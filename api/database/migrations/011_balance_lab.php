<?php
declare(strict_types=1);

return static function (PDO $db): void {
    $db->exec('CREATE TABLE IF NOT EXISTS balance_reports (
        id CHAR(32) NOT NULL PRIMARY KEY,
        admin_player_id BIGINT UNSIGNED NOT NULL,
        simulated_matches INT UNSIGNED NOT NULL,
        report_json MEDIUMTEXT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_balance_reports_created (created_at),
        CONSTRAINT fk_balance_report_admin FOREIGN KEY (admin_player_id) REFERENCES players(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci');
};
