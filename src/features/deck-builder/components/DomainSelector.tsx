import type { Domain } from '../../../game/types';
import { useI18n } from '../../../i18n';

interface DomainSelectorProps {
  availableDomains: Domain[];
  selectedDomains: Domain[];
  notice: string | null;
  onToggle: (domain: Domain) => void;
}

export function DomainSelector({ availableDomains, selectedDomains, notice, onToggle }: DomainSelectorProps) {
  const { t } = useI18n();
  return (
    <section className="deck-domain-config" aria-labelledby="domain-heading">
      <div className="deck-section-heading">
        <div><span>01</span><h2 id="domain-heading">{t('deck.domains.title')}</h2></div>
        <b className={selectedDomains.length === 2 ? 'complete' : ''}>{t('deck.domains.selected', { count: selectedDomains.length })}</b>
      </div>
      <div className="domain-picker">
        {availableDomains.map((domain) => {
          const selected = selectedDomains.includes(domain);
          return (
            <button type="button" key={domain} className={selected ? 'active' : ''} aria-pressed={selected} onClick={() => onToggle(domain)}>
              <i className={`domain-dot domain-${domain}`} />
              {t(`domain.${domain}`)}
              {selected && <span>✓</span>}
            </button>
          );
        })}
      </div>
      {notice && <p className="deck-notice" role="status">{notice}</p>}
    </section>
  );
}
