import { useState } from 'react';
import { domainLabels } from '../../../game/catalog';
import type { Domain } from '../../../game/types';
import { FilterChip, SegmentedControl, type SegmentedOption } from '../../../ui/atoms';
import { FilterPopover, SearchField } from '../../../ui/molecules';
import type { CatalogFilter, CatalogTypeFilter, SortMode } from '../model/deckBuilder';

interface CatalogToolbarProps {
  cardCount: number;
  domains: Domain[];
  filter: CatalogFilter;
  typeFilter: CatalogTypeFilter;
  query: string;
  sort: SortMode;
  onFilterChange: (filter: CatalogFilter) => void;
  onTypeFilterChange: (filter: CatalogTypeFilter) => void;
  onQueryChange: (query: string) => void;
  onSortChange: (sort: SortMode) => void;
  columns: 4 | 5;
  onColumnsChange: (columns: 4 | 5) => void;
  ownership: 'all' | 'owned';
  onOwnershipChange: (mode: 'all' | 'owned') => void;
  collectionAvailable: boolean;
  collectionMode: boolean;
  onCollectionModeChange: (enabled: boolean) => void;
}

const typeOptions: SegmentedOption<CatalogTypeFilter>[] = [
  { value: 'all', label: 'Alle' },
  { value: 'service', label: 'Services' },
  { value: 'command', label: 'Commands' },
  { value: 'infrastructure', label: 'Infrastructure' },
];

const ownershipOptions: SegmentedOption<'all' | 'owned'>[] = [
  { value: 'all', label: 'Alle Karten' },
  { value: 'owned', label: 'Nur Sammlung' },
];

const sortLabels: Record<SortMode, string> = {
  'cost-asc': 'Compute aufsteigend',
  'cost-desc': 'Compute absteigend',
  name: 'Name A–Z',
  type: 'Kartentyp',
};

export function CatalogToolbar({ cardCount, domains, filter, typeFilter, query, sort, onFilterChange, onTypeFilterChange, onQueryChange, onSortChange, columns, onColumnsChange, ownership, onOwnershipChange, collectionAvailable, collectionMode, onCollectionModeChange }: CatalogToolbarProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const advancedFilterCount = Number(filter !== 'selected')
    + Number(sort !== 'cost-asc')
    + Number(collectionAvailable && ownership !== 'all')
    + Number(collectionAvailable && collectionMode);
  const domainOptions: SegmentedOption<CatalogFilter>[] = [
    { value: 'selected', label: 'Deck-Pool' },
    ...domains.map((domain) => ({ value: domain, label: domainLabels[domain] })),
    { value: 'neutral', label: 'Neutral' },
  ];

  const resetAdvancedFilters = () => {
    onFilterChange('selected');
    onSortChange('cost-asc');
    onOwnershipChange('all');
    onCollectionModeChange(false);
  };

  return (
    <section className="catalog-controls" aria-labelledby="catalog-heading">
      <div className="deck-section-heading compact">
        <div><span>02</span><h2 id="catalog-heading">Kartenkatalog</h2></div>
        <b>{cardCount} Karten</b>
      </div>

      <div className="catalog-smartbar">
        <SearchField value={query} onChange={onQueryChange} placeholder="Karte suchen …" ariaLabel="Karten durchsuchen" />
        <SegmentedControl ariaLabel="Kartentyp" value={typeFilter} options={typeOptions} onChange={onTypeFilterChange} className="catalog-type-control" />
        <FilterPopover open={filtersOpen} onOpenChange={setFiltersOpen} activeCount={advancedFilterCount}>
          <header className="filter-panel-header">
            <div><span>SMART FILTER</span><b>Karten eingrenzen</b></div>
            <button type="button" disabled={advancedFilterCount === 0} onClick={resetAdvancedFilters}>Zurücksetzen</button>
          </header>

          <div className="filter-panel-group">
            <label>Domain</label>
            <SegmentedControl ariaLabel="Domain-Filter" value={filter} options={domainOptions} onChange={onFilterChange} className="filter-panel-segments" />
            <small>Der Deck-Pool enthält deine zwei Domains plus neutrale Karten.</small>
          </div>

          {collectionAvailable && <div className="filter-panel-group">
            <label>Sammlung</label>
            <SegmentedControl ariaLabel="Sammlungsfilter" value={ownership} options={ownershipOptions} onChange={onOwnershipChange} className="filter-panel-segments" />
            <button
              className={`collection-mode-switch${collectionMode ? ' active' : ''}`}
              type="button"
              role="switch"
              aria-checked={collectionMode}
              onClick={() => onCollectionModeChange(!collectionMode)}
            >
              <span><b>Collection Mode</b><small>Deck nur mit deinen vorhandenen Kopien bauen</small></span>
              <i aria-hidden="true" />
            </button>
          </div>}

          <label className="filter-panel-sort">
            <span>Sortierung</span>
            <select value={sort} onChange={(event) => onSortChange(event.target.value as SortMode)}>
              <option value="cost-asc">Compute: niedrig zuerst</option>
              <option value="cost-desc">Compute: hoch zuerst</option>
              <option value="name">Name: A–Z</option>
              <option value="type">Kartentyp</option>
            </select>
          </label>
        </FilterPopover>

        <div className="catalog-grid-switch" aria-label="Rastergröße">
          <button type="button" className={columns === 4 ? 'active' : ''} onClick={() => onColumnsChange(4)} aria-label="Vier große Karten pro Reihe" title="Große Karten">
            <span className="grid-icon grid-icon-four" aria-hidden="true" />
          </button>
          <button type="button" className={columns === 5 ? 'active' : ''} onClick={() => onColumnsChange(5)} aria-label="Fünf kompakte Karten pro Reihe" title="Kompakte Karten">
            <span className="grid-icon grid-icon-five" aria-hidden="true" />
          </button>
        </div>
      </div>

      {advancedFilterCount > 0 && <div className="active-filter-chips" aria-label="Aktive Filter">
        {filter !== 'selected' && <FilterChip onRemove={() => onFilterChange('selected')}>{filter === 'neutral' ? 'Neutral' : domainLabels[filter]}</FilterChip>}
        {sort !== 'cost-asc' && <FilterChip onRemove={() => onSortChange('cost-asc')}>{sortLabels[sort]}</FilterChip>}
        {collectionAvailable && ownership === 'owned' && <FilterChip onRemove={() => onOwnershipChange('all')}>Nur Sammlung</FilterChip>}
        {collectionAvailable && collectionMode && <FilterChip onRemove={() => onCollectionModeChange(false)}>Collection Mode</FilterChip>}
        <button className="clear-filter-chips" type="button" onClick={resetAdvancedFilters}>Alle löschen</button>
      </div>}
    </section>
  );
}
