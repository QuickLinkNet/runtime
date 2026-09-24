<?php
declare(strict_types=1);

final class MatchService
{
    private MatchRepository $matches;

    public function __construct(
        private PDO $db,
        private GameEngine $engine,
        private BotPlayer $bot,
        private CardCatalog $catalog
    ) {
        $this->matches = new MatchRepository($db);
    }

    public function create(string $playerId, string $playerName, string $mode, array $deck): array
    {
        if (!in_array($mode, ['single', 'multi'], true)) {
            throw new ApiException('INVALID_MODE', 'Ungültiger Spielmodus.');
        }
        $this->catalog->validateDeck($deck);
        $this->db->beginTransaction();
        try {
            $code = $this->newRoomCode();
            $state = $this->engine->createState($code, $mode);
            $this->engine->addPlayer($state, $playerId, $playerName, $deck);
            $matchId = $this->matches->create($code, $mode, $playerId, $state);
            $this->matches->addPlayer($matchId, $playerId, 0);
            if ($mode === 'single') {
                [$botId, $botName] = $this->createBotIdentity();
                $botDeck = $this->catalog->starterDeck('data-ai');
                $this->engine->addPlayer($state, $botId, $botName, $botDeck, true);
                $this->matches->addPlayer($matchId, $botId, 1);
                $this->engine->startMatch($state);
                $this->matches->save($matchId, $state, 2);
                $version = 2;
            } else {
                $version = 1;
            }
            $this->db->commit();
            return ['roomCode' => $code, 'version' => $version, 'state' => PlayerView::build($state, $playerId)];
        } catch (Throwable $error) {
            $this->db->rollBack();
            throw $error;
        }
    }

    public function join(string $playerId, string $playerName, string $roomCode, array $deck): array
    {
        $this->catalog->validateDeck($deck);
        $this->db->beginTransaction();
        try {
            $row = $this->requireMatch($roomCode, true);
            if ($row['state']['status'] !== 'lobby') {
                throw new ApiException('MATCH_NOT_JOINABLE', 'Dieses Match kann nicht mehr betreten werden.', 409);
            }
            $state = $row['state'];
            $this->engine->addPlayer($state, $playerId, $playerName, $deck);
            $this->matches->addPlayer((int)$row['id'], $playerId, 1);
            $version = (int)$row['version'] + 1;
            $this->matches->save((int)$row['id'], $state, $version);
            $this->db->commit();
            return ['roomCode' => $roomCode, 'version' => $version, 'state' => PlayerView::build($state, $playerId)];
        } catch (Throwable $error) {
            $this->db->rollBack();
            throw $error;
        }
    }

    public function start(string $playerId, string $roomCode): array
    {
        $this->db->beginTransaction();
        try {
            $row = $this->requireMatch($roomCode, true);
            if ((string)$row['owner_player_id'] !== $playerId) {
                throw new ApiException('NOT_MATCH_OWNER', 'Nur der Raumersteller kann das Match starten.', 403);
            }
            $state = $row['state'];
            $this->engine->startMatch($state);
            $version = (int)$row['version'] + 1;
            $this->matches->save((int)$row['id'], $state, $version);
            $this->db->commit();
            return ['version' => $version, 'state' => PlayerView::build($state, $playerId)];
        } catch (Throwable $error) {
            $this->db->rollBack();
            throw $error;
        }
    }

    public function state(string $playerId, string $roomCode, int $knownVersion): array
    {
        $this->db->beginTransaction();
        try {
            $row = $this->requireMatch($roomCode, true);
            $state = $row['state'];
            if (!isset($state['players'][$playerId])) {
                throw new ApiException('NOT_MATCH_PLAYER', 'Du nimmst nicht an diesem Match teil.', 403);
            }
            $version = (int)$row['version'];
            if ($state['status'] === 'active' && $state['mode'] === 'multi' && $state['turnDeadlineAt'] !== null && strtotime($state['turnDeadlineAt']) <= time()) {
                $this->engine->endTurn($state, $state['activePlayerId'], true);
                $version++;
                $this->matches->save((int)$row['id'], $state, $version);
            }
            $this->db->commit();
            if ($knownVersion === $version) {
                return ['changed' => false, 'version' => $version];
            }
            return ['changed' => true, 'version' => $version, 'state' => PlayerView::build($state, $playerId)];
        } catch (Throwable $error) {
            $this->db->rollBack();
            throw $error;
        }
    }

    public function submit(string $playerId, string $roomCode, int $expectedVersion, array $action): array
    {
        $this->db->beginTransaction();
        try {
            $row = $this->requireMatch($roomCode, true);
            if ((int)$row['version'] !== $expectedVersion) {
                throw new ApiException('VERSION_CONFLICT', 'Der Match-Stand hat sich geändert.', 409);
            }
            $state = $row['state'];
            if ($state['status'] === 'active' && $state['mode'] === 'multi' && $state['turnDeadlineAt'] !== null && strtotime($state['turnDeadlineAt']) <= time()) {
                $this->engine->endTurn($state, $state['activePlayerId'], true);
                $version = (int)$row['version'] + 1;
                $this->matches->save((int)$row['id'], $state, $version);
                $this->db->commit();
                return ['version' => $version, 'timedOut' => true, 'state' => PlayerView::build($state, $playerId)];
            }
            $this->engine->applyAction($state, $playerId, $action);
            if ($state['mode'] === 'single' && $state['status'] === 'active') {
                $active = $state['activePlayerId'];
                if ($state['players'][$active]['isBot']) {
                    $this->bot->playTurn($state, $active);
                }
            }
            $version = (int)$row['version'] + 1;
            $this->matches->save((int)$row['id'], $state, $version);
            $this->db->commit();
            return ['version' => $version, 'state' => PlayerView::build($state, $playerId)];
        } catch (Throwable $error) {
            $this->db->rollBack();
            throw $error;
        }
    }

    public function resume(string $playerId): ?array
    {
        $row = $this->matches->activeForPlayer($playerId);
        if ($row === null) {
            return null;
        }
        return [
            'roomCode' => $row['room_code'],
            'version' => (int)$row['version'],
            'state' => PlayerView::build($row['state'], $playerId),
        ];
    }

    public function leave(string $playerId, string $roomCode): void
    {
        $this->db->beginTransaction();
        try {
            $row = $this->requireMatch($roomCode, true);
            $state = $row['state'];
            if (!isset($state['players'][$playerId])) {
                throw new ApiException('NOT_MATCH_PLAYER', 'Du nimmst nicht an diesem Match teil.', 403);
            }
            $state['status'] = 'abandoned';
            $state['finishReason'] = 'PLAYER_LEFT';
            $this->matches->save((int)$row['id'], $state, (int)$row['version'] + 1);
            $this->db->commit();
        } catch (Throwable $error) {
            $this->db->rollBack();
            throw $error;
        }
    }

    private function requireMatch(string $roomCode, bool $forUpdate): array
    {
        $row = $this->matches->findByCode(strtoupper($roomCode), $forUpdate);
        if ($row === null) {
            throw new ApiException('MATCH_NOT_FOUND', 'Raum nicht gefunden.', 404);
        }
        return $row;
    }

    private function newRoomCode(): string
    {
        $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        for ($attempt = 0; $attempt < 10; $attempt++) {
            $code = '';
            for ($i = 0; $i < 5; $i++) {
                $code .= $alphabet[random_int(0, strlen($alphabet) - 1)];
            }
            if ($this->matches->findByCode($code) === null) {
                return $code;
            }
        }
        throw new RuntimeException('Room code generation failed.');
    }

    private function createBotIdentity(): array
    {
        $names = ['Ada.bot', 'Patchwerk', 'Null Pointer', 'Deploy Droid'];
        $name = $names[random_int(0, count($names) - 1)];
        $tokenHash = hash('sha256', bin2hex(random_bytes(32)));
        $stmt = $this->db->prepare('INSERT INTO players (name, token_hash, is_bot) VALUES (?, ?, 1)');
        $stmt->execute([$name, $tokenHash]);
        return [(string)$this->db->lastInsertId(), $name];
    }
}
