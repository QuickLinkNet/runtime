<?php
declare(strict_types=1);

/** Runs isolated bot-vs-bot matches. It never touches player progression or live matches. */
final class BalanceSimulator
{
    public function __construct(private GameEngine $engine, private BotPlayer $bot, private CardCatalog $catalog, private BotProfiles $profiles) {}

    public function run(int $matchesPerPair): array
    {
        $matchesPerPair = max(2, min(12, $matchesPerPair));
        $archetypes = $this->archetypes();
        $records = array_fill_keys(array_column($archetypes, 'id'), ['games' => 0, 'wins' => 0, 'turns' => 0]);
        $matchups = []; $referenceFactions = []; $coverageFactions = []; $cards = [];
        $totalTurns = 0; $totalGames = 0; $draws = 0; $firstPlayerGames = 0; $firstPlayerWins = 0; $guardTerminations = 0; $coreTieBreaks = 0;

        foreach ($this->pairings($archetypes) as [$left, $right]) {
            $key = $left['id'] . '__vs__' . $right['id'];
            $matchups[$key] = ['left' => $left['id'], 'right' => $right['id'], 'suite' => $left['suite'], 'games' => 0, 'leftWins' => 0, 'rightWins' => 0, 'draws' => 0, 'turns' => 0];
            for ($round = 0; $round < $matchesPerPair; $round++) {
                $result = $this->match($left, $right, $round, $round % 2 === 0 ? 'left' : 'right');
                $totalGames++; $totalTurns += $result['turns'];
                $matchups[$key]['games']++; $matchups[$key]['turns'] += $result['turns'];
                if ($result['firstPlayerWon']) { $firstPlayerWins++; }
                if ($result['firstPlayerId'] !== null) { $firstPlayerGames++; }
                foreach ([['side' => 'left', 'archetype' => $left], ['side' => 'right', 'archetype' => $right]] as $entry) {
                    $side = $entry['side']; $archetype = $entry['archetype']; $won = $result['winner'] === $side;
                    $records[$archetype['id']]['games']++; $records[$archetype['id']]['turns'] += $result['turns'];
                    if ($won) { $records[$archetype['id']]['wins']++; $matchups[$key][$side . 'Wins']++; }
                    if ($archetype['suite'] === 'reference') $factionBucket =& $referenceFactions;
                    else $factionBucket =& $coverageFactions;
                    foreach ($this->domains($archetype['deck']) as $domain) {
                        $factionBucket[$domain] ??= ['games' => 0, 'wins' => 0];
                        $factionBucket[$domain]['games']++; if ($won) $factionBucket[$domain]['wins']++;
                    }
                    unset($factionBucket);
                    $this->recordCards($cards, $archetype['deck'], $result['draws'][$side], $result['plays'][$side], $result['impact'][$side], $won);
                }
                if ($result['winner'] === null) { $draws++; $matchups[$key]['draws']++; }
                if ($result['termination'] === 'turn_guard') $guardTerminations++;
                if ($result['termination'] === 'core_tiebreak') $coreTieBreaks++;
            }
        }

        $archetypeRows = array_map(fn(array $archetype): array => $this->archetypeRow($archetype, $records[$archetype['id']]), $archetypes);
        $factionRows = [];
        foreach ($referenceFactions as $domain => $data) $factionRows[] = $this->rateRow(['id' => $domain] + $data);
        $coverageFactionRows = [];
        foreach ($coverageFactions as $domain => $data) $coverageFactionRows[] = $this->rateRow(['id' => $domain] + $data);
        $cardRows = $this->cardRows($cards);
        $matchupRows = $this->normalizeMatchups($matchups);
        foreach ($matchupRows as &$row) {
            $row['leftWinRate'] = self::rate($row['leftWins'], $row['games']);
            $row['rightWinRate'] = self::rate($row['rightWins'], $row['games']);
            $row['avgTurns'] = self::average($row['turns'], $row['games']);
            $row['imbalance'] = round(abs($row['leftWinRate'] - $row['rightWinRate']), 1);
            $row['confidence'] = self::confidence($row['games']);
        }
        unset($row);
        usort($factionRows, static fn(array $a, array $b): int => $a['winRate'] <=> $b['winRate']);
        usort($coverageFactionRows, static fn(array $a, array $b): int => $a['winRate'] <=> $b['winRate']);
        usort($cardRows, static fn(array $a, array $b): int => $b['impactPerGame'] <=> $a['impactPerGame']);

        $playableCards = $this->catalog->all();
        $coveredCards = array_values(array_intersect(array_column($playableCards, 'id'), array_keys($cards)));
        return [
            'summary' => [
                'simulatedMatches' => $totalGames, 'matchesPerPair' => $matchesPerPair,
                'averageTurns' => self::average($totalTurns, $totalGames), 'draws' => $draws, 'guardTerminations' => $guardTerminations, 'coreTieBreaks' => $coreTieBreaks,
                'firstPlayerWinRate' => self::rate($firstPlayerWins, $firstPlayerGames),
                'confidence' => self::confidence($totalGames),
                'cardsCovered' => count($coveredCards), 'cardsTotal' => count($playableCards),
                'coveragePercent' => self::rate(count($coveredCards), count($playableCards)),
                'testDecks' => count($archetypes),
            ],
            'archetypes' => $archetypeRows, 'matchups' => array_values($matchupRows), 'factions' => $factionRows,
            'coverageFactions' => $coverageFactionRows,
            'cards' => $cardRows, 'recommendations' => [],
        ];
    }

    private function archetypes(): array
    {
        $reference = [
            // A common bot profile isolates deck strength from bot intelligence.
            ['id' => 'frontend-backend', 'name' => 'Interface & API', 'deck' => $this->catalog->starterDeck('frontend-backend'), 'profile' => 'balance', 'suite' => 'reference'],
            ['id' => 'infrastructure-security', 'name' => 'Fortress Stack', 'deck' => $this->catalog->starterDeck('infrastructure-security'), 'profile' => 'balance', 'suite' => 'reference'],
            ['id' => 'data-ai', 'name' => 'Model Pipeline', 'deck' => $this->catalog->starterDeck('data-ai'), 'profile' => 'balance-ai', 'suite' => 'reference'],
            ['id' => 'chaos', 'name' => 'Chaos Engineer', 'deck' => (array)$this->profiles->get('chaos')['deck'], 'profile' => 'balance', 'suite' => 'reference'],
        ];
        return array_merge($reference, $this->coverageArchetypes());
    }

    /**
     * Every pair contains all twelve cards of both domains once. Six balanced
     * neutral slots complete a legal 30-card deck. Across the full matrix this
     * makes every playable definition observable without inventing test-only cards.
     */
    private function coverageArchetypes(): array
    {
        $domainNames = [
            'frontend' => 'Frontend', 'backend' => 'Backend', 'infrastructure' => 'DevOps',
            'data' => 'Data', 'security' => 'Security', 'ai' => 'AI',
        ];
        $cardsByDomain = [];
        $neutral = [];
        foreach ($this->catalog->all() as $card) {
            if ($card['domain'] === 'neutral') $neutral[] = $card;
            else $cardsByDomain[$card['domain']][] = $card;
        }
        $neutralUsage = array_fill_keys(array_column($neutral, 'id'), 0);
        $domains = array_keys($domainNames);
        $archetypes = [];
        $pairIndex = 0;
        for ($left = 0; $left < count($domains); $left++) {
            for ($right = $left + 1; $right < count($domains); $right++) {
                $leftDomain = $domains[$left]; $rightDomain = $domains[$right];
                $domainCards = array_merge($cardsByDomain[$leftDomain] ?? [], $cardsByDomain[$rightDomain] ?? []);
                $deck = array_column($domainCards, 'id');
                $infrastructureCount = count(array_filter($domainCards, static fn(array $card): bool => $card['type'] === 'infrastructure'));
                foreach ($this->neutralCardsForDeck($neutral, $neutralUsage, CardCatalog::MAX_INFRASTRUCTURE_PER_DECK - $infrastructureCount, $pairIndex) as $id) {
                    $deck[] = $id;
                    $neutralUsage[$id]++;
                }
                $this->catalog->validateDeck($deck);
                $archetypes[] = [
                    'id' => 'matrix-' . $leftDomain . '-' . $rightDomain,
                    'name' => 'Matrix · ' . $domainNames[$leftDomain] . ' + ' . $domainNames[$rightDomain],
                    'deck' => $deck,
                    'profile' => in_array('ai', [$leftDomain, $rightDomain], true) ? 'balance-ai' : 'balance',
                    'suite' => 'coverage',
                ];
                $pairIndex++;
            }
        }
        return $archetypes;
    }

    /** @return array<int,string> */
    private function neutralCardsForDeck(array $neutral, array $usage, int $infrastructureCapacity, int $pairIndex): array
    {
        $selected = [];
        $neutralCount = count($neutral);
        $neutralOrder = array_flip(array_column($neutral, 'id'));
        $selectedInfrastructure = 0;
        while (count($selected) < 6) {
            $candidates = array_values(array_filter($neutral, static function (array $card) use ($selected, $infrastructureCapacity, $selectedInfrastructure): bool {
                if (in_array($card['id'], $selected, true)) return false;
                if ($card['type'] !== 'infrastructure') return true;
                return $selectedInfrastructure < $infrastructureCapacity;
            }));
            usort($candidates, static function (array $a, array $b) use ($usage, $neutralOrder, $neutralCount, $pairIndex): int {
                $byUsage = $usage[$a['id']] <=> $usage[$b['id']];
                if ($byUsage !== 0) return $byUsage;
                $aIndex = $neutralOrder[$a['id']]; $bIndex = $neutralOrder[$b['id']];
                $offset = ($pairIndex * 6) % max(1, $neutralCount);
                return (($aIndex - $offset + $neutralCount) % $neutralCount) <=> (($bIndex - $offset + $neutralCount) % $neutralCount);
            });
            if ($candidates === []) throw new RuntimeException('Could not build legal neutral coverage slots.');
            $selected[] = (string)$candidates[0]['id'];
            if ($candidates[0]['type'] === 'infrastructure') $selectedInfrastructure++;
        }
        return $selected;
    }

    /** Only compare decks inside the same suite; reference and coverage data serve different questions. */
    private function pairings(array $archetypes): array
    {
        $pairings = [];
        foreach (['reference', 'coverage'] as $suite) {
            $items = array_values(array_filter($archetypes, static fn(array $item): bool => $item['suite'] === $suite));
            for ($left = 0; $left < count($items); $left++) {
                for ($right = $left; $right < count($items); $right++) $pairings[] = [$items[$left], $items[$right]];
            }
        }
        return $pairings;
    }

    private function match(array $left, array $right, int $round, string $wantedFirst): array
    {
        $leftId = 'left'; $rightId = 'right'; $state = [];
        // The engine owns randomness. Recreate only the opening until the planned seat is reached,
        // so every report has exactly the same number of first-player games on both sides.
        for ($attempt = 0; $attempt < 8; $attempt++) {
            $state = $this->engine->createState('SIM' . $round . '-' . $attempt, 'balance');
            $this->engine->addPlayer($state, $leftId, $left['name'], $left['deck'], true);
            $this->engine->addPlayer($state, $rightId, $right['name'], $right['deck'], true);
            $state['players'][$leftId]['botProfile'] = $left['profile']; $state['players'][$rightId]['botProfile'] = $right['profile'];
            $this->engine->startMatch($state);
            $this->engine->applyAction($state, $leftId, ['type' => 'MULLIGAN', 'cardInstanceIds' => []]);
            $this->engine->applyAction($state, $rightId, ['type' => 'MULLIGAN', 'cardInstanceIds' => []]);
            if ($state['startingPlayerId'] === $wantedFirst) break;
        }
        $turnGuard = 70;
        while ($state['status'] === 'active' && --$turnGuard > 0) $this->bot->playTurn($state, $state['activePlayerId']);
        $winner = null;
        $termination = 'completed';
        if ($state['status'] === 'finished') $winner = $state['winnerId'] === $leftId ? 'left' : 'right';
        elseif ($state['players'][$leftId]['core'] !== $state['players'][$rightId]['core']) { $winner = $state['players'][$leftId]['core'] > $state['players'][$rightId]['core'] ? 'left' : 'right'; $termination = 'core_tiebreak'; }
        else $termination = 'turn_guard';
        $firstPlayerId = $state['startingPlayerId'] ?? null;
        return [
            'winner' => $winner, 'turns' => (int)$state['turn'], 'termination' => $termination, 'firstPlayerId' => $firstPlayerId,
            'firstPlayerWon' => $winner !== null && (($winner === 'left' ? $leftId : $rightId) === $firstPlayerId),
            'impact' => ['left' => (array)$state['players'][$leftId]['matchStats']['cardImpact'], 'right' => (array)$state['players'][$rightId]['matchStats']['cardImpact']],
            'plays' => ['left' => (array)$state['players'][$leftId]['matchStats']['cardPlayCounts'], 'right' => (array)$state['players'][$rightId]['matchStats']['cardPlayCounts']],
            'draws' => ['left' => (array)$state['players'][$leftId]['matchStats']['cardDrawCounts'], 'right' => (array)$state['players'][$rightId]['matchStats']['cardDrawCounts']],
        ];
    }

    private function recordCards(array &$cards, array $deck, array $draws, array $plays, array $impact, bool $won): void
    {
        foreach (array_unique($deck) as $id) {
            $cards[$id] ??= ['possibleGames' => 0, 'games' => 0, 'draws' => 0, 'plays' => 0, 'winsWhenPlayed' => 0, 'impact' => 0];
            $cards[$id]['possibleGames']++;
            $count = (int)($plays[$id] ?? 0);
            $cards[$id]['draws'] += (int)($draws[$id] ?? 0);
            if ($count > 0) { $cards[$id]['games']++; $cards[$id]['plays'] += $count; if ($won) $cards[$id]['winsWhenPlayed']++; }
            $cards[$id]['impact'] += (int)($impact[$id] ?? 0);
        }
    }

    private function cardRows(array $cards): array
    {
        $rows = [];
        foreach ($cards as $id => $data) {
            $definition = $this->catalog->get($id);
            $rows[] = ['definitionId' => $id, 'domain' => $definition['domain'], 'games' => $data['games'], 'possibleGames' => $data['possibleGames'], 'draws' => $data['draws'], 'plays' => $data['plays'],
                'playRate' => self::rate($data['games'], $data['possibleGames']), 'impactPerGame' => self::average($data['impact'], $data['games']),
                'playConversion' => self::rate($data['plays'], $data['draws']), 'winRate' => self::rate($data['winsWhenPlayed'], $data['games']), 'confidence' => self::confidence($data['games'])];
        }
        return $rows;
    }

    /** Merge mirrored seat orders so each matchup has one readable, twice as large sample. */
    private function normalizeMatchups(array $matchups): array
    {
        $normalized = [];
        foreach ($matchups as $row) {
            $ids = [(string)$row['left'], (string)$row['right']]; sort($ids, SORT_STRING);
            $key = $ids[0] . '__vs__' . $ids[1];
            $normalized[$key] ??= ['left' => $ids[0], 'right' => $ids[1], 'suite' => (string)($row['suite'] ?? 'reference'), 'games' => 0, 'leftWins' => 0, 'rightWins' => 0, 'draws' => 0, 'turns' => 0];
            $swapped = $row['left'] !== $ids[0];
            $normalized[$key]['games'] += $row['games']; $normalized[$key]['draws'] += $row['draws']; $normalized[$key]['turns'] += $row['turns'];
            $normalized[$key]['leftWins'] += $swapped ? $row['rightWins'] : $row['leftWins'];
            $normalized[$key]['rightWins'] += $swapped ? $row['leftWins'] : $row['rightWins'];
        }
        return $normalized;
    }

    private function archetypeRow(array $archetype, array $data): array
    {
        return ['id' => $archetype['id'], 'name' => $archetype['name'], 'suite' => $archetype['suite'], 'games' => $data['games'], 'winRate' => self::rate($data['wins'], $data['games']), 'avgTurns' => self::average($data['turns'], $data['games']), 'confidence' => self::confidence($data['games']), 'winRateInterval' => self::wilson($data['wins'], $data['games'])];
    }

    private function rateRow(array $data): array { return ['id' => $data['id'], 'games' => $data['games'], 'winRate' => self::rate($data['wins'], $data['games']), 'confidence' => self::confidence($data['games']), 'winRateInterval' => self::wilson($data['wins'], $data['games'])]; }
    private function domains(array $deck): array { $domains = []; foreach ($deck as $id) { $domain = $this->catalog->get($id)['domain']; if (!in_array($domain, ['neutral', 'token'], true)) $domains[$domain] = true; } return array_keys($domains); }
    public static function rate(int $part, int $total): float { return $total === 0 ? 0.0 : round($part * 100 / $total, 1); }
    public static function average(int $value, int $total): float { return $total === 0 ? 0.0 : round($value / $total, 1); }
    public static function confidence(int $samples): string { return $samples >= 160 ? 'high' : ($samples >= 48 ? 'medium' : 'low'); }
    public static function wilson(int $wins, int $games): array { if ($games === 0) return ['low' => 0.0, 'high' => 100.0]; $z = 1.96; $p = $wins / $games; $denominator = 1 + ($z * $z / $games); $centre = ($p + ($z * $z / (2 * $games))) / $denominator; $margin = $z * sqrt(($p * (1 - $p) / $games) + ($z * $z / (4 * $games * $games))) / $denominator; return ['low' => round(max(0, ($centre - $margin) * 100), 1), 'high' => round(min(100, ($centre + $margin) * 100), 1)]; }
}
