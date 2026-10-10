<?php
declare(strict_types=1);

final class IncidentService
{
    private const INCIDENTS = [
        ['id' => 'traffic_spike', 'name' => 'Traffic Spike', 'description' => 'Der erste Service jedes Zuges kostet 1 Compute mehr.', 'rule' => 'FIRST_SERVICE_PLUS_ONE'],
        ['id' => 'open_source_sprint', 'name' => 'Open Source Sprint', 'description' => 'Der erste Command jedes Zuges kostet 1 Compute weniger.', 'rule' => 'FIRST_COMMAND_MINUS_ONE'],
        ['id' => 'nightly_cache', 'name' => 'Nightly Cache', 'description' => 'Der erste Data- oder AI-Service jedes Zuges kostet 1 Compute weniger.', 'rule' => 'FIRST_DATA_AI_SERVICE_MINUS_ONE'],
    ];

    public function current(): array
    {
        $index = ((int)gmdate('W') - 1) % count(self::INCIDENTS);
        return self::INCIDENTS[$index];
    }
}
