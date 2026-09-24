interface DeckHeaderProps {
  deckSize: number;
  validation: string | null;
}

export function DeckHeader({ deckSize, validation }: DeckHeaderProps) {
  return (
    <header className="screen-header deck-header">
      <div>
        <span className="eyebrow">DECK CONFIGURATION</span>
        <h1>Deck Builder</h1>
        <p>Wähle zwei Tech-Domains und stelle daraus zusammen mit neutralen Karten deinen Stack zusammen.</p>
      </div>
      <div className={`deck-counter ${validation ? 'invalid' : 'valid'}`}>
        <span>KARTEN</span>{deckSize}<small>/30</small>
      </div>
    </header>
  );
}
