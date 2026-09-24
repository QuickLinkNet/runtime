import type { GameState } from '../../../game/types';
import { Button } from '../../../ui/atoms';

interface WaitingLobbyProps {
  state: GameState;
  pending: boolean;
  onExit: () => void;
}

export function WaitingLobby({ state, pending, onExit }: WaitingLobbyProps) {
  return (
    <main className="screen lobby-wait">
      <span className="eyebrow">PRIVATE ROOM</span>
      <h1>{state.roomCode}</h1>
      <p>Teile diesen Code mit deinem Gegenspieler.</p>
      <div className="player-slots">
        {state.order.map((id) => <span key={id}>{state.players[id].name}<b>bereit</b></span>)}
        {state.order.length < 2 && <span className="waiting">Warte auf Verbindung …</span>}
      </div>
      <Button variant="ghost" disabled={pending} onClick={onExit}>Raum verlassen</Button>
    </main>
  );
}
