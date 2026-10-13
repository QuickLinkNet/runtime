import { domainLabels } from '../../../game/catalog';
import type { Domain } from '../../../game/types';
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

export function CatalogToolbar({ cardCount, domains, filter, typeFilter, query, sort, onFilterChange, onTypeFilterChange, onQueryChange, onSortChange, columns, onColumnsChange, ownership, onOwnershipChange, collectionAvailable, collectionMode, onCollectionModeChange }: CatalogToolbarProps) {
  return (
    <section className="catalog-controls" aria-labelledby="catalog-heading">
      <div className="deck-section-heading compact">
        <div><span>02</span><h2 id="catalog-heading">Kartenkatalog</h2></div>
        <b>{cardCount} Karten</b>
      </div>
      <div className="catalog-toolbar">
        <div className="catalog-filter-groups">
          <div className="catalog-filters" aria-label="Nach Domain filtern">
            <button type="button" className={filter === 'selected' ? 'active' : ''} onClick={() => onFilterChange('selected')}>Meine Domains</button>
            {domains.map((domain) => (
              <button type="button" key={domain} className={filter === domain ? 'active' : ''} onClick={() => onFilterChange(domain)}>{domainLabels[domain]}</button>
            ))}
            <button type="button" className={filter === 'neutral' ? 'active' : ''} onClick={() => onFilterChange('neutral')}>Neutral</button>
          </div>
          <div className="catalog-filters type-filters" aria-label="Nach Kartentyp filtern">
            <button type="button" className={typeFilter === 'all' ? 'active' : ''} onClick={() => onTypeFilterChange('all')}>Alle Typen</button>
            <button type="button" className={typeFilter === 'service' ? 'active' : ''} onClick={() => onTypeFilterChange('service')}>Services</button>
            <button type="button" className={typeFilter === 'command' ? 'active' : ''} onClick={() => onTypeFilterChange('command')}>Commands</button>
            <button type="button" className={typeFilter === 'infrastructure' ? 'active' : ''} onClick={() => onTypeFilterChange('infrastructure')}>Infrastructure</button>
          </div>
        </div>
        <div className="catalog-tools">
          {collectionAvailable && <div className="ownership-switch" aria-label="Sammlungsfilter">
            <button type="button" className={ownership === 'all' ? 'active' : ''} onClick={() => onOwnershipChange('all')}>Alle Karten</button>
            <button type="button" className={ownership === 'owned' ? 'active' : ''} onClick={() => onOwnershipChange('owned')}>Nur Sammlung</button>
            <button type="button" className={collectionMode ? 'active collection-mode-toggle' : 'collection-mode-toggle'} onClick={() => onCollectionModeChange(!collectionMode)}>Collection Mode: {collectionMode ? 'AN' : 'AUS'}</button>
          </div>}
          <label className="catalog-search">
            <span>Suche</span>
            <input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Name, Text oder Typ …" />
            {query && <button type="button" onClick={() => onQueryChange('')} aria-label="Suche leeren">×</button>}
          </label>
          <label className="catalog-sort">
            <span>Sortierung</span>
            <select value={sort} onChange={(event) => onSortChange(event.target.value as SortMode)}>
              <option value="cost-asc">Compute: niedrig zuerst</option>
              <option value="cost-desc">Compute: hoch zuerst</option>
              <option value="name">Name: A–Z</option>
              <option value="type">Kartentyp</option>
            </select>
          </label>
          <div className="catalog-grid-switch" aria-label="Rastergröße">
            <button type="button" className={columns === 4 ? 'active' : ''} onClick={() => onColumnsChange(4)} aria-label="Vier große Karten pro Reihe" title="Große Karten">
              <span className="grid-icon grid-icon-four" aria-hidden="true" />
            </button>
            <button type="button" className={columns === 5 ? 'active' : ''} onClick={() => onColumnsChange(5)} aria-label="Fünf kompakte Karten pro Reihe" title="Kompakte Karten">
              <span className="grid-icon grid-icon-five" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
