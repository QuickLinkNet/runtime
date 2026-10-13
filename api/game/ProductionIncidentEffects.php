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
            'design_system_deploy' => $this->buffDomainServices($state, $playerId, 'frontend', 0, 1),
            'graphql_gateway_deploy' => $this->drawFirstType($state, $playerId, 'command'),
            'retry_storm' => $this->returnServiceToHand($state, $targetId) + $this->drawCards($state, $playerId, 1),
            'chaos_monkey_crash' => $this->drawCards($state, $playerId, 1),
            'terraform_apply' => $this->reinforceInfrastructure($state, $targetId, 3),
            'service_mesh_deploy' => $this->grantAllServicesRedundancy($state, $playerId),
            'data_scientist_deploy' => count($player['hand']) <= 4 ? $this->drawCards($state, $playerId, 1) : null,
            'schema_migration' => $this->drawFirstType($state, $playerId, 'infrastructure'),
            'penetration_tester_deploy', 'model_drift' => $this->sandboxTarget($state, $targetId, $playerId),
            'rotate_secrets' => $this->grantRedundancy($state, $targetId),
            'siem_deploy' => $this->drawCards($state, $playerId, $this->hasBug($opponent) ? 2 : 1),
            'prompt_engineer_deploy' => $this->generateRandomCard($state, $playerId, true, false),
            'rag_pipeline_deploy' => $this->drawFirstDomain($state, $playerId, 'data'),
            'werkstudent_deploy' => $this->spawnToken($state, $playerId, 'token-bug'),
            'product_owner_deploy' => count($player['hand']) <= 3 ? $this->drawCards($state, $playerId, 1) : null,
            'scrum_master_deploy' => $player['turnFlags']['projectManagerDiscount'] = true,
            'maintenance_window' => $this->patchOwnBoard($state, $playerId, 2),
            'technical_debt' => $this->spawnBugs($state, $opponentId, 3),
            default => null,
        };
    }

    private function drawFirstType(array &$state, string $playerId, string $type): int
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
                $player['hand'][] = $card;
                $this->recordHandAcquisition($player, $card['definitionId']);
                $this->event($state, 'CARD_DRAWN', ['playerId' => $playerId, 'cardInstanceId' => $card['instanceId']]);
            }
            return 1;
        }
        return 0;
    }

    private function buffDomainServices(array &$state, string $playerId, string $domain, int $power, int $integrity): int
    {
        $count = 0;
        foreach ($state['players'][$playerId]['services'] as $service) {
            if ($this->catalog->get($service['definitionId'])['domain'] === $domain) {
                $count += $this->buffEntity($state, $service['instanceId'], $power, $integrity);
            }
        }
        return $count;
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
