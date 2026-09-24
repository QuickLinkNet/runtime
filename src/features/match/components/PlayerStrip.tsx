import { CoreIndicator, PlayerSummary } from '../../../ui/molecules';
import type { GameState } from '../../../game/types';

interface PlayerStripProps {
  player: GameState['players'][string];
  enemy?: boolean;
  active: boolean;
  targetable: boolean;
  onCore: () => void;
}

export function PlayerStrip({ player, enemy, active, targetable, onCore }: PlayerStripProps) {
  return (
    <div className={`player-strip ${enemy ? 'enemy' : ''} ${active ? 'active' : ''}`}>
      <div className="player-name">
        <span>{enemy ? 'GEGNER' : 'DEIN SYSTEM'}</span>
        <b>{player.name}</b>
      </div>
      <PlayerSummary deckCount={player.deckCount} handCount={player.handCount} trashCount={player.trashCount} />
      <CoreIndicator value={player.core} targetable={targetable} onClick={onCore} />
    </div>
  );
}
