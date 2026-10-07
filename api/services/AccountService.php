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

    public function loadout(string $playerId): ?array
    {
        $stmt = $this->db->prepare('SELECT deck_json FROM player_loadouts WHERE player_id = ?');
        $stmt->execute([$playerId]);
        $json = $stmt->fetchColumn();
        if (!is_string($json)) return null;
        $deck = json_decode($json, true);
        return is_array($deck) ? array_values(array_map('strval', $deck)) : null;
    }

    public function saveLoadout(string $playerId, array $deck): void
    {
        $stmt = $this->db->prepare(
            'INSERT INTO player_loadouts (player_id, deck_json) VALUES (?, ?)
             ON DUPLICATE KEY UPDATE deck_json = VALUES(deck_json), updated_at = CURRENT_TIMESTAMP'
        );
        $stmt->execute([$playerId, json_encode(array_values($deck), JSON_THROW_ON_ERROR)]);
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
