<?php
declare(strict_types=1);

final class CollectionService
{
    public function __construct(private PDO $db, private BoosterGenerator $generator)
    {
    }

    public function snapshot(string $playerId): array
    {
        $this->ensureProgression($playerId);
        $progression = $this->progression($playerId);
        $statement = $this->db->prepare(
            'SELECT card_definition_id, quantity FROM player_collections WHERE player_id = ?'
        );
        $statement->execute([$playerId]);
        $owned = [];
        foreach ($statement->fetchAll() as $row) {
            $owned[(string)$row['card_definition_id']] = (int)$row['quantity'];
        }
        return [
            'cards' => $owned,
            'uniqueCards' => count($owned),
            'totalCards' => array_sum($owned),
            'boosterBalance' => (int)$progression['booster_balance'],
            'unlimitedBoosters' => (bool)$progression['test_mode'],
            'totalBoostersOpened' => (int)$progression['total_boosters_opened'],
        ];
    }

    public function openBooster(string $playerId): array
    {
        $this->db->beginTransaction();
        try {
            $this->ensureProgression($playerId);
            $lock = $this->db->prepare('SELECT * FROM player_progression WHERE player_id = ? FOR UPDATE');
            $lock->execute([$playerId]);
            $progression = $lock->fetch();
            if (!(bool)$progression['test_mode'] && (int)$progression['booster_balance'] < 1) {
                throw new ApiException('NO_BOOSTERS', 'Du hast aktuell keinen Booster.', 409);
            }

            $snapshot = $this->snapshot($playerId);
            $cards = $this->generator->generate($snapshot['cards']);
            $upsert = $this->db->prepare(
                'INSERT INTO player_collections (player_id, card_definition_id, quantity) VALUES (?, ?, 1)
                 ON DUPLICATE KEY UPDATE quantity = quantity + 1, updated_at = CURRENT_TIMESTAMP'
            );
            foreach ($cards as $card) $upsert->execute([$playerId, $card['definitionId']]);

            $update = $this->db->prepare(
                'UPDATE player_progression SET booster_balance = IF(test_mode = 1, booster_balance, booster_balance - 1),
                 total_boosters_opened = total_boosters_opened + 1, last_booster_at = CURRENT_TIMESTAMP WHERE player_id = ?'
            );
            $update->execute([$playerId]);
            $openingId = bin2hex(random_bytes(16));
            $record = $this->db->prepare('INSERT INTO booster_openings (id, player_id, cards_json) VALUES (?, ?, ?)');
            $record->execute([$openingId, $playerId, json_encode($cards, JSON_THROW_ON_ERROR)]);
            $this->db->commit();
            return ['openingId' => $openingId, 'cards' => $cards, 'collection' => $this->snapshot($playerId)];
        } catch (Throwable $error) {
            if ($this->db->inTransaction()) $this->db->rollBack();
            throw $error;
        }
    }

    private function ensureProgression(string $playerId): void
    {
        $statement = $this->db->prepare('INSERT IGNORE INTO player_progression (player_id) VALUES (?)');
        $statement->execute([$playerId]);
    }

    private function progression(string $playerId): array
    {
        $statement = $this->db->prepare('SELECT * FROM player_progression WHERE player_id = ?');
        $statement->execute([$playerId]);
        return $statement->fetch() ?: throw new RuntimeException('Player progression is unavailable.');
    }
}
