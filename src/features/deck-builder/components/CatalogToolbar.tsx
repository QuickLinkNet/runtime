import { domainLabels } from '../../../game/catalog';
import type { Domain } from '../../../game/types';
import type { CatalogFilter, SortMode } from '../model/deckBuilder';

interface CatalogToolbarProps {
  cardCount: number;
  domains: Domain[];
  filter: CatalogFilter;
  query: string;
  sort: SortMode;
  onFilterChange: (filter: CatalogFilter) => void;
  onQueryChange: (query: string) => void;
  onSortChange: (sort: SortMode) => void;
}

export function CatalogToolbar({ cardCount, domains, filter, query, sort, onFilterChange, onQueryChange, onSortChange }: CatalogToolbarProps) {
  return (
    <section className="catalog-controls" aria-labelledby="catalog-heading">
      <div className="deck-section-heading compact">
        <div><span>02</span><h2 id="catalog-heading">Kartenkatalog</h2></div>
        <b>{cardCount} Karten</b>
      </div>
      <div className="catalog-toolbar">
        <div className="catalog-filters" aria-label="Karten filtern">
          <button type="button" className={filter === 'selected' ? 'active' : ''} onClick={() => onFilterChange('selected')}>Meine Domains</button>
          {domains.map((domain) => (
            <button type="button" key={domain} className={filter === domain ? 'active' : ''} onClick={() => onFilterChange(domain)}>{domainLabels[domain]}</button>
          ))}
          <button type="button" className={filter === 'neutral' ? 'active' : ''} onClick={() => onFilterChange('neutral')}>Neutral</button>
        </div>
        <div className="catalog-tools">
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
        </div>
      </div>
    </section>
  );
}
