<?php
declare(strict_types=1);

return static function (PDO $db): void {
    $db->exec(
        'CREATE TABLE IF NOT EXISTS players (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(24) NOT NULL,
            token_hash CHAR(64) NOT NULL UNIQUE,
            is_bot TINYINT(1) NOT NULL DEFAULT 0,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            last_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_players_last_seen (last_seen_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );

    $db->exec(
        "CREATE TABLE IF NOT EXISTS matches (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            room_code CHAR(5) NOT NULL UNIQUE,
            mode ENUM('single','multi') NOT NULL,
            status ENUM('lobby','mulligan','active','finished','abandoned') NOT NULL DEFAULT 'lobby',
            owner_player_id BIGINT UNSIGNED NOT NULL,
            state_json LONGTEXT NOT NULL,
            version INT UNSIGNED NOT NULL DEFAULT 1,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            finished_at DATETIME NULL,
            INDEX idx_matches_status (status),
            INDEX idx_matches_owner (owner_player_id),
            CONSTRAINT fk_match_owner FOREIGN KEY (owner_player_id) REFERENCES players(id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    );

    $db->exec(
        'CREATE TABLE IF NOT EXISTS match_players (
            match_id BIGINT UNSIGNED NOT NULL,
            player_id BIGINT UNSIGNED NOT NULL,
            seat TINYINT UNSIGNED NOT NULL,
            joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (match_id, player_id),
            UNIQUE KEY unique_match_seat (match_id, seat),
            INDEX idx_player_matches (player_id, match_id),
            CONSTRAINT fk_mp_match FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
            CONSTRAINT fk_mp_player FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );
};
