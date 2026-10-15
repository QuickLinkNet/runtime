import type { MatchSelection } from '../model/types';
import { useI18n } from '../../../i18n';

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
  const { t } = useI18n();
  return (
    <div className="selection-panel" role="status">
      <div className="selection-copy">
        <b>{selection.kind === 'attacker' ? t('match.selection.attack') : selection.definition.name}</b>
        <span>{message}</span>
      </div>
      {selection.kind === 'card' && selection.definition.overclockCost && (
        <label className="overclock-toggle">
          <input type="checkbox" checked={overclock} onChange={(event) => onOverclockChange(event.target.checked)} />
          <span>Overclock +{selection.definition.overclockCost}</span>
        </label>
      )}
      <div className="selection-actions">
        {optionalTarget && <button className="selection-confirm" type="button" onClick={onPlayWithoutTarget}>{t('match.selection.play')}</button>}
        <button type="button" onClick={onCancel}>{t('common.cancel')}</button>
      </div>
    </div>
  );
}
