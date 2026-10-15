import { useEffect, useState, type CSSProperties } from 'react';
import { useI18n } from '../../../i18n';

interface TurnBannerProps {
  turn: number;
  myTurn: boolean;
  opponentName: string;
  animationScale: number;
}

export function TurnBanner({ turn, myTurn, opponentName, animationScale }: TurnBannerProps) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), 1450 * animationScale);
    return () => window.clearTimeout(timer);
  }, [animationScale, myTurn, turn]);

  if (!visible) return null;
  return (
    <div className={`turn-banner ${myTurn ? 'is-yours' : 'is-opponent'}`} role="status" aria-live="assertive" style={{ '--motion-scale': animationScale } as CSSProperties}>
      <small>{t('match.banner.turn', { turn })}</small>
      <b>{myTurn ? t('match.top.yourTurn') : t('match.top.opponentTurn', { name: opponentName })}</b>
      <span>{myTurn ? t('match.banner.ready') : t('match.banner.processing')}</span>
    </div>
  );
}
