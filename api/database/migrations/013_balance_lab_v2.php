<?php
declare(strict_types=1);

return static function (PDO $db): void {
    $db->exec('CREATE TABLE IF NOT EXISTS balance_recommendation_reviews (
        report_id CHAR(32) NOT NULL,
        recommendation_id VARCHAR(32) NOT NULL,
        status ENUM("open", "accepted", "dismissed") NOT NULL DEFAULT "open",
        note VARCHAR(500) NOT NULL DEFAULT "",
        reviewed_by BIGINT UNSIGNED NOT NULL,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (report_id, recommendation_id),
        CONSTRAINT fk_balance_review_report FOREIGN KEY (report_id) REFERENCES balance_reports(id) ON DELETE CASCADE,
        CONSTRAINT fk_balance_review_admin FOREIGN KEY (reviewed_by) REFERENCES players(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci');
};
