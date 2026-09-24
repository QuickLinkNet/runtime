import { domainLabels } from '../../../game/catalog';
import type { Domain } from '../../../game/types';

interface DomainSelectorProps {
  availableDomains: Domain[];
  selectedDomains: Domain[];
  notice: string | null;
  onToggle: (domain: Domain) => void;
}

export function DomainSelector({ availableDomains, selectedDomains, notice, onToggle }: DomainSelectorProps) {
  return (
    <section className="deck-domain-config" aria-labelledby="domain-heading">
      <div className="deck-section-heading">
        <div><span>01</span><h2 id="domain-heading">Deck-Domains</h2></div>
        <b className={selectedDomains.length === 2 ? 'complete' : ''}>{selectedDomains.length}/2 gewählt</b>
      </div>
      <div className="domain-picker">
        {availableDomains.map((domain) => {
          const selected = selectedDomains.includes(domain);
          return (
            <button type="button" key={domain} className={selected ? 'active' : ''} aria-pressed={selected} onClick={() => onToggle(domain)}>
              <i className={`domain-dot domain-${domain}`} />
              {domainLabels[domain]}
              {selected && <span>✓</span>}
            </button>
          );
        })}
      </div>
      {notice && <p className="deck-notice" role="status">{notice}</p>}
    </section>
  );
}
