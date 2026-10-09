interface DeckHeaderProps {
  deckSize: number;
  validation: string | null;
  health?: { infrastructure: number; early: number };
}

export function DeckHeader({ deckSize, validation, health }: DeckHeaderProps) {
  return (
    <header className="screen-header deck-header">
      <div>
        <span className="eyebrow">DECK CONFIGURATION</span>
        <h1>Deck Builder</h1>
        <p>Wähle zwei Tech-Domains und stelle daraus zusammen mit neutralen Karten deinen Stack zusammen.</p>
      </div>
      <div className={`deck-counter ${validation ? 'invalid' : 'valid'}`}>
        <span>KARTEN</span>{deckSize}<small>/30</small>
        {health && <em>{health.infrastructure}/4 Infra · {health.early} Early</em>}
      </div>
    </header>
  );
}
