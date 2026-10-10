<?php
declare(strict_types=1);

final class MasteryService
{
    public function __construct(private PDO $db) {}

    public function recordMatch(string $playerId, array $domains, bool $won, int $servicesDeployed): array
    {
        $xpGain = 20 + ($won ? 15 : 0) + min(10, $servicesDeployed);
        $update = $this->db->prepare('INSERT INTO player_faction_mastery (player_id, faction, xp, level, matches_played, wins) VALUES (?, ?, ?, 1, 1, ?) ON DUPLICATE KEY UPDATE xp = xp + VALUES(xp), matches_played = matches_played + 1, wins = wins + VALUES(wins)');
        foreach ($domains as $domain) if (!in_array($domain, ['neutral', 'token'], true)) $update->execute([$playerId, $domain, $xpGain, $won ? 1 : 0]);
        $this->refreshLevels($playerId);
        return ['xpGain' => $xpGain, 'items' => $this->snapshot($playerId)];
    }

    public function snapshot(string $playerId): array
    {
        $stmt = $this->db->prepare('SELECT faction, xp, level, matches_played, wins FROM player_faction_mastery WHERE player_id = ? ORDER BY xp DESC');
        $stmt->execute([$playerId]);
        return array_map(static function (array $row): array {
            $level = (int)$row['level'];
            return ['faction' => (string)$row['faction'], 'xp' => (int)$row['xp'], 'level' => $level, 'matchesPlayed' => (int)$row['matches_played'], 'wins' => (int)$row['wins'], 'nextLevelXp' => $level * $level * 50];
        }, $stmt->fetchAll());
    }

    private function refreshLevels(string $playerId): void
    {
        $this->db->prepare('UPDATE player_faction_mastery SET level = GREATEST(1, FLOOR(SQRT(xp / 50)) + 1) WHERE player_id = ?')->execute([$playerId]);
    }
}
