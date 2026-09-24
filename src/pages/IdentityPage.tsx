import { useState, type FormEvent } from 'react';
import { api, setToken } from '../api/client';
import type { PlayerIdentity } from '../game/types';
import { Button } from '../ui/atoms';

interface IdentityPageProps {
  onCreated: (player: PlayerIdentity) => void;
}

export function IdentityPage({ onCreated }: IdentityPageProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError('');
    try {
      const result = await api.createPlayer(name.trim());
      setToken(result.token);
      onCreated(result.player);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Verbindung fehlgeschlagen.');
      setPending(false);
    }
  }

  return (
    <main className="screen identity-screen">
      <div className="identity-panel">
        <span className="eyebrow">NEW SESSION</span>
        <div className="brand-large">RUNTIME<span>_</span></div>
        <p>Ein taktisches Duell zwischen Services, Infrastructure und sehr optimistischen Deployments.</p>
        <form onSubmit={submit}>
          <label htmlFor="player-name">Wie heißt dein System?</label>
          <input id="player-name" autoFocus maxLength={24} value={name} onChange={(event) => setName(event.target.value)} placeholder="Spielername" />
          <Button variant="primary" type="submit" disabled={pending || name.trim().length < 2}>
            {pending ? 'Verbinde …' : 'Session starten'}
          </Button>
          {error && <span className="form-error">{error}</span>}
        </form>
      </div>
      <aside className="identity-aside">
        <span>01</span>
        <h2>Deploy.<br />Defend.<br />Debug.</h2>
        <p>30 Integrity. Zwei Domains. Keine Ausreden.</p>
      </aside>
    </main>
  );
}
