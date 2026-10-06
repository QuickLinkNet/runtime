import { useEffect, useState, type CSSProperties } from 'react';

interface TurnBannerProps {
  turn: number;
  myTurn: boolean;
  opponentName: string;
  animationScale: number;
}

export function TurnBanner({ turn, myTurn, opponentName, animationScale }: TurnBannerProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), 1450 * animationScale);
    return () => window.clearTimeout(timer);
  }, [animationScale, myTurn, turn]);

  if (!visible) return null;
  return (
    <div className={`turn-banner ${myTurn ? 'is-yours' : 'is-opponent'}`} role="status" aria-live="assertive" style={{ '--motion-scale': animationScale } as CSSProperties}>
      <small>ZUG {turn}</small>
      <b>{myTurn ? 'DEIN ZUG' : `${opponentName} IST AM ZUG`}</b>
      <span>{myTurn ? 'Compute bereit. Plane deinen Deploy.' : 'Gegnerische Aktionen werden verarbeitet.'}</span>
    </div>
  );
}
