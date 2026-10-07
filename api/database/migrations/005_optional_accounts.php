<?php
declare(strict_types=1);

return static function (PDO $db): void {
    $db->exec('ALTER TABLE players
        ADD COLUMN account_email VARCHAR(190) NULL AFTER name,
        ADD COLUMN password_hash VARCHAR(255) NULL AFTER account_email,
        ADD COLUMN account_created_at DATETIME NULL AFTER password_hash,
        ADD UNIQUE KEY unique_players_account_email (account_email)');
    $db->exec("CREATE TABLE IF NOT EXISTS player_loadouts (
        player_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
        deck_json TEXT NOT NULL,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_loadout_player FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
};
