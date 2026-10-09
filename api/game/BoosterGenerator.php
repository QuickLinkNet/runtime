<?php
declare(strict_types=1);

final class BoosterGenerator
{
    private array $config;
    private $randomInt;

    public function __construct(
        private CardCatalog $catalog,
        ?string $configPath = null,
        ?callable $randomInt = null
    ) {
        $configPath ??= dirname(__DIR__, 2) . '/shared/booster-config.json';
        $this->config = json_decode((string)file_get_contents($configPath), true, 512, JSON_THROW_ON_ERROR);
        $this->randomInt = $randomInt ?? static fn(int $min, int $max): int => random_int($min, $max);
        $this->validateConfig();
    }

    /** @param array<string,int> $owned @param string[]|null $allowedDefinitionIds @return array<int,array<string,mixed>> */
    public function generate(array $owned, ?array $allowedDefinitionIds = null): array
    {
        $cards = [];
        $picked = [];
        $allowed = $allowedDefinitionIds === null ? null : array_fill_keys($allowedDefinitionIds, true);
        foreach ($this->config['slots'] as $slot) {
            for ($index = 0; $index < (int)$slot['count']; $index++) {
                $rarity = $this->weightedRarity($slot['weights']);
                $definitionId = $this->pickCard($rarity, $owned, $picked, $allowed);
                $previous = (int)($owned[$definitionId] ?? 0);
                $cards[] = [
                    'definitionId' => $definitionId,
                    'rarity' => $rarity,
                    'previousQuantity' => $previous,
                    'isNew' => $previous === 0,
                ];
                $owned[$definitionId] = $previous + 1;
                $picked[$definitionId] = true;
            }
        }
        return $cards;
    }

    public function rarityFor(string $definitionId): string
    {
        return (string)$this->config['rarities'][$definitionId];
    }

    private function weightedRarity(array $weights): string
    {
        $total = array_sum($weights);
        $roll = ($this->randomInt)(1, $total);
        foreach ($weights as $rarity => $weight) {
            $roll -= (int)$weight;
            if ($roll <= 0) return (string)$rarity;
        }
        throw new RuntimeException('Invalid booster rarity weights.');
    }

    /** @param array<string,int> $owned @param array<string,bool> $picked @param array<string,bool>|null $allowed */
    private function pickCard(string $rarity, array $owned, array $picked, ?array $allowed): string
    {
        $pool = array_keys(array_filter(
            $this->config['rarities'],
            static fn(string $value, string $id): bool => $value === $rarity && ($allowed === null || isset($allowed[$id])),
            ARRAY_FILTER_USE_BOTH
        ));
        if ($pool === []) throw new RuntimeException('No eligible card exists for booster rarity ' . $rarity . '.');
        $unique = array_values(array_filter($pool, static fn(string $id): bool => !isset($picked[$id])));
        if ($unique !== []) $pool = $unique;

        $protection = $this->config['duplicateProtection'];
        if (($protection['enabled'] ?? false) === true) {
            $limit = (int)($protection['preferredMaxCopies'] ?? 2);
            $preferred = array_values(array_filter(
                $pool,
                static fn(string $id): bool => (int)($owned[$id] ?? 0) < $limit
            ));
            if ($preferred !== []) $pool = $preferred;
        }
        return $pool[($this->randomInt)(0, count($pool) - 1)];
    }

    private function validateConfig(): void
    {
        $playableIds = array_column($this->catalog->all(), 'id');
        $configuredIds = array_keys($this->config['rarities'] ?? []);
        sort($playableIds);
        sort($configuredIds);
        if ($playableIds !== $configuredIds) {
            throw new RuntimeException('Every playable card needs exactly one booster rarity.');
        }
        $slotCount = array_sum(array_column($this->config['slots'] ?? [], 'count'));
        if ($slotCount !== (int)($this->config['packSize'] ?? 0)) {
            throw new RuntimeException('Booster slot count does not match pack size.');
        }
    }
}
