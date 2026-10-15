import { starterNames } from '../../../game/catalog';
import { factionProfile } from '../../../game/factions';
import type { Domain } from '../../../game/types';
import { Button } from '../../../ui/atoms';
import type { DeckEntry, DeckHealth } from '../model/deckBuilder';
import { useI18n } from '../../../i18n';

interface DeckSidebarProps {
  deck: string[];
  domains: Domain[];
  entries: DeckEntry[];
  domainCounts: Map<Domain, number>;
  validation: string | null;
  health: DeckHealth;
  dirty: boolean;
  starterKey: string;
  onStarterChange: (key: string) => void;
  onLoadStarter: () => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onCancel: () => void;
  onSave: () => void;
}

export function DeckSidebar({ deck, domains, entries, domainCounts, validation, health, dirty, starterKey, onStarterChange, onLoadStarter, onRemove, onClear, onCancel, onSave }: DeckSidebarProps) {
  const { t } = useI18n();
  return (
    <aside className="deck-sidebar">
      <div className="deck-sidebar-title">
        <div><span className="eyebrow">{t('deck.sidebar.eyebrow')}</span><h2>{t('deck.sidebar.title')}</h2></div>
        {dirty && <span className="unsaved-badge">{t('deck.sidebar.unsaved')}</span>}
      </div>
      <p className={validation ? 'validation-error' : 'validation-ok'}>{validation ?? t('deck.sidebar.ready')}</p>
      <div className="deck-domain-summary">
        {domains.map((domain) => <span key={domain} className={`domain-${domain}`}><i />{t(`domain.${domain}`)} <b>{domainCounts.get(domain) ?? 0}</b></span>)}
        <span className="domain-neutral"><i />{t('domain.neutral')} <b>{domainCounts.get('neutral') ?? 0}</b></span>
      </div>
      <div className="deck-health"><span>{t('deck.health.infrastructure')} <b>{health.infrastructure}/4</b></span><span>{t('deck.health.services')} <b>{health.services}</b></span><span>{t('deck.health.curve')} <b>{health.early}/{health.mid}/{health.late}</b></span><strong>{health.archetype}</strong><small>{health.recommendation}</small>{health.warnings.map((warning) => <small key={warning}>{warning}</small>)}</div>
      <div className="deck-faction-brief">{domains.map((domain) => { const faction = factionProfile(domain); return faction && <div key={domain}><b>{t(`domain.${domain}`)} · {t(`deck.faction.${domain}.identity`)}</b><small>{faction.verbs.join(' · ')}</small></div>; })}</div>
      <div className="deck-list">
        {entries.length === 0 ? <p>{t('deck.sidebar.empty')}</p> : entries.map(({ card, count }) => (
          <button type="button" key={card.id} onClick={() => onRemove(card.id)} title={t('deck.sidebar.removeCopy')}>
            <i className={`domain-${card.domain}`} />
            <span><b>{card.name}</b><small>{card.cost} C · {t(`domain.${card.domain}`)}</small></span>
            <strong>{count}×</strong>
          </button>
        ))}
      </div>
      <div className="starter-loader">
        <label htmlFor="starter-deck">{t('deck.sidebar.starter')}</label>
        <div>
          <select id="starter-deck" value={starterKey} onChange={(event) => onStarterChange(event.target.value)}>
            {Object.entries(starterNames).map(([key, name]) => <option key={key} value={key}>{name}</option>)}
          </select>
          <button type="button" onClick={onLoadStarter}>{t('deck.sidebar.load')}</button>
        </div>
      </div>
      <div className="sidebar-actions">
        <Button variant="ghost" disabled={deck.length === 0} onClick={onClear}>{t('deck.sidebar.clear')}</Button>
        <Button variant="ghost" onClick={onCancel}>{t('common.cancel')}</Button>
        <Button variant="primary" disabled={Boolean(validation)} onClick={onSave}>{t('deck.sidebar.save')}</Button>
      </div>
    </aside>
  );
}
