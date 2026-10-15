<?php
declare(strict_types=1);

final class AccountService
{
    public function __construct(private PDO $db)
    {
    }

    public function login(string $email, string $password): array
    {
        $email = $this->email($email);
        $stmt = $this->db->prepare(
            'SELECT p.id, p.name, p.password_hash, pp.tutorial_completed_at
             FROM players p LEFT JOIN player_progression pp ON pp.player_id = p.id
             WHERE p.account_email = ? AND p.is_bot = 0'
        );
        $stmt->execute([$email]);
        $player = $stmt->fetch();
        if (!$player || !is_string($player['password_hash']) || !password_verify($password, $player['password_hash'])) {
            throw new ApiException('INVALID_CREDENTIALS', 'E-Mail oder Passwort ist nicht korrekt.', 401);
        }
        $token = bin2hex(random_bytes(32));
        $this->db->prepare('UPDATE players SET token_hash = ?, last_seen_at = CURRENT_TIMESTAMP WHERE id = ?')
            ->execute([hash('sha256', $token), $player['id']]);
        return ['token' => $token, 'player' => $this->identity($player, $email, true)];
    }

    public function logout(string $playerId): void
    {
        $revokedHash = hash('sha256', random_bytes(32));
        $this->db->prepare('UPDATE players SET token_hash = ?, last_seen_at = CURRENT_TIMESTAMP WHERE id = ?')
            ->execute([$revokedHash, $playerId]);
    }

    public function register(string $name, string $email, string $password): array
    {
        $name = $this->name($name);
        $email = $this->email($email);
        $this->password($password);
        $exists = $this->db->prepare('SELECT id FROM players WHERE account_email = ? LIMIT 1');
        $exists->execute([$email]);
        if ($exists->fetch()) {
            throw new ApiException('ACCOUNT_EMAIL_TAKEN', 'Für diese E-Mail existiert bereits ein Account.', 409);
        }
        $token = bin2hex(random_bytes(32));
        $stmt = $this->db->prepare(
            'INSERT INTO players (name, account_email, password_hash, account_created_at, token_hash)
             VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?)'
        );
        $stmt->execute([$name, $email, password_hash($password, PASSWORD_DEFAULT), hash('sha256', $token)]);
        return [
            'token' => $token,
            'player' => [
                'id' => (string)$this->db->lastInsertId(),
                'name' => $name,
                'tutorialCompleted' => false,
                'isAccount' => true,
                'accountEmail' => $email,
            ],
        ];
    }

    public function linkGuest(string $playerId, string $email, string $password): array
    {
        $email = $this->email($email);
        $this->password($password);
        $this->db->beginTransaction();
        try {
            $stmt = $this->db->prepare('SELECT p.id, p.name, p.account_email, pp.tutorial_completed_at FROM players p LEFT JOIN player_progression pp ON pp.player_id = p.id WHERE p.id = ? FOR UPDATE');
            $stmt->execute([$playerId]);
            $player = $stmt->fetch();
            if (!$player) {
                throw new ApiException('UNAUTHENTICATED', 'Gastprofil wurde nicht gefunden.', 401);
            }
            if ($player['account_email'] !== null) {
                throw new ApiException('ACCOUNT_ALREADY_LINKED', 'Dieses Profil ist bereits mit einem Account verbunden.', 409);
            }
            $exists = $this->db->prepare('SELECT id FROM players WHERE account_email = ? LIMIT 1');
            $exists->execute([$email]);
            if ($exists->fetch()) {
                throw new ApiException('ACCOUNT_EMAIL_TAKEN', 'Für diese E-Mail existiert bereits ein Account.', 409);
            }
            $token = bin2hex(random_bytes(32));
            $this->db->prepare('UPDATE players SET account_email = ?, password_hash = ?, account_created_at = CURRENT_TIMESTAMP, token_hash = ? WHERE id = ?')
                ->execute([$email, password_hash($password, PASSWORD_DEFAULT), hash('sha256', $token), $playerId]);
            $this->db->commit();
            return ['token' => $token, 'player' => $this->identity($player, $email, true)];
        } catch (Throwable $error) {
            if ($this->db->inTransaction()) $this->db->rollBack();
            throw $error;
        }
    }

    public function deckSlots(string $playerId): array
    {
        $this->importLegacyLoadout($playerId);
        $stmt = $this->db->prepare('SELECT id, name, deck_json, is_active, updated_at FROM player_deck_slots WHERE player_id = ? ORDER BY is_active DESC, updated_at DESC');
        $stmt->execute([$playerId]);
        return ['slots' => array_map(fn(array $row): array => $this->slot($row), $stmt->fetchAll())];
    }

    public function createDeckSlot(string $playerId, string $name, array $deck): array
    {
        $this->db->beginTransaction();
        try {
            $this->importLegacyLoadout($playerId);
            $count = $this->db->prepare('SELECT COUNT(*) FROM player_deck_slots WHERE player_id = ? FOR UPDATE');
            $count->execute([$playerId]);
            $slotCount = (int)$count->fetchColumn();
            if ($slotCount >= 8) throw new ApiException('DECK_SLOT_LIMIT', 'Du kannst maximal acht Stacks speichern.', 409);
            $active = $slotCount === 0;
            $id = bin2hex(random_bytes(16));
            $this->db->prepare('INSERT INTO player_deck_slots (id, player_id, name, deck_json, is_active) VALUES (?, ?, ?, ?, ?)')
                ->execute([$id, $playerId, $this->deckName($name), json_encode(array_values($deck), JSON_THROW_ON_ERROR), $active ? 1 : 0]);
            if ($active) $this->syncLegacyLoadout($playerId, $deck);
            $this->db->commit();
            return $this->deckSlots($playerId);
        } catch (Throwable $error) {
            if ($this->db->inTransaction()) $this->db->rollBack();
            throw $error;
        }
    }

    public function updateDeckSlot(string $playerId, string $slotId, string $name, array $deck): array
    {
        $this->db->beginTransaction();
        try {
            $slot = $this->lockSlot($playerId, $slotId);
            $this->db->prepare('UPDATE player_deck_slots SET name = ?, deck_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
                ->execute([$this->deckName($name), json_encode(array_values($deck), JSON_THROW_ON_ERROR), $slotId]);
            if ((bool)$slot['is_active']) $this->syncLegacyLoadout($playerId, $deck);
            $this->db->commit();
            return $this->deckSlots($playerId);
        } catch (Throwable $error) {
            if ($this->db->inTransaction()) $this->db->rollBack();
            throw $error;
        }
    }

    public function activateDeckSlot(string $playerId, string $slotId): array
    {
        $this->db->beginTransaction();
        try {
            $slot = $this->lockSlot($playerId, $slotId);
            $this->db->prepare('UPDATE player_deck_slots SET is_active = 0 WHERE player_id = ?')->execute([$playerId]);
            $this->db->prepare('UPDATE player_deck_slots SET is_active = 1 WHERE id = ?')->execute([$slotId]);
            $this->syncLegacyLoadout($playerId, $this->decodeDeck((string)$slot['deck_json']));
            $this->db->commit();
            return $this->deckSlots($playerId);
        } catch (Throwable $error) {
            if ($this->db->inTransaction()) $this->db->rollBack();
            throw $error;
        }
    }

    public function duplicateDeckSlot(string $playerId, string $slotId, string $name): array
    {
        $slot = $this->lockSlot($playerId, $slotId);
        return $this->createDeckSlot($playerId, $name, $this->decodeDeck((string)$slot['deck_json']));
    }

    public function deleteDeckSlot(string $playerId, string $slotId): array
    {
        $this->db->beginTransaction();
        try {
            $slot = $this->lockSlot($playerId, $slotId);
            $remaining = $this->db->prepare('SELECT id, deck_json FROM player_deck_slots WHERE player_id = ? AND id <> ? ORDER BY updated_at DESC FOR UPDATE');
            $remaining->execute([$playerId, $slotId]);
            $next = $remaining->fetch();
            if (!$next) throw new ApiException('LAST_DECK_SLOT', 'Dein letzter Stack kann nicht gelöscht werden.', 409);
            $this->db->prepare('DELETE FROM player_deck_slots WHERE id = ?')->execute([$slotId]);
            if ((bool)$slot['is_active']) {
                $this->db->prepare('UPDATE player_deck_slots SET is_active = 1 WHERE id = ?')->execute([$next['id']]);
                $this->syncLegacyLoadout($playerId, $this->decodeDeck((string)$next['deck_json']));
            }
            $this->db->commit();
            return $this->deckSlots($playerId);
        } catch (Throwable $error) {
            if ($this->db->inTransaction()) $this->db->rollBack();
            throw $error;
        }
    }

    public function loadout(string $playerId): ?array
    {
        $slots = $this->deckSlots($playerId)['slots'];
        foreach ($slots as $slot) if ($slot['isActive']) return $slot['deck'];
        return null;
    }

    public function saveLoadout(string $playerId, array $deck): void
    {
        $slots = $this->deckSlots($playerId)['slots'];
        $active = current(array_filter($slots, static fn(array $slot): bool => $slot['isActive']));
        if (is_array($active)) { $this->updateDeckSlot($playerId, $active['id'], $active['name'], $deck); return; }
        $this->createDeckSlot($playerId, 'Mein erster Stack', $deck);
    }

    private function importLegacyLoadout(string $playerId): void
    {
        $existing = $this->db->prepare('SELECT COUNT(*) FROM player_deck_slots WHERE player_id = ?');
        $existing->execute([$playerId]);
        if ((int)$existing->fetchColumn() > 0) return;
        $legacy = $this->db->prepare('SELECT deck_json FROM player_loadouts WHERE player_id = ?');
        $legacy->execute([$playerId]);
        $json = $legacy->fetchColumn();
        if (!is_string($json)) return;
        $this->db->prepare('INSERT INTO player_deck_slots (id, player_id, name, deck_json, is_active) VALUES (?, ?, ?, ?, 1)')
            ->execute([bin2hex(random_bytes(16)), $playerId, 'Mein Stack', $json]);
    }

    private function lockSlot(string $playerId, string $slotId): array
    {
        if (!preg_match('/^[a-f0-9]{32}$/', $slotId)) throw new ApiException('INVALID_DECK_SLOT', 'Ungültiger Stack.', 422);
        $stmt = $this->db->prepare('SELECT id, name, deck_json, is_active FROM player_deck_slots WHERE id = ? AND player_id = ? FOR UPDATE');
        $stmt->execute([$slotId, $playerId]);
        $slot = $stmt->fetch();
        if (!$slot) throw new ApiException('DECK_SLOT_NOT_FOUND', 'Dieser Stack wurde nicht gefunden.', 404);
        return $slot;
    }

    private function syncLegacyLoadout(string $playerId, array $deck): void
    {
        $this->db->prepare('INSERT INTO player_loadouts (player_id, deck_json) VALUES (?, ?) ON DUPLICATE KEY UPDATE deck_json = VALUES(deck_json), updated_at = CURRENT_TIMESTAMP')
            ->execute([$playerId, json_encode(array_values($deck), JSON_THROW_ON_ERROR)]);
    }

    private function decodeDeck(string $json): array
    {
        $deck = json_decode($json, true);
        return is_array($deck) ? array_values(array_map('strval', $deck)) : [];
    }

    private function slot(array $row): array
    {
        return ['id' => (string)$row['id'], 'name' => (string)$row['name'], 'deck' => $this->decodeDeck((string)$row['deck_json']), 'isActive' => (bool)$row['is_active'], 'updatedAt' => (string)$row['updated_at']];
    }

    private function deckName(string $name): string
    {
        $name = trim($name);
        if (!preg_match('/^[\p{L}\p{N} _.-]{2,40}$/u', $name)) throw new ApiException('INVALID_DECK_NAME', 'Der Stack-Name muss 2–40 gültige Zeichen enthalten.', 422);
        return $name;
    }

    private function email(string $email): string
    {
        $email = strtolower(trim($email));
        if (strlen($email) > 190 || filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
            throw new ApiException('INVALID_EMAIL', 'Bitte gib eine gültige E-Mail-Adresse ein.');
        }
        return $email;
    }

    private function name(string $name): string
    {
        $name = trim($name);
        if (!preg_match('/^[\p{L}\p{N} _.-]{2,24}$/u', $name)) {
            throw new ApiException('INVALID_NAME', 'Der Name muss 2–24 gültige Zeichen enthalten.');
        }
        return $name;
    }

    private function password(string $password): void
    {
        if (strlen($password) < 8 || strlen($password) > 128) {
            throw new ApiException('INVALID_PASSWORD', 'Das Passwort braucht 8 bis 128 Zeichen.');
        }
    }

    private function identity(array $player, string $email, bool $isAccount): array
    {
        return [
            'id' => (string)$player['id'],
            'name' => $player['name'],
            'tutorialCompleted' => $player['tutorial_completed_at'] !== null,
            'isAccount' => $isAccount,
            'accountEmail' => $email,
        ];
    }
}
