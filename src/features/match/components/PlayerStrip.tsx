import { CoreIndicator, PlayerSummary } from '../../../ui/molecules';
import type { GameState } from '../../../game/types';
import { useValuePulse } from '../../../ui/hooks/useValuePulse';

interface PlayerStripProps {
  player: GameState['players'][string];
  enemy?: boolean;
  active: boolean;
  targetable: boolean;
  onCore: () => void;
}

export function PlayerStrip({ player, enemy, active, targetable, onCore }: PlayerStripProps) {
  const corePulse = useValuePulse(player.core, 850);

  return (
    <div className={`player-strip ${enemy ? 'enemy' : ''} ${active ? 'active' : ''} ${corePulse ? `is-${corePulse}` : ''}`}>
      <div className="player-name">
        <span>{enemy ? 'GEGNER' : 'DEIN SYSTEM'}</span>
        <b>{player.name}</b>
      </div>
      <PlayerSummary playerId={player.id} deckCount={player.deckCount} handCount={player.handCount} trashCount={player.trashCount} />
      <CoreIndicator value={player.core} targetable={targetable} combatId={`core:${player.id}`} onClick={onCore} />
    </div>
  );
}
