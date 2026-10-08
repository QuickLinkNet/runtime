<?php
declare(strict_types=1);

return static function (PDO $db): void {
    $db->exec("CREATE TABLE IF NOT EXISTS match_action_telemetry (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        match_id BIGINT UNSIGNED NOT NULL,
        player_id BIGINT UNSIGNED NOT NULL,
        action_type VARCHAR(32) NOT NULL,
        expected_version INT UNSIGNED NOT NULL,
        resolved_version INT UNSIGNED NOT NULL,
        duration_ms INT UNSIGNED NOT NULL DEFAULT 0,
        accepted TINYINT(1) NOT NULL,
        error_code VARCHAR(64) NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_action_telemetry_match (match_id, created_at),
        INDEX idx_action_telemetry_type (action_type, accepted, created_at),
        CONSTRAINT fk_action_telemetry_match FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
        CONSTRAINT fk_action_telemetry_player FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    $db->exec("CREATE TABLE IF NOT EXISTS match_summaries (
        match_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
        winner_player_id BIGINT UNSIGNED NULL,
        finish_reason VARCHAR(32) NOT NULL,
        turns INT UNSIGNED NOT NULL,
        duration_seconds INT UNSIGNED NOT NULL,
        metrics_json TEXT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_match_summaries_reason (finish_reason, created_at),
        CONSTRAINT fk_match_summary_match FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
        CONSTRAINT fk_match_summary_winner FOREIGN KEY (winner_player_id) REFERENCES players(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
};
