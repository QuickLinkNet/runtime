<?php
declare(strict_types=1);

final class BalanceLabService
{
    public function __construct(private PDO $db, private BalanceSimulator $simulator, private BalanceAdvisor $advisor, private CardCatalog $catalog) {}

    public function latest(): ?array
    {
        $row = $this->db->query('SELECT id, simulated_matches, report_json, created_at FROM balance_reports ORDER BY created_at DESC, id DESC LIMIT 1')->fetch();
        if (!$row) return null;
        $result = $this->row($row);
        $result['report'] = $this->hydrateLegacyReport($result['report']);
        $result['report'] = $this->advisor->enrich($result['report'], $this->liveSignals());
        $result['reviews'] = $this->reviews($result['id']);
        return $result;
    }

    public function run(string $adminId, int $matchesPerPair): array
    {
        set_time_limit(90);
        $report = $this->advisor->enrich($this->simulator->run($matchesPerPair), $this->liveSignals());
        $id = bin2hex(random_bytes(16));
        $this->db->prepare('INSERT INTO balance_reports (id, admin_player_id, simulated_matches, report_json) VALUES (?, ?, ?, ?)')
            ->execute([$id, $adminId, $report['summary']['simulatedMatches'], json_encode($report, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE)]);
        return ['id' => $id, 'createdAt' => gmdate('Y-m-d H:i:s'), 'simulatedMatches' => $report['summary']['simulatedMatches'], 'report' => $report, 'reviews' => []];
    }

    public function review(string $adminId, string $reportId, string $recommendationId, string $status, string $note = ''): array
    {
        if (!in_array($status, ['open', 'accepted', 'dismissed'], true)) throw new ApiException('INVALID_BALANCE_REVIEW', 'Ungültiger Review-Status.', 422);
        $exists = $this->db->prepare('SELECT id FROM balance_reports WHERE id = ?'); $exists->execute([$reportId]);
        if (!$exists->fetch()) throw new ApiException('BALANCE_REPORT_NOT_FOUND', 'Balance-Report nicht gefunden.', 404);
        $statement = $this->db->prepare('INSERT INTO balance_recommendation_reviews (report_id, recommendation_id, status, note, reviewed_by) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE status = VALUES(status), note = VALUES(note), reviewed_by = VALUES(reviewed_by), updated_at = CURRENT_TIMESTAMP');
        $statement->execute([$reportId, $recommendationId, $status, mb_substr(trim($note), 0, 500), $adminId]);
        return $this->reviews($reportId);
    }

    private function row(array $row): array { return ['id' => (string)$row['id'], 'createdAt' => (string)$row['created_at'], 'simulatedMatches' => (int)$row['simulated_matches'], 'report' => json_decode((string)$row['report_json'], true, 512, JSON_THROW_ON_ERROR)]; }

    /** Old saved reports remain readable after adding new Balance Lab fields. */
    private function hydrateLegacyReport(array $report): array
    {
        $summary = (array)($report['summary'] ?? []);
        $summary += ['guardTerminations' => 0, 'coreTieBreaks' => 0, 'firstPlayerWinRate' => 50.0, 'confidence' => BalanceSimulator::confidence((int)($summary['simulatedMatches'] ?? 0))];
        $report['summary'] = $summary;
        foreach (['archetypes', 'factions'] as $key) {
            $report[$key] ??= [];
            foreach ($report[$key] as &$row) $row += ['confidence' => BalanceSimulator::confidence((int)($row['games'] ?? 0)), 'winRateInterval' => ['low' => 0.0, 'high' => 100.0]];
            unset($row);
        }
        $report['matchups'] ??= [];
        foreach ($report['matchups'] as &$row) $row += ['leftWinRate' => BalanceSimulator::rate((int)($row['leftWins'] ?? 0), (int)($row['games'] ?? 0)), 'rightWinRate' => BalanceSimulator::rate((int)($row['rightWins'] ?? 0), (int)($row['games'] ?? 0)), 'avgTurns' => 0.0, 'imbalance' => 0.0, 'confidence' => 'low'];
        unset($row);
        $report['cards'] ??= [];
        foreach ($report['cards'] as &$row) $row += ['possibleGames' => (int)($row['games'] ?? 0), 'draws' => (int)($row['games'] ?? 0), 'plays' => (int)($row['games'] ?? 0), 'playRate' => 100.0, 'playConversion' => 100.0, 'confidence' => BalanceSimulator::confidence((int)($row['games'] ?? 0))];
        unset($row);
        return $report;
    }

    private function reviews(string $reportId): array
    {
        $statement = $this->db->prepare('SELECT recommendation_id, status, note, updated_at FROM balance_recommendation_reviews WHERE report_id = ?');
        $statement->execute([$reportId]); $rows = $statement->fetchAll(); $result = [];
        foreach ($rows as $row) $result[(string)$row['recommendation_id']] = ['status' => (string)$row['status'], 'note' => (string)$row['note'], 'updatedAt' => (string)$row['updated_at']];
        return $result;
    }

    private function liveSignals(): array
    {
        $rows = $this->db->query('SELECT winner_player_id, metrics_json FROM match_summaries ORDER BY created_at DESC, match_id DESC LIMIT 1000')->fetchAll();
        $factions = []; $cards = []; $matches = 0;
        foreach ($rows as $row) {
            $metrics = json_decode((string)$row['metrics_json'], true); if (!is_array($metrics)) continue; $matches++;
            foreach ($metrics as $playerId => $metric) {
                $won = (string)($row['winner_player_id'] ?? '') === (string)$playerId;
                foreach ((array)($metric['domains'] ?? []) as $domain) {
                    if (in_array($domain, ['neutral', 'token'], true)) continue;
                    $factions[$domain] ??= ['games' => 0, 'wins' => 0]; $factions[$domain]['games']++; if ($won) $factions[$domain]['wins']++;
                }
                $stats = (array)($metric['stats'] ?? []); $plays = (array)($stats['cardPlayCounts'] ?? []); $draws = (array)($stats['cardDrawCounts'] ?? []); $impact = (array)($stats['cardImpact'] ?? []);
                foreach (array_unique(array_merge(array_keys($plays), array_keys($draws))) as $definitionId) {
                    $cards[$definitionId] ??= ['games' => 0, 'wins' => 0, 'draws' => 0, 'plays' => 0, 'impact' => 0];
                    $cards[$definitionId]['games']++; $cards[$definitionId]['draws'] += (int)($draws[$definitionId] ?? 0); $cards[$definitionId]['plays'] += (int)($plays[$definitionId] ?? 0); $cards[$definitionId]['impact'] += (int)($impact[$definitionId] ?? 0); if ($won) $cards[$definitionId]['wins']++;
                }
            }
        }
        $factionRows = [];
        foreach ($factions as $id => $data) $factionRows[] = $this->rateRow(['id' => $id] + $data);
        $cardRows = [];
        foreach ($cards as $definitionId => $data) {
            try { $definition = $this->catalog->get((string)$definitionId); } catch (ApiException) { continue; }
            $cardRows[] = ['definitionId' => $definitionId, 'domain' => $definition['domain'], 'games' => $data['games'], 'draws' => $data['draws'], 'plays' => $data['plays'], 'playConversion' => BalanceSimulator::rate($data['plays'], $data['draws']), 'impactPerGame' => round($data['impact'] / max(1, $data['games']), 1), 'winRate' => BalanceSimulator::rate($data['wins'], $data['games']), 'confidence' => BalanceSimulator::confidence($data['games'])];
        }
        usort($factionRows, static fn(array $a, array $b): int => $a['winRate'] <=> $b['winRate']);
        usort($cardRows, static fn(array $a, array $b): int => $b['impactPerGame'] <=> $a['impactPerGame']);
        return ['recordedMatches' => $matches, 'factions' => $factionRows, 'cards' => array_slice($cardRows, 0, 20), 'feedback' => $this->feedbackSignals($matches)];
    }

    private function feedbackSignals(int $matches): array
    {
        $rows = $this->db->query('SELECT rating, COUNT(*) AS total FROM match_feedback GROUP BY rating')->fetchAll(); $counts = ['easy' => 0, 'fair' => 0, 'hard' => 0];
        foreach ($rows as $row) $counts[(string)$row['rating']] = (int)$row['total'];
        return ['responses' => array_sum($counts), 'easy' => $counts['easy'], 'fair' => $counts['fair'], 'hard' => $counts['hard'], 'coverage' => $matches === 0 ? 0.0 : round(array_sum($counts) * 100 / $matches, 1)];
    }

    private function rateRow(array $data): array { return ['id' => $data['id'], 'games' => $data['games'], 'winRate' => BalanceSimulator::rate($data['wins'], $data['games']), 'confidence' => BalanceSimulator::confidence($data['games']), 'winRateInterval' => BalanceSimulator::wilson($data['wins'], $data['games'])]; }
}
