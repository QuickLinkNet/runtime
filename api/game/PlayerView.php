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
            ];
        }
        $events = array_map(static function (array $event) use ($viewerId): array {
            if (($event['playerId'] ?? null) !== $viewerId && in_array($event['type'], ['CARD_GENERATED', 'CARD_DRAWN'], true)) {
                unset($event['definitionId'], $event['cardInstanceId']);
            }
            return $event;
        }, $state['events']);
        return [
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
            'events' => $events,
        ];
    }
}
