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
  columns: 4 | 5;
  onColumnsChange: (columns: 4 | 5) => void;
}

export function CatalogToolbar({ cardCount, domains, filter, query, sort, onFilterChange, onQueryChange, onSortChange, columns, onColumnsChange }: CatalogToolbarProps) {
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
