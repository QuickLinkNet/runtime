<?php
declare(strict_types=1);

final class MatchRepository
{
    public function __construct(private PDO $db)
    {
    }

    public function create(string $roomCode, string $mode, string $ownerId, array $state): int
    {
        $stmt = $this->db->prepare(
            'INSERT INTO matches (room_code, mode, status, owner_player_id, state_json, version) VALUES (?, ?, ?, ?, ?, 1)'
        );
        $stmt->execute([$roomCode, $mode, $state['status'], $ownerId, $this->encode($state)]);
        return (int)$this->db->lastInsertId();
    }

    public function addPlayer(int $matchId, string $playerId, int $seat): void
    {
        $stmt = $this->db->prepare('INSERT INTO match_players (match_id, player_id, seat) VALUES (?, ?, ?)');
        $stmt->execute([$matchId, $playerId, $seat]);
    }

    public function findByCode(string $roomCode, bool $forUpdate = false): ?array
    {
        $sql = 'SELECT * FROM matches WHERE room_code = ?' . ($forUpdate ? ' FOR UPDATE' : '');
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$roomCode]);
        $row = $stmt->fetch();
        if (!$row) {
            return null;
        }
        $row['state'] = json_decode($row['state_json'], true, 512, JSON_THROW_ON_ERROR);
        return $row;
    }

    public function save(int $matchId, array $state, int $version): void
    {
        $finished = $state['status'] === 'finished' ? gmdate('Y-m-d H:i:s') : null;
        $stmt = $this->db->prepare(
            'UPDATE matches SET status = ?, state_json = ?, version = ?, finished_at = COALESCE(finished_at, ?) WHERE id = ?'
        );
        $stmt->execute([$state['status'], $this->encode($state), $version, $finished, $matchId]);
    }

    public function activeForPlayer(string $playerId): ?array
    {
        $stmt = $this->db->prepare(
            "SELECT m.* FROM matches m JOIN match_players mp ON mp.match_id=m.id
             WHERE mp.player_id=? AND m.status IN ('lobby','mulligan','active')
             ORDER BY m.updated_at DESC LIMIT 1"
        );
        $stmt->execute([$playerId]);
        $row = $stmt->fetch();
        if (!$row) {
            return null;
        }
        $row['state'] = json_decode($row['state_json'], true, 512, JSON_THROW_ON_ERROR);
        return $row;
    }

    private function encode(array $state): string
    {
        return json_encode($state, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
}
