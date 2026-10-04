import { useEffect, useState } from 'react';

interface TurnBannerProps {
  turn: number;
  myTurn: boolean;
  opponentName: string;
}

export function TurnBanner({ turn, myTurn, opponentName }: TurnBannerProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), 1450);
    return () => window.clearTimeout(timer);
  }, [myTurn, turn]);

  if (!visible) return null;
  return (
    <div className={`turn-banner ${myTurn ? 'is-yours' : 'is-opponent'}`} role="status" aria-live="assertive">
      <small>ZUG {turn}</small>
      <b>{myTurn ? 'DEIN ZUG' : `${opponentName} IST AM ZUG`}</b>
      <span>{myTurn ? 'Compute bereit. Plane deinen Deploy.' : 'Gegnerische Aktionen werden verarbeitet.'}</span>
    </div>
  );
}
