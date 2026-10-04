interface PlayerSummaryProps {
  playerId?: string;
  deckCount: number;
  handCount: number;
  trashCount: number;
}

type PileKind = 'deck' | 'hand' | 'trash';

function PileIcon({ kind }: { kind: PileKind }) {
  if (kind === 'deck') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m4 8 8-4 8 4-8 4-8-4Z" />
        <path d="m4 12 8 4 8-4M4 16l8 4 8-4" />
      </svg>
    );
  }

  if (kind === 'hand') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m3.5 7.5 6-2 3.7 11.2-6 2L3.5 7.5Z" />
        <path d="m11.1 5.5 6.4-.8 1.5 11.7-5.2.7" />
        <path d="m17.5 6.5 3 .6-1.9 9.2" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13M10 10v7M14 10v7" />
    </svg>
  );
}

export function PlayerSummary({ playerId, deckCount, handCount, trashCount }: PlayerSummaryProps) {
  const piles: Array<{ kind: PileKind; label: string; value: number }> = [
    { kind: 'deck', label: 'Deck', value: deckCount },
    { kind: 'hand', label: 'Hand', value: handCount },
    { kind: 'trash', label: 'Trash', value: trashCount },
  ];

  return (
    <div className="pile-stats" aria-label="Kartenübersicht">
      {piles.map(({ kind, label, value }) => (
        <span
          className={`pile-stat pile-stat-${kind}`}
          data-combat-trash={kind === 'trash' ? playerId : undefined}
          title={`${label}: ${value}`}
          key={kind}
        >
          <PileIcon kind={kind} />
          <b>{value}</b>
          <i>{label}</i>
        </span>
      ))}
    </div>
  );
}
