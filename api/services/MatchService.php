<?php
declare(strict_types=1);

final class MatchService
{
    private MatchRepository $matches;
    private TutorialScenario $tutorial;

    public function __construct(
        private PDO $db,
        private GameEngine $engine,
        private BotPlayer $bot,
        private CardCatalog $catalog,
        private TelemetryService $telemetry,
        private BotProfiles $botProfiles,
        private ContractService $contracts
    ) {
        $this->matches = new MatchRepository($db);
        $this->tutorial = new TutorialScenario($catalog);
    }

    public function createTutorial(string $playerId, string $playerName): array
    {
        $this->db->beginTransaction();
        try {
            $code = $this->newRoomCode();
            $state = $this->engine->createState($code, 'tutorial');
            $this->engine->addPlayer($state, $playerId, $playerName, $this->catalog->starterDeck('frontend-backend'));
            [$coachId, $coachName] = $this->createBotIdentity('Runtime Coach');
            $this->engine->addPlayer($state, $coachId, $coachName, $this->catalog->starterDeck('infrastructure-security'), true);
            $this->tutorial->initialize($state, $playerId, $coachId);
            $matchId = $this->matches->create($code, 'single', $playerId, $state);
            $this->matches->addPlayer($matchId, $playerId, 0);
            $this->matches->addPlayer($matchId, $coachId, 1);
            $this->matches->save($matchId, $state, 2);
            $this->db->commit();
            return ['roomCode' => $code, 'version' => 2, 'state' => PlayerView::build($state, $playerId)];
        } catch (Throwable $error) {
            $this->db->rollBack();
            throw $error;
        }
    }

    public function create(string $playerId, string $playerName, string $mode, array $deck, bool $isAccount = true, string $botProfile = 'junior'): array
    {
        if (!in_array($mode, ['single', 'multi'], true)) {
            throw new ApiException('INVALID_MODE', 'Ungültiger Spielmodus.');
        }
        $this->catalog->validateDeck($deck);
        if (!$isAccount && !$this->catalog->isStarterDeck($deck)) {
            throw new ApiException('ACCOUNT_REQUIRED_FOR_CUSTOM_DECK', 'Als Gast kannst du einen der drei freien Starter-Stacks spielen.');
        }
        $this->db->beginTransaction();
        try {
            $code = $this->newRoomCode();
            $state = $this->engine->createState($code, $mode);
            $this->engine->addPlayer($state, $playerId, $playerName, $deck);
            $matchId = $this->matches->create($code, $mode, $playerId, $state);
            $this->matches->addPlayer($matchId, $playerId, 0);
            if ($mode === 'single') {
                $profile = $this->botProfiles->get($botProfile);
                [$botId, $botName] = $this->createBotIdentity((string)$profile['name']);
                $botDeck = (array)$profile['deck'];
                $this->engine->addPlayer($state, $botId, $botName, $botDeck, true);
                $state['players'][$botId]['botProfile'] = $botProfile;
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

    public function join(string $playerId, string $playerName, string $roomCode, array $deck, bool $isAccount = true): array
    {
        $this->catalog->validateDeck($deck);
        if (!$isAccount && !$this->catalog->isStarterDeck($deck)) {
            throw new ApiException('ACCOUNT_REQUIRED_FOR_CUSTOM_DECK', 'Als Gast kannst du einen der drei freien Starter-Stacks spielen.');
        }
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
                $this->recordFinishedMatch((int)$row['id'], $state);
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
        $startedAt = microtime(true);
        $matchId = null;
        $actionType = strtoupper((string)($action['type'] ?? 'UNKNOWN'));
        $actionId = (string)($action['clientActionId'] ?? '');
        if ($actionId !== '' && !preg_match('/^[a-zA-Z0-9_-]{12,80}$/', $actionId)) throw new ApiException('INVALID_ACTION_ID', 'Ungültige Aktionskennung.', 400);
        $this->db->beginTransaction();
        try {
            $row = $this->requireMatch($roomCode, true);
            $matchId = (int)$row['id'];
            $state = $row['state'];
            $replayedVersion = $actionId !== '' ? $this->replayedActionVersion($state, $playerId, $actionId) : null;
            if ($replayedVersion !== null) {
                $currentVersion = (int)$row['version'];
                $this->telemetry->recordAction($matchId, $playerId, $actionType, $expectedVersion, $currentVersion, $this->durationMs($startedAt), true);
                $this->db->commit();
                return ['version' => $currentVersion, 'replayed' => true, 'state' => PlayerView::build($state, $playerId)];
            }
            if ((int)$row['version'] !== $expectedVersion) throw new ApiException('VERSION_CONFLICT', 'Der Match-Stand hat sich geändert.', 409);
            if ($state['status'] === 'active' && $state['mode'] === 'multi' && $state['turnDeadlineAt'] !== null && strtotime($state['turnDeadlineAt']) <= time()) {
                $this->engine->endTurn($state, $state['activePlayerId'], true);
                $this->recordFinishedMatch($matchId, $state);
                $version = (int)$row['version'] + 1;
                $this->matches->save($matchId, $state, $version);
                $this->telemetry->recordAction($matchId, $playerId, $actionType, $expectedVersion, $version, $this->durationMs($startedAt), true);
                $this->db->commit();
                return ['version' => $version, 'timedOut' => true, 'state' => PlayerView::build($state, $playerId)];
            }
            if ($state['mode'] === 'tutorial') {
                if ($actionType === 'CONTINUE_TUTORIAL') $this->tutorial->continue($state, $playerId);
                else {
                    $this->tutorial->assertActionAllowed($state, $playerId, $action);
                    $this->engine->applyAction($state, $playerId, $action);
                    $this->tutorial->afterAction($state, $playerId);
                    if (($state['tutorial']['completed'] ?? false) === true) $state['tutorial']['rewardGranted'] = $this->completeTutorial($playerId);
                }
            } else $this->engine->applyAction($state, $playerId, $action);
            if ($state['mode'] === 'single' && $state['status'] === 'active') {
                $active = $state['activePlayerId'];
                if ($state['players'][$active]['isBot']) $this->bot->playTurn($state, $active);
            }
            $this->recordFinishedMatch($matchId, $state);
            $version = (int)$row['version'] + 1;
            if ($actionId !== '') $this->rememberAction($state, $playerId, $actionId, $version);
            $this->matches->save($matchId, $state, $version);
            $this->telemetry->recordAction($matchId, $playerId, $actionType, $expectedVersion, $version, $this->durationMs($startedAt), true);
            $this->db->commit();
            return ['version' => $version, 'state' => PlayerView::build($state, $playerId)];
        } catch (Throwable $error) {
            if ($this->db->inTransaction()) $this->db->rollBack();
            if ($matchId !== null) try {
                $code = $error instanceof ApiException ? $error->errorCode : 'INTERNAL_ERROR';
                $this->telemetry->recordAction($matchId, $playerId, $actionType, $expectedVersion, 0, $this->durationMs($startedAt), false, $code);
            } catch (Throwable) { /* Telemetry must never shadow gameplay errors. */ }
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

    private function createBotIdentity(?string $fixedName = null): array
    {
        $names = ['Ada.bot', 'Patchwerk', 'Null Pointer', 'Deploy Droid'];
        $name = $fixedName ?? $names[random_int(0, count($names) - 1)];
        $tokenHash = hash('sha256', bin2hex(random_bytes(32)));
        $stmt = $this->db->prepare('INSERT INTO players (name, token_hash, is_bot) VALUES (?, ?, 1)');
        $stmt->execute([$name, $tokenHash]);
        return [(string)$this->db->lastInsertId(), $name];
    }

    private function completeTutorial(string $playerId): bool
    {
        $this->db->prepare('INSERT IGNORE INTO player_progression (player_id) VALUES (?)')->execute([$playerId]);
        $statement = $this->db->prepare(
            'UPDATE player_progression
             SET tutorial_completed_at = COALESCE(tutorial_completed_at, CURRENT_TIMESTAMP),
                 tutorial_reward_claimed_at = CURRENT_TIMESTAMP,
                 booster_balance = booster_balance + 1
             WHERE player_id = ? AND tutorial_reward_claimed_at IS NULL'
        );
        $statement->execute([$playerId]);
        return $statement->rowCount() === 1;
    }

    private function recordFinishedMatch(int $matchId, array &$state): void
    {
        if ($state['status'] !== 'finished') {
            return;
        }
        if ($state['mode'] !== 'tutorial' && !($state['resultsRecorded'] ?? false)) foreach ($state['order'] as $playerId) {
            $player = $state['players'][$playerId];
            if ($player['isBot']) {
                continue;
            }
            $this->db->prepare('INSERT IGNORE INTO player_progression (player_id) VALUES (?)')->execute([$playerId]);
            $won = $state['winnerId'] === $playerId;
            $isAccount = $this->isAccount($playerId);
            $matchCredits = $isAccount ? 10 : 0;
            $winBonus = $isAccount && $won ? 15 : 0;
            $credits = $matchCredits + $winBonus;
            $rewarded = false;
            if ($won) {
                if ($isAccount) {
                    $reward = $this->db->prepare(
                        'UPDATE player_progression
                         SET matches_played = matches_played + 1, wins = wins + 1,
                             first_win_at = COALESCE(first_win_at, CURRENT_TIMESTAMP),
                             first_win_reward_claimed_at = CURRENT_TIMESTAMP,
                             booster_balance = booster_balance + 1,
                             credits = credits + ?, total_credits_earned = total_credits_earned + ?
                         WHERE player_id = ? AND first_win_reward_claimed_at IS NULL'
                    );
                    $reward->execute([$credits, $credits, $playerId]);
                    $rewarded = $reward->rowCount() === 1;
                }
                if (!$rewarded) {
                    $this->db->prepare('UPDATE player_progression SET matches_played = matches_played + 1, wins = wins + 1, credits = credits + ?, total_credits_earned = total_credits_earned + ? WHERE player_id = ?')
                        ->execute([$credits, $credits, $playerId]);
                }
            } else {
                $this->db->prepare('UPDATE player_progression SET matches_played = matches_played + 1, losses = losses + 1, credits = credits + ?, total_credits_earned = total_credits_earned + ? WHERE player_id = ?')
                    ->execute([$credits, $credits, $playerId]);
            }
            $state['matchRewards'][$playerId] = [
                'firstWinBooster' => $rewarded,
                'credits' => $credits,
                'matchCredits' => $matchCredits,
                'winBonus' => $winBonus,
            ];
            if ($isAccount) $this->contracts->recordMatch($playerId, $won, (int)($player['matchStats']['servicesDeployed'] ?? 0));
        }
        if ($state['mode'] !== 'tutorial') $state['resultsRecorded'] = true;
        $this->telemetry->recordSummary($matchId, $state);
    }

    private function isAccount(string $playerId): bool
    {
        $statement = $this->db->prepare('SELECT account_email FROM players WHERE id = ?');
        $statement->execute([$playerId]);
        $player = $statement->fetch();
        return $player !== false && $player['account_email'] !== null;
    }

    private function replayedActionVersion(array $state, string $playerId, string $actionId): ?int
    {
        $version = $state['actionReceipts'][$playerId][$actionId]['version'] ?? null;
        return is_int($version) || ctype_digit((string)$version) ? (int)$version : null;
    }

    private function rememberAction(array &$state, string $playerId, string $actionId, int $version): void
    {
        $receipts = (array)($state['actionReceipts'][$playerId] ?? []);
        $receipts[$actionId] = ['version' => $version];
        if (count($receipts) > 20) $receipts = array_slice($receipts, -20, null, true);
        $state['actionReceipts'][$playerId] = $receipts;
    }

    private function durationMs(float $startedAt): int
    {
        return max(0, (int)round((microtime(true) - $startedAt) * 1000));
    }
}
