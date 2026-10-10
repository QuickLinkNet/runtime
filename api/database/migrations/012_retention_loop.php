<?php
declare(strict_types=1);

return static function (PDO $db): void {
    $columns = $db->query("SHOW COLUMNS FROM player_progression")->fetchAll(PDO::FETCH_COLUMN);
    if (!in_array('daily_streak', $columns, true)) $db->exec('ALTER TABLE player_progression ADD COLUMN daily_streak INT UNSIGNED NOT NULL DEFAULT 0');
    if (!in_array('last_daily_match_at', $columns, true)) $db->exec('ALTER TABLE player_progression ADD COLUMN last_daily_match_at DATETIME NULL');
    $db->exec('CREATE TABLE IF NOT EXISTS player_faction_mastery (
        player_id BIGINT UNSIGNED NOT NULL,
        faction VARCHAR(32) NOT NULL,
        xp INT UNSIGNED NOT NULL DEFAULT 0,
        level INT UNSIGNED NOT NULL DEFAULT 1,
        matches_played INT UNSIGNED NOT NULL DEFAULT 0,
        wins INT UNSIGNED NOT NULL DEFAULT 0,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (player_id, faction),
        CONSTRAINT fk_mastery_player FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci');
    $db->exec('CREATE TABLE IF NOT EXISTS player_rivalries (
        player_id BIGINT UNSIGNED NOT NULL,
        opponent_player_id BIGINT UNSIGNED NOT NULL,
        matches_played INT UNSIGNED NOT NULL DEFAULT 0,
        wins INT UNSIGNED NOT NULL DEFAULT 0,
        losses INT UNSIGNED NOT NULL DEFAULT 0,
        last_played_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (player_id, opponent_player_id),
        CONSTRAINT fk_rivalry_player FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
        CONSTRAINT fk_rivalry_opponent FOREIGN KEY (opponent_player_id) REFERENCES players(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci');
    $db->exec('CREATE TABLE IF NOT EXISTS match_feedback (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        player_id BIGINT UNSIGNED NOT NULL,
        room_code CHAR(5) NOT NULL,
        rating ENUM(\'easy\', \'fair\', \'hard\') NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_match_feedback (player_id, room_code),
        CONSTRAINT fk_feedback_player FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci');
};
