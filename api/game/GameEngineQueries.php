<?php
declare(strict_types=1);

trait GameEngineQueries
{
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

    private function countInfrastructure(array $player, string $definitionId): int
    {
        $count = 0;
        foreach ($player['infrastructure'] as $entity) {
            if ($entity['definitionId'] === $definitionId) {
                $count++;
            }
        }
        return $count;
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
}
