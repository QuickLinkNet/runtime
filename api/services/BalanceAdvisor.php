<?php
declare(strict_types=1);

/** Turns raw simulations and opt-in match telemetry into reviewable balance hypotheses. */
final class BalanceAdvisor
{
    private array $profiles;
    private CardDesignAuditor $cardAuditor;

    public function __construct(private CardCatalog $catalog, ?CardDesignAuditor $cardAuditor = null)
    {
        $path = dirname(__DIR__, 2) . '/shared/faction-profiles.json';
        $this->profiles = json_decode((string)file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);
        $this->cardAuditor = $cardAuditor ?? new CardDesignAuditor($catalog);
    }

    public function enrich(array $report, array $live): array
    {
        $report['live'] = $live;
        $report['coverage'] = $this->coverage();
        $report['cardAudit'] = $this->cardAuditor->audit();
        $report['recommendations'] = $this->recommendations($report, $live);
        $report['quality'] = [
            'simulationConfidence' => $report['summary']['confidence'],
            'liveConfidence' => $this->confidence((int)($live['recordedMatches'] ?? 0)),
            'method' => sprintf(
                'Kuratierte Referenz-Stacks liefern Balance-Signale. Die getrennte Coverage-Matrix prüft ausschließlich, ob %d/%d Karten erreichbar und regelkonform spielbar sind; ihre Siegquoten sind kein Balanceurteil. Live-Signale beschreiben Nutzung, sie beweisen keine Ursache.',
                (int)($report['summary']['cardsCovered'] ?? 0),
                (int)($report['summary']['cardsTotal'] ?? count($this->catalog->all()))
            ),
            'nextStep' => (int)($live['recordedMatches'] ?? 0) < 40 ? 'Mindestens 40 abgeschlossene Spieler-Matches sammeln, bevor Kartenwerte geändert werden.' : 'Hypothesen zuerst als kleine Playtest-Änderung prüfen und danach erneut messen.',
        ];
        return $report;
    }

    private function recommendations(array $report, array $live): array
    {
        $items = [];
        foreach ($report['archetypes'] as $row) {
            if (($row['suite'] ?? 'reference') !== 'reference') continue;
            $interval = $row['winRateInterval']; $name = (string)$row['name'];
            if ($row['games'] >= 48 && $interval['high'] < 48) $items[] = $this->item('buff', $name, $row['confidence'], $row['games'], sprintf('Simulator: %.1f%% (95%%: %.1f–%.1f).', $row['winRate'], $interval['low'], $interval['high']), 'Teste einen kleinen Synergie- oder Konsistenz-Buff, nicht pauschal mehr Power.');
            if ($row['games'] >= 48 && $interval['low'] > 52) $items[] = $this->item('nerf', $name, $row['confidence'], $row['games'], sprintf('Simulator: %.1f%% (95%%: %.1f–%.1f).', $row['winRate'], $interval['low'], $interval['high']), 'Teste eine kleine Kosten- oder Bedingungsverschärfung an der effizientesten Kernkarte.');
        }
        foreach ($report['matchups'] as $matchup) {
            if (($matchup['suite'] ?? 'reference') !== 'reference') continue;
            if ($matchup['left'] !== $matchup['right'] && $matchup['games'] >= 48 && $matchup['imbalance'] >= 18) $items[] = $this->item('matchup', $matchup['left'] . ' vs ' . $matchup['right'], $matchup['confidence'], $matchup['games'], sprintf('Matchup-Abstand: %.1f Punkte (%s %.1f%% / %s %.1f%%).', $matchup['imbalance'], $matchup['left'], $matchup['leftWinRate'], $matchup['right'], $matchup['rightWinRate']), 'Prüfe gezielte Antworten im unterlegenen Stack statt einen globalen Nerf.');
        }
        $first = (float)($report['summary']['firstPlayerWinRate'] ?? 50);
        if (($report['summary']['simulatedMatches'] ?? 0) >= 160 && abs($first - 50) >= 8) $items[] = $this->item('system', 'Startvorteil', $report['summary']['confidence'], $report['summary']['simulatedMatches'], sprintf('Spieler eins gewinnt %.1f%% der Simulationsmatches.', $first), 'Prüfe Bootstrap, Erstdraw oder das Start-Compute – keine Fraktionskarte ändern.');
        foreach ($report['coverage'] as $row) if ($row['gap'] > 0) {
            $items[] = $this->item('new-card', $this->domainName($row['domain']) . ': ' . $row['role'], 'high', $row['cards'], sprintf('%d vorhandene Karten, Zielwert %d.', $row['cards'], $row['target']), $this->newCardBrief($row));
        }
        foreach ($report['cards'] as $card) {
            if ($card['games'] < 48 || ($card['confidence'] ?? 'low') === 'low') continue;
            $name = $this->catalog->get($card['definitionId'])['name'];
            if ($card['impactPerGame'] >= 7 && $card['winRate'] >= 58) $items[] = $this->item('observe', $name, $card['confidence'] ?? 'low', $card['games'], sprintf('%.1f Impact / Spiel, %.1f%% Gewinnrate bei Ausspielen.', $card['impactPerGame'], $card['winRate']), 'In echten Matches gegen Auswahl-Bias prüfen; erst dann einen gezielten Nerf testen.');
            if (($card['playRate'] ?? 100) <= 12) $items[] = $this->item('observe', $name, $card['confidence'] ?? 'low', $card['games'], sprintf('Nur %.1f%% der möglichen Spiele nutzen die Karte.', $card['playRate']), 'Prüfe Kosten, Zielbedingung oder ob der Kartentext den Fraktionsplan ausreichend unterstützt.');
        }
        foreach ((array)($live['factions'] ?? []) as $faction) {
            if (($faction['games'] ?? 0) >= 40 && ($faction['winRate'] ?? 50) < 43) $items[] = $this->item('live-check', $this->domainName($faction['id']), $faction['confidence'] ?? 'medium', $faction['games'], sprintf('Live: %.1f%% über %d Decksignale.', $faction['winRate'], $faction['games']), 'Mit Decklisten und Matchups gegen die Simulation abgleichen; erst danach eine Änderung freigeben.');
        }
        if ($items === []) $items[] = $this->item('observe', 'Stabil', $report['summary']['confidence'], $report['summary']['simulatedMatches'], 'Keine Schwelle klar überschritten.', 'Weitere echte Matches sammeln und nach dem nächsten Kartenpaket erneut simulieren.');
        usort($items, static fn(array $a, array $b): int => self::priority($a['tone']) <=> self::priority($b['tone']));
        return array_slice($items, 0, 14);
    }

    private function coverage(): array
    {
        $roles = ['early' => 4, 'pressure' => 4, 'defense' => 3, 'advantage' => 3, 'control' => 3, 'finisher' => 2];
        $counts = [];
        foreach ($this->catalog->all() as $card) {
            if (($card['domain'] ?? '') === 'neutral') continue;
            foreach ($this->rolesForCard($card) as $role) $counts[$card['domain']][$role] = (int)($counts[$card['domain']][$role] ?? 0) + 1;
        }
        $rows = [];
        foreach (array_keys($this->profiles) as $domain) if ($domain !== 'neutral') foreach ($roles as $role => $target) {
            $cards = (int)($counts[$domain][$role] ?? 0);
            if ($cards < $target) $rows[] = ['domain' => $domain, 'role' => $role, 'cards' => $cards, 'target' => $target, 'gap' => $target - $cards];
        }
        return $rows;
    }

    private function rolesForCard(array $card): array
    {
        $text = strtolower((string)($card['text'] ?? '') . ' ' . ($card['effectId'] ?? '') . ' ' . implode(' ', (array)($card['keywords'] ?? [])));
        $roles = [];
        if ((int)($card['cost'] ?? 99) <= 2) $roles[] = 'early';
        if (($card['type'] ?? '') === 'service' && (int)($card['power'] ?? 0) >= 3) $roles[] = 'pressure';
        if (str_contains($text, 'patch') || str_contains($text, 'redundancy') || str_contains($text, 'firewall') || str_contains($text, 'integrity')) $roles[] = 'defense';
        if (str_contains($text, 'zieh') || str_contains($text, 'draw') || str_contains($text, 'generate') || str_contains($text, 'compute')) $roles[] = 'advantage';
        if (str_contains($text, 'sandbox') || str_contains($text, 'crash') || str_contains($text, 'rate') || str_contains($text, 'cost')) $roles[] = 'control';
        if ((int)($card['cost'] ?? 0) >= 5 || (int)($card['power'] ?? 0) >= 5) $roles[] = 'finisher';
        return array_values(array_unique($roles));
    }

    private function newCardBrief(array $row): string
    {
        $identity = (string)($this->profiles[$row['domain']]['identity'] ?? $row['domain']);
        $verb = (string)(($this->profiles[$row['domain']]['verbs'] ?? ['SYNERGY'])[0]);
        return sprintf('Neue %s-Karte für %s: Rolle %s, klarer %s-Trigger und eine echte Bedingung statt blanker Stats.', $this->domainName($row['domain']), $identity, $row['role'], $verb);
    }
    private function item(string $tone, string $scope, string $confidence, int $samples, string $evidence, string $proposal): array { return ['id' => substr(hash('sha256', $tone . '|' . $scope . '|' . $proposal), 0, 16), 'tone' => $tone, 'scope' => $scope, 'confidence' => $confidence, 'samples' => $samples, 'evidence' => $evidence, 'proposal' => $proposal, 'message' => $evidence . ' ' . $proposal]; }
    private function domainName(string $domain): string { return (string)($this->profiles[$domain]['name'] ?? ucfirst($domain)); }
    private function confidence(int $samples): string { return BalanceSimulator::confidence($samples); }
    private static function priority(string $tone): int { return match ($tone) { 'system' => 0, 'matchup' => 1, 'buff', 'nerf' => 2, 'new-card' => 3, 'live-check' => 4, default => 5 }; }
}
