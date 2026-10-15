import { useState } from 'react';
import type { Domain } from '../../../game/types';
import { FilterChip, SegmentedControl, type SegmentedOption } from '../../../ui/atoms';
import { FilterPopover, SearchField } from '../../../ui/molecules';
import type { CatalogFilter, CatalogTypeFilter, SortMode } from '../model/deckBuilder';
import { useI18n } from '../../../i18n';

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
  const { t } = useI18n();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const advancedFilterCount = Number(filter !== 'selected')
    + Number(sort !== 'cost-asc')
    + Number(collectionAvailable && ownership !== 'all')
    + Number(collectionAvailable && collectionMode);
  const domainOptions: SegmentedOption<CatalogFilter>[] = [
    { value: 'selected', label: t('deck.filter.pool') },
    ...domains.map((domain) => ({ value: domain, label: t(`domain.${domain}`) })),
    { value: 'neutral', label: t('domain.neutral') },
  ];
  const typeOptions: SegmentedOption<CatalogTypeFilter>[] = [
    { value: 'all', label: t('deck.type.all') },
    { value: 'service', label: t('common.services') },
    { value: 'command', label: t('common.commands') },
    { value: 'infrastructure', label: t('common.infrastructure') },
  ];
  const ownershipOptions: SegmentedOption<'all' | 'owned'>[] = [
    { value: 'all', label: t('deck.collection.all') },
    { value: 'owned', label: t('deck.collection.owned') },
  ];
  const sortLabels: Record<SortMode, string> = {
    'cost-asc': t('deck.sort.costAscChip'),
    'cost-desc': t('deck.sort.costDescChip'),
    name: t('deck.sort.name'),
    type: t('deck.sort.type'),
  };

  const resetAdvancedFilters = () => {
    onFilterChange('selected');
    onSortChange('cost-asc');
    onOwnershipChange('all');
    onCollectionModeChange(false);
  };

  return (
    <section className="catalog-controls" aria-labelledby="catalog-heading">
      <div className="deck-section-heading compact">
        <div><span>02</span><h2 id="catalog-heading">{t('deck.catalog.title')}</h2></div>
        <b>{t('deck.catalog.count', { count: cardCount })}</b>
      </div>

      <div className="catalog-smartbar">
        <SearchField value={query} onChange={onQueryChange} placeholder={t('deck.search.placeholder')} ariaLabel={t('deck.search.aria')} />
        <SegmentedControl ariaLabel={t('deck.type.aria')} value={typeFilter} options={typeOptions} onChange={onTypeFilterChange} className="catalog-type-control" />
        <FilterPopover open={filtersOpen} onOpenChange={setFiltersOpen} activeCount={advancedFilterCount}>
          <header className="filter-panel-header">
            <div><span>{t('deck.filter.smart')}</span><b>{t('deck.filter.title')}</b></div>
            <button type="button" disabled={advancedFilterCount === 0} onClick={resetAdvancedFilters}>{t('deck.filter.reset')}</button>
          </header>

          <div className="filter-panel-group">
            <label>{t('deck.filter.domain')}</label>
            <SegmentedControl ariaLabel={t('deck.filter.domainAria')} value={filter} options={domainOptions} onChange={onFilterChange} className="filter-panel-segments" />
            <small>{t('deck.filter.poolHelp')}</small>
          </div>

          {collectionAvailable && <div className="filter-panel-group">
            <label>{t('deck.collection')}</label>
            <SegmentedControl ariaLabel={t('deck.collection.aria')} value={ownership} options={ownershipOptions} onChange={onOwnershipChange} className="filter-panel-segments" />
            <button
              className={`collection-mode-switch${collectionMode ? ' active' : ''}`}
              type="button"
              role="switch"
              aria-checked={collectionMode}
              onClick={() => onCollectionModeChange(!collectionMode)}
            >
              <span><b>{t('deck.collection.mode')}</b><small>{t('deck.collection.modeHelp')}</small></span>
              <i aria-hidden="true" />
            </button>
          </div>}

          <label className="filter-panel-sort">
            <span>{t('deck.sort.label')}</span>
            <select value={sort} onChange={(event) => onSortChange(event.target.value as SortMode)}>
              <option value="cost-asc">{t('deck.sort.costAsc')}</option>
              <option value="cost-desc">{t('deck.sort.costDesc')}</option>
              <option value="name">{t('deck.sort.name')}</option>
              <option value="type">{t('deck.sort.type')}</option>
            </select>
          </label>
        </FilterPopover>

        <div className="catalog-grid-switch" aria-label={t('deck.grid.aria')}>
          <button type="button" className={columns === 4 ? 'active' : ''} onClick={() => onColumnsChange(4)} aria-label={t('deck.grid.largeAria')} title={t('deck.grid.large')}>
            <span className="grid-icon grid-icon-four" aria-hidden="true" />
          </button>
          <button type="button" className={columns === 5 ? 'active' : ''} onClick={() => onColumnsChange(5)} aria-label={t('deck.grid.compactAria')} title={t('deck.grid.compact')}>
            <span className="grid-icon grid-icon-five" aria-hidden="true" />
          </button>
        </div>
      </div>

      {advancedFilterCount > 0 && <div className="active-filter-chips" aria-label={t('deck.filter.active')}>
        {filter !== 'selected' && <FilterChip onRemove={() => onFilterChange('selected')}>{t(`domain.${filter}`)}</FilterChip>}
        {sort !== 'cost-asc' && <FilterChip onRemove={() => onSortChange('cost-asc')}>{sortLabels[sort]}</FilterChip>}
        {collectionAvailable && ownership === 'owned' && <FilterChip onRemove={() => onOwnershipChange('all')}>{t('deck.collection.owned')}</FilterChip>}
        {collectionAvailable && collectionMode && <FilterChip onRemove={() => onCollectionModeChange(false)}>{t('deck.collection.mode')}</FilterChip>}
        <button className="clear-filter-chips" type="button" onClick={resetAdvancedFilters}>{t('deck.filter.clearAll')}</button>
      </div>}
    </section>
  );
}
