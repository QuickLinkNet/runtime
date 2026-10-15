<?php
declare(strict_types=1);

final class AdminService
{
    /** @param string[] $allowedEmails */
    public function __construct(private PDO $db, array $allowedEmails, private CollectionService $collection)
    {
        $this->allowedEmails = array_values(array_unique(array_filter(array_map(
            static fn(string $email): string => strtolower(trim($email)),
            $allowedEmails
        ))));
    }

    /** @var string[] */
    private array $allowedEmails;

    public function isAllowed(?string $email): bool
    {
        return $email !== null && in_array(strtolower($email), $this->allowedEmails, true);
    }

    public function assertAllowed(?string $email): void
    {
        if (!$this->isAllowed($email)) {
            throw new ApiException('ADMIN_REQUIRED', 'Dieser Bereich ist nur für konfigurierte Administratoren verfügbar.', 403);
        }
    }

    public function overview(): array
    {
        $summary = $this->db->query(
            'SELECT
                COUNT(*) AS players,
                SUM(account_email IS NOT NULL) AS accounts,
                COALESCE(SUM(COALESCE(pp.credits, 0)), 0) AS credits,
                COALESCE(SUM(COALESCE(pp.salvage_components, 0)), 0) AS components,
                COALESCE(SUM(COALESCE(pp.booster_balance, 0)), 0) AS unopenedBoosters,
                COALESCE(SUM(COALESCE(cards.total_cards, 0)), 0) AS collectedCards
             FROM players p
             LEFT JOIN player_progression pp ON pp.player_id = p.id
             LEFT JOIN (SELECT player_id, SUM(quantity) AS total_cards FROM player_collections GROUP BY player_id) cards ON cards.player_id = p.id
             WHERE p.is_bot = 0 AND p.deleted_at IS NULL'
        )->fetch();

        return [
            'summary' => array_map('intval', $summary ?: []),
            'recentAudit' => $this->auditEntries(16),
        ];
    }

    public function players(string $query = ''): array
    {
        $query = trim($query);
        $statement = $this->db->prepare(
            'SELECT p.id, p.name, p.account_email, p.created_at, p.last_seen_at,
                COALESCE(pp.matches_played, 0) AS matchesPlayed,
                COALESCE(pp.wins, 0) AS wins,
                COALESCE(pp.losses, 0) AS losses,
                COALESCE(pp.credits, 0) AS credits,
                COALESCE(pp.salvage_components, 0) AS components,
                COALESCE(pp.booster_balance, 0) AS boosterBalance,
                COALESCE(cards.unique_cards, 0) AS uniqueCards,
                COALESCE(cards.total_cards, 0) AS totalCards
             FROM players p
             LEFT JOIN player_progression pp ON pp.player_id = p.id
             LEFT JOIN (
                SELECT player_id, COUNT(*) AS unique_cards, SUM(quantity) AS total_cards
                FROM player_collections GROUP BY player_id
             ) cards ON cards.player_id = p.id
             WHERE p.is_bot = 0 AND p.deleted_at IS NULL AND (CHAR_LENGTH(?) = 0 OR p.name LIKE ? OR p.account_email LIKE ?)
             ORDER BY p.last_seen_at DESC, p.id DESC
             LIMIT 100'
        );
        $like = '%' . $query . '%';
        $statement->execute([$query, $like, $like]);
        return $statement->fetchAll();
    }

    public function player(string $playerId): array
    {
        $statement = $this->db->prepare(
            'SELECT p.id, p.name, p.account_email, p.created_at, p.last_seen_at,
                COALESCE(pp.matches_played, 0) AS matchesPlayed,
                COALESCE(pp.wins, 0) AS wins,
                COALESCE(pp.losses, 0) AS losses,
                COALESCE(pp.credits, 0) AS credits,
                COALESCE(pp.salvage_components, 0) AS components,
                COALESCE(pp.total_credits_earned, 0) AS totalCreditsEarned,
                COALESCE(pp.booster_balance, 0) AS boosterBalance,
                COALESCE(pp.total_boosters_opened, 0) AS totalBoostersOpened
             FROM players p LEFT JOIN player_progression pp ON pp.player_id = p.id
             WHERE p.id = ? AND p.is_bot = 0 AND p.deleted_at IS NULL'
        );
        $statement->execute([$playerId]);
        $player = $statement->fetch();
        if (!$player) throw new ApiException('PLAYER_NOT_FOUND', 'Spieler wurde nicht gefunden.', 404);

        $collection = $this->collection->snapshot($playerId);
        $cards = [];
        foreach ($collection['cards'] as $definitionId => $quantity) {
            $cards[] = ['definitionId' => $definitionId, 'quantity' => $quantity];
        }
        usort($cards, static fn(array $left, array $right): int => $right['quantity'] <=> $left['quantity'] ?: $left['definitionId'] <=> $right['definitionId']);
        $loadout = $this->db->prepare('SELECT deck_json FROM player_loadouts WHERE player_id = ?');
        $loadout->execute([$playerId]);
        $deck = $loadout->fetchColumn();
        return [
            'player' => $player,
            'cards' => $cards,
            'deck' => is_string($deck) ? json_decode($deck, true) : null,
            'audit' => $this->auditEntries(12, $playerId),
        ];
    }

    public function updateProgression(string $adminId, string $targetId, int $credits, int $boosterBalance, int $components): array
    {
        if ($credits < 0 || $credits > 1000000 || $boosterBalance < 0 || $boosterBalance > 10000 || $components < 0 || $components > 1000000) {
            throw new ApiException('INVALID_ADMIN_VALUE', 'Credits oder Booster liegen außerhalb des erlaubten Bereichs.', 422);
        }
        $this->db->beginTransaction();
        try {
            $this->assertPlayer($targetId);
            $this->db->prepare('INSERT IGNORE INTO player_progression (player_id) VALUES (?)')->execute([$targetId]);
            $before = $this->db->prepare('SELECT credits, booster_balance, salvage_components FROM player_progression WHERE player_id = ? FOR UPDATE');
            $before->execute([$targetId]);
            $previous = $before->fetch() ?: ['credits' => 0, 'booster_balance' => 0];
            $this->db->prepare('UPDATE player_progression SET credits = ?, booster_balance = ?, salvage_components = ? WHERE player_id = ?')
                ->execute([$credits, $boosterBalance, $components, $targetId]);
            $this->audit($adminId, $targetId, 'player_progression_updated', [
                'before' => ['credits' => (int)$previous['credits'], 'boosterBalance' => (int)$previous['booster_balance'], 'components' => (int)$previous['salvage_components']],
                'after' => ['credits' => $credits, 'boosterBalance' => $boosterBalance, 'components' => $components],
            ]);
            $this->db->commit();
            return $this->player($targetId);
        } catch (Throwable $error) {
            if ($this->db->inTransaction()) $this->db->rollBack();
            throw $error;
        }
    }

    public function resetAllCollections(string $adminId): array
    {
        $this->db->beginTransaction();
        try {
            $deleted = $this->db->exec('DELETE FROM player_collections');
            $this->audit($adminId, null, 'all_collections_reset', ['deletedCopies' => (int)$deleted]);
            $this->db->commit();
            return ['deletedCopies' => (int)$deleted];
        } catch (Throwable $error) {
            if ($this->db->inTransaction()) $this->db->rollBack();
            throw $error;
        }
    }

    public function deleteAllGuestPlayers(string $adminId): array
    {
        $this->db->beginTransaction();
        try {
            $deletedMatches = $this->db->exec(
                'DELETE matches FROM matches
                 INNER JOIN players ON players.id = matches.owner_player_id
                 WHERE players.is_bot = 0 AND players.account_email IS NULL AND players.deleted_at IS NULL'
            );
            $deletedPlayers = $this->db->exec('DELETE FROM players WHERE is_bot = 0 AND account_email IS NULL AND deleted_at IS NULL');
            $this->audit($adminId, null, 'guest_players_deleted', [
                'deletedPlayers' => (int)$deletedPlayers,
                'deletedOwnedMatches' => (int)$deletedMatches,
            ]);
            $this->db->commit();
            return ['deletedPlayers' => (int)$deletedPlayers, 'deletedOwnedMatches' => (int)$deletedMatches];
        } catch (Throwable $error) {
            if ($this->db->inTransaction()) $this->db->rollBack();
            throw $error;
        }
    }

    private function assertPlayer(string $playerId): void
    {
        if (!ctype_digit($playerId)) throw new ApiException('INVALID_PLAYER', 'Ungültige Spieler-ID.', 422);
        $statement = $this->db->prepare('SELECT id FROM players WHERE id = ? AND is_bot = 0 AND deleted_at IS NULL');
        $statement->execute([$playerId]);
        if (!$statement->fetch()) throw new ApiException('PLAYER_NOT_FOUND', 'Spieler wurde nicht gefunden.', 404);
    }

    private function audit(string $adminId, ?string $targetId, string $action, array $details): void
    {
        $statement = $this->db->prepare(
            'INSERT INTO admin_audit_log (admin_player_id, target_player_id, action, details_json) VALUES (?, ?, ?, ?)'
        );
        $statement->execute([$adminId, $targetId, $action, json_encode($details, JSON_THROW_ON_ERROR)]);
    }

    private function auditEntries(int $limit, ?string $targetId = null): array
    {
        $query = 'SELECT audit.id, audit.action, audit.details_json AS detailsJson, audit.created_at AS createdAt,
                    admin.name AS adminName, target.name AS targetName
                  FROM admin_audit_log audit
                  INNER JOIN players admin ON admin.id = audit.admin_player_id
                  LEFT JOIN players target ON target.id = audit.target_player_id';
        if ($targetId !== null) $query .= ' WHERE audit.target_player_id = ?';
        $query .= ' ORDER BY audit.id DESC LIMIT ' . max(1, min(50, $limit));
        $statement = $this->db->prepare($query);
        $statement->execute($targetId !== null ? [$targetId] : []);
        return $statement->fetchAll();
    }
}
