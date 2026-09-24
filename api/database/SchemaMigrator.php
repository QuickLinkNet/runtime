<?php
declare(strict_types=1);

final class SchemaMigrator
{
    private const LOCK_NAME = 'runtime_schema_migrations';

    public function __construct(
        private PDO $db,
        private string $migrationDirectory
    ) {
    }

    /** @return string[] Versions applied during this call. */
    public function migrate(): array
    {
        $this->ensureMigrationTable();
        $files = glob($this->migrationDirectory . DIRECTORY_SEPARATOR . '*.php') ?: [];
        sort($files, SORT_STRING);
        $pending = $this->pendingFiles($files);
        if ($pending === []) {
            return [];
        }

        $lock = $this->db->prepare('SELECT GET_LOCK(?, 10)');
        $lock->execute([self::LOCK_NAME]);
        if ((int)$lock->fetchColumn() !== 1) {
            throw new ApiException(
                'MIGRATION_LOCK_TIMEOUT',
                'Die Datenbankaktualisierung ist momentan durch einen anderen Prozess belegt.',
                503
            );
        }

        $appliedNow = [];
        try {
            // Another request may have completed the migration while this one waited.
            foreach ($this->pendingFiles($files) as $file) {
                $version = pathinfo($file, PATHINFO_FILENAME);
                $migration = require $file;
                if (!is_callable($migration)) {
                    throw new RuntimeException('Migration is not callable: ' . $version);
                }
                $migration($this->db);
                $statement = $this->db->prepare(
                    'INSERT INTO schema_migrations (version, applied_at) VALUES (?, CURRENT_TIMESTAMP)'
                );
                $statement->execute([$version]);
                $appliedNow[] = $version;
            }
        } catch (Throwable $error) {
            error_log(sprintf('[RUNTIME] Migration failed: %s', $error->getMessage()));
            throw new ApiException(
                'DATABASE_MIGRATION_FAILED',
                'Die automatische Datenbankmigration ist fehlgeschlagen. Prüfe die Schema-Rechte des DB-Benutzers.',
                500
            );
        } finally {
            $release = $this->db->prepare('SELECT RELEASE_LOCK(?)');
            $release->execute([self::LOCK_NAME]);
        }

        return $appliedNow;
    }

    private function ensureMigrationTable(): void
    {
        $this->db->exec(
            'CREATE TABLE IF NOT EXISTS schema_migrations (
                version VARCHAR(191) NOT NULL PRIMARY KEY,
                applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
        );
    }

    /** @param string[] $files @return string[] */
    private function pendingFiles(array $files): array
    {
        $applied = $this->db->query('SELECT version FROM schema_migrations')->fetchAll(PDO::FETCH_COLUMN);
        $lookup = array_fill_keys(array_map('strval', $applied), true);
        return array_values(array_filter(
            $files,
            static fn(string $file): bool => !isset($lookup[pathinfo($file, PATHINFO_FILENAME)])
        ));
    }
}
