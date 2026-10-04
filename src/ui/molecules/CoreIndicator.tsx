interface CoreIndicatorProps {
  value: number;
  targetable: boolean;
  combatId?: string;
  onClick: () => void;
}

export function CoreIndicator({ value, targetable, combatId, onClick }: CoreIndicatorProps) {
  return (
    <button
      className={`core ${targetable ? 'is-targetable' : ''}`}
      data-combat-id={combatId}
      onClick={onClick}
      type="button"
      aria-label={`Core Integrity ${value}${targetable ? ', als Ziel wählen' : ''}`}
    >
      <span>CORE</span>
      <b>{value}</b>
    </button>
  );
}
