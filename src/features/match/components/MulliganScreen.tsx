import { GameCard } from '../../cards';
import type { PlayerView } from '../../../game/types';
import { Button } from '../../../ui/atoms';
import { useI18n } from '../../../i18n';

interface MulliganScreenProps {
  player: PlayerView;
  pending: boolean;
  selectedIds: string[];
  onToggle: (instanceId: string) => void;
  onSubmit: () => void;
}

export function MulliganScreen({ player, pending, selectedIds, onToggle, onSubmit }: MulliganScreenProps) {
  const { t } = useI18n();
  return (
    <main className="screen mulligan-screen">
      <span className="eyebrow">{t('match.mulligan.eyebrow')}</span>
      <h1>{t('match.mulligan.title')}</h1>
      <p>{t('match.mulligan.description')}</p>
      <div className="mulligan-cards">
        {player.hand.map((card) => (
          <GameCard
            key={card.instanceId}
            card={card}
            selected={selectedIds.includes(card.instanceId)}
            actionLabel={t('match.mulligan.toggle')}
            onClick={() => onToggle(card.instanceId)}
          />
        ))}
      </div>
      <small className="mulligan-note">{t('match.mulligan.note')}</small>
      <Button variant="primary" disabled={pending || player.mulliganDone === true} onClick={onSubmit}>
        {player.mulliganDone ? t('match.mulligan.waiting') : selectedIds.length > 0 ? t('match.mulligan.replaceCount', { count: selectedIds.length }) : t('match.mulligan.replaceNone')}
      </Button>
    </main>
  );
}
