<?php
declare(strict_types=1);

trait GameEngineResolution
{
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
            default => $this->resolveProductionIncidentEffect($state, $playerId, $effect, $sourceId, $targetId),
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
        if ($definition['type'] === 'service' && $definition['domain'] === 'frontend' && $player['turnFlags']['frontendPlayed'] === 0) {
            $cost = max(1, $cost - $this->countInfrastructure($player, 'frontend-state-store'));
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
        $incidentRule = (string)($state['incident']['rule'] ?? '');
        if ($incidentRule === 'FIRST_SERVICE_PLUS_ONE' && $definition['type'] === 'service' && $player['turnFlags']['servicePlayed'] === 0) $cost++;
        if ($incidentRule === 'FIRST_COMMAND_MINUS_ONE' && $definition['type'] === 'command' && $player['turnFlags']['commandPlayed'] === 0) $cost--;
        if ($incidentRule === 'FIRST_DATA_AI_SERVICE_MINUS_ONE' && $definition['type'] === 'service' && in_array($definition['domain'], ['data', 'ai'], true) && $player['turnFlags']['servicePlayed'] === 0) $cost--;
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
                    $this->ensureMatchStats($state['players'][$playerId]);
                    $state['players'][$playerId]['matchStats']['servicesCrashed']++;
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
        $this->ensureMatchStats($player);
        if ($definitionId === 'token-bug') {
            $player['matchStats']['bugsCreated']++;
        }
        if ($definitionId === 'token-replica') {
            $player['matchStats']['replicasCreated']++;
        }
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
}
