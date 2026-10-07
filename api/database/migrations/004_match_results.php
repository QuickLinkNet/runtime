<?php
declare(strict_types=1);

return static function (PDO $db): void {
    $db->exec('ALTER TABLE player_progression
        ADD COLUMN first_win_at DATETIME NULL AFTER tutorial_reward_claimed_at,
        ADD COLUMN first_win_reward_claimed_at DATETIME NULL AFTER first_win_at,
        ADD COLUMN matches_played INT UNSIGNED NOT NULL DEFAULT 0 AFTER first_win_reward_claimed_at,
        ADD COLUMN wins INT UNSIGNED NOT NULL DEFAULT 0 AFTER matches_played,
        ADD COLUMN losses INT UNSIGNED NOT NULL DEFAULT 0 AFTER wins');
};
