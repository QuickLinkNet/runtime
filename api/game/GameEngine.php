<?php
declare(strict_types=1);

require_once __DIR__ . '/GameEngineResolution.php';
require_once __DIR__ . '/GameEngineQueries.php';
require_once __DIR__ . '/GameEngineActions.php';
require_once __DIR__ . '/ProductionIncidentEffects.php';

final class GameEngine
{
    use GameEngineResolution;
    use GameEngineQueries;
    use GameEngineActions;
    use ProductionIncidentEffects;

    private int $resolutionBudget = 100;
    private int $sequence = 0;
    private const OPENING_HAND_SIZE = 5;

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
            'startedAt' => null,
            'finishedAt' => null,
            'resultsRecorded' => false,
            'matchRewards' => [],
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
            'matchStats' => $this->emptyMatchStats(),
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
            $this->drawCards($state, $playerId, self::OPENING_HAND_SIZE);
        }
        $this->event($state, 'MULLIGAN_STARTED');
    }

    public function applyAction(array &$state, string $playerId, array $action): void
    {
        $this->resolutionBudget = 100;
        $this->sequence = 0;
        foreach ($state['events'] as $event) {
            $this->sequence = max($this->sequence, (int)($event['sequence'] ?? 0));
        }
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
            'DECOMMISSION' => $this->decommission($state, $playerId, (string)($action['cardInstanceId'] ?? '')),
            'END_TURN' => $this->endTurn($state, $playerId),
            default => throw new ApiException('INVALID_ACTION', 'Unbekannte Spielaktion.'),
        };
        $this->resolveDeaths($state);
        $this->checkGameOver($state);
        $this->assertInvariants($state);
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
        $state['finishedAt'] = gmdate('c');
        foreach ($state['players'] as &$player) {
            $this->ensureMatchStats($player);
            $impact = $player['matchStats']['cardImpact'];
            arsort($impact, SORT_NUMERIC);
            $player['matchStats']['mvpDefinitionId'] = $impact !== [] ? (string)array_key_first($impact) : null;
        }
        unset($player);
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
            'infrastructureDecommissioned' => false,
        ];
    }

    private function emptyMatchStats(): array
    {
        return [
            'cardsPlayed' => 0,
            'servicesDeployed' => 0,
            'infrastructureDeployed' => 0,
            'commandsPlayed' => 0,
            'attacks' => 0,
            'coreDamageDealt' => 0,
            'bugsCreated' => 0,
            'replicasCreated' => 0,
            'servicesCrashed' => 0,
            'cardImpact' => [],
            'mvpDefinitionId' => null,
        ];
    }

    private function ensureMatchStats(array &$player): void
    {
        $defaults = $this->emptyMatchStats();
        $player['matchStats'] = array_merge($defaults, (array)($player['matchStats'] ?? []));
        $player['matchStats']['cardImpact'] = (array)($player['matchStats']['cardImpact'] ?? []);
    }

    private function recordCardImpact(array &$player, string $definitionId, int $impact): void
    {
        $this->ensureMatchStats($player);
        $player['matchStats']['cardImpact'][$definitionId] = (int)($player['matchStats']['cardImpact'][$definitionId] ?? 0) + $impact;
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
