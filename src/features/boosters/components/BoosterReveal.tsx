import type { BoosterCard } from '../../../game/types';
import { GameCard } from '../../cards';
import { useI18n } from '../../../i18n';

interface BoosterRevealProps {
  cards: BoosterCard[];
  revealed: number;
  onReveal: (index: number) => void;
}

export function BoosterReveal({ cards, revealed, onReveal }: BoosterRevealProps) {
  const { t } = useI18n();
  return (
    <section className="booster-reveal" aria-label={t('booster.reveal.contentAria')}>
      {cards.map((card, index) => {
        const isRevealed = index < revealed;
        return (
          <article className={`booster-slot rarity-${card.rarity} ${isRevealed ? 'is-revealed' : ''}`} key={`${card.definitionId}-${index}`}>
            {isRevealed ? (
              <>
                <GameCard card={{ instanceId: `booster-${index}`, definitionId: card.definitionId }} detailsOnHover={false} detailsOnTap />
                <footer>
                  <b>{t(`rarity.${card.rarity}`)}</b>
                  <span>{card.salvaged ? t('booster.reveal.components', { count: card.salvageValue ?? 0 }) : card.isNew ? t('booster.reveal.new') : t('booster.reveal.owned', { count: card.previousQuantity + 1 })}</span>
                </footer>
              </>
            ) : (
              <button className="booster-card-back" type="button" disabled={index !== revealed} onClick={() => onReveal(index)} aria-label={t('booster.reveal.cardAria', { number: index + 1 })}>
                <span>R_</span><small>{t(index === revealed ? 'booster.reveal.reveal' : 'booster.reveal.encrypted')}</small>
              </button>
            )}
          </article>
        );
      })}
    </section>
  );
}
