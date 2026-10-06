<?php
declare(strict_types=1);

final class BotPlayer
{
    public function __construct(
        private GameEngine $engine,
        private CardCatalog $catalog
    ) {
    }

    public function playTurn(array &$state, string $botId): void
    {
        $guard = 50;
        while ($state['status'] === 'active' && $state['activePlayerId'] === $botId && --$guard > 0) {
            if ($this->tryLethalAttack($state, $botId)) {
                continue;
            }
            if ($this->tryPlayCard($state, $botId)) {
                continue;
            }
            if ($this->tryAttack($state, $botId)) {
                continue;
            }
            if ($this->tryDebug($state, $botId)) {
                continue;
            }
            $this->engine->applyAction($state, $botId, ['type' => 'END_TURN']);
        }
        if ($guard <= 0 && $state['status'] === 'active' && $state['activePlayerId'] === $botId) {
            $this->engine->applyAction($state, $botId, ['type' => 'END_TURN']);
        }
    }

    private function tryLethalAttack(array &$state, string $botId): bool
    {
        $opponentId = $this->opponentId($state, $botId);
        $available = array_values(array_filter($state['players'][$botId]['services'], fn(array $s): bool => $this->canAttack($s)));
        $damage = array_sum(array_column($available, 'power'));
        if ($damage < $state['players'][$opponentId]['core'] || $this->hasFirewall($state['players'][$opponentId])) {
            return false;
        }
        $service = $available[0];
        $this->engine->applyAction($state, $botId, [
            'type' => 'ATTACK',
            'attackerId' => $service['instanceId'],
            'targetId' => 'core:' . $opponentId,
        ]);
        return true;
    }

    private function tryPlayCard(array &$state, string $botId): bool
    {
        $hand = $state['players'][$botId]['hand'];
        usort($hand, fn(array $a, array $b): int => $this->catalog->get($b['definitionId'])['cost'] <=> $this->catalog->get($a['definitionId'])['cost']);
        foreach ($hand as $card) {
            $definition = $this->catalog->get($card['definitionId']);
            $targetId = $this->targetFor($state, $botId, $definition);
            if ($targetId === false) {
                continue;
            }
            try {
                $action = ['type' => 'PLAY_CARD', 'cardInstanceId' => $card['instanceId']];
                if (is_string($targetId)) {
                    $action['targetId'] = $targetId;
                }
                $this->engine->applyAction($state, $botId, $action);
                return true;
            } catch (ApiException) {
                continue;
            }
        }
        return false;
    }

    private function tryAttack(array &$state, string $botId): bool
    {
        $opponentId = $this->opponentId($state, $botId);
        foreach ($state['players'][$botId]['services'] as $service) {
            if (!$this->canAttack($service)) {
                continue;
            }
            $targetId = null;
            $enemyServices = $state['players'][$opponentId]['services'];
            if ($enemyServices !== []) {
                usort($enemyServices, static fn(array $a, array $b): int => $a['integrity'] <=> $b['integrity']);
                $targetId = $enemyServices[0]['instanceId'];
            } elseif ($state['players'][$opponentId]['infrastructure'] !== []) {
                $targetId = $state['players'][$opponentId]['infrastructure'][0]['instanceId'];
            } elseif (!$this->hasFirewall($state['players'][$opponentId])) {
                $targetId = 'core:' . $opponentId;
            }
            if ($targetId !== null) {
                $this->engine->applyAction($state, $botId, ['type' => 'ATTACK', 'attackerId' => $service['instanceId'], 'targetId' => $targetId]);
                return true;
            }
        }
        return false;
    }

    private function tryDebug(array &$state, string $botId): bool
    {
        if ($state['players'][$botId]['compute'] + $state['players'][$botId]['temporaryCompute'] < 1) {
            return false;
        }
        foreach ($state['players'][$botId]['services'] as $service) {
            if ($service['definitionId'] === 'token-bug') {
                $this->engine->applyAction($state, $botId, ['type' => 'DEBUG', 'targetId' => $service['instanceId']]);
                return true;
            }
        }
        return false;
    }

    private function targetFor(array $state, string $botId, array $definition): string|false|null
    {
        $own = $state['players'][$botId];
        $opponent = $state['players'][$this->opponentId($state, $botId)];
        if ($definition['type'] === 'infrastructure' && count($own['infrastructure']) >= 2) {
            return $own['infrastructure'][0]['instanceId'];
        }
        return match ($definition['effectId'] ?? '') {
            'infinite_rerender', 'force_push' => ($opponent['services'][0]['instanceId'] ?? $own['services'][0]['instanceId'] ?? false),
            'hotfix', 'coffee' => ($own['services'][0]['instanceId'] ?? false),
            'web_worker_deploy', 'security_engineer_deploy' => ($own['services'][0]['instanceId'] ?? null),
            'horizontal_scaling' => $this->cheapServiceTarget($own),
            'emergency_patch' => $own['services'][0]['instanceId'] ?? $own['infrastructure'][0]['instanceId'] ?? 'core:' . $botId,
            'sandbox_container_deploy' => $opponent['services'][0]['instanceId'] ?? null,
            'feature_flag', 'retry_storm', 'rotate_secrets' => $own['services'][0]['instanceId'] ?? false,
            'terraform_apply' => $own['infrastructure'][0]['instanceId'] ?? false,
            'penetration_tester_deploy' => $opponent['services'][0]['instanceId'] ?? null,
            'model_drift' => $opponent['services'][0]['instanceId'] ?? false,
            default => null,
        };
    }

    private function cheapServiceTarget(array $player): string|false
    {
        foreach ($player['services'] as $service) {
            if ($this->catalog->get($service['definitionId'])['cost'] <= 3) {
                return $service['instanceId'];
            }
        }
        return false;
    }

    private function canAttack(array $service): bool
    {
        $definition = $this->catalog->get($service['definitionId']);
        return !$service['exhausted'] && !$service['sandboxed'] && !($definition['cannotAttack'] ?? false);
    }

    private function hasFirewall(array $player): bool
    {
        foreach ($player['services'] as $service) {
            if (!$service['sandboxed'] && in_array('FIREWALL', $this->catalog->get($service['definitionId'])['keywords'] ?? [], true)) {
                return true;
            }
        }
        return false;
    }

    private function opponentId(array $state, string $playerId): string
    {
        return $state['order'][0] === $playerId ? $state['order'][1] : $state['order'][0];
    }
}
