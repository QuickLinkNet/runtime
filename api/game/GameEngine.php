<?php
declare(strict_types=1);

final class GameEngine
{
    private int $resolutionBudget = 100;
    private int $sequence = 0;

    public function __construct(private CardCatalog $catalog)
    {
    }

    public function createState(string $roomCode, string $mode): array
    {
        return [
            'roomCode' => $roomCode,
            'mode' => $mode,
            'status' => 'lobby',
            'players' => [],
            'order' => [],
            'activePlayerId' => null,
            'startingPlayerId' => null,
            'turn' => 0,
            'turnStartedAt' => null,
            'turnDeadlineAt' => null,
            'winnerId' => null,
            'finishReason' => null,
            'events' => [],
        ];
    }

    public function addPlayer(array &$state, string $playerId, string $name, array $deckIds, bool $isBot = false): void
    {
        if (count($state['order']) >= 2 || isset($state['players'][$playerId])) {
            throw new ApiException('MATCH_FULL', 'Dieses Match ist bereits voll.', 409);
        }
        $domains = $this->catalog->validateDeck($deckIds);
        $deck = array_map(fn(string $id): array => $this->newCard($id), $deckIds);
        $this->shuffle($deck);
        $state['players'][$playerId] = [
            'id' => $playerId,
            'name' => $name,
            'isBot' => $isBot,
            'domains' => $domains,
            'core' => 30,
            'deck' => $deck,
            'hand' => [],
            'services' => [],
            'infrastructure' => [],
            'trash' => [],
            'maxCompute' => 0,
            'compute' => 0,
            'temporaryCompute' => 0,
            'storedCompute' => 0,
            'fatigue' => 0,
            'mulliganDone' => false,
            'consecutiveTimeouts' => 0,
            'turnsTaken' => 0,
            'turnFlags' => $this->emptyTurnFlags(),
        ];
        $state['order'][] = $playerId;
    }

    public function startMatch(array &$state): void
    {
        if ($state['status'] !== 'lobby' || count($state['order']) !== 2) {
            throw new ApiException('MATCH_NOT_READY', 'Das Match ist noch nicht startbereit.', 409);
        }
        $state['status'] = 'mulligan';
        foreach ($state['order'] as $playerId) {
            $this->drawCards($state, $playerId, 3);
        }
        $this->event($state, 'MULLIGAN_STARTED');
    }

    public function applyAction(array &$state, string $playerId, array $action): void
    {
        $this->resolutionBudget = 100;
        $this->sequence = count($state['events']);
        if (!isset($state['players'][$playerId])) {
            throw new ApiException('NOT_MATCH_PLAYER', 'Du nimmst nicht an diesem Match teil.', 403);
        }
        $type = strtoupper((string)($action['type'] ?? ''));
        if ($state['status'] === 'mulligan') {
            if ($type !== 'MULLIGAN') {
                throw new ApiException('MULLIGAN_REQUIRED', 'Schließe zuerst den Mulligan ab.', 409);
            }
            $this->mulligan($state, $playerId, (array)($action['cardInstanceIds'] ?? []));
            $this->assertInvariants($state);
            return;
        }
        if ($state['status'] !== 'active') {
            throw new ApiException('MATCH_NOT_ACTIVE', 'Das Match ist nicht aktiv.', 409);
        }
        if ($state['activePlayerId'] !== $playerId) {
            throw new ApiException('NOT_YOUR_TURN', 'Du bist nicht am Zug.', 409);
        }
        $state['players'][$playerId]['consecutiveTimeouts'] = 0;
        match ($type) {
            'PLAY_CARD' => $this->playCard(
                $state,
                $playerId,
                (string)($action['cardInstanceId'] ?? ''),
                isset($action['targetId']) ? (string)$action['targetId'] : null,
                (bool)($action['overclock'] ?? false)
            ),
            'ATTACK' => $this->attack(
                $state,
                $playerId,
                (string)($action['attackerId'] ?? ''),
                (string)($action['targetId'] ?? '')
            ),
            'DEBUG' => $this->debug($state, $playerId, (string)($action['targetId'] ?? '')),
            'END_TURN' => $this->endTurn($state, $playerId),
            default => throw new ApiException('INVALID_ACTION', 'Unbekannte Spielaktion.'),
        };
        $this->resolveDeaths($state);
        $this->checkGameOver($state);
        $this->assertInvariants($state);
    }

    private function mulligan(array &$state, string $playerId, array $instanceIds): void
    {
        $player =& $state['players'][$playerId];
        if ($player['mulliganDone']) {
            throw new ApiException('MULLIGAN_ALREADY_DONE', 'Mulligan bereits abgeschlossen.', 409);
        }
        $instanceIds = array_values(array_unique(array_map('strval', $instanceIds)));
        if (count($instanceIds) > 3) {
            throw new ApiException('INVALID_MULLIGAN', 'Maximal drei Karten können getauscht werden.');
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
        if ($definition['type'] === 'infrastructure' && count($player['infrastructure']) >= 2) {
            throw new ApiException('INFRASTRUCTURE_SLOTS_FULL', 'Alle Infrastructure-Slots sind belegt.');
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
        $this->drawCards($state, $playerId, 1);
        $this->resolveDeaths($state);
        $this->checkGameOver($state);
    }

    private function resolveEffect(array &$state, string $playerId, array $definition, ?string $sourceId, ?string $targetId, bool $overclock): void
    {
        $this->consumeBudget();
        if ($sourceId !== null) {
            $source = $this->locateTarget($state, $sourceId);
            if ($source !== null && ($source['entity']['sandboxed'] ?? false)) {
                return;
            }
        }
        $effect = $definition['effectId'] ?? '';
        $opponentId = $this->opponentId($state, $playerId);
        $player =& $state['players'][$playerId];
        $opponent =& $state['players'][$opponentId];

        match ($effect) {
            'react_component_deploy' => $this->spawnToken($state, $playerId, 'token-child-component'),
            'vue_widget_deploy' => $this->countDomainServices($player, 'frontend', $sourceId) === 0 ? $this->buffEntity($state, $sourceId, 1, 0) : null,
            'angular_module_deploy' => $this->countDomainServices($player, 'frontend', $sourceId) >= 2 ? $this->grantRedundancy($state, $sourceId) : null,
            'web_worker_deploy' => $targetId !== null ? $this->patchTarget($state, $targetId, 2) : null,
            'infinite_rerender' => $this->sandboxTarget($state, $targetId, $playerId) + $this->drawCards($state, $playerId, 1),
            'legacy_php_crash' => $this->drawFirstDomain($state, $playerId, 'backend'),
            'queue_worker_deploy' => $this->hasDomainInfrastructure($player, 'backend') ? $this->buffEntity($state, $sourceId, 0, 2) : null,
            'java_service_deploy' => count($player['services']) === 1 ? $this->grantRedundancy($state, $sourceId) : null,
            'hotfix' => $this->patchTarget($state, $targetId, 4),
            'docker_container_deploy' => count($player['infrastructure']) > 0 ? $this->buffEntity($state, $sourceId, 1, 1) : null,
            'auto_scaler_crash' => $this->spawnToken($state, $playerId, 'token-replica'),
            'kubernetes_pod_deploy' => count($player['infrastructure']) >= 2 ? $this->grantRedundancy($state, $sourceId) : null,
            'horizontal_scaling' => $this->forkService($state, $playerId, $targetId),
            'query_engine_deploy' => count($player['infrastructure']) > 0 ? $this->drawCards($state, $playerId, 1) : null,
            'database_replica_deploy' => $this->hasDomainInfrastructure($player, 'data') ? $this->grantRedundancy($state, $sourceId) : null,
            'vector_database_deploy' => $this->handHasDomain($player, 'ai') ? $this->drawCards($state, $playerId, 1) : null,
            'data_engineer_deploy' => count($player['hand']) <= 4 ? $this->drawCards($state, $playerId, 1) : null,
            'select_all' => $this->drawCards($state, $playerId, 2),
            'sandbox_container_deploy' => $this->sandboxTarget($state, $targetId, $playerId),
            'security_engineer_deploy' => $this->grantRedundancy($state, $targetId ?? $sourceId),
            'emergency_patch' => $this->patchTarget($state, $targetId, 5),
            'llm_agent_deploy' => $this->generateRandomCard($state, $playerId, true, false),
            'vision_model_deploy' => $this->hasBug($opponent) ? $this->drawCards($state, $playerId, 1) : null,
            'embedding_model_deploy' => $this->drawFirstDomain($state, $playerId, 'data'),
            'hallucination' => $this->generateRandomCard($state, $playerId, false, true),
            'junior_developer_deploy' => $this->spawnToken($state, $playerId, 'token-bug'),
            'senior_developer_deploy' => $this->resolveSenior($state, $playerId, $sourceId),
            'qa_engineer_deploy' => $this->resolveQa($state, $playerId),
            'rubber_duck_deploy' => $this->hasBug($player) ? $this->drawCards($state, $playerId, 1) : null,
            'old_workstation_crash' => $this->drawCards($state, $playerId, 1),
            'project_manager_deploy' => $player['turnFlags']['projectManagerDiscount'] = true,
            'coffee' => $this->buffEntity($state, $targetId, 1, 0, true),
            'force_push' => $this->returnServiceToHand($state, $targetId),
            'stack_overflow' => $this->resolveStackOverflow($state, $playerId),
            'spaghetti_code' => $this->spawnToken($state, $opponentId, 'token-bug') + $this->spawnToken($state, $opponentId, 'token-bug'),
            'friday_deploy' => $this->resolveFridayDeploy($state, $playerId),
            'bootstrap' => $player['temporaryCompute']++,
            default => null,
        };
    }

    private function effectiveCost(array $state, string $playerId, array $instance, array $definition, ?string $targetId): int
    {
        $player = $state['players'][$playerId];
        $opponent = $state['players'][$this->opponentId($state, $playerId)];
        $cost = (int)$definition['cost'];
        if (($instance['costModifierTurn'] ?? null) === $state['turn']) {
            $cost += (int)($instance['costModifier'] ?? 0);
        }
        if ($definition['type'] === 'service' && $player['turnFlags']['servicePlayed'] === 0 && $this->hasActiveService($opponent, 'security-rate-limiter')) {
            $cost++;
        }
        if ($definition['type'] === 'command' && $targetId !== null && $player['turnFlags']['targetedCommandPlayed'] === 0 && $this->hasInfrastructure($opponent, 'security-zero-trust')) {
            $cost++;
        }
        if ($definition['type'] === 'service' && $definition['domain'] === 'frontend' && $player['turnFlags']['frontendPlayed'] === 0 && $this->hasInfrastructure($player, 'frontend-state-store')) {
            $cost = max(1, $cost - 1);
        }
        if ($definition['type'] === 'service' && $definition['domain'] === 'ai' && $this->hasInfrastructure($player, 'ai-gpu-cluster')) {
            $cost = max(1, $cost - 1);
        }
        if ($definition['type'] === 'command' && $player['turnFlags']['commandPlayed'] === 0 && $this->hasInfrastructure($player, 'neutral-ci-pipeline')) {
            $cost--;
        }
        if ($definition['type'] === 'command' && $player['turnFlags']['projectManagerDiscount']) {
            $cost--;
        }
        return max(0, $cost);
    }

    private function drawCards(array &$state, string $playerId, int $count): int
    {
        $drawn = 0;
        for ($i = 0; $i < $count; $i++) {
            $player =& $state['players'][$playerId];
            if ($player['deck'] === []) {
                $player['fatigue']++;
                $player['core'] -= $player['fatigue'];
                $this->event($state, 'MEMORY_LEAK', ['playerId' => $playerId, 'amount' => $player['fatigue']]);
                continue;
            }
            $card = array_pop($player['deck']);
            if (count($player['hand']) >= 10) {
                if (!($this->catalog->get($card['definitionId'])['token'] ?? false)) {
                    $player['trash'][] = $card;
                }
                $this->event($state, 'CARD_OVERFLOW', ['playerId' => $playerId, 'definitionId' => $card['definitionId']]);
                continue;
            }
            $player['hand'][] = $card;
            $drawn++;
            $this->event($state, 'CARD_DRAWN', ['playerId' => $playerId, 'cardInstanceId' => $card['instanceId']]);
        }
        return $drawn;
    }

    private function resolveDeaths(array &$state): void
    {
        do {
            $dead = [];
            $active = $state['activePlayerId'];
            $ordered = $active !== null ? [$active, $this->opponentId($state, $active)] : $state['order'];
            foreach ($ordered as $playerId) {
                foreach (['services', 'infrastructure'] as $zone) {
                    foreach ($state['players'][$playerId][$zone] as $entity) {
                        if ($entity['integrity'] <= 0) {
                            $dead[] = [$playerId, $zone, $entity['instanceId']];
                        }
                    }
                }
            }
            foreach ($dead as [$playerId, $zone, $instanceId]) {
                $location = $this->locateTarget($state, $instanceId);
                if ($location === null) {
                    continue;
                }
                $entity = $location['entity'];
                array_splice($state['players'][$playerId][$zone], $location['index'], 1);
                $definition = $this->catalog->get($entity['definitionId']);
                if (!($definition['token'] ?? false)) {
                    $state['players'][$playerId]['trash'][] = [
                        'instanceId' => $entity['instanceId'],
                        'definitionId' => $entity['definitionId'],
                    ];
                }
                if ($zone === 'services') {
                    $state['players'][$playerId]['turnFlags']['serviceCrashed'] = true;
                    $this->event($state, 'SERVICE_CRASHED', ['playerId' => $playerId, 'entityId' => $instanceId]);
                    if (!$entity['sandboxed'] && in_array('CRASH', $definition['keywords'] ?? [], true)) {
                        $this->resolveEffect($state, $playerId, $definition, null, null, false);
                    }
                } else {
                    $this->event($state, 'INFRASTRUCTURE_DESTROYED', ['playerId' => $playerId, 'entityId' => $instanceId]);
                }
            }
        } while ($dead !== []);
    }

    private function dealEntityDamage(array &$state, string $targetId, int $amount): void
    {
        $target = $this->locateTarget($state, $targetId);
        if ($target === null || !in_array($target['zone'], ['services', 'infrastructure'], true)) {
            return;
        }
        $entity =& $state['players'][$target['ownerId']][$target['zone']][$target['index']];
        if ($entity['redundancy']) {
            $entity['redundancy'] = false;
            $this->event($state, 'REDUNDANCY_TRIGGERED', ['targetId' => $targetId, 'prevented' => $amount]);
            return;
        }
        $entity['integrity'] -= $amount;
        $this->event($state, 'DAMAGE_DEALT', ['targetId' => $targetId, 'amount' => $amount]);
    }

    private function patchTarget(array &$state, ?string $targetId, int $amount): int
    {
        if ($targetId === null) {
            return 0;
        }
        $target = $this->locateTarget($state, $targetId);
        if ($target === null) {
            return 0;
        }
        if ($target['zone'] === 'core') {
            $state['players'][$target['ownerId']]['core'] = min(30, $state['players'][$target['ownerId']]['core'] + $amount);
        } else {
            $entity =& $state['players'][$target['ownerId']][$target['zone']][$target['index']];
            $entity['integrity'] = min($entity['maxIntegrity'], $entity['integrity'] + $amount);
        }
        $this->event($state, 'PATCH_APPLIED', ['targetId' => $targetId, 'amount' => $amount]);
        return $amount;
    }

    private function buffEntity(array &$state, ?string $targetId, int $power, int $integrity, bool $temporary = false): int
    {
        if ($targetId === null) {
            return 0;
        }
        $target = $this->locateTarget($state, $targetId);
        if ($target === null || $target['zone'] !== 'services') {
            return 0;
        }
        $entity =& $state['players'][$target['ownerId']]['services'][$target['index']];
        $entity['power'] += $power;
        if ($temporary) {
            $entity['temporaryPower'] += $power;
        }
        if ($integrity > 0) {
            $entity['maxIntegrity'] += $integrity;
            $entity['integrity'] += $integrity;
        }
        return 1;
    }

    private function grantRedundancy(array &$state, ?string $targetId): int
    {
        if ($targetId === null) {
            return 0;
        }
        $target = $this->locateTarget($state, $targetId);
        if ($target === null || $target['zone'] !== 'services') {
            return 0;
        }
        $state['players'][$target['ownerId']]['services'][$target['index']]['redundancy'] = true;
        return 1;
    }

    private function sandboxTarget(array &$state, ?string $targetId, string $actingPlayerId): int
    {
        if ($targetId === null) {
            return 0;
        }
        $target = $this->locateTarget($state, $targetId);
        if ($target === null || $target['zone'] !== 'services') {
            return 0;
        }
        $owner =& $state['players'][$target['ownerId']];
        $service =& $owner['services'][$target['index']];
        $service['sandboxed'] = true;
        $service['sandboxUntilTurn'] = $owner['turnsTaken'] + 1;
        $this->event($state, 'SERVICE_SANDBOXED', ['sourcePlayerId' => $actingPlayerId, 'targetId' => $targetId]);
        return 1;
    }

    private function spawnToken(array &$state, string $playerId, string $definitionId): int
    {
        $player =& $state['players'][$playerId];
        if (count($player['services']) >= 5) {
            return 0;
        }
        $card = $this->newCard($definitionId);
        $entity = $this->newEntity($card, $this->catalog->get($definitionId));
        $entity['exhausted'] = true;
        $player['services'][] = $entity;
        $this->event($state, $definitionId === 'token-bug' ? 'BUG_CREATED' : 'TOKEN_CREATED', [
            'playerId' => $playerId,
            'entityId' => $entity['instanceId'],
            'definitionId' => $definitionId,
        ]);
        return 1;
    }

    private function forkService(array &$state, string $playerId, ?string $targetId): int
    {
        if ($targetId === null || count($state['players'][$playerId]['services']) >= 5) {
            return 0;
        }
        $target = $this->locateTarget($state, $targetId);
        if ($target === null || $target['ownerId'] !== $playerId || $target['zone'] !== 'services') {
            return 0;
        }
        $original = $target['entity'];
        $copy = $original;
        $copy['instanceId'] = $this->id();
        $copy['integrity'] = $copy['maxIntegrity'];
        $copy['exhausted'] = true;
        $copy['sandboxed'] = false;
        $copy['sandboxUntilTurn'] = 0;
        $copy['temporaryPower'] = 0;
        $state['players'][$playerId]['services'][] = $copy;
        $this->event($state, 'SERVICE_FORKED', ['sourceId' => $targetId, 'entityId' => $copy['instanceId']]);
        return 1;
    }

    private function returnServiceToHand(array &$state, ?string $targetId): int
    {
        if ($targetId === null) {
            return 0;
        }
        $target = $this->locateTarget($state, $targetId);
        if ($target === null || $target['zone'] !== 'services') {
            return 0;
        }
        $player =& $state['players'][$target['ownerId']];
        $entity = $target['entity'];
        array_splice($player['services'], $target['index'], 1);
        $definition = $this->catalog->get($entity['definitionId']);
        if ($definition['token'] ?? false) {
            return 1;
        }
        $card = ['instanceId' => $entity['instanceId'], 'definitionId' => $entity['definitionId']];
        if (count($player['hand']) >= 10) {
            $player['trash'][] = $card;
            $this->event($state, 'CARD_OVERFLOW', ['playerId' => $target['ownerId'], 'definitionId' => $entity['definitionId']]);
        } else {
            $player['hand'][] = $card;
        }
        return 1;
    }

    private function drawFirstDomain(array &$state, string $playerId, string $domain): int
    {
        $player =& $state['players'][$playerId];
        foreach ($player['deck'] as $index => $card) {
            if ($this->catalog->get($card['definitionId'])['domain'] === $domain) {
                array_splice($player['deck'], $index, 1);
                if (count($player['hand']) >= 10) {
                    $player['trash'][] = $card;
                    $this->event($state, 'CARD_OVERFLOW', ['playerId' => $playerId, 'definitionId' => $card['definitionId']]);
                } else {
                    $player['hand'][] = $card;
                    $this->event($state, 'CARD_DRAWN', ['playerId' => $playerId, 'cardInstanceId' => $card['instanceId']]);
                }
                return 1;
            }
        }
        return 0;
    }

    private function generateRandomCard(array &$state, string $playerId, bool $commandsOnly, bool $discount): int
    {
        $player =& $state['players'][$playerId];
        if (count($player['hand']) >= 10) {
            return 0;
        }
        $choices = array_values(array_filter($this->catalog->all(), static function (array $card) use ($player, $commandsOnly): bool {
            return in_array($card['domain'], $player['domains'], true) && (!$commandsOnly || $card['type'] === 'command');
        }));
        if ($choices === []) {
            return 0;
        }
        $choice = $choices[random_int(0, count($choices) - 1)];
        $card = $this->newCard($choice['id']);
        if ($discount) {
            $card['costModifier'] = -1;
            $card['costModifierTurn'] = $state['turn'];
        }
        $player['hand'][] = $card;
        $this->event($state, 'CARD_GENERATED', ['playerId' => $playerId, 'definitionId' => $choice['id']]);
        return 1;
    }

    private function resolveSenior(array &$state, string $playerId, ?string $sourceId): int
    {
        $services =& $state['players'][$playerId]['services'];
        $count = 0;
        for ($i = count($services) - 1; $i >= 0; $i--) {
            if ($services[$i]['definitionId'] === 'token-bug') {
                array_splice($services, $i, 1);
                $count++;
            }
        }
        if ($count > 0) {
            $this->buffEntity($state, $sourceId, $count, $count);
        }
        return $count;
    }

    private function resolveQa(array &$state, string $playerId): int
    {
        foreach ($state['players'][$playerId]['services'] as $index => $service) {
            if ($service['definitionId'] === 'token-bug') {
                array_splice($state['players'][$playerId]['services'], $index, 1);
                $this->drawCards($state, $playerId, 1);
                return 1;
            }
        }
        return 0;
    }

    private function resolveStackOverflow(array &$state, string $playerId): int
    {
        $before = count($state['players'][$playerId]['hand']);
        $this->drawCards($state, $playerId, 1);
        if (count($state['players'][$playerId]['hand']) > $before) {
            $last = end($state['players'][$playerId]['hand']);
            if ($this->catalog->get($last['definitionId'])['type'] === 'command') {
                $this->drawCards($state, $playerId, 1);
            }
        }
        return 1;
    }

    private function resolveFridayDeploy(array &$state, string $playerId): int
    {
        $player =& $state['players'][$playerId];
        $options = ['A', 'C', 'D'];
        if ($player['services'] !== []) {
            $options[] = 'B';
        }
        $choice = $options[random_int(0, count($options) - 1)];
        if ($choice === 'A' && $player['services'] !== []) {
            $target = $player['services'][random_int(0, count($player['services']) - 1)]['instanceId'];
            $this->buffEntity($state, $target, 3, 3);
        } elseif ($choice === 'B') {
            $target = $player['services'][random_int(0, count($player['services']) - 1)]['instanceId'];
            $this->dealEntityDamage($state, $target, 999);
            $this->resolveDeaths($state);
        } elseif ($choice === 'C') {
            $this->drawCards($state, $playerId, 2);
        } else {
            $this->spawnToken($state, $playerId, 'token-bug');
            $this->spawnToken($state, $playerId, 'token-bug');
        }
        $this->event($state, 'FRIDAY_DEPLOY_RESOLVED', ['playerId' => $playerId, 'outcome' => $choice]);
        return 1;
    }

    private function applyMessageQueue(array &$player, string $entityId): void
    {
        if ($player['turnFlags']['servicePlayed'] !== 1 || !$this->hasInfrastructure($player, 'backend-message-queue')) {
            return;
        }
        foreach ($player['services'] as &$service) {
            if ($service['instanceId'] === $entityId) {
                $service['maxIntegrity']++;
                $service['integrity']++;
                return;
            }
        }
    }

    private function checkGameOver(array &$state): void
    {
        if ($state['status'] === 'finished') {
            return;
        }
        foreach ($state['order'] as $playerId) {
            if ($state['players'][$playerId]['core'] <= 0) {
                $this->finish($state, $this->opponentId($state, $playerId), 'CORE_DESTROYED');
                return;
            }
        }
    }

    private function finish(array &$state, string $winnerId, string $reason): void
    {
        $state['status'] = 'finished';
        $state['winnerId'] = $winnerId;
        $state['finishReason'] = $reason;
        $state['turnDeadlineAt'] = null;
        $this->event($state, 'GAME_OVER', ['winnerId' => $winnerId, 'reason' => $reason]);
    }

    private function newCard(string $definitionId): array
    {
        return ['instanceId' => $this->id(), 'definitionId' => $definitionId];
    }

    private function newEntity(array $card, array $definition): array
    {
        return [
            'instanceId' => $card['instanceId'],
            'definitionId' => $card['definitionId'],
            'power' => (int)($definition['power'] ?? 0),
            'integrity' => (int)$definition['integrity'],
            'maxIntegrity' => (int)$definition['integrity'],
            'redundancy' => false,
            'sandboxed' => false,
            'sandboxUntilTurn' => 0,
            'exhausted' => false,
            'temporaryPower' => 0,
        ];
    }

    private function locateTarget(array $state, string $targetId): ?array
    {
        if (str_starts_with($targetId, 'core:')) {
            $playerId = substr($targetId, 5);
            return isset($state['players'][$playerId]) ? ['ownerId' => $playerId, 'zone' => 'core', 'index' => null, 'entity' => null] : null;
        }
        foreach ($state['order'] as $playerId) {
            foreach (['services', 'infrastructure'] as $zone) {
                foreach ($state['players'][$playerId][$zone] as $index => $entity) {
                    if ($entity['instanceId'] === $targetId) {
                        return ['ownerId' => $playerId, 'zone' => $zone, 'index' => $index, 'entity' => $entity];
                    }
                }
            }
        }
        return null;
    }

    private function findIndex(array $cards, string $instanceId): ?int
    {
        foreach ($cards as $index => $card) {
            if ($card['instanceId'] === $instanceId) {
                return $index;
            }
        }
        return null;
    }

    private function opponentId(array $state, string $playerId): string
    {
        foreach ($state['order'] as $id) {
            if ($id !== $playerId) {
                return $id;
            }
        }
        throw new ApiException('MATCH_NOT_READY', 'Gegenspieler fehlt.', 409);
    }

    private function hasFirewall(array $player): bool
    {
        foreach ($player['services'] as $service) {
            $definition = $this->catalog->get($service['definitionId']);
            if (!$service['sandboxed'] && in_array('FIREWALL', $definition['keywords'] ?? [], true)) {
                return true;
            }
        }
        return false;
    }

    private function hasActiveService(array $player, string $definitionId): bool
    {
        foreach ($player['services'] as $service) {
            if ($service['definitionId'] === $definitionId && !$service['sandboxed']) {
                return true;
            }
        }
        return false;
    }

    private function hasInfrastructure(array $player, string $definitionId): bool
    {
        foreach ($player['infrastructure'] as $entity) {
            if ($entity['definitionId'] === $definitionId) {
                return true;
            }
        }
        return false;
    }

    private function hasDomainInfrastructure(array $player, string $domain): bool
    {
        foreach ($player['infrastructure'] as $entity) {
            if ($this->catalog->get($entity['definitionId'])['domain'] === $domain) {
                return true;
            }
        }
        return false;
    }

    private function countDomainServices(array $player, string $domain, ?string $exceptId = null): int
    {
        $count = 0;
        foreach ($player['services'] as $service) {
            if ($service['instanceId'] !== $exceptId && $this->catalog->get($service['definitionId'])['domain'] === $domain) {
                $count++;
            }
        }
        return $count;
    }

    private function handHasDomain(array $player, string $domain): bool
    {
        foreach ($player['hand'] as $card) {
            if ($this->catalog->get($card['definitionId'])['domain'] === $domain) {
                return true;
            }
        }
        return false;
    }

    private function hasBug(array $player): bool
    {
        foreach ($player['services'] as $service) {
            if ($service['definitionId'] === 'token-bug') {
                return true;
            }
        }
        return false;
    }

    private function spendCompute(array &$player, int $amount): void
    {
        $fromTemporary = min($amount, $player['temporaryCompute']);
        $player['temporaryCompute'] -= $fromTemporary;
        $player['compute'] -= $amount - $fromTemporary;
    }

    private function emptyTurnFlags(): array
    {
        return [
            'frontendPlayed' => 0,
            'servicePlayed' => 0,
            'commandPlayed' => 0,
            'targetedCommandPlayed' => 0,
            'serviceCrashed' => false,
            'projectManagerDiscount' => false,
        ];
    }

    private function event(array &$state, string $type, array $data = []): void
    {
        $state['events'][] = array_merge([
            'id' => $this->id(),
            'type' => $type,
            'sequence' => ++$this->sequence,
        ], $data);
        if (count($state['events']) > 80) {
            $state['events'] = array_slice($state['events'], -80);
        }
    }

    private function consumeBudget(): void
    {
        $this->resolutionBudget--;
        if ($this->resolutionBudget < 0) {
            throw new ApiException('EFFECT_LIMIT', 'Effekt-Auflösung hat das Sicherheitslimit überschritten.', 409);
        }
    }

    private function shuffle(array &$items): void
    {
        for ($i = count($items) - 1; $i > 0; $i--) {
            $j = random_int(0, $i);
            [$items[$i], $items[$j]] = [$items[$j], $items[$i]];
        }
    }

    private function id(): string
    {
        return bin2hex(random_bytes(8));
    }

    public function assertInvariants(array $state): void
    {
        $ids = [];
        foreach ($state['players'] as $player) {
            if (count($player['hand']) > 10 || count($player['services']) > 5 || count($player['infrastructure']) > 2) {
                throw new LogicException('Board or hand limit invariant failed.');
            }
            if ($player['compute'] < 0 || $player['temporaryCompute'] < 0) {
                throw new LogicException('Compute invariant failed.');
            }
            foreach (['deck', 'hand', 'trash', 'services', 'infrastructure'] as $zone) {
                foreach ($player[$zone] as $entity) {
                    if (isset($ids[$entity['instanceId']])) {
                        throw new LogicException('Duplicate card instance: ' . $entity['instanceId']);
                    }
                    $ids[$entity['instanceId']] = true;
                }
            }
        }
    }
}
