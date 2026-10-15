import { useI18n } from '../../../i18n';

interface DeckHeaderProps {
  deckSize: number;
  validation: string | null;
  health?: { infrastructure: number; early: number };
}

export function DeckHeader({ deckSize, validation, health }: DeckHeaderProps) {
  const { t } = useI18n();
  return (
    <header className="screen-header deck-header">
      <div>
        <span className="eyebrow">{t('deck.header.eyebrow')}</span>
        <h1>{t('deck.header.title')}</h1>
        <p>{t('deck.header.description')}</p>
      </div>
      <div className={`deck-counter ${validation ? 'invalid' : 'valid'}`}>
        <span>{t('deck.cards')}</span>{deckSize}<small>/30</small>
        {health && <em>{health.infrastructure}/4 {t('deck.health.infrastructure')} · {health.early} {t('deck.health.early')}</em>}
      </div>
    </header>
  );
}
