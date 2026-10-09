<?php
declare(strict_types=1);

final class ContractService
{
    private const CONTRACTS = [
        'ship_matches' => ['label' => 'Ship it', 'description' => 'Spiele 3 Matches.', 'goal' => 3, 'credits' => 30, 'components' => 10],
        'win_matches' => ['label' => 'Production Ready', 'description' => 'Gewinne 2 Matches.', 'goal' => 2, 'credits' => 45, 'components' => 15],
        'deploy_services' => ['label' => 'Service Fleet', 'description' => 'Spiele 12 Services aus.', 'goal' => 12, 'credits' => 35, 'components' => 12],
    ];

    public function __construct(private PDO $db) {}

    public function snapshot(string $playerId): array
    {
        $cycle = $this->cycle();
        $this->ensure($playerId, $cycle);
        $stmt = $this->db->prepare('SELECT contract_key, progress, claimed_at FROM player_contracts WHERE player_id = ? AND cycle_key = ?');
        $stmt->execute([$playerId, $cycle]);
        $rows = [];
        foreach ($stmt->fetchAll() as $row) $rows[(string)$row['contract_key']] = $row;
        $items = [];
        foreach (self::CONTRACTS as $key => $definition) {
            $row = $rows[$key] ?? [];
            $progress = min((int)($row['progress'] ?? 0), $definition['goal']);
            $items[] = array_merge(['key' => $key, 'progress' => $progress, 'claimed' => ($row['claimed_at'] ?? null) !== null, 'claimable' => $progress >= $definition['goal'] && ($row['claimed_at'] ?? null) === null], $definition);
        }
        return ['cycleKey' => $cycle, 'items' => $items];
    }

    public function recordMatch(string $playerId, bool $won, int $servicesDeployed): void
    {
        $cycle = $this->cycle();
        $this->ensure($playerId, $cycle);
        $increment = $this->db->prepare('UPDATE player_contracts SET progress = progress + ? WHERE player_id = ? AND cycle_key = ? AND contract_key = ?');
        $increment->execute([1, $playerId, $cycle, 'ship_matches']);
        if ($won) $increment->execute([1, $playerId, $cycle, 'win_matches']);
        if ($servicesDeployed > 0) $increment->execute([$servicesDeployed, $playerId, $cycle, 'deploy_services']);
    }

    public function claim(string $playerId, string $key): void
    {
        if (!isset(self::CONTRACTS[$key])) throw new ApiException('UNKNOWN_CONTRACT', 'Dieser Contract ist unbekannt.', 404);
        $cycle = $this->cycle();
        $this->db->beginTransaction();
        try {
            $this->ensure($playerId, $cycle);
            $stmt = $this->db->prepare('SELECT progress, claimed_at FROM player_contracts WHERE player_id = ? AND cycle_key = ? AND contract_key = ? FOR UPDATE');
            $stmt->execute([$playerId, $cycle, $key]);
            $row = $stmt->fetch();
            $definition = self::CONTRACTS[$key];
            if (!$row || (int)$row['progress'] < $definition['goal']) throw new ApiException('CONTRACT_NOT_COMPLETE', 'Dieser Contract ist noch nicht erfüllt.', 409);
            if ($row['claimed_at'] !== null) throw new ApiException('CONTRACT_ALREADY_CLAIMED', 'Diese Belohnung wurde bereits abgeholt.', 409);
            $this->db->prepare('UPDATE player_contracts SET claimed_at = CURRENT_TIMESTAMP WHERE player_id = ? AND cycle_key = ? AND contract_key = ?')->execute([$playerId, $cycle, $key]);
            $this->db->prepare('INSERT IGNORE INTO player_progression (player_id) VALUES (?)')->execute([$playerId]);
            $this->db->prepare('UPDATE player_progression SET credits = credits + ?, total_credits_earned = total_credits_earned + ?, salvage_components = salvage_components + ? WHERE player_id = ?')->execute([$definition['credits'], $definition['credits'], $definition['components'], $playerId]);
            $this->db->commit();
        } catch (Throwable $error) {
            if ($this->db->inTransaction()) $this->db->rollBack();
            throw $error;
        }
    }

    private function ensure(string $playerId, string $cycle): void
    {
        $statement = $this->db->prepare('INSERT IGNORE INTO player_contracts (player_id, cycle_key, contract_key) VALUES (?, ?, ?)');
        foreach (array_keys(self::CONTRACTS) as $key) $statement->execute([$playerId, $cycle, $key]);
    }

    private function cycle(): string { return gmdate('o-\WW'); }
}
