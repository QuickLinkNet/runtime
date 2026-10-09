<?php
declare(strict_types=1);

final class PlayerView
{
    public static function build(array $state, string $viewerId): array
    {
        if (!isset($state['players'][$viewerId])) {
            throw new ApiException('NOT_MATCH_PLAYER', 'Du nimmst nicht an diesem Match teil.', 403);
        }
        $players = [];
        foreach ($state['order'] as $playerId) {
            $player = $state['players'][$playerId];
            $isViewer = $playerId === $viewerId;
            $players[$playerId] = [
                'id' => $player['id'],
                'name' => $player['name'],
                'isBot' => $player['isBot'],
                'botProfile' => $player['isBot'] ? ($player['botProfile'] ?? null) : null,
                'domains' => $isViewer ? $player['domains'] : [],
                'core' => $player['core'],
                'deckCount' => count($player['deck']),
                'handCount' => count($player['hand']),
                'hand' => $isViewer ? $player['hand'] : [],
                'services' => $player['services'],
                'infrastructure' => $player['infrastructure'],
                'trash' => $player['trash'],
                'trashCount' => count($player['trash']),
                'maxCompute' => $isViewer ? $player['maxCompute'] : null,
                'compute' => $isViewer ? $player['compute'] : null,
                'temporaryCompute' => $isViewer ? $player['temporaryCompute'] : null,
                'fatigue' => $player['fatigue'],
                'mulliganDone' => $isViewer ? $player['mulliganDone'] : null,
                'consecutiveTimeouts' => $player['consecutiveTimeouts'],
                'canDecommission' => $isViewer && !(bool)($player['turnFlags']['infrastructureDecommissioned'] ?? false),
                'matchStats' => [
                    'cardsPlayed' => (int)($player['matchStats']['cardsPlayed'] ?? 0),
                    'servicesDeployed' => (int)($player['matchStats']['servicesDeployed'] ?? 0),
                    'infrastructureDeployed' => (int)($player['matchStats']['infrastructureDeployed'] ?? 0),
                    'commandsPlayed' => (int)($player['matchStats']['commandsPlayed'] ?? 0),
                    'attacks' => (int)($player['matchStats']['attacks'] ?? 0),
                    'coreDamageDealt' => (int)($player['matchStats']['coreDamageDealt'] ?? 0),
                    'bugsCreated' => (int)($player['matchStats']['bugsCreated'] ?? 0),
                    'replicasCreated' => (int)($player['matchStats']['replicasCreated'] ?? 0),
                    'servicesCrashed' => (int)($player['matchStats']['servicesCrashed'] ?? 0),
                    'mvpDefinitionId' => $player['matchStats']['mvpDefinitionId'] ?? null,
                ],
            ];
        }
        $events = array_map(static function (array $event) use ($viewerId): array {
            if (($event['playerId'] ?? null) !== $viewerId && in_array($event['type'], ['CARD_GENERATED', 'CARD_DRAWN'], true)) {
                unset($event['definitionId'], $event['cardInstanceId']);
            }
            return $event;
        }, $state['events']);
        $view = [
            'roomCode' => $state['roomCode'],
            'mode' => $state['mode'],
            'status' => $state['status'],
            'viewerId' => $viewerId,
            'order' => $state['order'],
            'players' => $players,
            'activePlayerId' => $state['activePlayerId'],
            'startingPlayerId' => $state['startingPlayerId'],
            'turn' => $state['turn'],
            'turnStartedAt' => $state['turnStartedAt'],
            'turnDeadlineAt' => $state['turnDeadlineAt'],
            'winnerId' => $state['winnerId'],
            'finishReason' => $state['finishReason'],
            'startedAt' => $state['startedAt'] ?? null,
            'finishedAt' => $state['finishedAt'] ?? null,
            'reward' => $state['matchRewards'][$viewerId] ?? [
                'firstWinBooster' => false,
                'credits' => 0,
                'matchCredits' => 0,
                'winBonus' => 0,
            ],
            'events' => $events,
        ];
        if (isset($state['tutorial'])) {
            $view['tutorial'] = $state['tutorial'];
        }
        return $view;
    }
}
