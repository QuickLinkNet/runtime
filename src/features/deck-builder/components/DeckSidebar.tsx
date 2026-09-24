import { domainLabels, starterNames } from '../../../game/catalog';
import type { Domain } from '../../../game/types';
import { Button } from '../../../ui/atoms';
import type { DeckEntry } from '../model/deckBuilder';

interface DeckSidebarProps {
  deck: string[];
  domains: Domain[];
  entries: DeckEntry[];
  domainCounts: Map<Domain, number>;
  validation: string | null;
  dirty: boolean;
  starterKey: string;
  onStarterChange: (key: string) => void;
  onLoadStarter: () => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onCancel: () => void;
  onSave: () => void;
}

export function DeckSidebar({ deck, domains, entries, domainCounts, validation, dirty, starterKey, onStarterChange, onLoadStarter, onRemove, onClear, onCancel, onSave }: DeckSidebarProps) {
  return (
    <aside className="deck-sidebar">
      <div className="deck-sidebar-title">
        <div><span className="eyebrow">CURRENT LOADOUT</span><h2>Dein Stack</h2></div>
        {dirty && <span className="unsaved-badge">Ungespeichert</span>}
      </div>
      <p className={validation ? 'validation-error' : 'validation-ok'}>{validation ?? 'Deck ist einsatzbereit.'}</p>
      <div className="deck-domain-summary">
        {domains.map((domain) => <span key={domain} className={`domain-${domain}`}><i />{domainLabels[domain]} <b>{domainCounts.get(domain) ?? 0}</b></span>)}
        <span className="domain-neutral"><i />Neutral <b>{domainCounts.get('neutral') ?? 0}</b></span>
      </div>
      <div className="deck-list">
        {entries.length === 0 ? <p>Noch keine Karten im Deck.</p> : entries.map(({ card, count }) => (
          <button type="button" key={card.id} onClick={() => onRemove(card.id)} title="Eine Kopie entfernen">
            <i className={`domain-${card.domain}`} />
            <span><b>{card.name}</b><small>{card.cost} C · {domainLabels[card.domain]}</small></span>
            <strong>{count}×</strong>
          </button>
        ))}
      </div>
      <div className="starter-loader">
        <label htmlFor="starter-deck">Starter-Deck</label>
        <div>
          <select id="starter-deck" value={starterKey} onChange={(event) => onStarterChange(event.target.value)}>
            {Object.entries(starterNames).map(([key, name]) => <option key={key} value={key}>{name}</option>)}
          </select>
          <button type="button" onClick={onLoadStarter}>Laden</button>
        </div>
      </div>
      <div className="sidebar-actions">
        <Button variant="ghost" disabled={deck.length === 0} onClick={onClear}>Deck leeren</Button>
        <Button variant="ghost" onClick={onCancel}>Abbrechen</Button>
        <Button variant="primary" disabled={Boolean(validation)} onClick={onSave}>Deck speichern</Button>
      </div>
    </aside>
  );
}
