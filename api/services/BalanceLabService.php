<?php
declare(strict_types=1);

final class BalanceLabService
{
    public function __construct(private PDO $db, private BalanceSimulator $simulator) {}

    public function latest(): ?array
    {
        $row = $this->db->query('SELECT id, simulated_matches, report_json, created_at FROM balance_reports ORDER BY created_at DESC, id DESC LIMIT 1')->fetch();
        if (!$row) return null;
        $result = $this->row($row);
        $result['report']['live'] = $this->liveSignals();
        return $result;
    }

    public function run(string $adminId, int $matchesPerPair): array
    {
        $report = $this->simulator->run($matchesPerPair);
        $report['live'] = $this->liveSignals();
        $id = bin2hex(random_bytes(16));
        $this->db->prepare('INSERT INTO balance_reports (id, admin_player_id, simulated_matches, report_json) VALUES (?, ?, ?, ?)')
            ->execute([$id, $adminId, $report['summary']['simulatedMatches'], json_encode($report, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE)]);
        return ['id' => $id, 'createdAt' => gmdate('Y-m-d H:i:s'), 'simulatedMatches' => $report['summary']['simulatedMatches'], 'report' => $report];
    }

    private function row(array $row): array
    {
        return ['id' => (string)$row['id'], 'createdAt' => (string)$row['created_at'], 'simulatedMatches' => (int)$row['simulated_matches'], 'report' => json_decode((string)$row['report_json'], true, 512, JSON_THROW_ON_ERROR)];
    }

    private function liveSignals(): array
    {
        $rows = $this->db->query('SELECT winner_player_id, metrics_json FROM match_summaries ORDER BY created_at DESC, match_id DESC LIMIT 500')->fetchAll();
        $factions = [];
        $cards = [];
        $matches = 0;
        foreach ($rows as $row) {
            $metrics = json_decode((string)$row['metrics_json'], true);
            if (!is_array($metrics)) continue;
            $matches++;
            foreach ($metrics as $playerId => $metric) {
                $won = (string)($row['winner_player_id'] ?? '') === (string)$playerId;
                foreach ((array)($metric['domains'] ?? []) as $domain) {
                    if (in_array($domain, ['neutral', 'token'], true)) continue;
                    $factions[$domain] ??= ['games' => 0, 'wins' => 0];
                    $factions[$domain]['games']++;
                    if ($won) $factions[$domain]['wins']++;
                }
                foreach ((array)($metric['stats']['cardImpact'] ?? []) as $definitionId => $impact) {
                    $cards[$definitionId] ??= ['games' => 0, 'impact' => 0];
                    $cards[$definitionId]['games']++;
                    $cards[$definitionId]['impact'] += (int)$impact;
                }
            }
        }
        $factionRows = [];
        foreach ($factions as $id => $data) $factionRows[] = ['id' => $id, 'games' => $data['games'], 'winRate' => $data['games'] === 0 ? 0.0 : round($data['wins'] * 100 / $data['games'], 1)];
        $cardRows = [];
        foreach ($cards as $definitionId => $data) $cardRows[] = ['definitionId' => $definitionId, 'games' => $data['games'], 'impactPerGame' => round($data['impact'] / max(1, $data['games']), 1)];
        usort($factionRows, static fn(array $a, array $b): int => $a['winRate'] <=> $b['winRate']);
        usort($cardRows, static fn(array $a, array $b): int => $b['impactPerGame'] <=> $a['impactPerGame']);
        return ['recordedMatches' => $matches, 'factions' => $factionRows, 'cards' => array_slice($cardRows, 0, 10)];
    }
}
