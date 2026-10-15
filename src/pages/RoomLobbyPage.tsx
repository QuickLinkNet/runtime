import type { MatchPayload } from '../game/types';
import { useI18n } from '../i18n';
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
  const { t } = useI18n();
  const owner = state.order[0] === state.viewerId;

  return (
    <main className="screen room-screen">
      <button className="back-link" onClick={onExit}>← {t('room.leave')}</button>
      <span className="eyebrow">{t('room.eyebrow')}</span>
      <h1>{state.roomCode}</h1>
      <button className="copy-code" onClick={() => navigator.clipboard.writeText(state.roomCode)}>{t('room.copyCode')}</button>
      <div className="versus-slots">
        <PlayerSlot name={state.players[state.order[0]]?.name} label={t('room.host')} />
        <i>{t('common.versus')}</i>
        <PlayerSlot name={state.players[state.order[1]]?.name} label={t('room.guest')} waiting={state.order.length < 2} />
      </div>
      {owner
        ? <Button variant="primary" disabled={pending || state.order.length < 2} onClick={onStart}>{t(state.order.length < 2 ? 'room.waitingOpponent' : 'room.startMatch')}</Button>
        : <p className="waiting-copy">{t('room.hostStarts')}</p>}
      {error && <p className="form-error">{error}</p>}
    </main>
  );
}
