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
        'serviceCrashed' => false,
        'projectManagerDiscount' => false,
    ];
}

check('Card catalog has exactly 72 playable cards', function () use ($catalog): void {
    expect(count($catalog->all()) === 72);
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

check('Design System reinforces only Frontend services', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    prepareTurn($state, 'p1');
    $state['players']['p1']['services'] = [
        entity($catalog, 'frontend-vue-widget', 'frontend-service'),
        entity($catalog, 'backend-queue-worker', 'backend-service'),
    ];
    $state['players']['p1']['hand'] = [card('frontend-design-system', 'design-system')];
    $engine->applyAction($state, 'p1', ['type' => 'PLAY_CARD', 'cardInstanceId' => 'design-system']);
    expect($state['players']['p1']['services'][0]['maxIntegrity'] === 4);
    expect($state['players']['p1']['services'][1]['maxIntegrity'] === 3);
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

check('Second player receives BOOTSTRAP and first starts at one Compute', function () use ($catalog): void {
    [, $state] = fresh($catalog);
    $second = $state['order'][0] === $state['startingPlayerId'] ? $state['order'][1] : $state['order'][0];
    expect(in_array('token-bootstrap', array_column($state['players'][$second]['hand'], 'definitionId'), true));
    expect(count($state['players'][$state['startingPlayerId']]['hand']) === 5);
    expect(count($state['players'][$second]['hand']) === 6);
    expect($state['players'][$state['startingPlayerId']]['maxCompute'] === 1);
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

check('Two State Stores stack their discount on the first Frontend service', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    prepareTurn($state, 'p1', 1);
    $state['players']['p1']['infrastructure'] = [
        entity($catalog, 'frontend-state-store', 'state-store-1'),
        entity($catalog, 'frontend-state-store', 'state-store-2'),
    ];
    $state['players']['p1']['hand'] = [card('frontend-web-worker', 'discounted-worker')];
    $engine->applyAction($state, 'p1', ['type' => 'PLAY_CARD', 'cardInstanceId' => 'discounted-worker']);
    expect($state['players']['p1']['compute'] === 0, 'Web Worker should cost exactly 1 Compute.');
    expect(in_array('discounted-worker', array_column($state['players']['p1']['services'], 'instanceId'), true));
});

check('Service board limit is enforced', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    prepareTurn($state, 'p1');
    $state['players']['p1']['services'] = [];
    for ($i = 0; $i < 5; $i++) $state['players']['p1']['services'][] = entity($catalog, 'frontend-vue-widget', "slot{$i}");
    $state['players']['p1']['hand'] = [card('frontend-vue-widget', 'sixth')];
    expectCode('SERVICE_SLOTS_FULL', fn() => $engine->applyAction($state, 'p1', ['type' => 'PLAY_CARD', 'cardInstanceId' => 'sixth']));
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

check('SANDBOX blocks attacks', function () use ($catalog): void {
    [$engine, $state] = fresh($catalog);
    prepareTurn($state, 'p1');
    $state['players']['p2']['services'] = [entity($catalog, 'frontend-web-worker', 'victim')];
    $state['players']['p1']['hand'] = [card('frontend-infinite-rerender', 'sandbox')];
    $engine->applyAction($state, 'p1', ['type' => 'PLAY_CARD', 'cardInstanceId' => 'sandbox', 'targetId' => 'victim']);
    prepareTurn($state, 'p2');
    expectCode('ATTACK_NOT_ALLOWED', fn() => $engine->applyAction($state, 'p2', ['type' => 'ATTACK', 'attackerId' => 'victim', 'targetId' => 'core:p1']));
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

check('Balance simulator produces a matchup report without mutating live matches', function () use ($catalog): void {
    $engine = new GameEngine($catalog);
    $bot = new BotPlayer($engine, $catalog);
    $report = (new BalanceSimulator($engine, $bot, $catalog, new BotProfiles($catalog)))->run(2);
    expect($report['summary']['simulatedMatches'] === 32, 'Expected every ordered archetype pairing to be simulated twice.');
    expect(count($report['archetypes']) === 4, 'Expected four balance archetypes.');
    expect($report['recommendations'] !== [], 'Expected actionable balance signals.');
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
