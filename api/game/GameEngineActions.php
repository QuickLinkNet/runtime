<?php
declare(strict_types=1);

trait GameEngineActions
{
    private function mulligan(array &$state, string $playerId, array $instanceIds): void
    {
        $player =& $state['players'][$playerId];
        if ($player['mulliganDone']) {
            throw new ApiException('MULLIGAN_ALREADY_DONE', 'Mulligan bereits abgeschlossen.', 409);
        }
        $instanceIds = array_values(array_unique(array_map('strval', $instanceIds)));
        if (count($instanceIds) > count($player['hand'])) {
            throw new ApiException('INVALID_MULLIGAN', 'Es können nur Karten aus deiner Starthand getauscht werden.');
        }
        $removed = [];
        foreach ($instanceIds as $instanceId) {
            $index = $this->findIndex($player['hand'], $instanceId);
            if ($index === null) {
                throw new ApiException('INVALID_MULLIGAN', 'Eine gewählte Karte ist nicht auf deiner Hand.');
            }
            $removed[] = $player['hand'][$index];
            array_splice($player['hand'], $index, 1);
        }
        $this->drawCards($state, $playerId, count($removed));
        foreach ($removed as $card) {
            $player['deck'][] = $card;
        }
        $this->shuffle($player['deck']);
        $player['mulliganDone'] = true;
        $this->event($state, 'MULLIGAN_COMPLETED', ['playerId' => $playerId, 'count' => count($removed)]);

        if ($state['mode'] === 'single') {
            foreach ($state['order'] as $id) {
                if ($state['players'][$id]['isBot']) {
                    $state['players'][$id]['mulliganDone'] = true;
                }
            }
        }
        foreach ($state['order'] as $id) {
            if (!$state['players'][$id]['mulliganDone']) {
                return;
            }
        }
        $firstIndex = random_int(0, 1);
        $first = $state['order'][$firstIndex];
        $second = $state['order'][1 - $firstIndex];
        $state['startingPlayerId'] = $first;
        $state['activePlayerId'] = $first;
        $state['players'][$second]['hand'][] = $this->newCard('token-bootstrap');
        $state['status'] = 'active';
        $this->startTurn($state, $first);
    }

    private function playCard(array &$state, string $playerId, string $instanceId, ?string $targetId, bool $overclock): void
    {
        $player =& $state['players'][$playerId];
        $handIndex = $this->findIndex($player['hand'], $instanceId);
        if ($handIndex === null) {
            throw new ApiException('CARD_NOT_IN_HAND', 'Diese Karte ist nicht auf deiner Hand.');
        }
        $cardInstance = $player['hand'][$handIndex];
        $definition = $this->catalog->get($cardInstance['definitionId']);
        if ($definition['type'] === 'service' && count($player['services']) >= 5) {
            throw new ApiException('SERVICE_SLOTS_FULL', 'Alle Service-Slots sind belegt.');
        }
        $infrastructureReplacement = null;
        if ($definition['type'] === 'infrastructure' && count($player['infrastructure']) >= 2) {
            $infrastructureReplacement = $targetId !== null ? $this->locateTarget($state, $targetId) : null;
            if ($infrastructureReplacement === null
                || $infrastructureReplacement['ownerId'] !== $playerId
                || $infrastructureReplacement['zone'] !== 'infrastructure') {
                throw new ApiException('INFRASTRUCTURE_REPLACEMENT_REQUIRED', 'Wähle eine eigene Infrastructure, die ersetzt werden soll.');
            }
        }
        $cost = $this->effectiveCost($state, $playerId, $cardInstance, $definition, $targetId);
        if ($overclock && isset($definition['overclockCost'])) {
            $cost += (int)$definition['overclockCost'];
        }
        if ($player['compute'] + $player['temporaryCompute'] < $cost) {
            throw new ApiException('INSUFFICIENT_COMPUTE', 'Nicht genug Compute.');
        }
        $this->validatePlayTarget($state, $playerId, $definition, $targetId);
        $this->spendCompute($player, $cost);
        array_splice($player['hand'], $handIndex, 1);

        $this->event($state, 'CARD_PLAYED', [
            'playerId' => $playerId,
            'cardInstanceId' => $instanceId,
            'definitionId' => $definition['id'],
            'cost' => $cost,
        ]);
        if ($definition['type'] === 'command') {
            $this->resolveEffect($state, $playerId, $definition, null, $targetId, $overclock);
            if (!($definition['token'] ?? false)) {
                $player['trash'][] = $cardInstance;
            }
            $player['turnFlags']['commandPlayed']++;
            $player['turnFlags']['projectManagerDiscount'] = false;
            if ($targetId !== null) {
                $player['turnFlags']['targetedCommandPlayed']++;
            }
            return;
        }

        $entity = $this->newEntity($cardInstance, $definition);
        if ($definition['type'] === 'service') {
            $entity['exhausted'] = true;
            $player['services'][] = $entity;
            $player['turnFlags']['servicePlayed']++;
            if ($definition['domain'] === 'frontend') {
                $player['turnFlags']['frontendPlayed']++;
            }
            $this->applyMessageQueue($player, $entity['instanceId']);
            if ($overclock && $definition['id'] === 'ai-inference-worker') {
                $this->buffEntity($state, $entity['instanceId'], 3, 0, false);
            }
            $this->resolveEffect($state, $playerId, $definition, $entity['instanceId'], $targetId, $overclock);
            $this->event($state, 'SERVICE_DEPLOYED', ['playerId' => $playerId, 'entityId' => $entity['instanceId']]);
        } else {
            if ($infrastructureReplacement !== null) {
                $replaced = $player['infrastructure'][$infrastructureReplacement['index']];
                array_splice($player['infrastructure'], $infrastructureReplacement['index'], 1);
                if (!($this->catalog->get($replaced['definitionId'])['token'] ?? false)) {
                    $player['trash'][] = [
                        'instanceId' => $replaced['instanceId'],
                        'definitionId' => $replaced['definitionId'],
                    ];
                }
                $this->event($state, 'INFRASTRUCTURE_REPLACED', [
                    'playerId' => $playerId,
                    'entityId' => $replaced['instanceId'],
                    'definitionId' => $replaced['definitionId'],
                ]);
            }
            $player['infrastructure'][] = $entity;
            $this->resolveEffect($state, $playerId, $definition, $entity['instanceId'], $targetId, $overclock);
        }
    }

    private function validatePlayTarget(array $state, string $playerId, array $definition, ?string $targetId): void
    {
        $effect = $definition['effectId'] ?? '';
        $target = $targetId !== null ? $this->locateTarget($state, $targetId) : null;
        $own = $target !== null && $target['ownerId'] === $playerId;
        $service = $target !== null && $target['zone'] === 'services';
        $board = $target !== null && in_array($target['zone'], ['services', 'infrastructure'], true);
        $opponentId = $this->opponentId($state, $playerId);
        $valid = match ($effect) {
            'infinite_rerender' => $service,
            'hotfix' => $board,
            'horizontal_scaling' => $service && $own && $this->catalog->get($target['entity']['definitionId'])['cost'] <= 3,
            'emergency_patch' => $own && ($board || $target['zone'] === 'core'),
            'coffee' => $service && $own,
            'force_push' => $service,
            'web_worker_deploy' => $this->countDomainServices($state['players'][$playerId], 'frontend') === 0 || ($service && $own),
            'security_engineer_deploy' => $targetId === null || ($service && $own),
            'sandbox_container_deploy' => $state['players'][$opponentId]['services'] === [] || ($service && !$own),
            'feature_flag', 'retry_storm', 'rotate_secrets' => $service && $own,
            'terraform_apply' => $target !== null && $target['zone'] === 'infrastructure' && $own,
            'penetration_tester_deploy' => $state['players'][$opponentId]['services'] === [] || ($service && !$own),
            'model_drift' => $service && !$own,
            default => true,
        };
        if (!$valid) {
            throw new ApiException('INVALID_TARGET', 'Ungültiges Ziel für diese Karte.');
        }
    }

    private function attack(array &$state, string $playerId, string $attackerId, string $targetId): void
    {
        $attackerLocation = $this->locateTarget($state, $attackerId);
        if ($attackerLocation === null || $attackerLocation['ownerId'] !== $playerId || $attackerLocation['zone'] !== 'services') {
            throw new ApiException('INVALID_ATTACKER', 'Ungültiger Angreifer.');
        }
        $attacker =& $state['players'][$playerId]['services'][$attackerLocation['index']];
        $attackerDef = $this->catalog->get($attacker['definitionId']);
        if ($attacker['exhausted'] || $attacker['sandboxed'] || ($attackerDef['cannotAttack'] ?? false)) {
            throw new ApiException('ATTACK_NOT_ALLOWED', 'Dieser Service kann nicht angreifen.');
        }
        $target = $this->locateTarget($state, $targetId);
        if ($target === null || $target['ownerId'] === $playerId) {
            throw new ApiException('INVALID_TARGET', 'Wähle ein gegnerisches Ziel.');
        }
        if ($target['zone'] === 'core' && $this->hasFirewall($state['players'][$target['ownerId']])) {
            throw new ApiException('FIREWALL_ACTIVE', 'FIREWALL schützt den gegnerischen Core.');
        }
        $attacker['exhausted'] = true;
        $this->event($state, 'ATTACK_STARTED', ['attackerId' => $attackerId, 'targetId' => $targetId]);
        $attackerPower = $attacker['power'];
        if ($target['zone'] === 'core') {
            $state['players'][$target['ownerId']]['core'] -= $attackerPower;
            $this->event($state, 'DAMAGE_DEALT', ['targetId' => $targetId, 'amount' => $attackerPower]);
        } elseif ($target['zone'] === 'infrastructure') {
            $this->dealEntityDamage($state, $targetId, $attackerPower);
        } else {
            $defenderPower = $target['entity']['power'];
            $this->dealEntityDamage($state, $targetId, $attackerPower);
            $this->dealEntityDamage($state, $attackerId, $defenderPower);
        }
    }

    private function debug(array &$state, string $playerId, string $targetId): void
    {
        $player =& $state['players'][$playerId];
        $target = $this->locateTarget($state, $targetId);
        if ($target === null || $target['ownerId'] !== $playerId || $target['zone'] !== 'services' || $target['entity']['definitionId'] !== 'token-bug') {
            throw new ApiException('INVALID_TARGET', 'DEBUG benötigt einen eigenen BUG.');
        }
        if ($player['compute'] + $player['temporaryCompute'] < 1) {
            throw new ApiException('INSUFFICIENT_COMPUTE', 'DEBUG kostet 1 Compute.');
        }
        $this->spendCompute($player, 1);
        array_splice($player['services'], $target['index'], 1);
        $this->event($state, 'BUG_DEBUGGED', ['playerId' => $playerId, 'targetId' => $targetId]);
    }

    public function endTurn(array &$state, string $playerId, bool $timeout = false): void
    {
        if ($state['activePlayerId'] !== $playerId) {
            throw new ApiException('NOT_YOUR_TURN', 'Du bist nicht am Zug.', 409);
        }
        $player =& $state['players'][$playerId];
        if ($this->hasInfrastructure($player, 'infrastructure-kubernetes-cluster') && $player['turnFlags']['serviceCrashed'] && count($player['services']) < 5) {
            $this->spawnToken($state, $playerId, 'token-replica');
        }
        $player['storedCompute'] = $this->hasInfrastructure($player, 'data-redis-cache')
            ? min(1, $player['compute'] + $player['temporaryCompute'])
            : 0;
        foreach ($player['services'] as &$service) {
            if (($service['temporaryPower'] ?? 0) > 0) {
                $service['power'] -= $service['temporaryPower'];
                $service['temporaryPower'] = 0;
            }
        }
        unset($service);
        $player['compute'] = 0;
        $player['temporaryCompute'] = 0;
        if ($timeout) {
            $player['consecutiveTimeouts']++;
            $this->event($state, 'TURN_TIMEOUT', ['playerId' => $playerId, 'count' => $player['consecutiveTimeouts']]);
            if ($player['consecutiveTimeouts'] >= 3) {
                $this->finish($state, $this->opponentId($state, $playerId), 'TIMEOUT');
                return;
            }
        }
        $this->event($state, 'TURN_ENDED', ['playerId' => $playerId]);
        $next = $this->opponentId($state, $playerId);
        $state['activePlayerId'] = $next;
        $this->startTurn($state, $next);
    }

    private function startTurn(array &$state, string $playerId): void
    {
        $state['turn']++;
        $player =& $state['players'][$playerId];
        $player['turnsTaken']++;
        $player['maxCompute'] = min(10, $player['maxCompute'] + 1);
        $player['compute'] = $player['maxCompute'];
        $player['temporaryCompute'] = $player['storedCompute'];
        $player['storedCompute'] = 0;
        $player['turnFlags'] = $this->emptyTurnFlags();
        foreach ($player['services'] as &$service) {
            $service['exhausted'] = false;
            if ($service['sandboxed'] && $service['sandboxUntilTurn'] <= $player['turnsTaken']) {
                $service['sandboxed'] = false;
                $service['sandboxUntilTurn'] = 0;
            }
        }
        unset($service);
        $state['turnStartedAt'] = gmdate('c');
        $state['turnDeadlineAt'] = $state['mode'] === 'multi' ? gmdate('c', time() + 75) : null;
        $this->event($state, 'TURN_STARTED', ['playerId' => $playerId, 'turn' => $state['turn']]);
        if ($player['turnsTaken'] > 1) {
            $this->drawCards($state, $playerId, 1);
        }
        $this->resolveDeaths($state);
        $this->checkGameOver($state);
    }
}
