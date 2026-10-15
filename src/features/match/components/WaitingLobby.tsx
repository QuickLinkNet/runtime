import type { GameState } from '../../../game/types';
import { Button } from '../../../ui/atoms';
import { useI18n } from '../../../i18n';

interface WaitingLobbyProps {
  state: GameState;
  pending: boolean;
  onExit: () => void;
}

export function WaitingLobby({ state, pending, onExit }: WaitingLobbyProps) {
  const { t } = useI18n();
  return (
    <main className="screen lobby-wait">
      <span className="eyebrow">{t('match.lobby.eyebrow')}</span>
      <h1>{state.roomCode}</h1>
      <p>{t('match.lobby.share')}</p>
      <div className="player-slots">
        {state.order.map((id) => <span key={id}>{state.players[id].name}<b>{t('match.lobby.ready')}</b></span>)}
        {state.order.length < 2 && <span className="waiting">{t('match.lobby.waiting')}</span>}
      </div>
      <Button variant="ghost" disabled={pending} onClick={onExit}>{t('match.lobby.leave')}</Button>
    </main>
  );
}
