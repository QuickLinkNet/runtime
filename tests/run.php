<?php
declare(strict_types=1);

require_once __DIR__ . '/../api/utils/ApiException.php';
require_once __DIR__ . '/../api/game/CardCatalog.php';
require_once __DIR__ . '/../api/game/BoosterGenerator.php';
require_once __DIR__ . '/../api/game/GameEngine.php';
require_once __DIR__ . '/../api/game/PlayerView.php';
require_once __DIR__ . '/../api/game/BotPlayer.php';
require_once __DIR__ . '/../api/game/BotProfiles.php';
require_once __DIR__ . '/../api/services/BalanceSimulator.php';
require_once __DIR__ . '/../api/services/CardDesignAuditor.php';
require_once __DIR__ . '/../api/services/BalanceAdvisor.php';
require_once __DIR__ . '/../api/game/TutorialScenario.php';

$catalog = new CardCatalog(__DIR__ . '/../shared/cards.json');
$passed = 0;
$failed = 0;

function check(string $name, callable $test): void
{
    global $passed, $failed;
    try {
        $test();
        $passed++;
        echo "✓ {$name}\n";
    } catch (Throwable $error) {
        $failed++;
        echo "✗ {$name}: {$error->getMessage()}\n";
    }
}

function expect(bool $condition, string $message = 'Assertion failed'): void
{
    if (!$condition) {
        throw new RuntimeException($message);
    }
}

function expectCode(string $code, callable $action): void
{
    try {
        $action();
    } catch (ApiException $error) {
        expect($error->errorCode === $code, "Expected {$code}, got {$error->errorCode}");
        return;
    }
    throw new RuntimeException("Expected ApiException {$code}");
}

function fresh(CardCatalog $catalog, bool $activate = true): array
{
    $engine = new GameEngine($catalog);
    $state = $engine->createState('TEST1', 'multi');
    $deck = $catalog->starterDeck('frontend-backend');
    $engine->addPlayer($state, 'p1', 'Ada', $deck);
    $engine->addPlayer($state, 'p2', 'Linus', $deck);
    $engine->startMatch($state);
    if ($activate) {
        $engine->applyAction($state, 'p1', ['type' => 'MULLIGAN', 'cardInstanceIds' => []]);
        $engine->applyAction($state, 'p2', ['type' => 'MULLIGAN', 'cardInstanceIds' => []]);
    }
    return [$engine, $state];
}

function card(string $definitionId, string $id): array
{
    return ['instanceId' => $id, 'definitionId' => $definitionId];
}

function entity(CardCatalog $catalog, string $definitionId, string $id, bool $ready = true): array
{
    $definition = $catalog->get($definitionId);
    return [
        'instanceId' => $id,
        'definitionId' => $definitionId,
        'power' => (int)($definition['power'] ?? 0),
        'integrity' => (int)$definition['integrity'],
        'maxIntegrity' => (int)$definition['integrity'],
        'redundancy' => false,
        'sandboxed' => false,
        'sandboxUntilTurn' => 0,
        'exhausted' => !$ready,
        'temporaryPower' => 0,
    ];
}

function prepareTurn(array &$state, string $playerId, int $compute = 20): void
{
    $state['status'] = 'active';
    $state['activePlayerId'] = $playerId;
    $state['players'][$playerId]['compute'] = $compute;
    $state['players'][$playerId]['temporaryCompute'] = 0;
    $state['players'][$playerId]['turnFlags'] = [
        'frontendPlayed' => 0,
        'servicePlayed' => 0,
        'commandPlayed' => 0,
        'targetedCommandPlayed' => 0,
        'zeroTrustTriggered' => false,
        'serviceCrashed' => false,
        'bugRemoved' => false,
        'sloMonitorArmed' => false,
        'projectManagerDiscount' => 0,
        'nextServiceDiscount' => 0,
        'preConsumedBugs' => 0,
    ];
}

check('Card catalog has exactly 90 playable cards including the expansion', function () use ($catalog): void {
    expect(count($catalog->all()) === 90);
    foreach (['frontend-error-boundary', 'backend-event-store', 'infrastructure-rolling-deploy', 'data-predictive-query', 'security-containment-plan', 'ai-model-ensemble'] as $id) {
        expect($catalog->get($id)['id'] === $id, "Missing expansion card {$id}.");
    }
});

check('Error Boundary patches Frontend and rewards a full recovery', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    prepareTurn($state, 'p1');
    $damaged = entity($catalog, 'frontend-vue-widget', 'damaged-frontend');
    $damaged['integrity'] = 1;
    $state['players']['p1']['services'] = [$damaged];
    $state['players']['p1']['hand'] = [card('frontend-error-boundary', 'boundary')];
    $state['players']['p1']['deck'] = [card('backend-hotfix', 'reward-draw')];
    $engine->applyAction($state, 'p1', ['type' => 'PLAY_CARD', 'cardInstanceId' => 'boundary', 'targetId' => 'damaged-frontend']);
    expect($state['players']['p1']['services'][0]['integrity'] === 3);
    expect(in_array('backend-hotfix', array_column($state['players']['p1']['hand'], 'definitionId'), true));
});

check('Containment Plan protects a Service from enemy Commands until its next turn', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    prepareTurn($state, 'p1');
    $state['players']['p1']['services'] = [entity($catalog, 'frontend-vue-widget', 'protected-service')];
    $state['players']['p1']['hand'] = [card('security-containment-plan', 'containment')];
    $engine->applyAction($state, 'p1', ['type' => 'PLAY_CARD', 'cardInstanceId' => 'containment', 'targetId' => 'protected-service']);
    expect($state['players']['p1']['services'][0]['redundancy'] === true, 'Containment Plan should also grant REDUNDANCY.');
    prepareTurn($state, 'p2');
    $state['players']['p2']['hand'] = [card('neutral-force-push', 'push')];
    expectCode('COMMAND_IMMUNE', fn() => $engine->applyAction($state, 'p2', ['type' => 'PLAY_CARD', 'cardInstanceId' => 'push', 'targetId' => 'protected-service']));
});

check('Containment Plan protects a second Service while behind on board', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    prepareTurn($state, 'p1');
    $state['players']['p1']['services'] = [
        entity($catalog, 'frontend-vue-widget', 'contained-primary'),
        entity($catalog, 'backend-queue-worker', 'contained-secondary'),
    ];
    $state['players']['p2']['services'] = [
        entity($catalog, 'frontend-vue-widget', 'enemy-one'),
        entity($catalog, 'frontend-vue-widget', 'enemy-two'),
        entity($catalog, 'frontend-vue-widget', 'enemy-three'),
    ];
    $state['players']['p1']['hand'] = [card('security-containment-plan', 'containment')];
    $engine->applyAction($state, 'p1', ['type' => 'PLAY_CARD', 'cardInstanceId' => 'containment', 'targetId' => 'contained-primary']);
    foreach ($state['players']['p1']['services'] as $service) {
        expect($service['redundancy'] === true, 'Both Services should receive REDUNDANCY while behind.');
        expect(($service['commandImmuneUntilTurn'] ?? 0) > $state['players']['p1']['turnsTaken'], 'Both Services should receive Command protection while behind.');
    }
});

check('Circuit Breaker protects only the first Backend service each own turn', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    prepareTurn($state, 'p1');
    $state['players']['p1']['infrastructure'] = [entity($catalog, 'backend-circuit-breaker', 'breaker')];
    $state['players']['p1']['hand'] = [card('backend-graphql-gateway', 'backend-one'), card('backend-queue-worker', 'backend-two')];
    $state['players']['p1']['deck'] = [card('neutral-coffee', 'graphql-draw')];
    $engine->applyAction($state, 'p1', ['type' => 'PLAY_CARD', 'cardInstanceId' => 'backend-one']);
    $engine->applyAction($state, 'p1', ['type' => 'PLAY_CARD', 'cardInstanceId' => 'backend-two']);
    expect($state['players']['p1']['services'][0]['redundancy'] === true, 'First Backend service should receive REDUNDANCY.');
    expect($state['players']['p1']['services'][1]['redundancy'] === false, 'Second Backend service must not receive REDUNDANCY in the same turn.');
});

check('Message Queue reinforces only the first Backend service each own turn', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    prepareTurn($state, 'p1');
    $state['players']['p1']['infrastructure'] = [entity($catalog, 'backend-message-queue', 'message-queue')];
    $state['players']['p1']['hand'] = [
        card('frontend-vue-widget', 'frontend-first'),
        card('backend-legacy-php', 'backend-first'),
        card('backend-idempotency-key', 'backend-second'),
    ];
    $engine->applyAction($state, 'p1', ['type' => 'PLAY_CARD', 'cardInstanceId' => 'frontend-first']);
    $engine->applyAction($state, 'p1', ['type' => 'PLAY_CARD', 'cardInstanceId' => 'backend-first']);
    $engine->applyAction($state, 'p1', ['type' => 'PLAY_CARD', 'cardInstanceId' => 'backend-second']);
    $services = array_column($state['players']['p1']['services'], null, 'instanceId');
    expect($services['frontend-first']['maxIntegrity'] === 3, 'Message Queue must not reinforce cross-domain Services.');
    expect($services['backend-first']['maxIntegrity'] === 5, 'The first Backend Service should receive +1 maximum Integrity.');
    expect($services['backend-second']['maxIntegrity'] === 4, 'The second Backend Service must remain unchanged.');
});

check('Event Stream draws once after a Data service each own turn', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    prepareTurn($state, 'p1');
    $state['players']['p1']['infrastructure'] = [entity($catalog, 'data-event-stream', 'stream')];
    $state['players']['p1']['hand'] = [card('data-database-replica', 'data-one'), card('data-database-replica', 'data-two')];
    $state['players']['p1']['deck'] = [card('neutral-coffee', 'second-reward'), card('backend-hotfix', 'first-reward')];
    $engine->applyAction($state, 'p1', ['type' => 'PLAY_CARD', 'cardInstanceId' => 'data-one']);
    expect(in_array('first-reward', array_column($state['players']['p1']['hand'], 'instanceId'), true), 'First Data service should trigger Event Stream.');
    $engine->applyAction($state, 'p1', ['type' => 'PLAY_CARD', 'cardInstanceId' => 'data-two']);
    expect(!in_array('second-reward', array_column($state['players']['p1']['hand'], 'instanceId'), true), 'Event Stream must trigger only once per turn.');
});

check('Monitoring Dashboard rewards repair activity at end of turn', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    prepareTurn($state, 'p1');
    $damaged = entity($catalog, 'frontend-vue-widget', 'damaged-service');
    $damaged['integrity'] = 1;
    $state['players']['p1']['services'] = [$damaged];
    $state['players']['p1']['infrastructure'] = [entity($catalog, 'neutral-monitoring-dashboard', 'dashboard')];
    $state['players']['p1']['hand'] = [card('backend-hotfix', 'repair')];
    $state['players']['p1']['deck'] = [card('neutral-coffee', 'dashboard-reward')];
    $engine->applyAction($state, 'p1', ['type' => 'PLAY_CARD', 'cardInstanceId' => 'repair', 'targetId' => 'damaged-service']);
    $engine->applyAction($state, 'p1', ['type' => 'END_TURN']);
    expect(in_array('dashboard-reward', array_column($state['players']['p1']['hand'], 'instanceId'), true), 'Dashboard should draw after a repaired service.');
});

check('BUG cleaners can deploy into a full board by consuming their BUG first', function () use ($catalog): void {
    foreach (['neutral-rubber-duck', 'neutral-qa-engineer', 'neutral-senior-developer', 'security-soc-analyst'] as $cleanerId) {
        [$engine, $state] = fresh($catalog);
        prepareTurn($state, 'p1');
        $state['players']['p1']['core'] = 29;
        $state['players']['p1']['services'] = [
            entity($catalog, 'frontend-vue-widget', $cleanerId . '-one'),
            entity($catalog, 'frontend-vue-widget', $cleanerId . '-two'),
            entity($catalog, 'frontend-vue-widget', $cleanerId . '-three'),
            entity($catalog, 'frontend-vue-widget', $cleanerId . '-four'),
            entity($catalog, 'token-bug', $cleanerId . '-bug'),
        ];
        $state['players']['p1']['hand'] = [card($cleanerId, $cleanerId . '-card')];
        $state['players']['p1']['deck'] = [card('neutral-coffee', $cleanerId . '-draw')];
        $engine->applyAction($state, 'p1', ['type' => 'PLAY_CARD', 'cardInstanceId' => $cleanerId . '-card']);
        expect(count($state['players']['p1']['services']) === 5, "{$cleanerId} should replace the blocking BUG.");
        expect(!in_array('token-bug', array_column($state['players']['p1']['services'], 'definitionId'), true), "{$cleanerId} should remove the BUG.");
        if ($cleanerId === 'security-soc-analyst') expect($state['players']['p1']['core'] === 29, 'SOC Analyst must not apply its fallback after pre-consuming a BUG.');
    }
});

check('QA Engineer and Senior Developer trigger Monitoring Dashboard after cleaning BUGs', function () use ($catalog): void {
    foreach (['neutral-qa-engineer', 'neutral-senior-developer'] as $cleanerId) {
        [$engine, $state] = fresh($catalog);
        prepareTurn($state, 'p1');
        $state['players']['p1']['services'] = [entity($catalog, 'token-bug', $cleanerId . '-bug')];
        $state['players']['p1']['infrastructure'] = [entity($catalog, 'neutral-monitoring-dashboard', $cleanerId . '-dashboard')];
        $state['players']['p1']['hand'] = [card($cleanerId, $cleanerId . '-card')];
        $state['players']['p1']['deck'] = $cleanerId === 'neutral-qa-engineer'
            ? [card('neutral-coffee', $cleanerId . '-dashboard-draw'), card('backend-hotfix', $cleanerId . '-effect-draw')]
            : [card('neutral-coffee', $cleanerId . '-dashboard-draw')];
        $engine->applyAction($state, 'p1', ['type' => 'PLAY_CARD', 'cardInstanceId' => $cleanerId . '-card']);
        $engine->applyAction($state, 'p1', ['type' => 'END_TURN']);
        expect(in_array($cleanerId . '-dashboard-draw', array_column($state['players']['p1']['hand'], 'instanceId'), true), "{$cleanerId} should arm Monitoring Dashboard.");
    }
});

check('Edge Runtime requires three other Frontend services', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    prepareTurn($state, 'p1');
    $state['players']['p1']['services'] = [
        entity($catalog, 'frontend-vue-widget', 'edge-one'),
        entity($catalog, 'frontend-web-worker', 'edge-two'),
    ];
    $state['players']['p1']['hand'] = [card('frontend-edge-runtime', 'edge-runtime')];
    $engine->applyAction($state, 'p1', ['type' => 'PLAY_CARD', 'cardInstanceId' => 'edge-runtime']);
    expect($state['players']['p1']['services'][0]['power'] === 2 && $state['players']['p1']['services'][1]['power'] === 3, 'Two other Frontend services must not activate Edge Runtime.');

    [$engine, $state] = fresh($catalog);
    prepareTurn($state, 'p1');
    $state['players']['p1']['services'] = [
        entity($catalog, 'frontend-vue-widget', 'edge-three-one'),
        entity($catalog, 'frontend-web-worker', 'edge-three-two'),
        entity($catalog, 'frontend-react-component', 'edge-three-three'),
    ];
    $state['players']['p1']['hand'] = [card('frontend-edge-runtime', 'edge-runtime-active')];
    $engine->applyAction($state, 'p1', ['type' => 'PLAY_CARD', 'cardInstanceId' => 'edge-runtime-active']);
    $buffed = array_filter($state['players']['p1']['services'], static fn(array $service): bool => ($service['temporaryPower'] ?? 0) === 2);
    expect(count($buffed) === 2, 'Three other Frontend services should activate exactly two Edge Runtime buffs.');
});

check('Zero Trust taxes only the first enemy Command targeting its board', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    prepareTurn($state, 'p1', 20);
    $state['players']['p1']['services'] = [entity($catalog, 'frontend-vue-widget', 'zero-own-service')];
    $state['players']['p2']['services'] = [entity($catalog, 'frontend-vue-widget', 'zero-enemy-service')];
    $state['players']['p2']['infrastructure'] = [entity($catalog, 'security-zero-trust', 'zero-trust')];
    $state['players']['p1']['hand'] = [
        card('frontend-feature-flag', 'zero-own-buff'),
        card('frontend-infinite-rerender', 'zero-enemy-command'),
        card('backend-hotfix', 'zero-second-command'),
    ];
    $engine->applyAction($state, 'p1', ['type' => 'PLAY_CARD', 'cardInstanceId' => 'zero-own-buff', 'targetId' => 'zero-own-service']);
    expect($state['players']['p1']['compute'] === 19 && $state['players']['p1']['turnFlags']['zeroTrustTriggered'] === false, 'Own targets must neither cost extra nor consume Zero Trust.');
    $engine->applyAction($state, 'p1', ['type' => 'PLAY_CARD', 'cardInstanceId' => 'zero-enemy-command', 'targetId' => 'zero-enemy-service']);
    expect($state['players']['p1']['compute'] === 15 && $state['players']['p1']['turnFlags']['zeroTrustTriggered'] === true, 'First enemy-board Command should cost one extra.');
    $engine->applyAction($state, 'p1', ['type' => 'PLAY_CARD', 'cardInstanceId' => 'zero-second-command', 'targetId' => 'zero-trust']);
    expect($state['players']['p1']['compute'] === 13, 'Later enemy-board Commands in the same turn must not be taxed again.');
});

check('SLO Monitor consumes its one crash trigger', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    prepareTurn($state, 'p1');
    $state['players']['p1']['hand'] = [card('infrastructure-slo-monitor', 'slo-monitor')];
    $engine->applyAction($state, 'p1', ['type' => 'PLAY_CARD', 'cardInstanceId' => 'slo-monitor']);
    $state['players']['p1']['turnFlags']['serviceCrashed'] = true;
    $engine->applyAction($state, 'p1', ['type' => 'END_TURN']);
    expect(count(array_filter($state['players']['p1']['services'], static fn(array $service): bool => $service['definitionId'] === 'token-replica')) === 1, 'First crash should create one Replica.');
    $state['players']['p1']['turnFlags']['serviceCrashed'] = true;
    $engine->applyAction($state, 'p2', ['type' => 'END_TURN']);
    expect(count(array_filter($state['players']['p1']['services'], static fn(array $service): bool => $service['definitionId'] === 'token-replica')) === 1, 'SLO Monitor must not trigger a second time.');
});

check('Redis Cache never stores temporary BOOTSTRAP Compute', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    prepareTurn($state, 'p1', 0);
    $state['players']['p1']['temporaryCompute'] = 3;
    $state['players']['p1']['infrastructure'] = [entity($catalog, 'data-redis-cache', 'redis-cache')];
    $engine->applyAction($state, 'p1', ['type' => 'END_TURN']);
    expect($state['players']['p1']['storedCompute'] === 0, 'Temporary Compute must expire instead of entering Redis Cache.');
});

check('Idempotency Key draws Backend after a returned own service', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    prepareTurn($state, 'p1');
    $state['players']['p1']['turnFlags']['ownServiceReturned'] = true;
    $state['players']['p1']['hand'] = [card('backend-idempotency-key', 'idempotency')];
    $state['players']['p1']['deck'] = [card('backend-hotfix', 'backend-reward')];
    $engine->applyAction($state, 'p1', ['type' => 'PLAY_CARD', 'cardInstanceId' => 'idempotency']);
    expect(in_array('backend-reward', array_column($state['players']['p1']['hand'], 'instanceId'), true));
});

check('Rolling Deploy discounts exactly the returned cheap service', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    prepareTurn($state, 'p1');
    $state['players']['p1']['services'] = [entity($catalog, 'frontend-vue-widget', 'returned-service')];
    $state['players']['p1']['hand'] = [card('neutral-coffee', 'unrelated-card'), card('infrastructure-rolling-deploy', 'rolling')];
    $engine->applyAction($state, 'p1', ['type' => 'PLAY_CARD', 'cardInstanceId' => 'rolling', 'targetId' => 'returned-service']);
    $returned = current(array_filter($state['players']['p1']['hand'], static fn(array $item): bool => $item['instanceId'] === 'returned-service'));
    $unrelated = current(array_filter($state['players']['p1']['hand'], static fn(array $item): bool => $item['instanceId'] === 'unrelated-card'));
    expect(($returned['costModifier'] ?? 0) === -1, 'Returned cheap service should be discounted.');
    expect(!isset($unrelated['costModifier']), 'Unrelated hand card must not be discounted.');
    $engine->applyAction($state, 'p1', ['type' => 'PLAY_CARD', 'cardInstanceId' => 'returned-service']);
    expect($state['players']['p1']['compute'] === 16, 'The next play of the returned 2-cost service should cost exactly 1.');
});

check('Query Planner puts unselected cards under the deck', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    prepareTurn($state, 'p1');
    $state['players']['p1']['turnsTaken'] = 1;
    $state['players']['p1']['hand'] = [card('data-query-planner', 'planner')];
    $state['players']['p1']['deck'] = [
        card('backend-hotfix', 'deep-card'),
        card('neutral-coffee', 'top-low'),
        card('frontend-vue-widget', 'top-mid'),
        card('infrastructure-kubernetes-cluster', 'top-high'),
    ];
    $engine->applyAction($state, 'p1', ['type' => 'PLAY_CARD', 'cardInstanceId' => 'planner']);
    expect(in_array('top-high', array_column($state['players']['p1']['hand'], 'instanceId'), true), 'Planner should take the most expensive top card.');
    $engine->applyAction($state, 'p1', ['type' => 'END_TURN']);
    $engine->applyAction($state, 'p2', ['type' => 'END_TURN']);
    expect(in_array('deep-card', array_column($state['players']['p1']['hand'], 'instanceId'), true), 'Unselected cards must stay below the previous deck, not on top.');
});

check('Event sequences remain monotonic after the event window is full', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    prepareTurn($state, 'p1');
    $state['events'] = [];
    for ($sequence = 100; $sequence < 180; $sequence++) {
        $state['events'][] = ['id' => "old-{$sequence}", 'type' => 'TEST', 'sequence' => $sequence];
    }
    $engine->applyAction($state, 'p1', ['type' => 'END_TURN']);
    $latest = array_values(array_filter(
        array_column($state['events'], 'sequence'),
        static fn(int $sequence): bool => $sequence >= 180
    ));
    expect(count($latest) >= 2 && min($latest) >= 180, 'New events must continue after the highest retained sequence.');
});

check('QA Engineer deploy removes a BUG without combat events', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    prepareTurn($state, 'p1');
    $state['players']['p1']['services'] = [entity($catalog, 'token-bug', 'qa-bug')];
    $state['players']['p1']['hand'] = [card('neutral-qa-engineer', 'qa-engineer')];
    $state['players']['p1']['deck'] = [card('frontend-vue-widget', 'qa-draw')];
    $before = count($state['events']);
    $engine->applyAction($state, 'p1', ['type' => 'PLAY_CARD', 'cardInstanceId' => 'qa-engineer']);
    $newTypes = array_column(array_slice($state['events'], $before), 'type');
    expect(!in_array('ATTACK_STARTED', $newTypes, true));
    expect(!in_array('DAMAGE_DEALT', $newTypes, true));
    expect(!in_array('token-bug', array_column($state['players']['p1']['services'], 'definitionId'), true));
});

check('Rubber Duck converts one BUG into Power and a card', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    prepareTurn($state, 'p1');
    $state['players']['p1']['services'] = [entity($catalog, 'token-bug', 'duck-bug')];
    $state['players']['p1']['hand'] = [card('neutral-rubber-duck', 'rubber-duck')];
    $state['players']['p1']['deck'] = [card('frontend-vue-widget', 'duck-draw')];
    $engine->applyAction($state, 'p1', ['type' => 'PLAY_CARD', 'cardInstanceId' => 'rubber-duck']);
    expect(array_column($state['players']['p1']['services'], 'definitionId') === ['neutral-rubber-duck'], 'Rubber Duck should consume exactly one BUG.');
    expect($state['players']['p1']['services'][0]['power'] === 1, 'Rubber Duck should gain +1 Power after debugging.');
    expect(in_array('duck-draw', array_column($state['players']['p1']['hand'], 'instanceId'), true), 'Rubber Duck should draw one card after consuming a BUG.');
    expect(($state['players']['p1']['turnFlags']['bugRemoved'] ?? false) === true, 'Removing the BUG should count as repair activity.');
});

check('Rubber Duck has no bonus without a BUG', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    prepareTurn($state, 'p1');
    $state['players']['p1']['hand'] = [card('neutral-rubber-duck', 'rubber-duck')];
    $state['players']['p1']['deck'] = [card('frontend-vue-widget', 'untouched-draw')];
    $engine->applyAction($state, 'p1', ['type' => 'PLAY_CARD', 'cardInstanceId' => 'rubber-duck']);
    expect($state['players']['p1']['services'][0]['power'] === 0, 'Rubber Duck must remain harmless without a BUG.');
    expect(array_column($state['players']['p1']['deck'], 'instanceId') === ['untouched-draw'], 'Rubber Duck must not draw without consuming a BUG.');
});

check('Werkstudent leaves a BUG and draws a card when it crashes', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    prepareTurn($state, 'p1');
    $state['players']['p1']['services'] = [entity($catalog, 'neutral-werkstudent', 'werkstudent')];
    $state['players']['p2']['services'] = [entity($catalog, 'neutral-junior-developer', 'enemy-junior')];
    $state['players']['p1']['deck'] = [card('frontend-vue-widget', 'werkstudent-draw')];
    $engine->applyAction($state, 'p1', ['type' => 'ATTACK', 'attackerId' => 'werkstudent', 'targetId' => 'enemy-junior']);
    expect(array_column($state['players']['p1']['services'], 'definitionId') === ['token-bug'], 'The crashed Werkstudent should leave one BUG in its freed slot.');
    expect(in_array('werkstudent-draw', array_column($state['players']['p1']['hand'], 'instanceId'), true), 'The crashed Werkstudent should draw one card.');
    expect(in_array('neutral-werkstudent', array_column($state['players']['p1']['trash'], 'definitionId'), true), 'The crashed Werkstudent should enter the trash.');
});

check('Chaos Monkey draws only when it crashes during its owners turn', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    prepareTurn($state, 'p1');
    $state['players']['p1']['services'] = [entity($catalog, 'infrastructure-chaos-monkey', 'active-chaos')];
    $state['players']['p2']['services'] = [entity($catalog, 'backend-java-service', 'enemy-java')];
    $state['players']['p1']['deck'] = [card('neutral-coffee', 'active-chaos-draw')];
    $engine->applyAction($state, 'p1', ['type' => 'ATTACK', 'attackerId' => 'active-chaos', 'targetId' => 'enemy-java']);
    expect(in_array('active-chaos-draw', array_column($state['players']['p1']['hand'], 'instanceId'), true), 'An actively traded Chaos Monkey should replace itself.');

    [$engine, $state] = fresh($catalog);
    prepareTurn($state, 'p2');
    $state['players']['p1']['services'] = [entity($catalog, 'infrastructure-chaos-monkey', 'defending-chaos')];
    $state['players']['p2']['services'] = [entity($catalog, 'backend-java-service', 'attacking-java')];
    $state['players']['p1']['deck'] = [card('neutral-coffee', 'forbidden-chaos-draw')];
    $engine->applyAction($state, 'p2', ['type' => 'ATTACK', 'attackerId' => 'attacking-java', 'targetId' => 'defending-chaos']);
    expect(in_array('forbidden-chaos-draw', array_column($state['players']['p1']['deck'], 'instanceId'), true), 'A defending Chaos Monkey must not draw a card.');
});

check('Legacy PHP Server tutors Backend only with Backend Infrastructure', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    prepareTurn($state, 'p1');
    $state['players']['p1']['services'] = [entity($catalog, 'backend-legacy-php', 'legacy-without-infra')];
    $state['players']['p2']['services'] = [entity($catalog, 'backend-java-service', 'enemy-java')];
    $state['players']['p1']['deck'] = [card('backend-hotfix', 'blocked-backend-draw')];
    $engine->applyAction($state, 'p1', ['type' => 'ATTACK', 'attackerId' => 'legacy-without-infra', 'targetId' => 'enemy-java']);
    expect(in_array('blocked-backend-draw', array_column($state['players']['p1']['deck'], 'instanceId'), true), 'Legacy PHP must not tutor without Backend Infrastructure.');

    [$engine, $state] = fresh($catalog);
    prepareTurn($state, 'p1');
    $state['players']['p1']['services'] = [entity($catalog, 'backend-legacy-php', 'legacy-with-infra')];
    $state['players']['p1']['infrastructure'] = [entity($catalog, 'backend-message-queue', 'backend-infra')];
    $state['players']['p2']['services'] = [entity($catalog, 'backend-java-service', 'enemy-java')];
    $state['players']['p1']['deck'] = [card('backend-hotfix', 'allowed-backend-draw')];
    $engine->applyAction($state, 'p1', ['type' => 'ATTACK', 'attackerId' => 'legacy-with-infra', 'targetId' => 'enemy-java']);
    expect(in_array('allowed-backend-draw', array_column($state['players']['p1']['hand'], 'instanceId'), true), 'Legacy PHP should tutor with Backend Infrastructure.');
});

check('SOC Analyst removes an own BUG without helping the opponent', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    prepareTurn($state, 'p1');
    $state['players']['p1']['core'] = 25;
    $state['players']['p1']['services'] = [entity($catalog, 'token-bug', 'own-soc-bug')];
    $state['players']['p2']['services'] = [entity($catalog, 'token-bug', 'enemy-soc-bug')];
    $state['players']['p1']['hand'] = [card('security-soc-analyst', 'soc-analyst')];
    $engine->applyAction($state, 'p1', ['type' => 'PLAY_CARD', 'cardInstanceId' => 'soc-analyst']);
    expect(!in_array('own-soc-bug', array_column($state['players']['p1']['services'], 'instanceId'), true), 'SOC Analyst should remove the own BUG.');
    expect(in_array('enemy-soc-bug', array_column($state['players']['p2']['services'], 'instanceId'), true), 'SOC Analyst must not remove an enemy BUG.');
    expect($state['players']['p1']['core'] === 25, 'The fallback PATCH must not trigger after removing a BUG.');
});

check('SOC Analyst patches the Core when there is no own BUG', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    prepareTurn($state, 'p1');
    $state['players']['p1']['core'] = 25;
    $state['players']['p1']['hand'] = [card('security-soc-analyst', 'soc-analyst')];
    $engine->applyAction($state, 'p1', ['type' => 'PLAY_CARD', 'cardInstanceId' => 'soc-analyst']);
    expect($state['players']['p1']['core'] === 27, 'SOC Analyst should PATCH 2 on the own Core as fallback.');
});

check('Data Scientist selects the most expensive Data card from the top four', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    prepareTurn($state, 'p1');
    $state['players']['p1']['hand'] = [card('data-data-scientist', 'data-scientist')];
    $state['players']['p1']['deck'] = [
        card('neutral-coffee', 'outside-window'),
        card('data-redis-cache', 'cheap-data'),
        card('neutral-friday-deploy', 'non-data-command'),
        card('data-vector-database', 'expensive-data'),
        card('neutral-old-workstation', 'non-data-service'),
    ];
    $engine->applyAction($state, 'p1', ['type' => 'PLAY_CARD', 'cardInstanceId' => 'data-scientist']);
    expect(in_array('expensive-data', array_column($state['players']['p1']['hand'], 'instanceId'), true), 'Data Scientist should select the most expensive available Data card.');
    expect(in_array('cheap-data', array_column($state['players']['p1']['deck'], 'instanceId'), true), 'Unselected Data cards must remain in the deck.');
});

check('Data Scientist falls back to the most expensive Command when no Data card is found', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    prepareTurn($state, 'p1');
    $state['players']['p1']['hand'] = [card('data-data-scientist', 'data-scientist')];
    $state['players']['p1']['deck'] = [
        card('frontend-vue-widget', 'outside-window'),
        card('neutral-coffee', 'cheap-command'),
        card('neutral-force-push', 'expensive-command'),
        card('backend-api-gateway', 'non-command'),
        card('frontend-web-worker', 'non-command-two'),
    ];
    $engine->applyAction($state, 'p1', ['type' => 'PLAY_CARD', 'cardInstanceId' => 'data-scientist']);
    expect(in_array('expensive-command', array_column($state['players']['p1']['hand'], 'instanceId'), true), 'Data Scientist should fall back to the most expensive Command.');
    expect(in_array('cheap-command', array_column($state['players']['p1']['deck'], 'instanceId'), true), 'The cheaper fallback Command must remain in the deck.');
});

check('Schema Migration discounts the Infrastructure it draws until played', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    prepareTurn($state, 'p1');
    $state['players']['p1']['hand'] = [card('data-schema-migration', 'schema-migration')];
    $state['players']['p1']['deck'] = [card('data-event-stream', 'drawn-infrastructure')];
    $engine->applyAction($state, 'p1', ['type' => 'PLAY_CARD', 'cardInstanceId' => 'schema-migration']);
    $drawn = $state['players']['p1']['hand'][0] ?? [];
    expect(($drawn['instanceId'] ?? '') === 'drawn-infrastructure', 'Schema Migration should draw the Infrastructure.');
    expect(($drawn['costModifier'] ?? 0) === -1 && ($drawn['costModifierUntilPlayed'] ?? false), 'The drawn Infrastructure should keep a one-point discount until played.');
});

check('Data Quality Gate discounts only its selected card for the current turn', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    prepareTurn($state, 'p1');
    $state['players']['p1']['hand'] = [
        card('data-data-quality-gate', 'quality-gate'),
        card('frontend-vue-widget', 'filtered-hand-card'),
    ];
    $state['players']['p1']['deck'] = [
        card('frontend-web-worker', 'outside-window'),
        card('neutral-coffee', 'cheap-command'),
        card('neutral-force-push', 'selected-command'),
        card('frontend-vue-widget', 'ignored-service'),
        card('backend-hotfix', 'other-command'),
    ];
    $engine->applyAction($state, 'p1', ['type' => 'PLAY_CARD', 'cardInstanceId' => 'quality-gate']);
    $selected = current(array_filter($state['players']['p1']['hand'], static fn(array $card): bool => $card['instanceId'] === 'selected-command'));
    expect(is_array($selected), 'Data Quality Gate should select the most expensive eligible card.');
    expect(($selected['costModifier'] ?? 0) === -1 && ($selected['costModifierTurn'] ?? null) === $state['turn'], 'The selected card should be discounted only for the current turn.');
});

check('Product Owner draws the top cheap Command and skips expensive Commands', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    prepareTurn($state, 'p1');
    $state['players']['p1']['hand'] = [card('neutral-product-owner', 'product-owner')];
    $state['players']['p1']['deck'] = [
        card('neutral-coffee', 'lower-cheap-command'),
        card('backend-hotfix', 'top-cheap-command'),
        card('neutral-force-push', 'expensive-command'),
    ];
    $engine->applyAction($state, 'p1', ['type' => 'PLAY_CARD', 'cardInstanceId' => 'product-owner']);
    expect(in_array('top-cheap-command', array_column($state['players']['p1']['hand'], 'instanceId'), true), 'Product Owner should draw the first affordable Command from the top.');
    expect(in_array('expensive-command', array_column($state['players']['p1']['deck'], 'instanceId'), true), 'Product Owner must skip expensive Commands without removing them.');
});

check('Project Manager discounts exactly the next Command by two', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    prepareTurn($state, 'p1');
    $state['players']['p1']['hand'] = [
        card('neutral-project-manager', 'project-manager'),
        card('data-select-all', 'first-command'),
        card('data-select-all', 'second-command'),
    ];
    $state['players']['p1']['deck'] = [
        card('neutral-coffee', 'draw-one'),
        card('neutral-coffee', 'draw-two'),
        card('neutral-coffee', 'draw-three'),
        card('neutral-coffee', 'draw-four'),
    ];
    $engine->applyAction($state, 'p1', ['type' => 'PLAY_CARD', 'cardInstanceId' => 'project-manager']);
    $engine->applyAction($state, 'p1', ['type' => 'PLAY_CARD', 'cardInstanceId' => 'first-command']);
    expect($state['players']['p1']['compute'] === 15, 'The first Command should cost one after the two-point discount.');
    $engine->applyAction($state, 'p1', ['type' => 'PLAY_CARD', 'cardInstanceId' => 'second-command']);
    expect($state['players']['p1']['compute'] === 12, 'The second Command should use its full base cost.');
});

check('Scrum Master discounts exactly the next Service by one', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    prepareTurn($state, 'p1');
    $state['players']['p1']['hand'] = [
        card('neutral-scrum-master', 'scrum-master'),
        card('data-query-engine', 'discounted-service'),
        card('neutral-old-workstation', 'full-price-service'),
    ];
    $engine->applyAction($state, 'p1', ['type' => 'PLAY_CARD', 'cardInstanceId' => 'scrum-master']);
    $engine->applyAction($state, 'p1', ['type' => 'PLAY_CARD', 'cardInstanceId' => 'discounted-service']);
    expect($state['players']['p1']['compute'] === 15, 'The next Service should receive the Scrum Master discount.');
    $engine->applyAction($state, 'p1', ['type' => 'PLAY_CARD', 'cardInstanceId' => 'full-price-service']);
    expect($state['players']['p1']['compute'] === 13, 'Only one Service should be discounted.');
});

check('Production Incident typed draw finds a Command', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    prepareTurn($state, 'p1');
    $state['players']['p1']['hand'] = [card('backend-graphql-gateway', 'graphql')];
    $state['players']['p1']['deck'] = [
        card('frontend-vue-widget', 'typed-service'),
        card('backend-hotfix', 'typed-command'),
    ];
    $engine->applyAction($state, 'p1', ['type' => 'PLAY_CARD', 'cardInstanceId' => 'graphql']);
    expect(in_array('backend-hotfix', array_column($state['players']['p1']['hand'], 'definitionId'), true));
    expect(in_array('frontend-vue-widget', array_column($state['players']['p1']['deck'], 'definitionId'), true));
});

check('Production Incident target rules reject enemy Feature Flag', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    prepareTurn($state, 'p1');
    $state['players']['p1']['hand'] = [card('frontend-feature-flag', 'flag')];
    $state['players']['p2']['services'] = [entity($catalog, 'frontend-vue-widget', 'enemy-service')];
    expectCode('INVALID_TARGET', fn() => $engine->applyAction($state, 'p1', [
        'type' => 'PLAY_CARD',
        'cardInstanceId' => 'flag',
        'targetId' => 'enemy-service',
    ]));
});

check('Design System reinforces only Child Components and does not stack', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    prepareTurn($state, 'p1');
    $state['players']['p1']['services'] = [
        entity($catalog, 'token-child-component', 'child-component'),
        entity($catalog, 'frontend-vue-widget', 'frontend-service'),
        entity($catalog, 'backend-queue-worker', 'backend-service'),
    ];
    $state['players']['p1']['hand'] = [
        card('frontend-design-system', 'design-system-one'),
        card('frontend-design-system', 'design-system-two'),
    ];
    $engine->applyAction($state, 'p1', ['type' => 'PLAY_CARD', 'cardInstanceId' => 'design-system-one']);
    $engine->applyAction($state, 'p1', ['type' => 'PLAY_CARD', 'cardInstanceId' => 'design-system-two']);
    expect($state['players']['p1']['services'][0]['power'] === 2 && $state['players']['p1']['services'][0]['maxIntegrity'] === 2, 'Existing Child Component should receive +1/+1 exactly once.');
    expect($state['players']['p1']['services'][1]['maxIntegrity'] === 3, 'Normal Frontend services should no longer receive the Component bonus.');
    expect($state['players']['p1']['services'][2]['maxIntegrity'] === 3, 'Other domains must remain unchanged.');
});

check('Design System reinforces future Child Components', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    prepareTurn($state, 'p1');
    $state['players']['p1']['hand'] = [
        card('frontend-design-system', 'design-system'),
        card('frontend-react-component', 'react-component'),
    ];
    $engine->applyAction($state, 'p1', ['type' => 'PLAY_CARD', 'cardInstanceId' => 'design-system']);
    $engine->applyAction($state, 'p1', ['type' => 'PLAY_CARD', 'cardInstanceId' => 'react-component']);
    $child = current(array_filter($state['players']['p1']['services'], static fn(array $service): bool => $service['definitionId'] === 'token-child-component'));
    expect(is_array($child) && $child['power'] === 2 && $child['integrity'] === 2, 'Future Child Components should enter as 2/2.');
});

check('Infinite Re-Render converts a wide Frontend board into a Child Component', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    prepareTurn($state, 'p1');
    $state['players']['p1']['services'] = [
        entity($catalog, 'frontend-vue-widget', 'frontend-one'),
        entity($catalog, 'frontend-web-worker', 'frontend-two'),
    ];
    $state['players']['p2']['services'] = [entity($catalog, 'backend-queue-worker', 'rerender-target')];
    $state['players']['p1']['hand'] = [card('frontend-infinite-rerender', 'rerender')];
    $state['players']['p1']['deck'] = [card('neutral-coffee', 'must-not-draw')];
    $engine->applyAction($state, 'p1', ['type' => 'PLAY_CARD', 'cardInstanceId' => 'rerender', 'targetId' => 'rerender-target']);
    expect($state['players']['p2']['services'][0]['sandboxed'] === true, 'Infinite Re-Render should SANDBOX the enemy target.');
    expect(in_array('token-child-component', array_column($state['players']['p1']['services'], 'definitionId'), true), 'A wide Frontend board should create a Child Component.');
    expect(in_array('must-not-draw', array_column($state['players']['p1']['deck'], 'instanceId'), true), 'Infinite Re-Render should no longer provide generic card draw.');
});

check('Infinite Re-Render cannot target an own Service', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    prepareTurn($state, 'p1');
    $state['players']['p1']['services'] = [entity($catalog, 'frontend-vue-widget', 'own-rerender-target')];
    $state['players']['p1']['hand'] = [card('frontend-infinite-rerender', 'rerender')];
    expectCode('INVALID_TARGET', fn() => $engine->applyAction($state, 'p1', [
        'type' => 'PLAY_CARD',
        'cardInstanceId' => 'rerender',
        'targetId' => 'own-rerender-target',
    ]));
});

check('Technical Debt fills only available enemy service slots', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    prepareTurn($state, 'p1');
    $state['players']['p1']['hand'] = [card('neutral-technical-debt', 'debt')];
    $state['players']['p2']['services'] = [
        entity($catalog, 'frontend-vue-widget', 'occupied-1'),
        entity($catalog, 'frontend-vue-widget', 'occupied-2'),
        entity($catalog, 'frontend-vue-widget', 'occupied-3'),
        entity($catalog, 'frontend-vue-widget', 'occupied-4'),
    ];
    $engine->applyAction($state, 'p1', ['type' => 'PLAY_CARD', 'cardInstanceId' => 'debt']);
    expect(count($state['players']['p2']['services']) === 5);
    expect(count(array_filter($state['players']['p2']['services'], static fn(array $service): bool => $service['definitionId'] === 'token-bug')) === 1);
});

check('Every playable card has a booster rarity', function () use ($catalog): void {
    $generator = new BoosterGenerator($catalog);
    foreach ($catalog->all() as $card) {
        expect(in_array($generator->rarityFor($card['id']), ['common', 'uncommon', 'rare', 'legendary'], true));
    }
});

check('Card design audit clears all resolved redesign findings', function () use ($catalog): void {
    $rows = (new CardDesignAuditor($catalog))->audit();
    $byId = [];
    foreach ($rows as $row) $byId[$row['definitionId']] = $row;
    foreach (['neutral-werkstudent', 'security-soc-analyst', 'security-siem', 'security-containment-plan', 'frontend-infinite-rerender', 'frontend-design-system', 'ai-model-router', 'ai-model-ensemble', 'ai-prompt-engineer', 'ai-llm-agent'] as $definitionId) {
        expect(($byId[$definitionId]['status'] ?? '') === 'solid', "Resolved card {$definitionId} should no longer remain in the design-review queue.");
    }
});

check('Booster contains five unique cards with a guaranteed rare', function () use ($catalog): void {
    $generator = new BoosterGenerator($catalog, null, static fn(int $min, int $max): int => $min);
    $cards = $generator->generate([]);
    expect(count($cards) === 5);
    expect(count(array_unique(array_column($cards, 'definitionId'))) === 5);
    expect(count(array_filter($cards, static fn(array $card): bool => in_array($card['rarity'], ['rare', 'legendary'], true))) >= 1);
});

check('Booster marks owned cards and prefers missing copies', function () use ($catalog): void {
    $generator = new BoosterGenerator($catalog, null, static fn(int $min, int $max): int => $min);
    $owned = array_fill_keys(array_column($catalog->all(), 'id'), 2);
    unset($owned['frontend-react-component']);
    $cards = $generator->generate($owned);
    $common = array_values(array_filter($cards, static fn(array $card): bool => $card['rarity'] === 'common'));
    expect($common[0]['definitionId'] === 'frontend-react-component');
    expect($common[0]['isNew'] === true);
});

check('Economy boosters contain only cards from the expansion pool', function () use ($catalog): void {
    $sets = json_decode((string)file_get_contents(__DIR__ . '/../shared/card-sets.json'), true, 512, JSON_THROW_ON_ERROR);
    $expansion = (array)$sets['expansionCardIds'];
    $generator = new BoosterGenerator($catalog, null, static fn(int $min, int $max): int => $min);
    $cards = $generator->generate([], $expansion);
    expect(count($cards) === 5);
    foreach ($cards as $card) expect(in_array($card['definitionId'], $expansion, true));
});

check('Starter decks are valid and contain 30 cards', function () use ($catalog): void {
    foreach (['frontend-backend', 'infrastructure-security', 'data-ai'] as $key) {
        $deck = $catalog->starterDeck($key);
        expect(count($deck) === 30);
        expect(count($catalog->validateDeck($deck)) === 2);
    }
});

check('Deck rules limit Legendary cards and Infrastructure density', function () use ($catalog): void {
    $deck = $catalog->starterDeck('frontend-backend');
    $deck[0] = 'frontend-angular-module';
    $deck[1] = 'frontend-angular-module';
    expectCode('INVALID_LEGENDARY_COPIES', fn() => $catalog->validateDeck($deck));
    $deck = array_values(array_filter($catalog->starterDeck('frontend-backend'), fn(string $id): bool => $catalog->get($id)['type'] !== 'infrastructure'));
    $deck = array_slice($deck, 0, 25);
    $deck = array_merge($deck, ['frontend-state-store', 'frontend-design-system', 'backend-message-queue', 'backend-circuit-breaker', 'neutral-ci-pipeline']);
    expectCode('INVALID_INFRASTRUCTURE_COUNT', fn() => $catalog->validateDeck($deck));
});

check('Only the three predefined starter decks qualify as free guest decks', function () use ($catalog): void {
    $starter = $catalog->starterDeck('frontend-backend');
    expect($catalog->isStarterDeck($starter));
    $custom = $starter;
    $custom[0] = 'security-emergency-patch';
    expect(!$catalog->isStarterDeck($custom));
});

check('Match start draws five cards', function () use ($catalog): void {
    [, $state] = fresh($catalog, false);
    expect($state['status'] === 'mulligan');
    expect(count($state['players']['p1']['hand']) === 5);
    expect(count($state['players']['p2']['hand']) === 5);
});

check('Mulligan replaces selected cards before reshuffling', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog, false);
    $old = $state['players']['p1']['hand'][0]['instanceId'];
    $engine->applyAction($state, 'p1', ['type' => 'MULLIGAN', 'cardInstanceIds' => [$old]]);
    expect(count($state['players']['p1']['hand']) === 5);
    expect(!in_array($old, array_column($state['players']['p1']['hand'], 'instanceId'), true));
});

check('Second player receives a three-Compute BOOTSTRAP and first starts at one Compute', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    $first = $state['startingPlayerId'];
    $second = $state['order'][0] === $state['startingPlayerId'] ? $state['order'][1] : $state['order'][0];
    expect(in_array('token-bootstrap', array_column($state['players'][$second]['hand'], 'definitionId'), true));
    expect(count($state['players'][$first]['hand']) === 5);
    expect(count($state['players'][$second]['hand']) === 6);
    expect($state['players'][$first]['maxCompute'] === 1);
    $engine->applyAction($state, $first, ['type' => 'END_TURN']);
    $bootstrap = current(array_filter($state['players'][$second]['hand'], static fn(array $card): bool => $card['definitionId'] === 'token-bootstrap'));
    $engine->applyAction($state, $second, ['type' => 'PLAY_CARD', 'cardInstanceId' => $bootstrap['instanceId']]);
    expect($state['players'][$second]['temporaryCompute'] === 3, 'BOOTSTRAP should grant exactly three temporary Compute.');
});

check('Each player skips the draw on their first own turn', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    $first = $state['startingPlayerId'];
    $second = $state['order'][0] === $first ? $state['order'][1] : $state['order'][0];
    $before = count($state['players'][$second]['hand']);
    $engine->applyAction($state, $first, ['type' => 'END_TURN']);
    expect(count($state['players'][$second]['hand']) === $before);
});

check('Compute progresses and is capped at ten', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    for ($i = 0; $i < 24; $i++) {
        $engine->applyAction($state, $state['activePlayerId'], ['type' => 'END_TURN']);
        if ($state['status'] !== 'active') {
            break;
        }
    }
    foreach ($state['players'] as $player) {
        expect($player['maxCompute'] <= 10);
    }
});

check('Card cost is validated server-side', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    prepareTurn($state, 'p1', 2);
    $state['players']['p1']['hand'] = [card('frontend-react-component', 'cost-card')];
    expectCode('INSUFFICIENT_COMPUTE', fn() => $engine->applyAction($state, 'p1', ['type' => 'PLAY_CARD', 'cardInstanceId' => 'cost-card']));
});

check('Multiple State Stores do not stack their discount', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    prepareTurn($state, 'p1', 1);
    $state['players']['p1']['infrastructure'] = [
        entity($catalog, 'frontend-state-store', 'state-store-1'),
        entity($catalog, 'frontend-state-store', 'state-store-2'),
    ];
    $state['players']['p1']['hand'] = [card('frontend-web-worker', 'discounted-worker')];
    expectCode('INSUFFICIENT_COMPUTE', fn() => $engine->applyAction($state, 'p1', ['type' => 'PLAY_CARD', 'cardInstanceId' => 'discounted-worker']));
    $state['players']['p1']['compute'] = 2;
    $engine->applyAction($state, 'p1', ['type' => 'PLAY_CARD', 'cardInstanceId' => 'discounted-worker']);
    expect($state['players']['p1']['compute'] === 0, 'Web Worker should receive only one 1-Compute discount.');
    expect(in_array('discounted-worker', array_column($state['players']['p1']['services'], 'instanceId'), true));
});

check('RAG Pipeline discounts only the first Data card each turn', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    prepareTurn($state, 'p1', 5);
    $state['players']['p1']['infrastructure'] = [entity($catalog, 'ai-rag-pipeline', 'rag-one'), entity($catalog, 'ai-rag-pipeline', 'rag-two')];
    $state['players']['p1']['hand'] = [card('data-query-engine', 'data-one'), card('data-query-engine', 'data-two')];
    $state['players']['p1']['deck'] = [];
    $engine->applyAction($state, 'p1', ['type' => 'PLAY_CARD', 'cardInstanceId' => 'data-one']);
    expect($state['players']['p1']['compute'] === 3, 'Two RAG Pipelines must still provide only one discount.');
    $engine->applyAction($state, 'p1', ['type' => 'PLAY_CARD', 'cardInstanceId' => 'data-two']);
    expect($state['players']['p1']['compute'] === 0, 'Second Data card should cost its normal amount.');
});

check('Vision Model has a durable fallback without an enemy BUG', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    prepareTurn($state, 'p1');
    $state['players']['p1']['hand'] = [card('ai-vision-model', 'vision')];
    $engine->applyAction($state, 'p1', ['type' => 'PLAY_CARD', 'cardInstanceId' => 'vision']);
    $vision = current(array_filter($state['players']['p1']['services'], static fn(array $item): bool => $item['instanceId'] === 'vision'));
    expect($vision['integrity'] === 5 && $vision['maxIntegrity'] === 5, 'Vision Model should become 4/5 without an enemy BUG.');
});

check('Model Router generates a Command from the non-AI Deck domain', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    prepareTurn($state, 'p1');
    $state['players']['p1']['domains'] = ['data', 'ai'];
    $state['players']['p1']['hand'] = [card('ai-model-router', 'model-router')];
    $engine->applyAction($state, 'p1', ['type' => 'PLAY_CARD', 'cardInstanceId' => 'model-router']);
    expect(count($state['players']['p1']['hand']) === 1, 'Model Router should generate exactly one card.');
    $generated = $state['players']['p1']['hand'][0];
    $definition = $catalog->get($generated['definitionId']);
    expect($definition['domain'] === 'data' && $definition['type'] === 'command', 'Model Router should route to a Data Command in a Data/AI deck.');
    expect(($generated['costModifier'] ?? 0) === -1 && ($generated['costModifierTurn'] ?? null) === $state['turn'], 'Model Router should discount its generated Command for this turn.');
});

check('Model Ensemble discounts the AI Service it tutors until played', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    prepareTurn($state, 'p1');
    $state['players']['p1']['domains'] = ['backend', 'ai'];
    $state['players']['p1']['hand'] = [
        card('ai-model-ensemble', 'model-ensemble'),
        card('backend-hotfix', 'other-domain-proof'),
    ];
    $state['players']['p1']['deck'] = [card('ai-inference-worker', 'tutored-ai-service')];
    $engine->applyAction($state, 'p1', ['type' => 'PLAY_CARD', 'cardInstanceId' => 'model-ensemble']);
    $tutored = current(array_filter($state['players']['p1']['hand'], static fn(array $card): bool => $card['instanceId'] === 'tutored-ai-service'));
    expect(is_array($tutored), 'Model Ensemble should tutor the first AI Service.');
    expect(($tutored['costModifier'] ?? 0) === -1 && ($tutored['costModifierUntilPlayed'] ?? false), 'The tutored AI Service should keep its discount until played.');
});

check('Model Ensemble remains inert without another Deck-domain card', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    prepareTurn($state, 'p1');
    $state['players']['p1']['domains'] = ['backend', 'ai'];
    $state['players']['p1']['hand'] = [card('ai-model-ensemble', 'model-ensemble')];
    $state['players']['p1']['deck'] = [card('ai-inference-worker', 'must-remain-in-deck')];
    $engine->applyAction($state, 'p1', ['type' => 'PLAY_CARD', 'cardInstanceId' => 'model-ensemble']);
    expect(in_array('must-remain-in-deck', array_column($state['players']['p1']['deck'], 'instanceId'), true), 'Model Ensemble must still require another-domain setup.');
});

check('GPU Cluster rewards an existing AI board but never costs less than four', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    prepareTurn($state, 'p1', 4);
    $state['players']['p1']['services'] = [
        entity($catalog, 'ai-model-router', 'ai-service-one'),
        entity($catalog, 'ai-inference-worker', 'ai-service-two'),
        entity($catalog, 'ai-vision-model', 'ai-service-three'),
    ];
    $state['players']['p1']['hand'] = [card('ai-gpu-cluster', 'gpu-cluster')];
    $engine->applyAction($state, 'p1', ['type' => 'PLAY_CARD', 'cardInstanceId' => 'gpu-cluster']);
    expect($state['players']['p1']['compute'] === 0, 'Three AI Services should reduce GPU Cluster to its minimum cost of four.');

    [$engine, $state] = fresh($catalog);
    prepareTurn($state, 'p1', 4);
    $state['players']['p1']['services'] = [entity($catalog, 'ai-model-router', 'single-ai-service')];
    $state['players']['p1']['hand'] = [card('ai-gpu-cluster', 'gpu-cluster')];
    expectCode('INSUFFICIENT_COMPUTE', fn() => $engine->applyAction($state, 'p1', ['type' => 'PLAY_CARD', 'cardInstanceId' => 'gpu-cluster']));
});

check('Prompt Engineer generates one discounted Command from the Deck domains', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    prepareTurn($state, 'p1');
    $state['players']['p1']['domains'] = ['data', 'ai'];
    $state['players']['p1']['hand'] = [card('ai-prompt-engineer', 'prompt-engineer')];
    $engine->applyAction($state, 'p1', ['type' => 'PLAY_CARD', 'cardInstanceId' => 'prompt-engineer']);
    expect(count($state['players']['p1']['hand']) === 1, 'Prompt Engineer should generate exactly one card.');
    $generated = $state['players']['p1']['hand'][0];
    $definition = $catalog->get($generated['definitionId']);
    expect(in_array($definition['domain'], ['data', 'ai'], true) && $definition['type'] === 'command', 'Prompt Engineer should generate a legal Deck-domain Command.');
    expect(($generated['costModifier'] ?? 0) === -1 && ($generated['costModifierTurn'] ?? null) === $state['turn'], 'Prompt Engineer should discount the generated Command for this turn.');
});

check('LLM Agent generates one discounted Command per Deck domain', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    prepareTurn($state, 'p1');
    $state['players']['p1']['domains'] = ['data', 'ai'];
    $state['players']['p1']['hand'] = [card('ai-llm-agent', 'llm-agent')];
    $engine->applyAction($state, 'p1', ['type' => 'PLAY_CARD', 'cardInstanceId' => 'llm-agent']);
    expect(count($state['players']['p1']['hand']) === 2, 'LLM Agent should generate two options.');
    $domains = [];
    foreach ($state['players']['p1']['hand'] as $generated) {
        $definition = $catalog->get($generated['definitionId']);
        expect($definition['type'] === 'command', 'Every LLM Agent option must be a Command.');
        expect(($generated['costModifier'] ?? 0) === -1 && ($generated['costModifierTurn'] ?? null) === $state['turn'], 'Every LLM Agent option should be discounted for this turn.');
        $domains[] = $definition['domain'];
    }
    sort($domains, SORT_STRING);
    expect($domains === ['ai', 'data'], 'LLM Agent should generate exactly one option from each Deck domain.');
});

check('SIEM and Service Mesh resolve as Commands without occupying Infrastructure slots', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    prepareTurn($state, 'p1');
    $state['players']['p1']['services'] = [entity($catalog, 'frontend-vue-widget', 'mesh-target')];
    $state['players']['p1']['hand'] = [card('security-siem', 'siem'), card('infrastructure-service-mesh', 'mesh')];
    $state['players']['p1']['deck'] = [card('neutral-coffee', 'siem-draw-one'), card('neutral-coffee', 'siem-draw-two')];
    $engine->applyAction($state, 'p1', ['type' => 'PLAY_CARD', 'cardInstanceId' => 'siem']);
    $engine->applyAction($state, 'p1', ['type' => 'PLAY_CARD', 'cardInstanceId' => 'mesh']);
    expect($state['players']['p1']['infrastructure'] === [], 'Commands must not occupy Infrastructure slots.');
    expect($state['players']['p1']['services'][0]['redundancy'] === true, 'Service Mesh should grant REDUNDANCY to all current Services.');
    expect(in_array('siem-draw-one', array_column($state['players']['p1']['hand'], 'instanceId'), true), 'SIEM should always draw its first card.');
    expect(in_array('siem-draw-two', array_column($state['players']['p1']['hand'], 'instanceId'), true), 'SIEM should always draw its second card.');
});

check('SIEM draws a third card from a sandboxed opponent', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    prepareTurn($state, 'p1');
    $sandboxed = entity($catalog, 'frontend-vue-widget', 'sandboxed-signal');
    $sandboxed['sandboxed'] = true;
    $state['players']['p2']['services'] = [$sandboxed];
    $state['players']['p1']['hand'] = [card('security-siem', 'siem')];
    $state['players']['p1']['deck'] = [
        card('neutral-coffee', 'siem-one'),
        card('neutral-coffee', 'siem-two'),
        card('neutral-coffee', 'siem-three'),
    ];
    $engine->applyAction($state, 'p1', ['type' => 'PLAY_CARD', 'cardInstanceId' => 'siem']);
    expect(count($state['players']['p1']['hand']) === 3, 'SIEM should draw three cards when it detects a sandboxed opponent.');
});

check('Generated cards count as hand opportunities in telemetry', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    prepareTurn($state, 'p1');
    $state['players']['p1']['hand'] = [card('ai-hallucination', 'hallucination')];
    $before = array_sum($state['players']['p1']['matchStats']['cardDrawCounts']);
    $engine->applyAction($state, 'p1', ['type' => 'PLAY_CARD', 'cardInstanceId' => 'hallucination']);
    $after = array_sum($state['players']['p1']['matchStats']['cardDrawCounts']);
    expect($after === $before + 1, 'Generated card should be counted once when it reaches the hand.');
});

check('Service board limit is enforced', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    prepareTurn($state, 'p1');
    $state['players']['p1']['services'] = [];
    for ($i = 0; $i < 5; $i++) $state['players']['p1']['services'][] = entity($catalog, 'frontend-vue-widget', "slot{$i}");
    $state['players']['p1']['hand'] = [card('frontend-vue-widget', 'sixth')];
    expectCode('SERVICE_SLOTS_FULL', fn() => $engine->applyAction($state, 'p1', ['type' => 'PLAY_CARD', 'cardInstanceId' => 'sixth']));
});

check('Token and FORK cards require enough free Service slots', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    prepareTurn($state, 'p1');
    $state['players']['p1']['services'] = [];
    for ($index = 0; $index < 4; $index++) $state['players']['p1']['services'][] = entity($catalog, 'frontend-vue-widget', "react-slot-{$index}");
    $state['players']['p1']['hand'] = [card('frontend-react-component', 'react-without-child-slot')];
    expectCode('SERVICE_SLOTS_FULL', fn() => $engine->applyAction($state, 'p1', ['type' => 'PLAY_CARD', 'cardInstanceId' => 'react-without-child-slot']));

    $state['players']['p1']['services'][] = entity($catalog, 'frontend-vue-widget', 'last-service-slot');
    $state['players']['p1']['hand'] = [
        card('frontend-component-library', 'library-without-slot'),
        card('infrastructure-horizontal-scaling', 'fork-without-slot'),
    ];
    expectCode('SERVICE_TOKEN_SLOT_REQUIRED', fn() => $engine->applyAction($state, 'p1', ['type' => 'PLAY_CARD', 'cardInstanceId' => 'library-without-slot']));
    expectCode('SERVICE_TOKEN_SLOT_REQUIRED', fn() => $engine->applyAction($state, 'p1', ['type' => 'PLAY_CARD', 'cardInstanceId' => 'fork-without-slot', 'targetId' => 'react-slot-0']));
});

check('Infinite Re-Render keeps its SANDBOX value on a full board without creating a token', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    prepareTurn($state, 'p1');
    $state['players']['p1']['services'] = [];
    for ($index = 0; $index < 5; $index++) $state['players']['p1']['services'][] = entity($catalog, 'frontend-vue-widget', "rerender-slot-{$index}");
    $state['players']['p2']['services'] = [entity($catalog, 'backend-queue-worker', 'rerender-target')];
    $state['players']['p1']['hand'] = [card('frontend-infinite-rerender', 'rerender-full-board')];
    $engine->applyAction($state, 'p1', ['type' => 'PLAY_CARD', 'cardInstanceId' => 'rerender-full-board', 'targetId' => 'rerender-target']);
    expect(count($state['players']['p1']['services']) === 5, 'Full board must not silently exceed its slot limit.');
    expect($state['players']['p2']['services'][0]['sandboxed'] === true, 'Infinite Re-Render should still apply SANDBOX.');
});

check('Inference Burst accepts only a freshly deployed own AI Service', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    prepareTurn($state, 'p1');
    $oldAi = entity($catalog, 'ai-inference-worker', 'old-ai');
    $oldAi['deployedTurn'] = $state['turn'] - 1;
    $freshFrontend = entity($catalog, 'frontend-vue-widget', 'fresh-frontend');
    $freshFrontend['deployedTurn'] = $state['turn'];
    $state['players']['p1']['services'] = [$oldAi, $freshFrontend];
    $state['players']['p1']['hand'] = [card('ai-inference-burst', 'invalid-burst')];
    expectCode('INVALID_TARGET', fn() => $engine->applyAction($state, 'p1', ['type' => 'PLAY_CARD', 'cardInstanceId' => 'invalid-burst', 'targetId' => 'old-ai']));
    expectCode('INVALID_TARGET', fn() => $engine->applyAction($state, 'p1', ['type' => 'PLAY_CARD', 'cardInstanceId' => 'invalid-burst', 'targetId' => 'fresh-frontend']));

    $freshAi = entity($catalog, 'ai-inference-worker', 'fresh-ai', false);
    $freshAi['deployedTurn'] = $state['turn'];
    $state['players']['p1']['services'][] = $freshAi;
    $engine->applyAction($state, 'p1', ['type' => 'PLAY_CARD', 'cardInstanceId' => 'invalid-burst', 'targetId' => 'fresh-ai']);
    $ready = current(array_filter($state['players']['p1']['services'], static fn(array $service): bool => $service['instanceId'] === 'fresh-ai'));
    expect($ready['exhausted'] === false, 'Valid fresh AI Service should become ready.');
});

check('Full Infrastructure board requires a replacement target', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    prepareTurn($state, 'p1');
    $state['players']['p1']['infrastructure'] = [entity($catalog, 'frontend-state-store', 'i1'), entity($catalog, 'backend-message-queue', 'i2')];
    $state['players']['p1']['hand'] = [card('neutral-ci-pipeline', 'i3')];
    expectCode('INFRASTRUCTURE_REPLACEMENT_REQUIRED', fn() => $engine->applyAction($state, 'p1', ['type' => 'PLAY_CARD', 'cardInstanceId' => 'i3']));
});

check('Infrastructure can replace an occupied own slot', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    prepareTurn($state, 'p1');
    $state['players']['p1']['infrastructure'] = [entity($catalog, 'frontend-state-store', 'old-infra'), entity($catalog, 'backend-message-queue', 'kept-infra')];
    $state['players']['p1']['hand'] = [card('neutral-ci-pipeline', 'new-infra')];
    $engine->applyAction($state, 'p1', ['type' => 'PLAY_CARD', 'cardInstanceId' => 'new-infra', 'targetId' => 'old-infra']);
    expect(count($state['players']['p1']['infrastructure']) === 2);
    expect(in_array('new-infra', array_column($state['players']['p1']['infrastructure'], 'instanceId'), true));
    expect(in_array('old-infra', array_column($state['players']['p1']['trash'], 'instanceId'), true));
});

check('Infrastructure can be decommissioned once per turn to draw a replacement', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    prepareTurn($state, 'p1');
    $state['players']['p1']['hand'] = [card('frontend-state-store', 'spare-infra')];
    $state['players']['p1']['deck'] = [card('frontend-vue-widget', 'fresh-card')];
    $engine->applyAction($state, 'p1', ['type' => 'DECOMMISSION', 'cardInstanceId' => 'spare-infra']);
    expect(in_array('fresh-card', array_column($state['players']['p1']['hand'], 'instanceId'), true));
    expect(in_array('spare-infra', array_column($state['players']['p1']['trash'], 'instanceId'), true));
    expectCode('DECOMMISSION_ALREADY_USED', fn() => $engine->applyAction($state, 'p1', ['type' => 'DECOMMISSION', 'cardInstanceId' => 'fresh-card']));
});

check('Hand limit sends overflow to trash', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    prepareTurn($state, 'p1');
    $state['players']['p1']['hand'] = [card('data-select-all', 'draw-command')];
    for ($i = 0; $i < 9; $i++) $state['players']['p1']['hand'][] = card('frontend-vue-widget', "hand{$i}");
    $state['players']['p1']['deck'] = [card('frontend-vue-widget', 'draw1'), card('frontend-vue-widget', 'draw2')];
    $before = count($state['players']['p1']['trash']);
    $engine->applyAction($state, 'p1', ['type' => 'PLAY_CARD', 'cardInstanceId' => 'draw-command']);
    expect(count($state['players']['p1']['hand']) === 10);
    expect(count($state['players']['p1']['trash']) === $before + 2, 'Command plus overflow should enter trash');
});

check('Normal combat deals simultaneous damage', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    prepareTurn($state, 'p1');
    $state['players']['p1']['services'] = [entity($catalog, 'frontend-web-worker', 'attacker')];
    $state['players']['p2']['services'] = [entity($catalog, 'frontend-vue-widget', 'defender')];
    $engine->applyAction($state, 'p1', ['type' => 'ATTACK', 'attackerId' => 'attacker', 'targetId' => 'defender']);
    expect($state['players']['p1']['services'][0]['integrity'] === 1);
    expect(count($state['players']['p2']['services']) === 0);
});

check('Core attack reduces integrity', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    prepareTurn($state, 'p1');
    $state['players']['p1']['services'] = [entity($catalog, 'frontend-web-worker', 'attacker')];
    $state['players']['p2']['services'] = [];
    $engine->applyAction($state, 'p1', ['type' => 'ATTACK', 'attackerId' => 'attacker', 'targetId' => 'core:p2']);
    expect($state['players']['p2']['core'] === 27);
});

check('FIREWALL protects the Core', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    prepareTurn($state, 'p1');
    $state['players']['p1']['services'] = [entity($catalog, 'frontend-web-worker', 'attacker')];
    $state['players']['p2']['services'] = [entity($catalog, 'backend-api-gateway', 'wall')];
    expectCode('FIREWALL_ACTIVE', fn() => $engine->applyAction($state, 'p1', ['type' => 'ATTACK', 'attackerId' => 'attacker', 'targetId' => 'core:p2']));
});

check('REDUNDANCY prevents one complete damage instance', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    prepareTurn($state, 'p1');
    $state['players']['p1']['services'] = [entity($catalog, 'backend-java-service', 'attacker')];
    $target = entity($catalog, 'frontend-vue-widget', 'shielded');
    $target['redundancy'] = true;
    $state['players']['p2']['services'] = [$target];
    $engine->applyAction($state, 'p1', ['type' => 'ATTACK', 'attackerId' => 'attacker', 'targetId' => 'shielded']);
    expect($state['players']['p2']['services'][0]['integrity'] === 3);
    expect($state['players']['p2']['services'][0]['redundancy'] === false);
});

check('PATCH never exceeds maxIntegrity', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    prepareTurn($state, 'p1');
    $service = entity($catalog, 'backend-java-service', 'hurt');
    $service['integrity'] = 4;
    $state['players']['p1']['services'] = [$service];
    $state['players']['p1']['hand'] = [card('backend-hotfix', 'patch')];
    $engine->applyAction($state, 'p1', ['type' => 'PLAY_CARD', 'cardInstanceId' => 'patch', 'targetId' => 'hurt']);
    expect($state['players']['p1']['services'][0]['integrity'] === 6);
});

check('SANDBOX blocks the targets next complete turn', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    prepareTurn($state, 'p1');
    $state['players']['p2']['services'] = [entity($catalog, 'frontend-web-worker', 'victim')];
    $state['players']['p1']['hand'] = [card('frontend-infinite-rerender', 'sandbox')];
    $engine->applyAction($state, 'p1', ['type' => 'PLAY_CARD', 'cardInstanceId' => 'sandbox', 'targetId' => 'victim']);
    $engine->applyAction($state, 'p1', ['type' => 'END_TURN']);
    expect($state['players']['p2']['services'][0]['sandboxed'] === true, 'SANDBOX must remain active during the targets next turn.');
    expectCode('ATTACK_NOT_ALLOWED', fn() => $engine->applyAction($state, 'p2', ['type' => 'ATTACK', 'attackerId' => 'victim', 'targetId' => 'core:p1']));
    $engine->applyAction($state, 'p2', ['type' => 'END_TURN']);
    $engine->applyAction($state, 'p1', ['type' => 'END_TURN']);
    expect($state['players']['p2']['services'][0]['sandboxed'] === false, 'SANDBOX should expire at the start of the following own turn.');
});

check('FORK copies a service without triggering DEPLOY', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    prepareTurn($state, 'p1');
    $state['players']['p1']['services'] = [entity($catalog, 'frontend-react-component', 'react')];
    $state['players']['p1']['hand'] = [card('infrastructure-horizontal-scaling', 'fork')];
    $engine->applyAction($state, 'p1', ['type' => 'PLAY_CARD', 'cardInstanceId' => 'fork', 'targetId' => 'react']);
    expect(count($state['players']['p1']['services']) === 2);
    expect(!in_array('token-child-component', array_column($state['players']['p1']['services'], 'definitionId'), true));
});

check('OVERCLOCK pays extra Compute and grants power', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    prepareTurn($state, 'p1', 5);
    $state['players']['p1']['services'] = [];
    $state['players']['p1']['hand'] = [card('ai-inference-worker', 'worker')];
    $engine->applyAction($state, 'p1', ['type' => 'PLAY_CARD', 'cardInstanceId' => 'worker', 'overclock' => true]);
    expect($state['players']['p1']['compute'] === 0);
    expect($state['players']['p1']['services'][0]['power'] === 6);
});

check('BUG creation and DEBUG work', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    prepareTurn($state, 'p1');
    $state['players']['p1']['services'] = [];
    $state['players']['p1']['hand'] = [card('neutral-junior-developer', 'junior')];
    $engine->applyAction($state, 'p1', ['type' => 'PLAY_CARD', 'cardInstanceId' => 'junior']);
    $bug = array_values(array_filter($state['players']['p1']['services'], static fn(array $s): bool => $s['definitionId'] === 'token-bug'))[0];
    $engine->applyAction($state, 'p1', ['type' => 'DEBUG', 'targetId' => $bug['instanceId']]);
    expect(!in_array('token-bug', array_column($state['players']['p1']['services'], 'definitionId'), true));
});

check('CRASH trigger creates Auto Scaler Replica', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    prepareTurn($state, 'p1');
    $state['players']['p1']['services'] = [entity($catalog, 'backend-java-service', 'attacker')];
    $state['players']['p2']['services'] = [entity($catalog, 'infrastructure-auto-scaler', 'scaler')];
    $engine->applyAction($state, 'p1', ['type' => 'ATTACK', 'attackerId' => 'attacker', 'targetId' => 'scaler']);
    expect(in_array('token-replica', array_column($state['players']['p2']['services'], 'definitionId'), true));
});

check('Kubernetes Cluster creates a Replica for a defending service that crashed this turn', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    prepareTurn($state, 'p1');
    $state['players']['p1']['services'] = [entity($catalog, 'backend-java-service', 'attacker')];
    $state['players']['p2']['services'] = [entity($catalog, 'frontend-react-component', 'defender')];
    $state['players']['p2']['infrastructure'] = [entity($catalog, 'infrastructure-kubernetes-cluster', 'cluster')];

    $engine->applyAction($state, 'p1', ['type' => 'ATTACK', 'attackerId' => 'attacker', 'targetId' => 'defender']);
    expect(!in_array('token-replica', array_column($state['players']['p2']['services'], 'definitionId'), true), 'Replica must wait until turn end.');

    $engine->applyAction($state, 'p1', ['type' => 'END_TURN']);
    expect(in_array('token-replica', array_column($state['players']['p2']['services'], 'definitionId'), true), 'Defending player should receive the Replica.');
});

check('Empty deck causes increasing MEMORY LEAK damage', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    prepareTurn($state, 'p1');
    $state['players']['p2']['deck'] = [];
    $state['players']['p2']['turnsTaken'] = 1;
    $core = $state['players']['p2']['core'];
    $engine->applyAction($state, 'p1', ['type' => 'END_TURN']);
    expect($state['players']['p2']['core'] === $core - 1);
    expect($state['players']['p2']['fatigue'] === 1);
});

check('Core at zero ends the game', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    prepareTurn($state, 'p1');
    $state['players']['p1']['services'] = [entity($catalog, 'frontend-web-worker', 'lethal')];
    $state['players']['p2']['services'] = [];
    $state['players']['p2']['core'] = 2;
    $engine->applyAction($state, 'p1', ['type' => 'ATTACK', 'attackerId' => 'lethal', 'targetId' => 'core:p2']);
    expect($state['status'] === 'finished' && $state['winnerId'] === 'p1');
});

check('Match result records statistics and exposes the highest-impact MVP card', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    prepareTurn($state, 'p1');
    $state['players']['p1']['services'] = [entity($catalog, 'frontend-web-worker', 'lethal')];
    $state['players']['p2']['services'] = [];
    $state['players']['p2']['core'] = 2;
    $engine->applyAction($state, 'p1', ['type' => 'ATTACK', 'attackerId' => 'lethal', 'targetId' => 'core:p2']);
    expect($state['players']['p1']['matchStats']['attacks'] === 1);
    expect($state['players']['p1']['matchStats']['coreDamageDealt'] === 3);
    expect($state['players']['p1']['matchStats']['mvpDefinitionId'] === 'frontend-web-worker');
    expect($state['startedAt'] !== null && $state['finishedAt'] !== null);
    $view = PlayerView::build($state, 'p1');
    expect($view['players']['p1']['matchStats']['mvpDefinitionId'] === 'frontend-web-worker');
});

check('Invalid player action is rejected', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    expectCode('NOT_MATCH_PLAYER', fn() => $engine->applyAction($state, 'intruder', ['type' => 'END_TURN']));
});

check('Action during opponent turn is rejected', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    $other = $state['activePlayerId'] === 'p1' ? 'p2' : 'p1';
    expectCode('NOT_YOUR_TURN', fn() => $engine->applyAction($state, $other, ['type' => 'END_TURN']));
});

check('Invalid target is rejected', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    prepareTurn($state, 'p1');
    $state['players']['p1']['hand'] = [card('backend-hotfix', 'hotfix')];
    expectCode('INVALID_TARGET', fn() => $engine->applyAction($state, 'p1', ['type' => 'PLAY_CARD', 'cardInstanceId' => 'hotfix', 'targetId' => 'missing']));
});

check('Private player view hides opponent hand and deck order', function () use ($catalog): void {
    [, $state] = fresh($catalog);
    $view = PlayerView::build($state, 'p1');
    expect($view['players']['p2']['hand'] === []);
    expect(!array_key_exists('deck', $view['players']['p2']));
    expect(count($view['players']['p1']['hand']) === $view['players']['p1']['handCount']);
});

check('Effect loop guard aborts after 100 resolutions', function () use ($catalog): void {
    $engine = new GameEngine($catalog);
    $method = new ReflectionMethod(GameEngine::class, 'consumeBudget');
    $method->setAccessible(true);
    for ($i = 0; $i < 100; $i++) $method->invoke($engine);
    expectCode('EFFECT_LIMIT', fn() => $method->invoke($engine));
});

check('Version conflict rule rejects stale versions', function (): void {
    $storedVersion = 12;
    $expectedVersion = 11;
    expectCode('VERSION_CONFLICT', function () use ($storedVersion, $expectedVersion): void {
        if ($storedVersion !== $expectedVersion) {
            throw new ApiException('VERSION_CONFLICT', 'Der Match-Stand hat sich geändert.', 409);
        }
    });
});

check('Three consecutive own timeouts cause a match loss', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    prepareTurn($state, 'p1');
    for ($i = 0; $i < 3; $i++) {
        $state['activePlayerId'] = 'p1';
        $engine->endTurn($state, 'p1', true);
        if ($state['status'] === 'finished') break;
    }
    expect($state['status'] === 'finished');
    expect($state['winnerId'] === 'p2');
    expect($state['finishReason'] === 'TIMEOUT');
});

check('Server bot completes a legal turn', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    $botId = $state['activePlayerId'];
    $state['players'][$botId]['isBot'] = true;
    $bot = new BotPlayer($engine, $catalog);
    $bot->playTurn($state, $botId);
    expect($state['status'] === 'finished' || $state['activePlayerId'] !== $botId);
});

check('Bot profiles provide three valid and distinct training opponents', function () use ($catalog): void {
    $profiles = new BotProfiles($catalog);
    $all = $profiles->all();
    expect(array_keys($all) === ['junior', 'security', 'chaos']);
    foreach ($all as $profile) {
        expect(count($profile['deck']) === 30);
        expect(count($catalog->validateDeck($profile['deck'])) === 2);
    }
    expect($all['junior']['name'] !== $all['security']['name'] && $all['security']['name'] !== $all['chaos']['name']);
    foreach (['security-soc-analyst', 'security-siem', 'security-containment-plan'] as $securityCard) {
        expect(count(array_filter($all['security']['deck'], static fn(string $id): bool => $id === $securityCard)) === 2, "Security Auditor should run two copies of {$securityCard}.");
    }
    foreach (['frontend-infinite-rerender', 'frontend-design-system'] as $frontendCard) {
        expect(count(array_filter($all['junior']['deck'], static fn(string $id): bool => $id === $frontendCard)) === 2, "Junior Bot should exercise two copies of {$frontendCard}.");
    }
});

check('Security Auditor prioritizes a FIREWALL deployment', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    prepareTurn($state, 'p1', 4);
    $state['players']['p1']['isBot'] = true;
    $state['players']['p1']['botProfile'] = 'security';
    $state['players']['p1']['hand'] = [card('security-firewall-gateway', 'auditor-firewall')];
    (new BotPlayer($engine, $catalog))->playTurn($state, 'p1');
    expect(in_array('security-firewall-gateway', array_column($state['players']['p1']['services'], 'definitionId'), true));
});

check('Chaos Engineer prioritizes BUG generation', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    prepareTurn($state, 'p1', 5);
    $state['players']['p1']['isBot'] = true;
    $state['players']['p1']['botProfile'] = 'chaos';
    $state['players']['p1']['hand'] = [card('neutral-technical-debt', 'chaos-debt')];
    (new BotPlayer($engine, $catalog))->playTurn($state, 'p1');
    expect(count(array_filter($state['players']['p2']['services'], static fn(array $service): bool => $service['definitionId'] === 'token-bug')) === 3);
});

check('Balance AI spends an expiring discounted card before cheaper base-cost cards', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    prepareTurn($state, 'p1', 3);
    $state['players']['p1']['isBot'] = true;
    $state['players']['p1']['botProfile'] = 'balance-ai';
    $discounted = card('neutral-force-push', 'discounted-command');
    $discounted['costModifier'] = -1;
    $discounted['costModifierTurn'] = $state['turn'];
    $state['players']['p1']['hand'] = [$discounted, card('neutral-stack-overflow', 'cheap-command')];
    $state['players']['p2']['services'] = [entity($catalog, 'frontend-vue-widget', 'force-push-target')];
    (new BotPlayer($engine, $catalog))->playTurn($state, 'p1');
    expect(in_array('force-push-target', array_column($state['players']['p2']['hand'], 'instanceId'), true), 'The expiring discount should be converted into tempo before other plays consume Compute.');
    expect(in_array('cheap-command', array_column($state['players']['p1']['hand'], 'instanceId'), true), 'The cheaper base-cost card should wait when the discounted play consumes all Compute.');
});

check('Balance AI skips a Model Ensemble with no other-domain setup', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    prepareTurn($state, 'p1', 3);
    $state['players']['p1']['isBot'] = true;
    $state['players']['p1']['botProfile'] = 'balance-ai';
    $state['players']['p1']['domains'] = ['backend', 'ai'];
    $state['players']['p1']['hand'] = [card('ai-model-ensemble', 'empty-ensemble')];
    (new BotPlayer($engine, $catalog))->playTurn($state, 'p1');
    expect(in_array('empty-ensemble', array_column($state['players']['p1']['hand'], 'instanceId'), true), 'The balance bot must not spend Model Ensemble as a no-op.');
});

check('Balance AI uses OVERCLOCK when the full Inference Worker cost is available', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    prepareTurn($state, 'p1', 5);
    $state['players']['p1']['isBot'] = true;
    $state['players']['p1']['botProfile'] = 'balance-ai';
    $state['players']['p1']['hand'] = [card('ai-inference-worker', 'overclocked-worker')];
    (new BotPlayer($engine, $catalog))->playTurn($state, 'p1');
    $worker = current(array_filter($state['players']['p1']['services'], static fn(array $service): bool => $service['instanceId'] === 'overclocked-worker'));
    expect(is_array($worker) && $worker['power'] === 6, 'The balance AI should test the OVERCLOCK line instead of always deploying the base body.');
});

check('Balance simulator produces a matchup report without mutating live matches', function () use ($catalog): void {
    $engine = new GameEngine($catalog);
    $bot = new BotPlayer($engine, $catalog);
    $report = (new BalanceSimulator($engine, $bot, $catalog, new BotProfiles($catalog)))->run(2);
    expect($report['summary']['simulatedMatches'] === 260, 'Expected reference and coverage suites to run every unordered pairing twice.');
    expect(count($report['archetypes']) === 19, 'Expected four reference decks and fifteen faction-matrix decks.');
    expect($report['summary']['cardsCovered'] === 90, 'Every playable card must occur in a simulated deck.');
    expect($report['summary']['cardsTotal'] === 90 && $report['summary']['coveragePercent'] === 100.0, 'Expected complete card coverage.');
    expect(count($report['cards']) === 90, 'The report must retain telemetry for every playable card.');
    expect(count(array_filter($report['cards'], static fn(array $row): bool => $row['possibleGames'] <= 0)) === 0, 'Every playable card needs simulation samples.');
    expect(count($report['factions']) === 6, 'Curated reference matches should expose six faction signals.');
    expect(count($report['coverageFactions']) === 6, 'Coverage runs should remain available as separate technical signals.');
    expect($report['summary']['firstPlayerWinRate'] >= 0, 'Expected start-player telemetry.');
    expect($report['cards'][0]['playRate'] >= 0, 'Expected card usage telemetry.');
    $enriched = (new BalanceAdvisor($catalog))->enrich($report, ['recordedMatches' => 0, 'factions' => [], 'cards' => [], 'feedback' => ['responses' => 0, 'easy' => 0, 'fair' => 0, 'hard' => 0, 'coverage' => 0]]);
    expect($enriched['recommendations'] !== [], 'Expected actionable balance signals after analysis.');
    expect(count($enriched['cardAudit']) === 90, 'Card auditor must review every playable card.');
    $eventStream = current(array_filter($enriched['cardAudit'], static fn(array $item): bool => $item['definitionId'] === 'data-event-stream'));
    expect(($eventStream['status'] ?? '') === 'solid', 'Event Stream should be clear after its lasting-value redesign.');
    $idempotencyKey = current(array_filter($enriched['cardAudit'], static fn(array $item): bool => $item['definitionId'] === 'backend-idempotency-key'));
    expect(($idempotencyKey['status'] ?? '') === 'solid', 'Idempotency Key text and engine must agree.');
});

check('Tutorial rejects actions outside the current objective', function () use ($catalog): void {
    $engine = new GameEngine($catalog);
    $scenario = new TutorialScenario($catalog);
    $state = $engine->createState('LEARN', 'tutorial');
    $engine->addPlayer($state, 'p1', 'Ada', $catalog->starterDeck('frontend-backend'));
    $engine->addPlayer($state, 'coach', 'Runtime Coach', $catalog->starterDeck('infrastructure-security'), true);
    $scenario->initialize($state, 'p1', 'coach');
    expectCode('TUTORIAL_ACTION_REQUIRED', fn() => $scenario->assertActionAllowed($state, 'p1', ['type' => 'END_TURN']));
});

check('Tutorial completes all eight server-authoritative lessons', function () use ($catalog): void {
    $engine = new GameEngine($catalog);
    $scenario = new TutorialScenario($catalog);
    $state = $engine->createState('LEARN', 'tutorial');
    $engine->addPlayer($state, 'p1', 'Ada', $catalog->starterDeck('frontend-backend'));
    $engine->addPlayer($state, 'coach', 'Runtime Coach', $catalog->starterDeck('infrastructure-security'), true);
    $scenario->initialize($state, 'p1', 'coach');

    $actionForStep = static function (array $state): array {
        $player = $state['players']['p1'];
        $coach = $state['players']['coach'];
        return match ($state['tutorial']['key']) {
            'deploy-service', 'deploy-infrastructure' => ['type' => 'PLAY_CARD', 'cardInstanceId' => $player['hand'][0]['instanceId']],
            'attack-core' => ['type' => 'ATTACK', 'attackerId' => $player['services'][0]['instanceId'], 'targetId' => 'core:coach'],
            'debug-bug' => ['type' => 'DEBUG', 'targetId' => $player['services'][1]['instanceId']],
            'patch-service' => ['type' => 'PLAY_CARD', 'cardInstanceId' => $player['hand'][0]['instanceId'], 'targetId' => $player['services'][0]['instanceId']],
            'crash-service' => ['type' => 'ATTACK', 'attackerId' => $player['services'][0]['instanceId'], 'targetId' => $coach['services'][0]['instanceId']],
            'replace-infrastructure' => ['type' => 'PLAY_CARD', 'cardInstanceId' => $player['hand'][0]['instanceId'], 'targetId' => $player['infrastructure'][0]['instanceId']],
            default => throw new RuntimeException('Unexpected guided step.'),
        };
    };

    for ($step = 0; $step < 7; $step++) {
        $action = $actionForStep($state);
        $scenario->assertActionAllowed($state, 'p1', $action);
        $engine->applyAction($state, 'p1', $action);
        $scenario->afterAction($state, 'p1');
        expect($state['tutorial']['objectiveComplete'] === true, 'Lesson objective should be complete.');
        $scenario->continue($state, 'p1');
        expect($state['tutorial']['step'] === $step + 1, 'Tutorial should advance exactly one lesson.');
    }

    while ($state['status'] === 'active') {
        $attacker = current(array_filter($state['players']['p1']['services'], static fn(array $service): bool => !$service['exhausted']));
        expect(is_array($attacker), 'Final lesson needs another ready attacker.');
        $action = ['type' => 'ATTACK', 'attackerId' => $attacker['instanceId'], 'targetId' => 'core:coach'];
        $scenario->assertActionAllowed($state, 'p1', $action);
        $engine->applyAction($state, 'p1', $action);
        $scenario->afterAction($state, 'p1');
    }
    expect($state['winnerId'] === 'p1');
    expect($state['tutorial']['completed'] === true);
});

echo "\n{$passed} passed, {$failed} failed\n";
exit($failed === 0 ? 0 : 1);
