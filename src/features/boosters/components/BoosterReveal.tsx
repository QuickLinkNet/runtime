import type { BoosterCard } from '../../../game/types';
import { rarityLabels } from '../../../game/cardRarity';
import { GameCard } from '../../cards';

interface BoosterRevealProps {
  cards: BoosterCard[];
  revealed: number;
  onReveal: (index: number) => void;
}

export function BoosterReveal({ cards, revealed, onReveal }: BoosterRevealProps) {
  return (
    <section className="booster-reveal" aria-label="Booster-Inhalt">
      {cards.map((card, index) => {
        const isRevealed = index < revealed;
        return (
          <article className={`booster-slot rarity-${card.rarity} ${isRevealed ? 'is-revealed' : ''}`} key={`${card.definitionId}-${index}`}>
            {isRevealed ? (
              <>
                <GameCard card={{ instanceId: `booster-${index}`, definitionId: card.definitionId }} detailsOnHover={false} detailsOnTap />
                <footer>
                  <b>{rarityLabels[card.rarity]}</b>
                  <span>{card.isNew ? 'NEU' : `Besitz ${card.previousQuantity + 1}`}</span>
                </footer>
              </>
            ) : (
              <button className="booster-card-back" type="button" disabled={index !== revealed} onClick={() => onReveal(index)} aria-label={`Karte ${index + 1} aufdecken`}>
                <span>R_</span><small>{index === revealed ? 'AUFDECKEN' : 'VERSCHLÜSSELT'}</small>
              </button>
            )}
          </article>
        );
      })}
    </section>
  );
}
