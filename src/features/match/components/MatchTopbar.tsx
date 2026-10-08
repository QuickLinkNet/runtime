import type { AnimationSpeed } from '../model/animationSpeed';
import { AnimationSpeedControl } from './AnimationSpeedControl';

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
  return (
    <header className="match-topbar">
      <div className="brand-small">RUNTIME <span>/{roomCode}</span></div>
      <div className={`turn-indicator ${myTurn ? 'your-turn' : ''}`}>
        <span>{myTurn ? 'DEIN ZUG' : `${opponentName.toUpperCase()} IST AM ZUG`}</span>
        <b>Turn {turn}</b>
        {seconds !== null && <time className={seconds < 15 ? 'urgent' : ''}>{seconds}s</time>}
      </div>
      <div className="match-header-actions">
        <span className={`match-sync-status is-${syncStatus}`} role="status">
          {syncStatus === 'connected' ? 'SYNC' : syncStatus === 'reconnecting' ? 'VERBINDE …' : 'OFFLINE'}
        </span>
        <AnimationSpeedControl value={animationSpeed} onChange={onAnimationSpeedChange} />
        <button className="icon-button rules-button" type="button" onClick={onOpenGlossary}>? Regeln</button>
        <button className="icon-button" type="button" onClick={onExit}>Verlassen</button>
      </div>
    </header>
  );
}
