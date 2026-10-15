<?php
declare(strict_types=1);

return static function (PDO $db): void {
    $columns = $db->query('SHOW COLUMNS FROM players')->fetchAll(PDO::FETCH_COLUMN);
    if (!in_array('deleted_at', $columns, true)) {
        $db->exec('ALTER TABLE players ADD COLUMN deleted_at DATETIME NULL AFTER last_seen_at');
    }

    $indexes = $db->query('SHOW INDEX FROM players')->fetchAll(PDO::FETCH_ASSOC);
    $hasDeletedIndex = array_filter(
        $indexes,
        static fn(array $index): bool => ($index['Key_name'] ?? null) === 'idx_players_deleted'
    ) !== [];
    if (!$hasDeletedIndex) {
        $db->exec('ALTER TABLE players ADD INDEX idx_players_deleted (deleted_at)');
    }
};
