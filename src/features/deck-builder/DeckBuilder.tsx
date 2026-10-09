import { useState } from 'react';
import { CardCatalog } from './components/CardCatalog';
import { CatalogToolbar } from './components/CatalogToolbar';
import { DeckHeader } from './components/DeckHeader';
import { DeckSidebar } from './components/DeckSidebar';
import { DomainSelector } from './components/DomainSelector';
import { useDeckBuilder } from './hooks/useDeckBuilder';
import type { CollectionSnapshot } from '../../game/types';
import { playSfx } from '../../audio/sfx';

interface DeckBuilderProps {
  initialDeck: string[];
  onSave: (deck: string[]) => void;
  onCancel: () => void;
  collection?: CollectionSnapshot | null;
}

export function DeckBuilder({ initialDeck, onSave, onCancel, collection }: DeckBuilderProps) {
  const builder = useDeckBuilder(initialDeck, collection?.cards ?? null);
  const [catalogColumns, setCatalogColumns] = useState<4 | 5>(5);
  const addCard = (id: string) => { playSfx('card-select'); builder.addCard(id); };
  const removeCard = (id: string) => { playSfx('card-select'); builder.removeCard(id); };

  return (
    <main className="screen deck-screen">
      <DeckHeader deckSize={builder.deck.length} validation={builder.validation} health={builder.health} />
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
        columns={catalogColumns}
        onColumnsChange={setCatalogColumns}
        ownership={builder.ownership}
        onOwnershipChange={builder.setOwnership}
        collectionAvailable={collection !== null && collection !== undefined}
        collectionMode={builder.collectionMode}
        onCollectionModeChange={builder.setCollectionMode}
      />
      <div className="deck-layout">
        <CardCatalog
          cards={builder.visibleCards}
          selectedDomainCount={builder.domains.length}
          showingNeutral={builder.filter === 'neutral'}
          deckSize={builder.deck.length}
          counts={builder.counts}
          owned={collection?.cards ?? null}
          collectionMode={builder.collectionMode}
          infrastructureCount={builder.health.infrastructure}
          columns={catalogColumns}
          onAdd={addCard}
          onRemove={removeCard}
        />
        <DeckSidebar
          deck={builder.deck}
          domains={builder.domains}
          entries={builder.deckEntries}
          domainCounts={builder.domainCounts}
          validation={builder.validation}
          health={builder.health}
          dirty={builder.dirty}
          starterKey={builder.starterKey}
          onStarterChange={builder.setStarterKey}
          onLoadStarter={builder.loadStarter}
          onRemove={removeCard}
          onClear={builder.clearDeck}
          onCancel={onCancel}
          onSave={() => onSave(builder.deck)}
        />
      </div>
    </main>
  );
}
