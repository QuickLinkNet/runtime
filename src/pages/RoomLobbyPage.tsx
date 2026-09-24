import type { MatchPayload } from '../game/types';
import { Button } from '../ui/atoms';
import { PlayerSlot } from '../ui/molecules';

interface RoomLobbyPageProps {
  state: MatchPayload['state'];
  pending: boolean;
  error: string | null;
  onStart: () => void;
  onExit: () => void;
}

export function RoomLobbyPage({ state, pending, error, onStart, onExit }: RoomLobbyPageProps) {
  const owner = state.order[0] === state.viewerId;

  return (
    <main className="screen room-screen">
      <button className="back-link" onClick={onExit}>← Raum verlassen</button>
      <span className="eyebrow">PRIVATE ROOM</span>
      <h1>{state.roomCode}</h1>
      <button className="copy-code" onClick={() => navigator.clipboard.writeText(state.roomCode)}>Code kopieren</button>
      <div className="versus-slots">
        <PlayerSlot name={state.players[state.order[0]]?.name} label="HOST" />
        <i>VS</i>
        <PlayerSlot name={state.players[state.order[1]]?.name} label="GUEST" waiting={state.order.length < 2} />
      </div>
      {owner
        ? <Button variant="primary" disabled={pending || state.order.length < 2} onClick={onStart}>{state.order.length < 2 ? 'Warte auf Gegenspieler …' : 'Match starten'}</Button>
        : <p className="waiting-copy">Der Host startet das Match.</p>}
      {error && <p className="form-error">{error}</p>}
    </main>
  );
}
