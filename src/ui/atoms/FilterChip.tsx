import type { ReactNode } from 'react';
import { useI18n } from '../../i18n';

interface FilterChipProps {
  children: ReactNode;
  onRemove: () => void;
}

export function FilterChip({ children, onRemove }: FilterChipProps) {
  const { t } = useI18n();
  return (
    <span className="filter-chip">
      <span>{children}</span>
      <button type="button" onClick={onRemove} aria-label={t('ui.filter.remove', { filter: String(children) })}>×</button>
    </span>
  );
}
