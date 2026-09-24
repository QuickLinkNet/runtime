<?php
declare(strict_types=1);

ini_set('display_errors', '0');
ini_set('log_errors', '1');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');

require_once __DIR__ . '/utils/ApiException.php';
require_once __DIR__ . '/utils/Http.php';
require_once __DIR__ . '/database/Database.php';
require_once __DIR__ . '/database/SchemaMigrator.php';
require_once __DIR__ . '/game/CardCatalog.php';
require_once __DIR__ . '/game/GameEngine.php';
require_once __DIR__ . '/game/PlayerView.php';
require_once __DIR__ . '/game/BotPlayer.php';
require_once __DIR__ . '/repositories/MatchRepository.php';
require_once __DIR__ . '/services/MatchService.php';

try {
    require_once __DIR__ . '/config/load_env.php';
    loadEnvFile(__DIR__ . '/.env');
    $configPath = __DIR__ . '/config/config.php';
    if (!is_file($configPath)) {
        $configPath = __DIR__ . '/config/config.example.php';
    }
    $config = require $configPath;
    $configuredPort = getenv('DB_PORT');
    if ($configuredPort !== false && $configuredPort !== '') {
        $config['db_port'] = (int)$configuredPort;
    }
    if (($config['db_password'] ?? '') === 'change-me' || ($config['db_password'] ?? '') === '') {
        throw new ApiException(
            'CONFIG_INCOMPLETE',
            'Bitte trage die lokalen MySQL-Zugangsdaten in api/config/config.php ein.',
            503
        );
    }
    $db = Database::connect($config);
    $migrator = new SchemaMigrator($db, __DIR__ . '/database/migrations');
    $migrator->migrate();
    $catalog = new CardCatalog();
    $engine = new GameEngine($catalog);
    $bot = new BotPlayer($engine, $catalog);
    $matches = new MatchService($db, $engine, $bot, $catalog);
    $action = (string)($_GET['action'] ?? '');

    if ($action === 'health') {
        Http::success(['status' => 'ok']);
    }
    if ($action === 'catalog') {
        Http::success([
            'cards' => $catalog->all(true),
            'starterDecks' => [
                'frontend-backend' => $catalog->starterDeck('frontend-backend'),
                'infrastructure-security' => $catalog->starterDeck('infrastructure-security'),
                'data-ai' => $catalog->starterDeck('data-ai'),
            ],
        ]);
    }
    if ($action === 'createPlayer') {
        $body = Http::body();
        $name = trim((string)($body['name'] ?? ''));
        if (!preg_match('/^[\p{L}\p{N} _.-]{2,24}$/u', $name)) {
            throw new ApiException('INVALID_NAME', 'Der Name muss 2–24 gültige Zeichen enthalten.');
        }
        $token = bin2hex(random_bytes(32));
        $stmt = $db->prepare('INSERT INTO players (name, token_hash) VALUES (?, ?)');
        $stmt->execute([$name, hash('sha256', $token)]);
        Http::success(['player' => ['id' => (string)$db->lastInsertId(), 'name' => $name], 'token' => $token], 201);
    }

    $token = Http::token();
    $stmt = $db->prepare('SELECT id, name FROM players WHERE token_hash = ? AND is_bot = 0');
    $stmt->execute([hash('sha256', $token)]);
    $player = $stmt->fetch();
    if (!$player) {
        throw new ApiException('UNAUTHENTICATED', 'Ungültiger Spieler-Token.', 401);
    }
    $playerId = (string)$player['id'];
    $db->prepare('UPDATE players SET last_seen_at = CURRENT_TIMESTAMP WHERE id = ?')->execute([$playerId]);
    $body = in_array($_SERVER['REQUEST_METHOD'] ?? 'GET', ['POST', 'PUT', 'PATCH'], true) ? Http::body() : [];

    match ($action) {
        'me' => Http::success(['player' => ['id' => $playerId, 'name' => $player['name']]]),
        'createMatch' => Http::success($matches->create(
            $playerId,
            $player['name'],
            (string)($body['mode'] ?? ''),
            (array)($body['deck'] ?? [])
        ), 201),
        'joinMatch' => Http::success($matches->join(
            $playerId,
            $player['name'],
            strtoupper(trim((string)($body['roomCode'] ?? ''))),
            (array)($body['deck'] ?? [])
        )),
        'startMatch' => Http::success($matches->start(
            $playerId,
            strtoupper(trim((string)($body['roomCode'] ?? '')))
        )),
        'getMatchState' => Http::success($matches->state(
            $playerId,
            strtoupper(trim((string)($_GET['match'] ?? ''))),
            max(0, (int)($_GET['version'] ?? 0))
        )),
        'submitGameAction' => Http::success($matches->submit(
            $playerId,
            strtoupper(trim((string)($body['roomCode'] ?? ''))),
            (int)($body['expectedVersion'] ?? 0),
            (array)($body['action'] ?? [])
        )),
        'resumeMatch' => Http::success(['match' => $matches->resume($playerId)]),
        'leaveMatch' => (function () use ($matches, $playerId, $body): void {
            $matches->leave($playerId, strtoupper(trim((string)($body['roomCode'] ?? ''))));
            Http::success();
        })(),
        default => throw new ApiException('NOT_FOUND', 'API-Aktion nicht gefunden.', 404),
    };
} catch (ApiException $error) {
    Http::error($error->errorCode, $error->getMessage(), $error->httpStatus);
} catch (PDOException $error) {
    error_log(sprintf('[RUNTIME] Database connection failed: %s', $error->getMessage()));
    Http::error(
        'DATABASE_CONNECTION_FAILED',
        'Keine Verbindung zur Datenbank. Prüfe api/.env und ob MySQL/MariaDB erreichbar ist.',
        503
    );
} catch (Throwable $error) {
    error_log(sprintf('[RUNTIME] %s in %s:%d', $error->getMessage(), $error->getFile(), $error->getLine()));
    Http::error('INTERNAL_ERROR', 'Ein interner Fehler ist aufgetreten.', 500);
}
