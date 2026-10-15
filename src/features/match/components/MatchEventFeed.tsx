import type { GameEvent, PlayerView } from '../../../game/types';
import { presentEvent } from '../model/eventPresentation';
import { useI18n } from '../../../i18n';

interface MatchEventFeedProps {
  events: GameEvent[];
  players: Record<string, PlayerView>;
}

export function MatchEventFeed({ events, players }: MatchEventFeedProps) {
  const { t } = useI18n();
  return (
    <div className="event-feed" aria-live="polite" aria-label={t('match.events.aria')}>
      {events.length === 0 && <span className="event-chip tone-neutral">{t('match.events.ready')}</span>}
      {events.map((event, index) => {
        const presentation = presentEvent(event, players);
        return (
          <span className={`event-chip tone-${presentation.tone} ${index === 0 ? 'is-latest' : ''}`} key={event.id}>
            <b>{presentation.label}</b>
            {presentation.detail && <small>{presentation.detail}</small>}
          </span>
        );
      })}
    </div>
  );
}
