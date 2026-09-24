import { useState } from 'react';
import { starterNames } from '../game/catalog';
import type { MatchPayload, PlayerIdentity } from '../game/types';
import { Button } from '../ui/atoms';

interface MainMenuPageProps {
  identity: PlayerIdentity;
  deck: string[];
  resume: MatchPayload | null;
  pending: boolean;
  onSingle: () => void;
  onMultiplayer: () => void;
  onDeck: () => void;
  onStarter: (key: string) => void;
  onResume: () => void;
}

export function MainMenuPage({ identity, deck, resume, pending, onSingle, onMultiplayer, onDeck, onStarter, onResume }: MainMenuPageProps) {
  const [starter, setStarter] = useState('custom');

  return (
    <main className="menu-screen">
      <header className="menu-header">
        <div className="brand-small">RUNTIME<span>_</span></div>
        <div className="profile-chip"><i />{identity.name}</div>
      </header>
      <section className="menu-hero">
        <span className="eyebrow">MULTIPLAYER TECH CARD GAME</span>
        <h1>Build your stack.<br /><em>Break theirs.</em></h1>
        <p>Stelle Services bereit, sichere deinen Core und überlebe den nächsten Friday Deploy.</p>
      </section>
      {resume && (
        <section className="resume-banner">
          <div><span>AKTIVE SESSION</span><b>Match {resume.state.roomCode} · Zug {resume.state.turn}</b></div>
          <Button variant="primary" onClick={onResume}>Match fortsetzen</Button>
        </section>
      )}
      <section className="menu-grid">
        <article className="mode-card featured">
          <div className="mode-number">01</div>
          <div><span className="eyebrow">TRAINING ENVIRONMENT</span><h2>Singleplayer</h2><p>Teste deinen Stack gegen einen serverseitigen Bot.</p></div>
          <Button variant="primary" disabled={pending} onClick={onSingle}>{pending ? 'Initialisiere …' : 'Bot-Match starten'}</Button>
        </article>
        <article className="mode-card">
          <div className="mode-number">02</div>
          <div><span className="eyebrow">PRIVATE CONNECTION</span><h2>Multiplayer</h2><p>Erstelle einen privaten Raum oder tritt per Code bei.</p></div>
          <Button variant="secondary" onClick={onMultiplayer}>Lobby öffnen</Button>
        </article>
        <article className="mode-card deck-mode">
          <div className="mode-number">03</div>
          <div><span className="eyebrow">CURRENT LOADOUT · {deck.length}/30</span><h2>Deck konfigurieren</h2><p>Zwei Tech-Domains, neutrale Karten, maximal zwei Kopien.</p></div>
          <select value={starter} onChange={(event) => {
            setStarter(event.target.value);
            if (event.target.value !== 'custom') onStarter(event.target.value);
          }}>
            <option value="custom">Eigenes Deck</option>
            {Object.entries(starterNames).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
          <Button variant="ghost" onClick={onDeck}>Deck Builder</Button>
        </article>
      </section>
      <footer className="menu-footer"><span>CORE INTEGRITY 30</span><span>BUILD 1.0 · MVP</span></footer>
    </main>
  );
}
