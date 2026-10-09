<?php
declare(strict_types=1);

return static function (PDO $db): void {
    $column = $db->query("SHOW COLUMNS FROM player_progression LIKE 'salvage_components'")->fetch();
    if (!$column) $db->exec('ALTER TABLE player_progression ADD COLUMN salvage_components INT UNSIGNED NOT NULL DEFAULT 0 AFTER credits');
    $db->exec('CREATE TABLE IF NOT EXISTS player_contracts (
        player_id BIGINT UNSIGNED NOT NULL,
        cycle_key VARCHAR(16) NOT NULL,
        contract_key VARCHAR(64) NOT NULL,
        progress INT UNSIGNED NOT NULL DEFAULT 0,
        claimed_at DATETIME NULL,
        PRIMARY KEY (player_id, cycle_key, contract_key),
        CONSTRAINT fk_contract_player FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci');
};
