<?php
declare(strict_types=1);

final class Http
{
    public static function body(): array
    {
        $raw = file_get_contents('php://input');
        if ($raw === false || trim($raw) === '') {
            return [];
        }
        $data = json_decode($raw, true);
        if (!is_array($data)) {
            throw new ApiException('INVALID_JSON', 'Ungültige JSON-Anfrage.', 400);
        }
        return $data;
    }

    public static function token(): string
    {
        $token = trim((string)($_SERVER['HTTP_X_PLAYER_TOKEN'] ?? ''));
        if ($token === '' || strlen($token) < 32) {
            throw new ApiException('UNAUTHENTICATED', 'Spieler-Token fehlt.', 401);
        }
        return $token;
    }

    public static function success(array $data = [], int $status = 200): void
    {
        self::json(['success' => true, 'data' => $data], $status);
    }

    public static function error(string $code, string $message, int $status): void
    {
        self::json(['success' => false, 'error' => ['code' => $code, 'message' => $message]], $status);
    }

    private static function json(array $payload, int $status): void
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store');
        echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }
}
