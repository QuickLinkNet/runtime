import type { ReactNode } from 'react';

interface FilterChipProps {
  children: ReactNode;
  onRemove: () => void;
}

export function FilterChip({ children, onRemove }: FilterChipProps) {
  return (
    <span className="filter-chip">
      <span>{children}</span>
      <button type="button" onClick={onRemove} aria-label={`${String(children)} entfernen`}>×</button>
    </span>
  );
}
