<?php
declare(strict_types=1);

return static function (PDO $db): void {
    $db->exec('ALTER TABLE player_progression
        ADD COLUMN credits INT UNSIGNED NOT NULL DEFAULT 0 AFTER booster_balance,
        ADD COLUMN total_credits_earned INT UNSIGNED NOT NULL DEFAULT 0 AFTER credits,
        MODIFY COLUMN test_mode TINYINT(1) NOT NULL DEFAULT 0');
    $db->exec('UPDATE player_progression SET test_mode = 0');
};
