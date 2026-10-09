<?php
declare(strict_types=1);

return static function (PDO $db): void {
    $db->exec('CREATE TABLE IF NOT EXISTS admin_audit_log (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        admin_player_id BIGINT UNSIGNED NOT NULL,
        target_player_id BIGINT UNSIGNED NULL,
        action VARCHAR(80) NOT NULL,
        details_json TEXT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_admin_audit_created (created_at),
        INDEX idx_admin_audit_target (target_player_id, created_at),
        CONSTRAINT fk_admin_audit_admin FOREIGN KEY (admin_player_id) REFERENCES players(id),
        CONSTRAINT fk_admin_audit_target FOREIGN KEY (target_player_id) REFERENCES players(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci');
};
