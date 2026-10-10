<?php
declare(strict_types=1);

final class FeedbackService
{
    public function __construct(private PDO $db) {}

    public function submit(string $playerId, string $roomCode, string $rating): void
    {
        if (!in_array($rating, ['easy', 'fair', 'hard'], true)) {
            throw new ApiException('INVALID_FEEDBACK', 'Wähle: zu leicht, fair oder zu hart.', 422);
        }
        $match = $this->db->prepare('SELECT mp.player_id FROM matches m INNER JOIN match_players mp ON mp.match_id = m.id WHERE m.room_code = ? AND m.status = \'finished\' AND mp.player_id = ?');
        $match->execute([$roomCode, $playerId]);
        if (!$match->fetch()) throw new ApiException('MATCH_NOT_FINISHED', 'Feedback ist erst nach deinem Match möglich.', 409);
        $statement = $this->db->prepare('INSERT INTO match_feedback (player_id, room_code, rating) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE rating = VALUES(rating), updated_at = CURRENT_TIMESTAMP');
        $statement->execute([$playerId, $roomCode, $rating]);
    }
}
