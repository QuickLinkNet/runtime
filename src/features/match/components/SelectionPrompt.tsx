import type { MatchSelection } from '../model/types';

interface SelectionPromptProps {
  selection: NonNullable<MatchSelection>;
  message: string;
  overclock: boolean;
  optionalTarget: boolean;
  onOverclockChange: (value: boolean) => void;
  onPlayWithoutTarget: () => void;
  onCancel: () => void;
}

export function SelectionPrompt({ selection, message, overclock, optionalTarget, onOverclockChange, onPlayWithoutTarget, onCancel }: SelectionPromptProps) {
  return (
    <div className="selection-panel" role="status">
      <div className="selection-copy">
        <b>{selection.kind === 'attacker' ? 'Angriff' : selection.definition.name}</b>
        <span>{message}</span>
      </div>
      {selection.kind === 'card' && selection.definition.overclockCost && (
        <label className="overclock-toggle">
          <input type="checkbox" checked={overclock} onChange={(event) => onOverclockChange(event.target.checked)} />
          <span>Overclock +{selection.definition.overclockCost}</span>
        </label>
      )}
      <div className="selection-actions">
        {optionalTarget && <button className="selection-confirm" type="button" onClick={onPlayWithoutTarget}>Ausspielen</button>}
        <button type="button" onClick={onCancel}>Abbrechen</button>
      </div>
    </div>
  );
}
