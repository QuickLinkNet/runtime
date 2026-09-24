import { domainLabels } from '../../../game/catalog';
import type { CardDefinition } from '../../../game/types';

interface CardCatalogProps {
  cards: CardDefinition[];
  selectedDomainCount: number;
  showingNeutral: boolean;
  deckSize: number;
  counts: Map<string, number>;
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
}

export function CardCatalog({ cards, selectedDomainCount, showingNeutral, deckSize, counts, onAdd, onRemove }: CardCatalogProps) {
  if (selectedDomainCount === 0 && !showingNeutral) {
    return (
      <section className="catalog-grid" aria-label="Kartenkatalog">
        <div className="catalog-empty"><b>Wähle zuerst deine Tech-Domains.</b><span>Danach erscheinen hier die passenden Karten.</span></div>
      </section>
    );
  }

  if (cards.length === 0) {
    return (
      <section className="catalog-grid" aria-label="Kartenkatalog">
        <div className="catalog-empty"><b>Keine Karten gefunden.</b><span>Ändere den Filter oder den Suchbegriff.</span></div>
      </section>
    );
  }

  return (
    <section className="catalog-grid" aria-label="Kartenkatalog">
      {cards.map((card) => {
        const copies = counts.get(card.id) ?? 0;
        const canAdd = deckSize < 30 && copies < 2;
        return (
          <article className={`catalog-card domain-${card.domain}`} key={card.id}>
            <div className="catalog-meta"><span>{card.cost} C</span><span>{domainLabels[card.domain]}</span></div>
            <h3>{card.name}</h3>
            <p>{card.text}</p>
            <footer>
              <span>{card.type}{card.power !== undefined ? ` · ${card.power}/${card.integrity}` : ''}</span>
              <span className="copy-stepper">
                <button type="button" disabled={copies === 0} onClick={() => onRemove(card.id)} aria-label={`${card.name} entfernen`}>−</button>
                <b>{copies}/2</b>
                <button type="button" disabled={!canAdd} onClick={() => onAdd(card.id)} aria-label={`${card.name} hinzufügen`}>+</button>
              </span>
            </footer>
          </article>
        );
      })}
    </section>
  );
}
