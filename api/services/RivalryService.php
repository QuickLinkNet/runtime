<?php
declare(strict_types=1);

final class RivalryService
{
    public function __construct(private PDO $db) {}

    public function record(string $playerId, string $opponentId, bool $won): void
    {
        $this->db->prepare('INSERT INTO player_rivalries (player_id, opponent_player_id, matches_played, wins, losses) VALUES (?, ?, 1, ?, ?) ON DUPLICATE KEY UPDATE matches_played = matches_played + 1, wins = wins + VALUES(wins), losses = losses + VALUES(losses), last_played_at = CURRENT_TIMESTAMP')->execute([$playerId, $opponentId, $won ? 1 : 0, $won ? 0 : 1]);
    }

    public function snapshot(string $playerId): array
    {
        $stmt = $this->db->prepare('SELECT p.name, r.matches_played, r.wins, r.losses, r.last_played_at FROM player_rivalries r INNER JOIN players p ON p.id = r.opponent_player_id WHERE r.player_id = ? ORDER BY r.last_played_at DESC LIMIT 5');
        $stmt->execute([$playerId]);
        return array_map(static fn(array $row): array => ['name' => (string)$row['name'], 'matchesPlayed' => (int)$row['matches_played'], 'wins' => (int)$row['wins'], 'losses' => (int)$row['losses'], 'lastPlayedAt' => (string)$row['last_played_at']], $stmt->fetchAll());
    }
}
