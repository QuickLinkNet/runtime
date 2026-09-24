import { CardCatalog } from './components/CardCatalog';
import { CatalogToolbar } from './components/CatalogToolbar';
import { DeckHeader } from './components/DeckHeader';
import { DeckSidebar } from './components/DeckSidebar';
import { DomainSelector } from './components/DomainSelector';
import { useDeckBuilder } from './hooks/useDeckBuilder';

interface DeckBuilderProps {
  initialDeck: string[];
  onSave: (deck: string[]) => void;
  onCancel: () => void;
}

export function DeckBuilder({ initialDeck, onSave, onCancel }: DeckBuilderProps) {
  const builder = useDeckBuilder(initialDeck);

  return (
    <main className="screen deck-screen">
      <DeckHeader deckSize={builder.deck.length} validation={builder.validation} />
      <DomainSelector
        availableDomains={builder.techDomains}
        selectedDomains={builder.domains}
        notice={builder.notice}
        onToggle={builder.toggleDomain}
      />
      <CatalogToolbar
        cardCount={builder.visibleCards.length}
        domains={builder.domains}
        filter={builder.filter}
        query={builder.query}
        sort={builder.sort}
        onFilterChange={builder.setFilter}
        onQueryChange={builder.setQuery}
        onSortChange={builder.setSort}
      />
      <div className="deck-layout">
        <CardCatalog
          cards={builder.visibleCards}
          selectedDomainCount={builder.domains.length}
          showingNeutral={builder.filter === 'neutral'}
          deckSize={builder.deck.length}
          counts={builder.counts}
          onAdd={builder.addCard}
          onRemove={builder.removeCard}
        />
        <DeckSidebar
          deck={builder.deck}
          domains={builder.domains}
          entries={builder.deckEntries}
          domainCounts={builder.domainCounts}
          validation={builder.validation}
          dirty={builder.dirty}
          starterKey={builder.starterKey}
          onStarterChange={builder.setStarterKey}
          onLoadStarter={builder.loadStarter}
          onRemove={builder.removeCard}
          onClear={builder.clearDeck}
          onCancel={onCancel}
          onSave={() => onSave(builder.deck)}
        />
      </div>
    </main>
  );
}
