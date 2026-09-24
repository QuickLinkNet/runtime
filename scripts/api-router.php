<?php
declare(strict_types=1);

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';

if ($path === '/api/index.php' || $path === '/index.php') {
    require dirname(__DIR__) . DIRECTORY_SEPARATOR . 'api' . DIRECTORY_SEPARATOR . 'index.php';
    return true;
}

http_response_code(404);
header('Content-Type: application/json; charset=utf-8');
echo json_encode([
    'success' => false,
    'error' => ['code' => 'NOT_FOUND', 'message' => 'API-Pfad nicht gefunden.'],
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
return true;
