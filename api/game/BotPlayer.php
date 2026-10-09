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
        $profile = (string)($state['players'][$botId]['botProfile'] ?? 'junior');
        $guard = 50;
        while ($state['status'] === 'active' && $state['activePlayerId'] === $botId && --$guard > 0) {
            if ($this->tryLethalAttack($state, $botId)) {
                continue;
            }
            if ($profile === 'junior' && random_int(1, 100) <= 35 && $this->tryPlayCard($state, $botId, 'junior')) {
                continue;
            }
            if ($this->tryPlayCard($state, $botId, $profile)) {
                continue;
            }
            if ($this->tryAttack($state, $botId, $profile)) {
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

    private function tryPlayCard(array &$state, string $botId, string $profile = 'default'): bool
    {
        $hand = $state['players'][$botId]['hand'];
        usort($hand, fn(array $a, array $b): int => $this->cardPriority($state, $botId, $this->catalog->get($b['definitionId']), $profile) <=> $this->cardPriority($state, $botId, $this->catalog->get($a['definitionId']), $profile));
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

    private function tryAttack(array &$state, string $botId, string $profile = 'default'): bool
    {
        $opponentId = $this->opponentId($state, $botId);
        if ($profile === 'security') {
            return $this->trySecurityAttack($state, $botId, $opponentId);
        }
        if ($profile === 'chaos') {
            return $this->tryChaosAttack($state, $botId, $opponentId);
        }
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

    private function trySecurityAttack(array &$state, string $botId, string $opponentId): bool
    {
        $services = array_values(array_filter($state['players'][$botId]['services'], fn(array $service): bool => $this->canAttack($service)));
        $targets = $state['players'][$opponentId]['services'];
        usort($targets, static fn(array $a, array $b): int => $a['integrity'] <=> $b['integrity']);
        foreach ($services as $service) {
            foreach ($targets as $target) {
                if ($service['power'] >= $target['integrity'] && $service['integrity'] > $target['power']) {
                    $this->engine->applyAction($state, $botId, ['type' => 'ATTACK', 'attackerId' => $service['instanceId'], 'targetId' => $target['instanceId']]);
                    return true;
                }
            }
        }
        if (!$this->hasFirewall($state['players'][$opponentId])) {
            foreach ($services as $service) {
                $this->engine->applyAction($state, $botId, ['type' => 'ATTACK', 'attackerId' => $service['instanceId'], 'targetId' => 'core:' . $opponentId]);
                return true;
            }
        }
        return false;
    }

    private function tryChaosAttack(array &$state, string $botId, string $opponentId): bool
    {
        $services = array_values(array_filter($state['players'][$botId]['services'], fn(array $service): bool => $this->canAttack($service)));
        usort($services, static fn(array $a, array $b): int => $b['power'] <=> $a['power']);
        if ($services === []) return false;
        if (!$this->hasFirewall($state['players'][$opponentId])) {
            $this->engine->applyAction($state, $botId, ['type' => 'ATTACK', 'attackerId' => $services[0]['instanceId'], 'targetId' => 'core:' . $opponentId]);
            return true;
        }
        $targets = $state['players'][$opponentId]['services'];
        usort($targets, static fn(array $a, array $b): int => $b['power'] <=> $a['power']);
        if ($targets !== []) {
            $this->engine->applyAction($state, $botId, ['type' => 'ATTACK', 'attackerId' => $services[0]['instanceId'], 'targetId' => $targets[0]['instanceId']]);
            return true;
        }
        if ($state['players'][$opponentId]['infrastructure'] !== []) {
            $this->engine->applyAction($state, $botId, ['type' => 'ATTACK', 'attackerId' => $services[0]['instanceId'], 'targetId' => $state['players'][$opponentId]['infrastructure'][0]['instanceId']]);
            return true;
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

    private function cardPriority(array $state, string $botId, array $definition, string $profile): int
    {
        $keywords = (array)($definition['keywords'] ?? []);
        $effect = (string)($definition['effectId'] ?? '');
        $cost = (int)($definition['cost'] ?? 0);
        if ($profile === 'junior') return 40 - $cost;
        if ($profile === 'security') {
            $own = $state['players'][$botId];
            $damaged = $own['core'] < 30 || array_filter(array_merge($own['services'], $own['infrastructure']), static fn(array $entity): bool => $entity['integrity'] < $entity['maxIntegrity']);
            $priority = $cost;
            if (in_array('FIREWALL', $keywords, true) && !$this->hasFirewall($own)) $priority += 120;
            if (in_array('PATCH', $keywords, true) && $damaged) $priority += 100;
            if (in_array($effect, ['security_engineer_deploy', 'rotate_secrets'], true)) $priority += 80;
            if (in_array('SANDBOX', $keywords, true)) $priority += 55;
            if ($definition['type'] === 'infrastructure') $priority += 25;
            return $priority;
        }
        if ($profile === 'chaos') {
            $priority = $cost;
            if (in_array($effect, ['technical_debt', 'spaghetti_code', 'chaos_monkey_crash', 'friday_deploy', 'force_push'], true)) $priority += 120;
            if (in_array('CRASH', $keywords, true)) $priority += 75;
            if (in_array('SANDBOX', $keywords, true)) $priority += 45;
            $priority += (int)($definition['power'] ?? 0) * 3;
            return $priority;
        }
        return $cost;
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
