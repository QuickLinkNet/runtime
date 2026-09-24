import type { PlayerView } from '../../../game/types';
import { Button } from '../../../ui/atoms';

interface MatchResultProps {
  player: PlayerView;
  opponent: PlayerView;
  won: boolean;
  onExit: () => void;
}

export function MatchResult({ player, opponent, won, onExit }: MatchResultProps) {
  return (
    <main className={`screen game-over ${won ? 'victory' : 'defeat'}`}>
      <span className="eyebrow">MATCH BEENDET</span>
      <h1>{won ? 'SYSTEM STABLE' : 'SYSTEM FAILURE'}</h1>
      <p>{won ? 'Der gegnerische Core wurde kompromittiert.' : 'Dein Core hat seine Integrität verloren.'}</p>
      <div className="result-score">
        <span>{player.name}<b>{player.core}</b></span>
        <i>vs</i>
        <span>{opponent.name}<b>{opponent.core}</b></span>
      </div>
      <Button variant="primary" onClick={onExit}>Zurück zum Menü</Button>
    </main>
  );
}
