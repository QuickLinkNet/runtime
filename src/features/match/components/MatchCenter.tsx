import type { MatchSelection } from '../model/types';

interface MatchCenterProps {
  events: Array<{ id: string; type: string }>;
  selection: MatchSelection;
  overclock: boolean;
  optionalTarget: boolean;
  onOverclockChange: (value: boolean) => void;
  onPlayWithoutTarget: () => void;
  onCancel: () => void;
  getEventLabel: (type: string) => string;
}

export function MatchCenter({ events, selection, overclock, optionalTarget, onOverclockChange, onPlayWithoutTarget, onCancel, getEventLabel }: MatchCenterProps) {
  return (
    <div className="board-center">
      <div className="event-feed" aria-live="polite">
        {events.map((event) => <span key={event.id}>{getEventLabel(event.type)}</span>)}
      </div>
      {selection && (
        <div className="selection-panel">
          <span>{selection.kind === 'attacker' ? 'Ziel für Angriff wählen' : `${selection.definition.name}: Ziel wählen`}</span>
          {selection.kind === 'card' && selection.definition.overclockCost && (
            <label>
              <input type="checkbox" checked={overclock} onChange={(event) => onOverclockChange(event.target.checked)} />
              {' '}Overclock +{selection.definition.overclockCost}
            </label>
          )}
          {optionalTarget && <button type="button" onClick={onPlayWithoutTarget}>Ausspielen</button>}
          <button type="button" onClick={onCancel}>Abbrechen</button>
        </div>
      )}
    </div>
  );
}
