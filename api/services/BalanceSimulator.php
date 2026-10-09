<?php
declare(strict_types=1);

/** Runs isolated bot-vs-bot matches. It never touches player progression or live matches. */
final class BalanceSimulator
{
    public function __construct(private GameEngine $engine, private BotPlayer $bot, private CardCatalog $catalog, private BotProfiles $profiles) {}

    public function run(int $matchesPerPair): array
    {
        $matchesPerPair = max(2, min(200, $matchesPerPair));
        $archetypes = [
            ['id' => 'frontend-backend', 'name' => 'Interface & API', 'deck' => $this->catalog->starterDeck('frontend-backend'), 'profile' => 'junior'],
            ['id' => 'infrastructure-security', 'name' => 'Fortress Stack', 'deck' => $this->catalog->starterDeck('infrastructure-security'), 'profile' => 'security'],
            ['id' => 'data-ai', 'name' => 'Model Pipeline', 'deck' => $this->catalog->starterDeck('data-ai'), 'profile' => 'junior'],
            ['id' => 'chaos', 'name' => 'Chaos Engineer', 'deck' => (array)$this->profiles->get('chaos')['deck'], 'profile' => 'chaos'],
        ];
        $records = array_fill_keys(array_column($archetypes, 'id'), ['games' => 0, 'wins' => 0, 'turns' => 0]);
        $matchups = [];
        $factions = [];
        $cards = [];
        $totalTurns = 0;
        $totalGames = 0;
        $draws = 0;

        foreach ($archetypes as $left) foreach ($archetypes as $right) {
            $key = $left['id'] . '__vs__' . $right['id'];
            $matchups[$key] = ['left' => $left['id'], 'right' => $right['id'], 'games' => 0, 'leftWins' => 0, 'rightWins' => 0, 'draws' => 0, 'turns' => 0];
            for ($round = 0; $round < $matchesPerPair; $round++) {
                $result = $this->match($left, $right, $round);
                $totalGames++;
                $totalTurns += $result['turns'];
                $matchups[$key]['games']++;
                $matchups[$key]['turns'] += $result['turns'];
                foreach ([['side' => 'left', 'archetype' => $left], ['side' => 'right', 'archetype' => $right]] as $entry) {
                    $side = $entry['side']; $archetype = $entry['archetype'];
                    $records[$archetype['id']]['games']++;
                    $records[$archetype['id']]['turns'] += $result['turns'];
                    $won = $result['winner'] === $side;
                    if ($won) { $records[$archetype['id']]['wins']++; $matchups[$key][$side . 'Wins']++; }
                    foreach ($this->domains($archetype['deck']) as $domain) {
                        $factions[$domain] ??= ['games' => 0, 'wins' => 0];
                        $factions[$domain]['games']++;
                        if ($won) $factions[$domain]['wins']++;
                    }
                    foreach ($result['impact'][$side] as $definitionId => $impact) {
                        $cards[$definitionId] ??= ['games' => 0, 'impact' => 0, 'wins' => 0];
                        $cards[$definitionId]['games']++;
                        $cards[$definitionId]['impact'] += (int)$impact;
                        if ($won) $cards[$definitionId]['wins']++;
                    }
                }
                if ($result['winner'] === null) { $draws++; $matchups[$key]['draws']++; }
            }
        }

        $archetypeRows = array_map(static fn(array $archetype) => [
            'id' => $archetype['id'], 'name' => $archetype['name'], 'games' => $records[$archetype['id']]['games'], 'winRate' => self::rate($records[$archetype['id']]['wins'], $records[$archetype['id']]['games']), 'avgTurns' => self::average($records[$archetype['id']]['turns'], $records[$archetype['id']]['games']),
        ], $archetypes);
        $factionRows = [];
        foreach ($factions as $domain => $data) $factionRows[] = ['id' => $domain, 'games' => $data['games'], 'winRate' => self::rate($data['wins'], $data['games'])];
        $cardRows = [];
        foreach ($cards as $id => $data) {
            $definition = $this->catalog->get($id);
            $cardRows[] = ['definitionId' => $id, 'games' => $data['games'], 'impactPerGame' => self::average($data['impact'], $data['games']), 'winRate' => self::rate($data['wins'], $data['games']), 'domain' => $definition['domain']];
        }
        usort($cardRows, static fn(array $a, array $b): int => $b['impactPerGame'] <=> $a['impactPerGame']);
        usort($factionRows, static fn(array $a, array $b): int => $a['winRate'] <=> $b['winRate']);

        return [
            'summary' => ['simulatedMatches' => $totalGames, 'matchesPerPair' => $matchesPerPair, 'averageTurns' => self::average($totalTurns, $totalGames), 'draws' => $draws],
            'archetypes' => $archetypeRows,
            'matchups' => array_values($matchups),
            'factions' => $factionRows,
            'cards' => array_slice($cardRows, 0, 18),
            'recommendations' => $this->recommendations($archetypeRows, $factionRows, $cardRows),
        ];
    }

    private function match(array $left, array $right, int $round): array
    {
        $state = $this->engine->createState('SIM' . $round, 'balance');
        $leftId = 'left'; $rightId = 'right';
        $this->engine->addPlayer($state, $leftId, $left['name'], $left['deck'], true);
        $this->engine->addPlayer($state, $rightId, $right['name'], $right['deck'], true);
        $state['players'][$leftId]['botProfile'] = $left['profile'];
        $state['players'][$rightId]['botProfile'] = $right['profile'];
        $this->engine->startMatch($state);
        $this->engine->applyAction($state, $leftId, ['type' => 'MULLIGAN', 'cardInstanceIds' => []]);
        $this->engine->applyAction($state, $rightId, ['type' => 'MULLIGAN', 'cardInstanceIds' => []]);
        $turnGuard = 70;
        while ($state['status'] === 'active' && --$turnGuard > 0) $this->bot->playTurn($state, $state['activePlayerId']);
        $winner = null;
        if ($state['status'] === 'finished') $winner = $state['winnerId'] === $leftId ? 'left' : 'right';
        elseif ($state['players'][$leftId]['core'] !== $state['players'][$rightId]['core']) $winner = $state['players'][$leftId]['core'] > $state['players'][$rightId]['core'] ? 'left' : 'right';
        return ['winner' => $winner, 'turns' => (int)$state['turn'], 'impact' => ['left' => (array)$state['players'][$leftId]['matchStats']['cardImpact'], 'right' => (array)$state['players'][$rightId]['matchStats']['cardImpact']]];
    }

    private function domains(array $deck): array
    {
        $domains = [];
        foreach ($deck as $id) { $domain = $this->catalog->get($id)['domain']; if (!in_array($domain, ['neutral', 'token'], true)) $domains[$domain] = true; }
        return array_keys($domains);
    }

    private function recommendations(array $archetypes, array $factions, array $cards): array
    {
        $items = [];
        foreach ($archetypes as $row) {
            if ($row['winRate'] < 43) $items[] = ['tone' => 'buff', 'scope' => $row['name'], 'message' => sprintf('%.1f%% Winrate im Simulator: prüfe 1–2 Synergie-Buffs, nicht pauschal Power.', $row['winRate'])];
            if ($row['winRate'] > 57) $items[] = ['tone' => 'nerf', 'scope' => $row['name'], 'message' => sprintf('%.1f%% Winrate im Simulator: prüfe dominante Kernkarten oder zu effiziente Kurven.', $row['winRate'])];
        }
        foreach ($factions as $row) if ($row['games'] >= 20 && $row['winRate'] < 44) $items[] = ['tone' => 'synergy', 'scope' => ucfirst($row['id']), 'message' => 'Die Fraktion braucht wahrscheinlich verlässlichere Kern-Synergien statt nur stärkere Einzelkarten.'];
        foreach (array_slice($cards, 0, 3) as $row) if ($row['games'] >= 8) $items[] = ['tone' => 'observe', 'scope' => $this->catalog->get($row['definitionId'])['name'], 'message' => sprintf('Hoher Simulations-Impact (%.1f): in echten Matches auf Dominanz prüfen.', $row['impactPerGame'])];
        return $items === [] ? [['tone' => 'observe', 'scope' => 'Stabil', 'message' => 'Keine klare Ausreißer-Empfehlung. Mehr Samples oder echte Matchdaten sammeln.']] : array_slice($items, 0, 10);
    }

    private static function rate(int $part, int $total): float { return $total === 0 ? 0.0 : round($part * 100 / $total, 1); }
    private static function average(int $value, int $total): float { return $total === 0 ? 0.0 : round($value / $total, 1); }
}
