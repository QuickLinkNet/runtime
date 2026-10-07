<?php
declare(strict_types=1);

return static function (PDO $db): void {
    $db->exec('ALTER TABLE player_progression
        ADD COLUMN tutorial_completed_at DATETIME NULL AFTER last_booster_at,
        ADD COLUMN tutorial_reward_claimed_at DATETIME NULL AFTER tutorial_completed_at');
};
