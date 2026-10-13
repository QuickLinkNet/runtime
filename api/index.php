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
require_once __DIR__ . '/game/BoosterGenerator.php';
require_once __DIR__ . '/game/GameEngine.php';
require_once __DIR__ . '/game/PlayerView.php';
require_once __DIR__ . '/game/BotPlayer.php';
require_once __DIR__ . '/game/BotProfiles.php';
require_once __DIR__ . '/game/TutorialScenario.php';
require_once __DIR__ . '/repositories/MatchRepository.php';
require_once __DIR__ . '/services/MatchService.php';
require_once __DIR__ . '/services/CollectionService.php';
require_once __DIR__ . '/services/ContractService.php';
require_once __DIR__ . '/services/MasteryService.php';
require_once __DIR__ . '/services/RivalryService.php';
require_once __DIR__ . '/services/IncidentService.php';
require_once __DIR__ . '/services/FeedbackService.php';
require_once __DIR__ . '/services/BalanceSimulator.php';
require_once __DIR__ . '/services/BalanceLabService.php';
require_once __DIR__ . '/services/CardDesignAuditor.php';
require_once __DIR__ . '/services/BalanceAdvisor.php';
require_once __DIR__ . '/services/AccountService.php';
require_once __DIR__ . '/services/TelemetryService.php';
require_once __DIR__ . '/services/AdminService.php';

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
    $contracts = new ContractService($db);
    $mastery = new MasteryService($db);
    $rivalries = new RivalryService($db);
    $incidents = new IncidentService();
    $feedback = new FeedbackService($db);
    $botProfiles = new BotProfiles($catalog);
    $matches = new MatchService($db, $engine, $bot, $catalog, new TelemetryService($db), $botProfiles, $contracts, $mastery, $rivalries, $incidents);
    $balanceLab = new BalanceLabService($db, new BalanceSimulator($engine, $bot, $catalog, $botProfiles), new BalanceAdvisor($catalog), $catalog);
    $collection = new CollectionService($db, new BoosterGenerator($catalog), $catalog, $contracts, $mastery, $rivalries, $incidents);
    $accounts = new AccountService($db);
    $adminEmails = explode(',', (string)(getenv('RUNTIME_ADMIN_EMAILS') ?: ''));
    $admin = new AdminService($db, $adminEmails, $collection);
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
        Http::success(['player' => ['id' => (string)$db->lastInsertId(), 'name' => $name, 'tutorialCompleted' => false, 'isAccount' => false, 'accountEmail' => null, 'isAdmin' => false], 'token' => $token], 201);
    }
    if ($action === 'login') {
        $body = Http::body();
        $result = $accounts->login((string)($body['email'] ?? ''), (string)($body['password'] ?? ''));
        $result['player']['isAdmin'] = $admin->isAllowed($result['player']['accountEmail']);
        Http::success($result);
    }
    if ($action === 'registerAccount') {
        $body = Http::body();
        $result = $accounts->register(
            (string)($body['name'] ?? ''),
            (string)($body['email'] ?? ''),
            (string)($body['password'] ?? '')
        );
        $result['player']['isAdmin'] = $admin->isAllowed($result['player']['accountEmail']);
        Http::success($result, 201);
    }

    $token = Http::token();
    $stmt = $db->prepare(
        'SELECT p.id, p.name, p.account_email, pp.tutorial_completed_at
         FROM players p LEFT JOIN player_progression pp ON pp.player_id = p.id
         WHERE p.token_hash = ? AND p.is_bot = 0'
    );
    $stmt->execute([hash('sha256', $token)]);
    $player = $stmt->fetch();
    if (!$player) {
        throw new ApiException('UNAUTHENTICATED', 'Ungültiger Spieler-Token.', 401);
    }
    $playerId = (string)$player['id'];
    $isAccount = $player['account_email'] !== null;
    $isAdmin = $admin->isAllowed($isAccount ? (string)$player['account_email'] : null);
    $db->prepare('UPDATE players SET last_seen_at = CURRENT_TIMESTAMP WHERE id = ?')->execute([$playerId]);
    $body = in_array($_SERVER['REQUEST_METHOD'] ?? 'GET', ['POST', 'PUT', 'PATCH'], true) ? Http::body() : [];

    match ($action) {
        'me' => Http::success(['player' => [
            'id' => $playerId,
            'name' => $player['name'],
            'tutorialCompleted' => $player['tutorial_completed_at'] !== null,
            'isAccount' => $isAccount,
            'accountEmail' => $isAccount ? $player['account_email'] : null,
            'isAdmin' => $isAdmin,
        ]]),
        'linkAccount' => (function () use ($accounts, $admin, $playerId, $body): void {
            $result = $accounts->linkGuest($playerId, (string)($body['email'] ?? ''), (string)($body['password'] ?? ''));
            $result['player']['isAdmin'] = $admin->isAllowed($result['player']['accountEmail']);
            Http::success($result);
        })(),
        'loadout' => (function () use ($accounts, $playerId, $isAccount): void {
            if (!$isAccount) throw new ApiException('ACCOUNT_REQUIRED', 'Melde dich an, um deinen Stack geräteübergreifend zu speichern.', 403);
            Http::success(['deck' => $accounts->loadout($playerId)]);
        })(),
        'deckSlots' => (function () use ($accounts, $playerId, $isAccount): void {
            if (!$isAccount) throw new ApiException('ACCOUNT_REQUIRED', 'Melde dich an, um eigene Stacks zu speichern.', 403);
            Http::success($accounts->deckSlots($playerId));
        })(),
        'createDeckSlot' => (function () use ($accounts, $catalog, $playerId, $isAccount, $body): void {
            if (!$isAccount) throw new ApiException('ACCOUNT_REQUIRED', 'Melde dich an, um eigene Stacks zu speichern.', 403);
            $deck = (array)($body['deck'] ?? []); $catalog->validateDeck($deck);
            Http::success($accounts->createDeckSlot($playerId, (string)($body['name'] ?? ''), $deck), 201);
        })(),
        'updateDeckSlot' => (function () use ($accounts, $catalog, $playerId, $isAccount, $body): void {
            if (!$isAccount) throw new ApiException('ACCOUNT_REQUIRED', 'Melde dich an, um eigene Stacks zu speichern.', 403);
            $deck = (array)($body['deck'] ?? []); $catalog->validateDeck($deck);
            Http::success($accounts->updateDeckSlot($playerId, (string)($body['slotId'] ?? ''), (string)($body['name'] ?? ''), $deck));
        })(),
        'activateDeckSlot' => (function () use ($accounts, $playerId, $isAccount, $body): void {
            if (!$isAccount) throw new ApiException('ACCOUNT_REQUIRED', 'Melde dich an, um eigene Stacks zu speichern.', 403);
            Http::success($accounts->activateDeckSlot($playerId, (string)($body['slotId'] ?? '')));
        })(),
        'duplicateDeckSlot' => (function () use ($accounts, $playerId, $isAccount, $body): void {
            if (!$isAccount) throw new ApiException('ACCOUNT_REQUIRED', 'Melde dich an, um eigene Stacks zu speichern.', 403);
            Http::success($accounts->duplicateDeckSlot($playerId, (string)($body['slotId'] ?? ''), (string)($body['name'] ?? '')), 201);
        })(),
        'deleteDeckSlot' => (function () use ($accounts, $playerId, $isAccount, $body): void {
            if (!$isAccount) throw new ApiException('ACCOUNT_REQUIRED', 'Melde dich an, um eigene Stacks zu speichern.', 403);
            Http::success($accounts->deleteDeckSlot($playerId, (string)($body['slotId'] ?? '')));
        })(),
        'saveLoadout' => (function () use ($accounts, $catalog, $playerId, $isAccount, $body): void {
            if (!$isAccount) throw new ApiException('ACCOUNT_REQUIRED', 'Melde dich an, um eigene Stacks zu speichern.', 403);
            $deck = (array)($body['deck'] ?? []);
            $catalog->validateDeck($deck);
            $accounts->saveLoadout($playerId, $deck);
            Http::success();
        })(),
        'collection' => (function () use ($collection, $playerId, $isAccount): void {
            if (!$isAccount) throw new ApiException('ACCOUNT_REQUIRED', 'Booster und Sammlung sind mit einem kostenlosen Account verfügbar.', 403);
            Http::success($collection->snapshot($playerId));
        })(),
        'openBooster' => (function () use ($collection, $playerId, $isAccount): void {
            if (!$isAccount) throw new ApiException('ACCOUNT_REQUIRED', 'Booster und Sammlung sind mit einem kostenlosen Account verfügbar.', 403);
            Http::success($collection->openBooster($playerId), 201);
        })(),
        'buyBooster' => (function () use ($collection, $playerId, $isAccount): void {
            if (!$isAccount) throw new ApiException('ACCOUNT_REQUIRED', 'Booster and collection require a free account.', 403);
            Http::success($collection->buyBooster($playerId), 201);
        })(),
        'salvageDuplicates' => (function () use ($collection, $playerId, $isAccount): void {
            if (!$isAccount) throw new ApiException('ACCOUNT_REQUIRED', 'Die Sammlung benötigt einen kostenlosen Account.', 403);
            Http::success($collection->salvageDuplicates($playerId));
        })(),
        'craftCard' => (function () use ($collection, $playerId, $isAccount, $body): void {
            if (!$isAccount) throw new ApiException('ACCOUNT_REQUIRED', 'Die Sammlung benötigt einen kostenlosen Account.', 403);
            Http::success($collection->craft($playerId, (string)($body['definitionId'] ?? '')));
        })(),
        'claimContract' => (function () use ($collection, $playerId, $isAccount, $body): void {
            if (!$isAccount) throw new ApiException('ACCOUNT_REQUIRED', 'Contracts benötigen einen kostenlosen Account.', 403);
            Http::success($collection->claimContract($playerId, (string)($body['key'] ?? '')));
        })(),
        'submitMatchFeedback' => (function () use ($feedback, $playerId, $body): void {
            $feedback->submit($playerId, strtoupper(trim((string)($body['roomCode'] ?? ''))), (string)($body['rating'] ?? ''));
            Http::success();
        })(),
        'adminOverview' => (function () use ($admin, $player, $isAccount): void {
            $admin->assertAllowed($isAccount ? (string)$player['account_email'] : null);
            Http::success($admin->overview());
        })(),
        'adminPlayers' => (function () use ($admin, $player, $isAccount): void {
            $admin->assertAllowed($isAccount ? (string)$player['account_email'] : null);
            Http::success(['players' => $admin->players((string)($_GET['query'] ?? ''))]);
        })(),
        'adminPlayer' => (function () use ($admin, $player, $isAccount): void {
            $admin->assertAllowed($isAccount ? (string)$player['account_email'] : null);
            Http::success($admin->player((string)($_GET['playerId'] ?? '')));
        })(),
        'adminUpdatePlayer' => (function () use ($admin, $player, $playerId, $isAccount, $body): void {
            $admin->assertAllowed($isAccount ? (string)$player['account_email'] : null);
            $credits = $body['credits'] ?? null;
            $boosters = $body['boosterBalance'] ?? null;
            $components = $body['components'] ?? null;
            if ((!is_int($credits) && !(is_string($credits) && ctype_digit($credits))) || (!is_int($boosters) && !(is_string($boosters) && ctype_digit($boosters))) || (!is_int($components) && !(is_string($components) && ctype_digit($components)))) {
                throw new ApiException('INVALID_ADMIN_VALUE', 'Credits und Booster müssen ganze, nichtnegative Zahlen sein.', 422);
            }
            Http::success($admin->updateProgression($playerId, (string)($body['playerId'] ?? ''), (int)$credits, (int)$boosters, (int)$components));
        })(),
        'adminResetCollections' => (function () use ($admin, $player, $playerId, $isAccount, $body): void {
            $admin->assertAllowed($isAccount ? (string)$player['account_email'] : null);
            if (($body['confirmation'] ?? '') !== 'RESET ALL' || ($body['doubleConfirmed'] ?? false) !== true) {
                throw new ApiException('RESET_CONFIRMATION_REQUIRED', 'Bestätige den Reset doppelt und gib RESET ALL ein.', 422);
            }
            Http::success($admin->resetAllCollections($playerId));
        })(),
        'adminDeleteGuestPlayers' => (function () use ($admin, $player, $playerId, $isAccount, $body): void {
            $admin->assertAllowed($isAccount ? (string)$player['account_email'] : null);
            if (($body['confirmation'] ?? '') !== 'DELETE GUESTS' || ($body['doubleConfirmed'] ?? false) !== true) {
                throw new ApiException('DELETE_CONFIRMATION_REQUIRED', 'Bestätige die Gastlöschung doppelt und gib DELETE GUESTS ein.', 422);
            }
            Http::success($admin->deleteAllGuestPlayers($playerId));
        })(),
        'adminBalanceReport' => (function () use ($admin, $balanceLab, $player, $isAccount): void {
            $admin->assertAllowed($isAccount ? (string)$player['account_email'] : null);
            Http::success(['report' => $balanceLab->latest()]);
        })(),
        'adminRunBalanceSimulation' => (function () use ($admin, $balanceLab, $player, $playerId, $isAccount, $body): void {
            $admin->assertAllowed($isAccount ? (string)$player['account_email'] : null);
            $samples = max(2, min(100, (int)($body['matchesPerPair'] ?? 12)));
            Http::success($balanceLab->run($playerId, $samples), 201);
        })(),
        'adminReviewBalanceRecommendation' => (function () use ($admin, $balanceLab, $player, $playerId, $isAccount, $body): void {
            $admin->assertAllowed($isAccount ? (string)$player['account_email'] : null);
            $reportId = (string)($body['reportId'] ?? ''); $recommendationId = (string)($body['recommendationId'] ?? '');
            if ($reportId === '' || $recommendationId === '') throw new ApiException('BALANCE_REVIEW_REQUIRED', 'Report und Empfehlung sind erforderlich.', 422);
            Http::success(['reviews' => $balanceLab->review($playerId, $reportId, $recommendationId, (string)($body['status'] ?? 'open'), (string)($body['note'] ?? ''))]);
        })(),
        'createMatch' => (function () use ($matches, $accounts, $playerId, $player, $body, $isAccount): void {
            $deck = $isAccount ? ($accounts->loadout($playerId) ?? (array)($body['deck'] ?? [])) : (array)($body['deck'] ?? []);
            Http::success($matches->create($playerId, $player['name'], (string)($body['mode'] ?? ''), $deck, $isAccount, (string)($body['botProfile'] ?? 'junior')), 201);
        })(),
        'createTutorial' => Http::success($matches->createTutorial($playerId, $player['name']), 201),
        'joinMatch' => (function () use ($matches, $accounts, $playerId, $player, $body, $isAccount): void {
            $deck = $isAccount ? ($accounts->loadout($playerId) ?? (array)($body['deck'] ?? [])) : (array)($body['deck'] ?? []);
            Http::success($matches->join($playerId, $player['name'], strtoupper(trim((string)($body['roomCode'] ?? ''))), $deck, $isAccount));
        })(),
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
