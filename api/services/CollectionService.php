<?php
declare(strict_types=1);

final class CollectionService
{
    public const BOOSTER_PRICE = 100;
    private const SALVAGE_VALUES = ['common' => 5, 'uncommon' => 10, 'rare' => 30, 'legendary' => 100];
    private const CRAFT_COSTS = ['common' => 40, 'uncommon' => 80, 'rare' => 180, 'legendary' => 500];
    /** @var string[] */
    private array $baseCardIds;
    /** @var string[] */
    private array $expansionCardIds;

    public function __construct(private PDO $db, private BoosterGenerator $generator, private CardCatalog $catalog, private ContractService $contracts, ?string $cardSetsPath = null)
    {
        $cardSetsPath ??= dirname(__DIR__, 2) . '/shared/card-sets.json';
        $sets = json_decode((string)file_get_contents($cardSetsPath), true, 512, JSON_THROW_ON_ERROR);
        $this->expansionCardIds = array_values(array_map('strval', (array)($sets['expansionCardIds'] ?? [])));
        $allCardIds = array_column($catalog->all(), 'id');
        if ($this->expansionCardIds === [] || array_diff($this->expansionCardIds, $allCardIds) !== []) {
            throw new RuntimeException('The expansion card-set configuration is invalid.');
        }
        $this->baseCardIds = array_values(array_diff($allCardIds, $this->expansionCardIds));
    }

    public function snapshot(string $playerId): array
    {
        $this->ensureProgression($playerId);
        $progression = $this->progression($playerId);
        $statement = $this->db->prepare(
            'SELECT card_definition_id, quantity FROM player_collections WHERE player_id = ?'
        );
        $statement->execute([$playerId]);
        $stored = [];
        foreach ($statement->fetchAll() as $row) {
            $stored[(string)$row['card_definition_id']] = (int)$row['quantity'];
        }
        $owned = array_fill_keys($this->baseCardIds, 2);
        foreach ($stored as $definitionId => $quantity) $owned[$definitionId] = max((int)($owned[$definitionId] ?? 0), $quantity);
        $excessCopies = 0;
        foreach ($stored as $quantity) $excessCopies += max(0, $quantity - 2);
        return [
            'cards' => $owned,
            'uniqueCards' => count($owned),
            'totalCards' => array_sum($owned),
            'credits' => (int)$progression['credits'],
            'components' => (int)($progression['salvage_components'] ?? 0),
            'excessCopies' => $excessCopies,
            'boosterPrice' => self::BOOSTER_PRICE,
            'boosterBalance' => (int)$progression['booster_balance'],
            'unlimitedBoosters' => false,
            'totalBoostersOpened' => (int)$progression['total_boosters_opened'],
            'contracts' => $this->contracts->snapshot($playerId),
        ];
    }

    public function buyBooster(string $playerId): array
    {
        $this->db->beginTransaction();
        try {
            $this->ensureProgression($playerId);
            $lock = $this->db->prepare('SELECT credits FROM player_progression WHERE player_id = ? FOR UPDATE');
            $lock->execute([$playerId]);
            $progression = $lock->fetch();
            if (!$progression || (int)$progression['credits'] < self::BOOSTER_PRICE) {
                throw new ApiException('INSUFFICIENT_CREDITS', 'Dir fehlen Credits fÃ¼r diesen Booster.', 409);
            }
            $this->db->prepare('UPDATE player_progression SET credits = credits - ?, booster_balance = booster_balance + 1 WHERE player_id = ?')
                ->execute([self::BOOSTER_PRICE, $playerId]);
            $this->db->commit();
            return $this->snapshot($playerId);
        } catch (Throwable $error) {
            if ($this->db->inTransaction()) $this->db->rollBack();
            throw $error;
        }
    }

    public function openBooster(string $playerId): array
    {
        $this->db->beginTransaction();
        try {
            $this->ensureProgression($playerId);
            $lock = $this->db->prepare('SELECT * FROM player_progression WHERE player_id = ? FOR UPDATE');
            $lock->execute([$playerId]);
            $progression = $lock->fetch();
            if ((int)$progression['booster_balance'] < 1) {
                throw new ApiException('NO_BOOSTERS', 'Du hast aktuell keinen Booster. Verdiene Credits und kaufe dir einen im Booster Lab.', 409);
            }

            $snapshot = $this->snapshot($playerId);
            $cards = $this->generator->generate($snapshot['cards'], $this->expansionCardIds);
            $upsert = $this->db->prepare(
                'INSERT INTO player_collections (player_id, card_definition_id, quantity) VALUES (?, ?, 1)
                 ON DUPLICATE KEY UPDATE quantity = quantity + 1, updated_at = CURRENT_TIMESTAMP'
            );
            $components = 0;
            foreach ($cards as &$card) {
                if ((int)$card['previousQuantity'] >= 2) {
                    $card['salvaged'] = true;
                    $card['salvageValue'] = self::SALVAGE_VALUES[$card['rarity']] ?? 0;
                    $components += (int)$card['salvageValue'];
                } else {
                    $card['salvaged'] = false;
                    $upsert->execute([$playerId, $card['definitionId']]);
                }
            }
            unset($card);

            $update = $this->db->prepare(
                'UPDATE player_progression SET booster_balance = booster_balance - 1, salvage_components = salvage_components + ?,
                 total_boosters_opened = total_boosters_opened + 1, last_booster_at = CURRENT_TIMESTAMP WHERE player_id = ?'
            );
            $update->execute([$components, $playerId]);
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

    public function salvageDuplicates(string $playerId): array
    {
        $this->db->beginTransaction();
        try {
            $this->ensureProgression($playerId);
            $stmt = $this->db->prepare('SELECT card_definition_id, quantity FROM player_collections WHERE player_id = ? FOR UPDATE');
            $stmt->execute([$playerId]);
            $components = 0;
            $update = $this->db->prepare('UPDATE player_collections SET quantity = 2 WHERE player_id = ? AND card_definition_id = ?');
            foreach ($stmt->fetchAll() as $row) {
                $quantity = (int)$row['quantity'];
                if ($quantity <= 2) continue;
                $id = (string)$row['card_definition_id'];
                $components += ($quantity - 2) * (self::SALVAGE_VALUES[$this->generator->rarityFor($id)] ?? 0);
                $update->execute([$playerId, $id]);
            }
            if ($components > 0) $this->db->prepare('UPDATE player_progression SET salvage_components = salvage_components + ? WHERE player_id = ?')->execute([$components, $playerId]);
            $this->db->commit();
            return $this->snapshot($playerId);
        } catch (Throwable $error) {
            if ($this->db->inTransaction()) $this->db->rollBack();
            throw $error;
        }
    }

    public function craft(string $playerId, string $definitionId): array
    {
        if (!in_array($definitionId, $this->expansionCardIds, true)) throw new ApiException('CARD_NOT_CRAFTABLE', 'Nur Karten aus Set 2 können hergestellt werden.', 422);
        $rarity = $this->generator->rarityFor($definitionId);
        $cost = self::CRAFT_COSTS[$rarity] ?? 0;
        $this->db->beginTransaction();
        try {
            $this->ensureProgression($playerId);
            $progression = $this->db->prepare('SELECT salvage_components FROM player_progression WHERE player_id = ? FOR UPDATE');
            $progression->execute([$playerId]);
            $components = (int)($progression->fetch()['salvage_components'] ?? 0);
            $owned = $this->db->prepare('SELECT quantity FROM player_collections WHERE player_id = ? AND card_definition_id = ? FOR UPDATE');
            $owned->execute([$playerId, $definitionId]);
            if ((int)($owned->fetch()['quantity'] ?? 0) >= 2) throw new ApiException('CARD_COPY_LIMIT', 'Du besitzt bereits beide Kopien dieser Karte.', 409);
            if ($components < $cost) throw new ApiException('INSUFFICIENT_COMPONENTS', 'Dir fehlen Komponenten für diese Karte.', 409);
            $this->db->prepare('UPDATE player_progression SET salvage_components = salvage_components - ? WHERE player_id = ?')->execute([$cost, $playerId]);
            $this->db->prepare('INSERT INTO player_collections (player_id, card_definition_id, quantity) VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE quantity = quantity + 1, updated_at = CURRENT_TIMESTAMP')->execute([$playerId, $definitionId]);
            $this->db->commit();
            return $this->snapshot($playerId);
        } catch (Throwable $error) {
            if ($this->db->inTransaction()) $this->db->rollBack();
            throw $error;
        }
    }

    public function claimContract(string $playerId, string $key): array { $this->contracts->claim($playerId, $key); return $this->snapshot($playerId); }

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
