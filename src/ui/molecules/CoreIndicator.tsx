interface CoreIndicatorProps {
  value: number;
  targetable: boolean;
  onClick: () => void;
}

export function CoreIndicator({ value, targetable, onClick }: CoreIndicatorProps) {
  return (
    <button
      className={`core ${targetable ? 'is-targetable' : ''}`}
      onClick={onClick}
      type="button"
      aria-label={`Core Integrity ${value}${targetable ? ', als Ziel wählen' : ''}`}
    >
      <span>CORE</span>
      <b>{value}</b>
    </button>
  );
}
