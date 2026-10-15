<?php
declare(strict_types=1);

/**
 * End-to-end API smoke test. Run it only against a disposable local database:
 * RUNTIME_API_URL=http://127.0.0.1:8080/index.php php tests/api-integration.php
 */

$baseUrl = rtrim((string)(getenv('RUNTIME_API_URL') ?: ($argv[1] ?? 'http://127.0.0.1:8080/index.php')), '?');

function expectApi(bool $condition, string $message): void
{
    if (!$condition) throw new RuntimeException($message);
}

/** @return array{status:int,payload:array<string,mixed>} */
function apiRequest(string $baseUrl, string $action, string $method = 'GET', ?array $body = null, ?string $token = null): array
{
    $headers = ['Accept: application/json'];
    $options = ['method' => $method, 'ignore_errors' => true, 'header' => $headers];
    if ($token !== null) $headers[] = 'X-Player-Token: ' . $token;
    if ($body !== null) {
        $headers[] = 'Content-Type: application/json';
        $options['content'] = json_encode($body, JSON_THROW_ON_ERROR);
    }
    $options['header'] = implode("\r\n", $headers);
    $raw = file_get_contents($baseUrl . '?action=' . rawurlencode($action), false, stream_context_create(['http' => $options]));
    $statusLine = $http_response_header[0] ?? '';
    preg_match('/\s(\d{3})\s/', $statusLine, $matches);
    $status = isset($matches[1]) ? (int)$matches[1] : 0;
    $payload = json_decode((string)$raw, true);
    expectApi(is_array($payload), "{$action}: expected JSON response, got HTTP {$status}.");
    return ['status' => $status, 'payload' => $payload];
}

function data(array $response, string $action): array
{
    expectApi($response['status'] >= 200 && $response['status'] < 300, "{$action}: HTTP {$response['status']}");
    expectApi(($response['payload']['success'] ?? false) === true, "{$action}: " . json_encode($response['payload']));
    return (array)($response['payload']['data'] ?? []);
}

try {
    data(apiRequest($baseUrl, 'health'), 'health');

    $name = 'ApiCheck' . random_int(10000, 99999);
    $created = data(apiRequest($baseUrl, 'createPlayer', 'POST', ['name' => $name]), 'createPlayer');
    $token = (string)($created['token'] ?? '');
    expectApi(strlen($token) >= 32, 'createPlayer did not return a player token.');

    $identity = data(apiRequest($baseUrl, 'me', 'GET', null, $token), 'me');
    expectApi(($identity['player']['name'] ?? null) === $name, 'me returned the wrong identity.');

    $guestCollection = apiRequest($baseUrl, 'collection', 'GET', null, $token);
    expectApi($guestCollection['status'] === 403 && ($guestCollection['payload']['error']['code'] ?? null) === 'ACCOUNT_REQUIRED', 'guest collection must require an account.');

    $decks = json_decode((string)file_get_contents(__DIR__ . '/../shared/starter-decks.json'), true, 512, JSON_THROW_ON_ERROR);
    $match = data(apiRequest($baseUrl, 'createMatch', 'POST', [
        'mode' => 'single',
        'deck' => $decks['frontend-backend'],
    ], $token), 'createMatch');
    $roomCode = (string)($match['roomCode'] ?? '');
    $version = (int)($match['version'] ?? 0);
    expectApi($roomCode !== '' && $version > 0, 'createMatch returned no room code or version.');

    $action = ['type' => 'MULLIGAN', 'cardInstanceIds' => [], 'clientActionId' => 'api-integration-action-001'];
    $first = data(apiRequest($baseUrl, 'submitGameAction', 'POST', [
        'roomCode' => $roomCode,
        'expectedVersion' => $version,
        'action' => $action,
    ], $token), 'submitGameAction');
    $resolvedVersion = (int)($first['version'] ?? 0);
    expectApi($resolvedVersion > $version, 'the first action did not advance the version.');

    $replay = data(apiRequest($baseUrl, 'submitGameAction', 'POST', [
        'roomCode' => $roomCode,
        'expectedVersion' => $version,
        'action' => $action,
    ], $token), 'idempotent replay');
    expectApi(($replay['replayed'] ?? false) === true, 'a repeated client action was not recognised as a replay.');
    expectApi((int)($replay['version'] ?? 0) === $resolvedVersion, 'a replay advanced the match version.');

    data(apiRequest($baseUrl, 'leaveMatch', 'POST', ['roomCode' => $roomCode], $token), 'leaveMatch');

    data(apiRequest($baseUrl, 'logout', 'POST', [], $token), 'logout');
    $afterLogout = apiRequest($baseUrl, 'me', 'GET', null, $token);
    expectApi($afterLogout['status'] === 401 && ($afterLogout['payload']['error']['code'] ?? null) === 'UNAUTHENTICATED', 'logout did not revoke the player token.');
    echo "API integration passed\n";
} catch (Throwable $error) {
    fwrite(STDERR, "API integration failed: {$error->getMessage()}\n");
    exit(1);
}
