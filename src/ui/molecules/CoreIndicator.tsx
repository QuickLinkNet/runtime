import { useI18n } from '../../i18n';

interface CoreIndicatorProps {
  value: number;
  targetable: boolean;
  combatId?: string;
  onClick: () => void;
}

export function CoreIndicator({ value, targetable, combatId, onClick }: CoreIndicatorProps) {
  const { t } = useI18n();
  return (
    <button
      className={`core ${targetable ? 'is-targetable' : ''}`}
      data-combat-id={combatId}
      onClick={onClick}
      type="button"
      aria-label={t(targetable ? 'ui.core.targetable' : 'ui.core.label', { value })}
    >
      <span>{t('common.core')}</span>
      <b>{value}</b>
    </button>
  );
}
