<?php
declare(strict_types=1);

final class TelemetryService
{
    public function __construct(private PDO $db)
    {
    }

    public function recordAction(int $matchId, string $playerId, string $actionType, int $expectedVersion, int $resolvedVersion, int $durationMs, bool $accepted, ?string $errorCode = null): void
    {
        $stmt = $this->db->prepare(
            'INSERT INTO match_action_telemetry
                (match_id, player_id, action_type, expected_version, resolved_version, duration_ms, accepted, error_code)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([$matchId, $playerId, $actionType, $expectedVersion, $resolvedVersion, $durationMs, $accepted ? 1 : 0, $errorCode]);
    }

    public function recordSummary(int $matchId, array $state): void
    {
        if (($state['status'] ?? null) !== 'finished') return;
        $duration = 0;
        if (!empty($state['startedAt']) && !empty($state['finishedAt'])) {
            $duration = max(0, strtotime((string)$state['finishedAt']) - strtotime((string)$state['startedAt']));
        }
        $metrics = ['_context' => ['startingPlayerId' => $state['startingPlayerId'] ?? null, 'mode' => $state['mode'] ?? null, 'incidentId' => $state['incident']['id'] ?? null]];
        foreach ($state['players'] as $playerId => $player) {
            if ($player['isBot'] ?? false) continue;
            $metrics[$playerId] = [
                'core' => max(0, (int)$player['core']),
                'domains' => array_values((array)($player['domains'] ?? [])),
                'initialDeckDefinitionIds' => array_values((array)($player['initialDeckDefinitionIds'] ?? [])),
                'initialDeckFingerprint' => hash('sha256', implode('|', array_values((array)($player['initialDeckDefinitionIds'] ?? [])))),
                'stats' => $player['matchStats'] ?? [],
            ];
        }
        $stmt = $this->db->prepare(
            'INSERT IGNORE INTO match_summaries
                (match_id, winner_player_id, finish_reason, turns, duration_seconds, metrics_json)
             VALUES (?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $matchId,
            $state['winnerId'] ?? null,
            $state['finishReason'] ?? null,
            (int)($state['turn'] ?? 0),
            $duration,
            json_encode($metrics, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        ]);
    }
}
