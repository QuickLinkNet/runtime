import { useState } from 'react';
import { Button } from '../ui/atoms';

interface MultiplayerPageProps {
  pending: boolean;
  error: string | null;
  onBack: () => void;
  onCreate: () => void;
  onJoin: (code: string) => void;
}

export function MultiplayerPage({ pending, error, onBack, onCreate, onJoin }: MultiplayerPageProps) {
  const [code, setCode] = useState('');

  return (
    <main className="screen multiplayer-screen">
      <button className="back-link" onClick={onBack}>← Hauptmenü</button>
      <span className="eyebrow">PRIVATE CONNECTION</span>
      <h1>Multiplayer Lobby</h1>
      <p>Ein Raumcode verbindet zwei Browser direkt mit demselben autoritativen Match.</p>
      <div className="connection-grid">
        <article>
          <span className="mode-number">A</span><h2>Neuen Raum erstellen</h2>
          <p>Du erhältst einen fünfstelligen Code zum Teilen.</p>
          <Button variant="primary" disabled={pending} onClick={onCreate}>Raum erstellen</Button>
        </article>
        <article>
          <span className="mode-number">B</span><h2>Raum beitreten</h2>
          <p>Gib den Code deines Gegenspielers ein.</p>
          <input className="room-input" value={code} onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5))} placeholder="ABCDE" />
          <Button variant="secondary" disabled={pending || code.length !== 5} onClick={() => onJoin(code)}>Verbinden</Button>
        </article>
      </div>
      {error && <p className="form-error">{error}</p>}
    </main>
  );
}
