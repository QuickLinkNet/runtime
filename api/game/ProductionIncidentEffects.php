<?php
declare(strict_types=1);

trait ProductionIncidentEffects
{
    private function resolveProductionIncidentEffect(
        array &$state,
        string $playerId,
        string $effect,
        ?string $sourceId,
        ?string $targetId
    ): void {
        $opponentId = $this->opponentId($state, $playerId);
        $player =& $state['players'][$playerId];
        $opponent =& $state['players'][$opponentId];

        match ($effect) {
            'microfrontend_deploy' => $this->countDomainServices($player, 'frontend', $sourceId) > 0
                ? $this->drawCards($state, $playerId, 1) : null,
            'feature_flag' => $this->buffEntity($state, $targetId, 2, 0, true),
            'design_system_deploy' => $this->enhanceChildComponents($state, $playerId),
            'graphql_gateway_deploy' => $this->drawFirstType($state, $playerId, 'command'),
            'retry_storm' => $this->returnServiceToHand($state, $targetId) + $this->drawCards($state, $playerId, 1),
            'chaos_monkey_crash' => $state['activePlayerId'] === $playerId
                ? $this->drawCards($state, $playerId, 1)
                : null,
            'terraform_apply' => $this->reinforceInfrastructure($state, $targetId, 3),
            'service_mesh_deploy' => $this->grantAllServicesRedundancy($state, $playerId),
            'data_scientist_deploy' => $this->resolveDataScientist($state, $playerId),
            'schema_migration' => $this->drawFirstType($state, $playerId, 'infrastructure', true),
            'penetration_tester_deploy', 'model_drift' => $this->sandboxTarget($state, $targetId, $playerId),
            'rotate_secrets' => $this->grantRedundancy($state, $targetId),
            'siem_deploy' => $this->drawCards($state, $playerId, $this->hasSandboxedService($opponent) ? 3 : 2),
            'prompt_engineer_deploy' => $this->generateRandomCard($state, $playerId, true, true),
            'rag_pipeline_deploy' => $this->drawFirstDomain($state, $playerId, 'data'),
            'werkstudent_crash' => $this->spawnToken($state, $playerId, 'token-bug')
                + $this->drawCards($state, $playerId, 1),
            'product_owner_deploy' => $this->drawFirstCheapCommand($state, $playerId, 2),
            'scrum_master_deploy' => $player['turnFlags']['nextServiceDiscount'] = 1,
            'maintenance_window' => $this->patchOwnBoard($state, $playerId, 2),
            'technical_debt' => $this->spawnBugs($state, $opponentId, 3),
            default => null,
        };
    }

    private function drawFirstType(array &$state, string $playerId, string $type, bool $discountUntilPlayed = false): int
    {
        $player =& $state['players'][$playerId];
        foreach ($player['deck'] as $index => $card) {
            if ($this->catalog->get($card['definitionId'])['type'] !== $type) {
                continue;
            }
            array_splice($player['deck'], $index, 1);
            if (count($player['hand']) >= 10) {
                $player['trash'][] = $card;
                $this->event($state, 'CARD_OVERFLOW', ['playerId' => $playerId, 'definitionId' => $card['definitionId']]);
            } else {
                if ($discountUntilPlayed) {
                    $card['costModifier'] = -1;
                    $card['costModifierUntilPlayed'] = true;
                }
                $player['hand'][] = $card;
                $this->recordHandAcquisition($player, $card['definitionId']);
                $this->event($state, 'CARD_DRAWN', ['playerId' => $playerId, 'cardInstanceId' => $card['instanceId']]);
            }
            return 1;
        }
        return 0;
    }

    private function resolveDataScientist(array &$state, string $playerId): int
    {
        $player =& $state['players'][$playerId];
        $top = array_splice($player['deck'], max(0, count($player['deck']) - 4));
        usort($top, fn(array $left, array $right): int =>
            $this->catalog->get($right['definitionId'])['cost'] <=> $this->catalog->get($left['definitionId'])['cost']
        );

        $selectedIndex = null;
        foreach ($top as $index => $card) {
            if ($this->catalog->get($card['definitionId'])['domain'] === 'data') {
                $selectedIndex = $index;
                break;
            }
        }
        if ($selectedIndex === null) {
            foreach ($top as $index => $card) {
                if ($this->catalog->get($card['definitionId'])['type'] === 'command') {
                    $selectedIndex = $index;
                    break;
                }
            }
        }

        if ($selectedIndex !== null && count($player['hand']) < 10) {
            $card = $top[$selectedIndex];
            unset($top[$selectedIndex]);
            $player['hand'][] = $card;
            $this->recordHandAcquisition($player, $card['definitionId']);
            $this->event($state, 'CARD_DRAWN', ['playerId' => $playerId, 'cardInstanceId' => $card['instanceId']]);
            $player['deck'] = array_merge(array_values($top), $player['deck']);
            return 1;
        }

        $player['deck'] = array_merge(array_values($top), $player['deck']);
        return 0;
    }

    private function drawFirstCheapCommand(array &$state, string $playerId, int $maximumCost): int
    {
        $player =& $state['players'][$playerId];
        for ($index = count($player['deck']) - 1; $index >= 0; $index--) {
            $card = $player['deck'][$index];
            $definition = $this->catalog->get($card['definitionId']);
            if ($definition['type'] !== 'command' || (int)$definition['cost'] > $maximumCost) {
                continue;
            }
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
        return 0;
    }

    private function grantFirstDomainRedundancy(array &$state, string $playerId, string $domain): int
    {
        foreach ($state['players'][$playerId]['services'] as $service) {
            if ($this->catalog->get($service['definitionId'])['domain'] === $domain) {
                return $this->grantRedundancy($state, $service['instanceId']);
            }
        }
        return 0;
    }

    private function grantAllServicesRedundancy(array &$state, string $playerId): int
    {
        $count = 0;
        foreach ($state['players'][$playerId]['services'] as $service) {
            $count += $this->grantRedundancy($state, $service['instanceId']);
        }
        return $count;
    }

    private function reinforceInfrastructure(array &$state, ?string $targetId, int $amount): int
    {
        if ($targetId === null) {
            return 0;
        }
        $target = $this->locateTarget($state, $targetId);
        if ($target === null || $target['zone'] !== 'infrastructure') {
            return 0;
        }
        $entity =& $state['players'][$target['ownerId']]['infrastructure'][$target['index']];
        $entity['maxIntegrity'] += $amount;
        $entity['integrity'] += $amount;
        $this->event($state, 'PATCH_APPLIED', ['targetId' => $targetId, 'amount' => $amount]);
        return 1;
    }

    private function patchOwnBoard(array &$state, string $playerId, int $amount): int
    {
        $count = 0;
        foreach (['services', 'infrastructure'] as $zone) {
            foreach ($state['players'][$playerId][$zone] as $entity) {
                $count += $this->patchTarget($state, $entity['instanceId'], $amount) > 0 ? 1 : 0;
            }
        }
        return $count;
    }

    private function spawnBugs(array &$state, string $playerId, int $amount): int
    {
        $count = 0;
        for ($index = 0; $index < $amount; $index++) {
            $count += $this->spawnToken($state, $playerId, 'token-bug');
        }
        return $count;
    }
}
