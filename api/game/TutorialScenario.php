<?php
declare(strict_types=1);

final class TutorialScenario
{
    private const STEPS = [
        'deploy-service',
        'deploy-infrastructure',
        'attack-core',
        'debug-bug',
        'patch-service',
        'crash-service',
        'replace-infrastructure',
        'final-deploy',
    ];

    public function __construct(private CardCatalog $catalog)
    {
    }

    public function initialize(array &$state, string $playerId, string $coachId): void
    {
        $state['mode'] = 'tutorial';
        $state['status'] = 'active';
        $state['startingPlayerId'] = $playerId;
        $state['activePlayerId'] = $playerId;
        $state['turnStartedAt'] = gmdate('c');
        $state['turnDeadlineAt'] = null;
        $state['winnerId'] = null;
        $state['finishReason'] = null;
        $state['events'] = [];
        $state['tutorial'] = [
            'step' => 0,
            'totalSteps' => count(self::STEPS),
            'key' => self::STEPS[0],
            'objectiveComplete' => false,
            'completed' => false,
            'rewardGranted' => false,
        ];
        $this->configureStep($state, $playerId, $coachId, 0);
    }

    public function assertActionAllowed(array $state, string $playerId, array $action): void
    {
        $tutorial = $state['tutorial'] ?? null;
        if (!is_array($tutorial) || ($tutorial['completed'] ?? false)) {
            throw new ApiException('TUTORIAL_COMPLETE', 'Dieses Tutorial ist bereits abgeschlossen.', 409);
        }
        if (($tutorial['objectiveComplete'] ?? false)) {
            throw new ApiException('TUTORIAL_CONTINUE_REQUIRED', 'Lektion abgeschlossen. Fahre mit dem Tutorial fort.', 409);
        }

        $type = strtoupper((string)($action['type'] ?? ''));
        $key = (string)$tutorial['key'];
        $player = $state['players'][$playerId];
        $coachId = $this->opponentId($state, $playerId);

        $valid = match ($key) {
            'deploy-service' => $type === 'PLAY_CARD'
                && $this->handDefinition($player, (string)($action['cardInstanceId'] ?? '')) === 'frontend-react-component',
            'deploy-infrastructure' => $type === 'PLAY_CARD'
                && $this->handDefinition($player, (string)($action['cardInstanceId'] ?? '')) === 'frontend-state-store',
            'attack-core' => $type === 'ATTACK'
                && (string)($action['targetId'] ?? '') === 'core:' . $coachId,
            'debug-bug' => $type === 'DEBUG'
                && $this->boardDefinition($player, (string)($action['targetId'] ?? '')) === 'token-bug',
            'patch-service' => $type === 'PLAY_CARD'
                && $this->handDefinition($player, (string)($action['cardInstanceId'] ?? '')) === 'security-emergency-patch'
                && $this->boardDefinition($player, (string)($action['targetId'] ?? '')) === 'infrastructure-docker-container',
            'crash-service' => $type === 'ATTACK'
                && $this->boardDefinition($player, (string)($action['attackerId'] ?? '')) === 'infrastructure-chaos-monkey'
                && $this->boardDefinition($state['players'][$coachId], (string)($action['targetId'] ?? '')) === 'neutral-junior-developer',
            'replace-infrastructure' => $type === 'PLAY_CARD'
                && $this->handDefinition($player, (string)($action['cardInstanceId'] ?? '')) === 'neutral-ci-pipeline'
                && $this->infrastructureContains($player, (string)($action['targetId'] ?? '')),
            'final-deploy' => $type === 'ATTACK'
                && (string)($action['targetId'] ?? '') === 'core:' . $coachId,
            default => false,
        };

        if (!$valid) {
            throw new ApiException('TUTORIAL_ACTION_REQUIRED', 'Folge dem aktuellen Tutorial-Ziel.', 409);
        }
    }

    public function afterAction(array &$state, string $playerId): void
    {
        if (($state['tutorial']['key'] ?? '') === 'final-deploy') {
            if ($state['status'] === 'finished' && $state['winnerId'] === $playerId) {
                $state['tutorial']['objectiveComplete'] = true;
                $state['tutorial']['completed'] = true;
            }
            return;
        }
        $state['tutorial']['objectiveComplete'] = true;
    }

    public function continue(array &$state, string $playerId): void
    {
        $tutorial = $state['tutorial'] ?? null;
        if (!is_array($tutorial) || !($tutorial['objectiveComplete'] ?? false) || ($tutorial['completed'] ?? false)) {
            throw new ApiException('TUTORIAL_NOT_READY', 'Schließe zuerst das aktuelle Ziel ab.', 409);
        }
        $next = (int)$tutorial['step'] + 1;
        if (!isset(self::STEPS[$next])) {
            throw new ApiException('TUTORIAL_COMPLETE', 'Das Tutorial ist bereits abgeschlossen.', 409);
        }
        $coachId = $this->opponentId($state, $playerId);
        $state['tutorial']['step'] = $next;
        $state['tutorial']['key'] = self::STEPS[$next];
        $state['tutorial']['objectiveComplete'] = false;
        $this->configureStep($state, $playerId, $coachId, $next);
    }

    private function configureStep(array &$state, string $playerId, string $coachId, int $step): void
    {
        $player =& $state['players'][$playerId];
        $coach =& $state['players'][$coachId];
        $this->resetPlayer($player);
        $this->resetPlayer($coach);
        $state['status'] = 'active';
        $state['activePlayerId'] = $playerId;
        $state['winnerId'] = null;
        $state['finishReason'] = null;
        $state['turn'] = $step + 1;
        $state['turnStartedAt'] = gmdate('c');

        match (self::STEPS[$step]) {
            'deploy-service' => $this->setupDeployService($player),
            'deploy-infrastructure' => $this->setupInfrastructure($player),
            'attack-core' => $this->setupCoreAttack($player, $coach),
            'debug-bug' => $this->setupDebug($player),
            'patch-service' => $this->setupPatch($player),
            'crash-service' => $this->setupCrash($player, $coach),
            'replace-infrastructure' => $this->setupReplacement($player),
            'final-deploy' => $this->setupFinal($player, $coach),
        };
        $this->tutorialEvent($state, 'TUTORIAL_STEP_STARTED', ['step' => $step, 'tutorialKey' => self::STEPS[$step]]);
    }

    private function resetPlayer(array &$player): void
    {
        $player['core'] = 30;
        $player['deck'] = [];
        $player['hand'] = [];
        $player['services'] = [];
        $player['infrastructure'] = [];
        $player['trash'] = [];
        $player['maxCompute'] = 0;
        $player['compute'] = 0;
        $player['temporaryCompute'] = 0;
        $player['storedCompute'] = 0;
        $player['fatigue'] = 0;
        $player['mulliganDone'] = true;
        $player['consecutiveTimeouts'] = 0;
        $player['turnsTaken'] = 1;
        $player['turnFlags'] = [
            'frontendPlayed' => 0,
            'servicePlayed' => 0,
            'commandPlayed' => 0,
            'targetedCommandPlayed' => 0,
            'serviceCrashed' => false,
            'projectManagerDiscount' => false,
        ];
    }

    private function setupDeployService(array &$player): void
    {
        $this->compute($player, 3);
        $player['hand'][] = $this->card('frontend-react-component');
    }

    private function setupInfrastructure(array &$player): void
    {
        $this->compute($player, 3);
        $player['services'][] = $this->entity('frontend-react-component', false);
        $player['hand'][] = $this->card('frontend-state-store');
    }

    private function setupCoreAttack(array &$player, array &$coach): void
    {
        $player['services'][] = $this->entity('frontend-react-component');
        $coach['core'] = 6;
    }

    private function setupDebug(array &$player): void
    {
        $this->compute($player, 1);
        $player['services'][] = $this->entity('infrastructure-docker-container');
        $player['services'][] = $this->entity('token-bug');
    }

    private function setupPatch(array &$player): void
    {
        $this->compute($player, 2);
        $damaged = $this->entity('infrastructure-docker-container');
        $damaged['integrity'] = 1;
        $player['services'][] = $damaged;
        $player['hand'][] = $this->card('security-emergency-patch');
    }

    private function setupCrash(array &$player, array &$coach): void
    {
        $player['services'][] = $this->entity('infrastructure-chaos-monkey');
        $coach['services'][] = $this->entity('neutral-junior-developer');
    }

    private function setupReplacement(array &$player): void
    {
        $this->compute($player, 3);
        $player['infrastructure'][] = $this->entity('frontend-state-store');
        $player['infrastructure'][] = $this->entity('backend-message-queue');
        $player['hand'][] = $this->card('neutral-ci-pipeline');
    }

    private function setupFinal(array &$player, array &$coach): void
    {
        $player['services'][] = $this->entity('frontend-web-worker');
        $player['services'][] = $this->entity('frontend-react-component');
        $player['services'][] = $this->entity('infrastructure-docker-container');
        $coach['core'] = 7;
    }

    private function compute(array &$player, int $amount): void
    {
        $player['maxCompute'] = $amount;
        $player['compute'] = $amount;
    }

    private function card(string $definitionId): array
    {
        return ['instanceId' => $this->id(), 'definitionId' => $definitionId];
    }

    private function entity(string $definitionId, bool $ready = true): array
    {
        $definition = $this->catalog->get($definitionId);
        return [
            'instanceId' => $this->id(),
            'definitionId' => $definitionId,
            'power' => (int)($definition['power'] ?? 0),
            'integrity' => (int)$definition['integrity'],
            'maxIntegrity' => (int)$definition['integrity'],
            'redundancy' => false,
            'sandboxed' => false,
            'sandboxUntilTurn' => 0,
            'exhausted' => !$ready,
            'temporaryPower' => 0,
        ];
    }

    private function handDefinition(array $player, string $instanceId): ?string
    {
        foreach ($player['hand'] as $card) {
            if ($card['instanceId'] === $instanceId) return $card['definitionId'];
        }
        return null;
    }

    private function boardDefinition(array $player, string $instanceId): ?string
    {
        foreach (['services', 'infrastructure'] as $zone) {
            foreach ($player[$zone] as $entity) {
                if ($entity['instanceId'] === $instanceId) return $entity['definitionId'];
            }
        }
        return null;
    }

    private function infrastructureContains(array $player, string $instanceId): bool
    {
        foreach ($player['infrastructure'] as $entity) {
            if ($entity['instanceId'] === $instanceId) return true;
        }
        return false;
    }

    private function opponentId(array $state, string $playerId): string
    {
        return $state['order'][0] === $playerId ? $state['order'][1] : $state['order'][0];
    }

    private function tutorialEvent(array &$state, string $type, array $data): void
    {
        $sequence = 0;
        foreach ($state['events'] as $event) $sequence = max($sequence, (int)($event['sequence'] ?? 0));
        $state['events'][] = array_merge(['id' => $this->id(), 'type' => $type, 'sequence' => $sequence + 1], $data);
    }

    private function id(): string
    {
        return bin2hex(random_bytes(8));
    }
}
