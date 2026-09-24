interface PlayerSummaryProps {
  deckCount: number;
  handCount: number;
  trashCount: number;
}

export function PlayerSummary({ deckCount, handCount, trashCount }: PlayerSummaryProps) {
  return (
    <div className="pile-stats" aria-label="Kartenübersicht">
      <span>Deck {deckCount}</span>
      <span>Hand {handCount}</span>
      <span>Trash {trashCount}</span>
    </div>
  );
}
