<?php
declare(strict_types=1);

return static function (PDO $db): void {
    $db->exec("CREATE TABLE IF NOT EXISTS player_progression (
        player_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
        booster_balance INT UNSIGNED NOT NULL DEFAULT 0,
        test_mode TINYINT(1) NOT NULL DEFAULT 1,
        total_boosters_opened INT UNSIGNED NOT NULL DEFAULT 0,
        last_booster_at DATETIME NULL,
        CONSTRAINT fk_progression_player FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    $db->exec("CREATE TABLE IF NOT EXISTS player_collections (
        player_id BIGINT UNSIGNED NOT NULL,
        card_definition_id VARCHAR(100) NOT NULL,
        quantity INT UNSIGNED NOT NULL DEFAULT 0,
        first_acquired_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (player_id, card_definition_id),
        CONSTRAINT fk_collection_player FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    $db->exec("CREATE TABLE IF NOT EXISTS booster_openings (
        id CHAR(32) NOT NULL PRIMARY KEY,
        player_id BIGINT UNSIGNED NOT NULL,
        cards_json TEXT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_booster_player (player_id, created_at),
        CONSTRAINT fk_booster_player FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
};
