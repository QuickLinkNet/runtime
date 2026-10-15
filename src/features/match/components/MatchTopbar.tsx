import type { AnimationSpeed } from '../model/animationSpeed';
import { AnimationSpeedControl } from './AnimationSpeedControl';
import { useI18n } from '../../../i18n';

interface MatchTopbarProps {
  roomCode: string;
  turn: number;
  myTurn: boolean;
  opponentName: string;
  seconds: number | null;
  syncStatus: 'connected' | 'reconnecting' | 'offline';
  animationSpeed: AnimationSpeed;
  onAnimationSpeedChange: (value: AnimationSpeed) => void;
  onOpenGlossary: () => void;
  onExit: () => void;
}

export function MatchTopbar({ roomCode, turn, myTurn, opponentName, seconds, syncStatus, animationSpeed, onAnimationSpeedChange, onOpenGlossary, onExit }: MatchTopbarProps) {
  const { t } = useI18n();
  return (
    <header className="match-topbar">
      <div className="brand-small">RUNTIME <span>/{roomCode}</span></div>
      <div className={`turn-indicator ${myTurn ? 'your-turn' : ''}`}>
        <span>{myTurn ? t('match.top.yourTurn') : t('match.top.opponentTurn', { name: opponentName.toUpperCase() })}</span>
        <b>{t('match.top.turn', { turn })}</b>
        {seconds !== null && <time className={seconds < 15 ? 'urgent' : ''}>{seconds}s</time>}
      </div>
      <div className="match-header-actions">
        <span className={`match-sync-status is-${syncStatus}`} role="status">
          {syncStatus === 'connected' ? t('match.top.sync') : syncStatus === 'reconnecting' ? t('match.top.reconnecting') : t('match.top.offline')}
        </span>
        <AnimationSpeedControl value={animationSpeed} onChange={onAnimationSpeedChange} />
        <button className="icon-button rules-button" type="button" onClick={onOpenGlossary}>{t('match.top.rules')}</button>
        <button className="icon-button" type="button" onClick={onExit}>{t('match.top.leave')}</button>
      </div>
    </header>
  );
}
