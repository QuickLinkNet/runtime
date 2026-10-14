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
            'infinite_rerender' => $this->resolveInfiniteRerender($state, $playerId, $targetId),
            'legacy_php_crash' => $this->hasDomainInfrastructure($player, 'backend')
                ? $this->drawFirstDomain($state, $playerId, 'backend')
                : null,
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
            'llm_agent_deploy' => $this->resolveLlmAgent($state, $playerId),
            'vision_model_deploy' => $this->hasBug($opponent) ? $this->drawCards($state, $playerId, 1) : $this->buffEntity($state, $sourceId, 0, 1),
            'embedding_model_deploy' => $this->drawFirstDomain($state, $playerId, 'data'),
            'hallucination' => $this->generateRandomCard($state, $playerId, false, true),
            'junior_developer_deploy' => $this->spawnToken($state, $playerId, 'token-bug'),
            'senior_developer_deploy' => $this->resolveSenior($state, $playerId, $sourceId),
            'qa_engineer_deploy' => $this->resolveQa($state, $playerId),
            'rubber_duck_deploy' => $this->resolveRubberDuck($state, $playerId, $sourceId),
            'old_workstation_crash' => $this->drawCards($state, $playerId, 1),
            'project_manager_deploy' => $player['turnFlags']['projectManagerDiscount'] = 2,
            'coffee' => $this->buffEntity($state, $targetId, 1, 0, true),
            'force_push' => $this->returnServiceToHand($state, $targetId),
            'stack_overflow' => $this->resolveStackOverflow($state, $playerId),
            'spaghetti_code' => $this->spawnToken($state, $opponentId, 'token-bug') + $this->spawnToken($state, $opponentId, 'token-bug'),
            'friday_deploy' => $this->resolveFridayDeploy($state, $playerId),
            'bootstrap' => $player['temporaryCompute'] += 3,
            'error_boundary_deploy' => $this->resolveErrorBoundary($state, $playerId, $targetId),
            'component_library' => $this->spawnToken($state, $playerId, 'token-child-component') + ($this->countDomainServices($player, 'frontend') >= 3 ? $this->drawCards($state, $playerId, 1) : 0),
            'edge_runtime_deploy' => $this->countDomainServices($player, 'frontend', $sourceId) >= 3
                ? $this->buffDomainServicesTemporary($state, $playerId, 'frontend', $sourceId, 2, 2)
                : null,
            'idempotency_key_deploy' => ($player['turnFlags']['ownServiceReturned'] ?? false) ? $this->drawFirstDomain($state, $playerId, 'backend') : null,
            'dead_letter_queue' => $this->armDeadLetterQueue($state, $targetId),
            'event_store_deploy' => $this->resolveEventStore($state, $playerId),
            'slo_monitor_deploy' => $player['turnFlags']['sloMonitorArmed'] = true,
            'rolling_deploy' => $this->resolveRollingDeploy($state, $playerId, $targetId),
            'disaster_recovery_plan' => $this->returnTrashServices($state, $playerId, 2),
            'query_planner_deploy' => $this->discoverTopCards($state, $playerId, 3, 1, null, null),
            'data_quality_gate' => $this->dataQualityGate($state, $playerId),
            'predictive_query' => $this->discoverTopCards($state, $playerId, 5, 2, null, null, true),
            'soc_analyst_deploy' => $this->resolveSocAnalyst($state, $playerId),
            'access_review' => $this->sandboxTarget($state, $targetId, $playerId),
            'containment_plan' => $this->containServices($state, $playerId, $targetId),
            'model_router_deploy' => $this->resolveModelRouter($state, $playerId),
            'model_ensemble' => $this->handHasOtherDeckDomain($player, 'ai')
                ? $this->drawFirstDomainType($state, $playerId, 'ai', 'service', true)
                : null,
            'inference_burst' => $this->resolveInferenceBurst($state, $playerId, $targetId),
            default => $this->resolveProductionIncidentEffect($state, $playerId, $effect, $sourceId, $targetId),
        };
    }

    private function effectiveCost(array $state, string $playerId, array $instance, array $definition, ?string $targetId): int
    {
        $player = $state['players'][$playerId];
        $opponent = $state['players'][$this->opponentId($state, $playerId)];
        $cost = (int)$definition['cost'];
        if ($definition['id'] === 'ai-gpu-cluster') {
            $cost = max(4, $cost - $this->countDomainServices($player, 'ai'));
        }
        if (($instance['costModifierUntilPlayed'] ?? false) || ($instance['costModifierTurn'] ?? null) === $state['turn']) {
            $cost += (int)($instance['costModifier'] ?? 0);
        }
        if ($definition['type'] === 'service' && $player['turnFlags']['servicePlayed'] === 0 && $this->hasActiveService($opponent, 'security-rate-limiter')) {
            $cost++;
        }
        if ($this->zeroTrustApplies($state, $playerId, $definition, $targetId)) {
            $cost++;
        }
        if ($definition['type'] === 'service' && $definition['domain'] === 'frontend' && $player['turnFlags']['frontendPlayed'] === 0) {
            $cost = max(1, $cost - ($this->hasInfrastructure($player, 'frontend-state-store') ? 1 : 0));
        }
        if ($definition['domain'] === 'data' && !($player['turnFlags']['dataPlayed'] ?? false) && $this->hasInfrastructure($player, 'ai-rag-pipeline')) {
            $cost = max(1, $cost - 1);
        }
        if ($definition['type'] === 'service' && $definition['domain'] === 'ai' && $this->hasInfrastructure($player, 'ai-gpu-cluster')) {
            $cost = max(1, $cost - 1);
        }
        if ($definition['type'] === 'command' && $player['turnFlags']['commandPlayed'] === 0 && $this->hasInfrastructure($player, 'neutral-ci-pipeline')) {
            $cost--;
        }
        if ($definition['type'] === 'command') {
            $cost -= (int)($player['turnFlags']['projectManagerDiscount'] ?? 0);
        }
        if ($definition['type'] === 'service') {
            $cost -= (int)($player['turnFlags']['nextServiceDiscount'] ?? 0);
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
            $this->recordHandAcquisition($player, $card['definitionId']);
            $drawn++;
            $this->event($state, 'CARD_DRAWN', ['playerId' => $playerId, 'cardInstanceId' => $card['instanceId']]);
        }
        return $drawn;
    }

    private function recordHandAcquisition(array &$player, string $definitionId): void
    {
        $this->ensureMatchStats($player);
        $player['matchStats']['cardDrawCounts'][$definitionId] = (int)($player['matchStats']['cardDrawCounts'][$definitionId] ?? 0) + 1;
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
                    if (($entity['deadLetterUntilTurn'] ?? 0) > $state['players'][$playerId]['turnsTaken']) {
                        $this->drawFirstDomain($state, $playerId, 'backend');
                    }
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
            $before = $entity['integrity'];
            $entity['integrity'] = min($entity['maxIntegrity'], $entity['integrity'] + $amount);
            if ($target['ownerId'] === $state['activePlayerId'] && $target['zone'] === 'services' && $entity['integrity'] > $before) {
                $state['players'][$target['ownerId']]['turnFlags']['patchedOwnService'] = true;
            }
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
        // Keep the service isolated throughout its owner's next complete turn.
        $service['sandboxUntilTurn'] = $owner['turnsTaken'] + 2;
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
        if ($definitionId === 'token-child-component' && $this->hasInfrastructure($player, 'frontend-design-system')) {
            $this->enhanceChildComponent($entity);
        }
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
            $this->recordHandAcquisition($player, $card['definitionId']);
            if ($target['ownerId'] === $state['activePlayerId']) {
                $player['turnFlags']['ownServiceReturned'] = true;
            }
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
                    $this->recordHandAcquisition($player, $card['definitionId']);
                    $this->event($state, 'CARD_DRAWN', ['playerId' => $playerId, 'cardInstanceId' => $card['instanceId']]);
                }
                return 1;
            }
        }
        return 0;
    }

    private function drawFirstDomainType(array &$state, string $playerId, string $domain, string $type, bool $discountUntilPlayed = false): int
    {
        $player =& $state['players'][$playerId];
        foreach ($player['deck'] as $index => $card) {
            $definition = $this->catalog->get($card['definitionId']);
            if ($definition['domain'] === $domain && $definition['type'] === $type) {
                array_splice($player['deck'], $index, 1);
                if (count($player['hand']) < 10) {
                    if ($discountUntilPlayed) {
                        $card['costModifier'] = -1;
                        $card['costModifierUntilPlayed'] = true;
                    }
                    $player['hand'][] = $card;
                    $this->recordHandAcquisition($player, $card['definitionId']);
                } else $player['trash'][] = $card;
                $this->event($state, 'CARD_DRAWN', ['playerId' => $playerId, 'cardInstanceId' => $card['instanceId']]);
                return 1;
            }
        }
        return 0;
    }

    private function resolveErrorBoundary(array &$state, string $playerId, ?string $targetId): int
    {
        $target = $this->locateTarget($state, (string)$targetId);
        $before = $target['entity']['integrity'] ?? 0;
        $result = $this->patchTarget($state, $targetId, 2);
        $after = $this->locateTarget($state, (string)$targetId)['entity']['integrity'] ?? 0;
        if ($result && $after > $before && $after === ($target['entity']['maxIntegrity'] ?? 0)) $this->drawCards($state, $playerId, 1);
        return $result;
    }

    private function resolveInfiniteRerender(array &$state, string $playerId, ?string $targetId): int
    {
        $result = $this->sandboxTarget($state, $targetId, $playerId);
        if ($result > 0 && $this->countDomainServices($state['players'][$playerId], 'frontend') >= 2) {
            $result += $this->spawnToken($state, $playerId, 'token-child-component');
        }
        return $result;
    }

    private function enhanceChildComponents(array &$state, string $playerId): int
    {
        $enhanced = 0;
        foreach ($state['players'][$playerId]['services'] as &$service) {
            if ($service['definitionId'] === 'token-child-component' && !($service['designSystemEnhanced'] ?? false)) {
                $this->enhanceChildComponent($service);
                $enhanced++;
            }
        }
        unset($service);
        return $enhanced;
    }

    private function enhanceChildComponent(array &$entity): void
    {
        $entity['power']++;
        $entity['integrity']++;
        $entity['maxIntegrity']++;
        $entity['designSystemEnhanced'] = true;
    }

    private function buffDomainServicesTemporary(array &$state, string $playerId, string $domain, ?string $exceptId, int $limit, int $power): int
    {
        $count = 0;
        foreach ($state['players'][$playerId]['services'] as $service) {
            if ($service['instanceId'] !== $exceptId && $this->catalog->get($service['definitionId'])['domain'] === $domain && $count < $limit) {
                $this->buffEntity($state, $service['instanceId'], $power, 0, true);
                $count++;
            }
        }
        return $count;
    }

    private function armDeadLetterQueue(array &$state, ?string $targetId): int
    {
        $target = $this->locateTarget($state, (string)$targetId);
        if ($target === null || $target['zone'] !== 'services') return 0;
        $state['players'][$target['ownerId']]['services'][$target['index']]['deadLetterUntilTurn'] = $state['players'][$target['ownerId']]['turnsTaken'] + 1;
        return 1;
    }

    private function resolveEventStore(array &$state, string $playerId): int
    {
        if ($state['players'][$playerId]['core'] <= 20) return $this->drawFirstDomain($state, $playerId, 'backend');
        return $this->returnFirstTrashDomain($state, $playerId, 'backend');
    }

    private function returnFirstTrashDomain(array &$state, string $playerId, string $domain): int
    {
        $player =& $state['players'][$playerId];
        foreach ($player['trash'] as $index => $card) {
            if ($this->catalog->get($card['definitionId'])['domain'] === $domain) {
                if (count($player['hand']) >= 10) return 0;
                array_splice($player['trash'], $index, 1);
                $player['hand'][] = $card;
                $this->recordHandAcquisition($player, $card['definitionId']);
                return 1;
            }
        }
        return 0;
    }

    private function resolveRollingDeploy(array &$state, string $playerId, ?string $targetId): int
    {
        if ($targetId === null) return 0;
        $target = $this->locateTarget($state, $targetId);
        if ($target === null) return 0;
        $definition = $this->catalog->get($target['entity']['definitionId']);
        $result = $this->returnServiceToHand($state, $targetId);
        $this->spawnToken($state, $playerId, 'token-replica');
        if ($result && (int)$definition['cost'] <= 3) {
            $index = $this->findIndex($state['players'][$playerId]['hand'], $targetId);
            if ($index !== null) {
                $state['players'][$playerId]['hand'][$index]['costModifier'] = -1;
                $state['players'][$playerId]['hand'][$index]['costModifierUntilPlayed'] = true;
            }
        }
        return $result;
    }

    private function returnTrashServices(array &$state, string $playerId, int $limit): int
    {
        $player =& $state['players'][$playerId]; $returned = 0;
        for ($i = count($player['trash']) - 1; $i >= 0 && $returned < $limit; $i--) {
            $card = $player['trash'][$i];
            if ($this->catalog->get($card['definitionId'])['type'] === 'service' && count($player['hand']) < 10) {
                array_splice($player['trash'], $i, 1); $player['hand'][] = $card; $this->recordHandAcquisition($player, $card['definitionId']); $returned++;
            }
        }
        if ($returned > 0 && count($player['infrastructure']) >= 2) {
            $index = array_key_last($player['hand']);
            $player['hand'][$index]['costModifier'] = -1;
            $player['hand'][$index]['costModifierUntilPlayed'] = true;
        }
        return $returned;
    }

    private function discoverTopCards(array &$state, string $playerId, int $depth, int $take, ?string $domain, ?string $type, bool $differentTypes = false): int
    {
        $player =& $state['players'][$playerId];
        $top = array_splice($player['deck'], max(0, count($player['deck']) - $depth));
        usort($top, fn(array $a, array $b): int => $this->catalog->get($b['definitionId'])['cost'] <=> $this->catalog->get($a['definitionId'])['cost']);
        $picked = 0; $types = [];
        foreach ($top as $index => $card) {
            $definition = $this->catalog->get($card['definitionId']);
            if ($picked < $take && count($player['hand']) < 10 && ($domain === null || $definition['domain'] === $domain) && ($type === null || $definition['type'] === $type) && (!$differentTypes || !isset($types[$definition['type']]))) {
                $player['hand'][] = $card; $this->recordHandAcquisition($player, $card['definitionId']); $types[$definition['type']] = true; unset($top[$index]); $picked++;
            }
        }
        $player['deck'] = array_merge(array_values($top), $player['deck']);
        return $picked;
    }

    private function dataQualityGate(array &$state, string $playerId): int
    {
        $player =& $state['players'][$playerId];
        if ($player['hand'] !== []) $player['deck'] = array_merge([array_shift($player['hand'])], $player['deck']);
        $top = array_splice($player['deck'], max(0, count($player['deck']) - 4));
        usort($top, fn(array $a, array $b): int => $this->catalog->get($b['definitionId'])['cost'] <=> $this->catalog->get($a['definitionId'])['cost']);
        foreach ($top as $index => $card) {
            $definition = $this->catalog->get($card['definitionId']);
            if (count($player['hand']) < 10 && ($definition['domain'] === 'data' || $definition['type'] === 'command')) {
                $card['costModifier'] = -1;
                $card['costModifierTurn'] = $state['turn'];
                $player['hand'][] = $card; $this->recordHandAcquisition($player, $card['definitionId']); unset($top[$index]);
                $player['deck'] = array_merge(array_values($top), $player['deck']);
                return 1;
            }
        }
        $player['deck'] = array_merge(array_values($top), $player['deck']);
        return 0;
    }

    private function resolveSocAnalyst(array &$state, string $playerId): int
    {
        if ($this->takePreConsumedBugs($state, $playerId) > 0) return 1;
        foreach ($state['players'][$playerId]['services'] as $index => $service) {
            if ($service['definitionId'] === 'token-bug') {
                array_splice($state['players'][$playerId]['services'], $index, 1);
                $state['players'][$playerId]['turnFlags']['bugRemoved'] = true;
                return 1;
            }
        }
        return $this->patchTarget($state, 'core:' . $playerId, 2);
    }

    private function applyCircuitBreaker(array &$state, string $playerId, string $serviceId, array $definition): void
    {
        $player =& $state['players'][$playerId];
        if (($definition['domain'] ?? '') !== 'backend' || ($player['turnFlags']['backendServiceProtected'] ?? false)
            || !$this->hasInfrastructure($player, 'backend-circuit-breaker')) return;
        if ($this->grantRedundancy($state, $serviceId) > 0) $player['turnFlags']['backendServiceProtected'] = true;
    }

    private function applyEventStream(array &$state, string $playerId, array $definition): void
    {
        $player =& $state['players'][$playerId];
        if (($definition['domain'] ?? '') !== 'data' || ($definition['type'] ?? '') === 'infrastructure'
            || ($player['turnFlags']['eventStreamTriggered'] ?? false)
            || !$this->hasInfrastructure($player, 'data-event-stream')) return;
        $player['turnFlags']['eventStreamTriggered'] = true;
        $this->drawCards($state, $playerId, 1);
    }

    private function containServices(array &$state, string $playerId, ?string $targetId): int
    {
        $count = $this->containService($state, $targetId);
        $opponentId = $this->opponentId($state, $playerId);
        if (count($state['players'][$playerId]['services']) < count($state['players'][$opponentId]['services'])) {
            foreach ($state['players'][$playerId]['services'] as $service) if ($service['instanceId'] !== $targetId) { $count += $this->containService($state, $service['instanceId']); break; }
        }
        return $count;
    }

    private function containService(array &$state, ?string $targetId): int
    {
        if ($this->armCommandImmunity($state, $targetId) === 0) return 0;
        $this->grantRedundancy($state, $targetId);
        return 1;
    }

    private function armCommandImmunity(array &$state, ?string $targetId): int
    {
        $target = $this->locateTarget($state, (string)$targetId);
        if ($target === null || $target['zone'] !== 'services') return 0;
        $state['players'][$target['ownerId']]['services'][$target['index']]['commandImmuneUntilTurn'] = $state['players'][$target['ownerId']]['turnsTaken'] + 1;
        return 1;
    }

    private function resolveInferenceBurst(array &$state, string $playerId, ?string $targetId): int
    {
        $target = $this->locateTarget($state, (string)$targetId);
        if ($target === null || ($target['entity']['deployedTurn'] ?? 0) !== $state['turn'] || $this->catalog->get($target['entity']['definitionId'])['domain'] !== 'ai') return 0;
        $state['players'][$playerId]['services'][$target['index']]['exhausted'] = false;
        if (($state['players'][$playerId]['turnFlags']['dataPlayed'] ?? false)) $this->buffEntity($state, $targetId, 1, 0, true);
        return 1;
    }

    private function generateRandomCard(array &$state, string $playerId, bool $commandsOnly, bool $discount, ?string $domain = null): int
    {
        $player =& $state['players'][$playerId];
        if (count($player['hand']) >= 10) {
            return 0;
        }
        $choices = array_values(array_filter($this->catalog->all(), static function (array $card) use ($player, $commandsOnly, $domain): bool {
            return in_array($card['domain'], $player['domains'], true)
                && ($domain === null || $card['domain'] === $domain)
                && (!$commandsOnly || $card['type'] === 'command');
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
        $this->recordHandAcquisition($player, $card['definitionId']);
        $this->event($state, 'CARD_GENERATED', ['playerId' => $playerId, 'definitionId' => $choice['id']]);
        return 1;
    }

    private function resolveModelRouter(array &$state, string $playerId): int
    {
        $domains = array_values(array_filter(
            $state['players'][$playerId]['domains'],
            static fn(string $domain): bool => $domain !== 'ai'
        ));
        if ($domains === []) return 0;
        return $this->generateRandomCard($state, $playerId, true, true, $domains[0]);
    }

    private function resolveLlmAgent(array &$state, string $playerId): int
    {
        $generated = 0;
        foreach ($state['players'][$playerId]['domains'] as $domain) {
            $generated += $this->generateRandomCard($state, $playerId, true, true, $domain);
        }
        return $generated;
    }

    private function resolveSenior(array &$state, string $playerId, ?string $sourceId): int
    {
        $services =& $state['players'][$playerId]['services'];
        $count = $this->takePreConsumedBugs($state, $playerId);
        for ($i = count($services) - 1; $i >= 0; $i--) {
            if ($services[$i]['definitionId'] === 'token-bug') {
                array_splice($services, $i, 1);
                $count++;
            }
        }
        if ($count > 0) {
            $state['players'][$playerId]['turnFlags']['bugRemoved'] = true;
            $this->buffEntity($state, $sourceId, $count, $count);
        }
        return $count;
    }

    private function resolveQa(array &$state, string $playerId): int
    {
        if ($this->takePreConsumedBugs($state, $playerId) > 0) {
            $this->drawCards($state, $playerId, 1);
            return 1;
        }
        foreach ($state['players'][$playerId]['services'] as $index => $service) {
            if ($service['definitionId'] === 'token-bug') {
                array_splice($state['players'][$playerId]['services'], $index, 1);
                $state['players'][$playerId]['turnFlags']['bugRemoved'] = true;
                $this->drawCards($state, $playerId, 1);
                return 1;
            }
        }
        return 0;
    }

    private function resolveRubberDuck(array &$state, string $playerId, ?string $sourceId): int
    {
        if ($this->takePreConsumedBugs($state, $playerId) > 0) {
            $this->drawCards($state, $playerId, 1);
            $this->buffEntity($state, $sourceId, 1, 0);
            return 1;
        }
        foreach ($state['players'][$playerId]['services'] as $index => $service) {
            if ($service['definitionId'] !== 'token-bug') {
                continue;
            }
            array_splice($state['players'][$playerId]['services'], $index, 1);
            $state['players'][$playerId]['turnFlags']['bugRemoved'] = true;
            $this->drawCards($state, $playerId, 1);
            $this->buffEntity($state, $sourceId, 1, 0);
            return 1;
        }
        return 0;
    }

    private function consumeBugsForDeploy(array &$state, string $playerId, array $definition): int
    {
        $services =& $state['players'][$playerId]['services'];
        $limit = ($definition['effectId'] ?? '') === 'senior_developer_deploy' ? PHP_INT_MAX : 1;
        $removed = 0;
        for ($index = count($services) - 1; $index >= 0 && $removed < $limit; $index--) {
            if ($services[$index]['definitionId'] !== 'token-bug') continue;
            array_splice($services, $index, 1);
            $removed++;
        }
        if ($removed > 0) {
            $state['players'][$playerId]['turnFlags']['preConsumedBugs'] = $removed;
            $state['players'][$playerId]['turnFlags']['bugRemoved'] = true;
            $this->event($state, 'BUGS_CLEANED_FOR_DEPLOY', ['playerId' => $playerId, 'count' => $removed, 'definitionId' => $definition['id']]);
        }
        return $removed;
    }

    private function takePreConsumedBugs(array &$state, string $playerId): int
    {
        $count = (int)($state['players'][$playerId]['turnFlags']['preConsumedBugs'] ?? 0);
        $state['players'][$playerId]['turnFlags']['preConsumedBugs'] = 0;
        return $count;
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

    private function applyMessageQueue(array &$player, string $entityId, array $definition): void
    {
        if (($definition['domain'] ?? '') !== 'backend'
            || ($player['turnFlags']['backendMessageQueueTriggered'] ?? false)
            || !$this->hasInfrastructure($player, 'backend-message-queue')) {
            return;
        }
        foreach ($player['services'] as &$service) {
            if ($service['instanceId'] === $entityId) {
                $service['maxIntegrity']++;
                $service['integrity']++;
                $player['turnFlags']['backendMessageQueueTriggered'] = true;
                return;
            }
        }
    }
}
