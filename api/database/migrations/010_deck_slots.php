<?php
declare(strict_types=1);

return static function (PDO $db): void {
    $db->exec('CREATE TABLE IF NOT EXISTS player_deck_slots (
        id CHAR(32) NOT NULL PRIMARY KEY,
        player_id BIGINT UNSIGNED NOT NULL,
        name VARCHAR(40) NOT NULL,
        deck_json TEXT NOT NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_deck_slots_player (player_id, is_active, updated_at),
        CONSTRAINT fk_deck_slots_player FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci');
};
