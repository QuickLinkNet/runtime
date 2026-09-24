<?php
declare(strict_types=1);

return [
    'db_host' => getenv('DB_HOST') ?: 'localhost',
    'db_port' => (int)(getenv('DB_PORT') ?: 3306),
    'db_name' => getenv('DB_NAME') ?: 'runtime',
    'db_user' => getenv('DB_USER') ?: 'runtime_user',
    'db_password' => getenv('DB_PASSWORD') ?: 'change-me',
    'app_env' => getenv('APP_ENV') ?: 'production',
];
