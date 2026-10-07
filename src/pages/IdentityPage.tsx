import { useState, type FormEvent } from 'react';
import { api, setToken } from '../api/client';
import type { PlayerIdentity } from '../game/types';
import { cacheIdentity } from '../pwa/identityCache';
import { Button } from '../ui/atoms';

type AccessMode = 'guest' | 'login' | 'register';

interface IdentityPageProps {
  onCreated: (player: PlayerIdentity) => void;
  onLoggedIn: (player: PlayerIdentity) => void;
}

const copy: Record<AccessMode, { label: string; title: string; body: string; action: string }> = {
  guest: { label: 'PLAY IMMEDIATELY', title: 'Ohne Anmeldung starten', body: 'Ein Name genügt. Die drei freien Starter-Stacks stehen sofort bereit.', action: 'Als Gast deployen' },
  login: { label: 'ACCOUNT ACCESS', title: 'Willkommen zurück', body: 'Hole deinen gespeicherten Stack und deine Sammlung auf dieses Gerät.', action: 'Einloggen' },
  register: { label: 'CREATE ACCOUNT', title: 'Stack dauerhaft sichern', body: 'Starte direkt mit einem Account und nimm Sammlung, Booster und eigene Decks überallhin mit.', action: 'Account erstellen' },
};

export function IdentityPage({ onCreated, onLoggedIn }: IdentityPageProps) {
  const [mode, setMode] = useState<AccessMode>('guest');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const current = copy[mode];

  function changeMode(next: AccessMode) {
    setMode(next);
    setError('');
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (mode === 'register' && password !== confirm) { setError('Die Passwörter stimmen nicht überein.'); return; }
    setPending(true);
    setError('');
    try {
      const result = mode === 'guest'
        ? await api.createPlayer(name.trim())
        : mode === 'login'
          ? await api.login(email, password)
          : await api.registerAccount(name.trim(), email, password);
      setToken(result.token);
      cacheIdentity(result.player);
      if (mode === 'guest') onCreated(result.player);
      else onLoggedIn(result.player);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Verbindung fehlgeschlagen.');
      setPending(false);
    }
  }

  const valid = mode === 'guest'
    ? name.trim().length >= 2
    : mode === 'login'
      ? Boolean(email) && password.length >= 8
      : name.trim().length >= 2 && Boolean(email) && password.length >= 8 && password === confirm;

  return (
    <main className="screen identity-screen">
      <header className="identity-header"><div className="brand-small">RUNTIME<span>_</span></div><span><i /> SYSTEM ONLINE · BUILD 1.0</span></header>
      <section className="identity-hero"><span className="eyebrow">TACTICAL TECH CARD GAME</span><h1><span>Deploy.</span><span>Defend.</span><em>Debug.</em></h1><p>Baue deinen Stack, sichere den Core und bring das System deines Gegners zum Absturz.</p><div className="identity-specs" aria-label="Spielmerkmale"><span><b>30</b> CORE INTEGRITY</span><span><b>02</b> TECH DOMAINS</span><span><b>1V1</b> RUNTIME DUEL</span></div></section>
      <section className="identity-access-card">
        <div className="identity-access-topline"><span>{mode === 'guest' ? 'GUEST_SESSION' : mode === 'login' ? 'ACCOUNT_LOGIN' : 'ACCOUNT_REGISTER'}</span><b>01</b></div>
        <span className="eyebrow">{current.label}</span><h2>{current.title}</h2><p>{current.body}</p>
        <form onSubmit={submit}>
          {mode !== 'login' && <><label htmlFor="player-name">Wie heißt dein System?</label><input id="player-name" autoFocus maxLength={24} autoComplete="nickname" value={name} onChange={(event) => setName(event.target.value)} placeholder="Spielername" /></>}
          {mode !== 'guest' && <><label htmlFor="account-email">E-Mail</label><input id="account-email" autoFocus={mode === 'login'} type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@beispiel.de" /><label htmlFor="account-password">Passwort</label><input id="account-password" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mindestens 8 Zeichen" /></>}
          {mode === 'register' && <><label htmlFor="account-confirm">Passwort wiederholen</label><input id="account-confirm" type="password" autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} placeholder="Passwort wiederholen" /></>}
          <Button variant="primary" type="submit" disabled={pending || !valid}>{pending ? 'Verbinde …' : <>{current.action} <span aria-hidden="true">→</span></>}</Button>
          {error && <span className="form-error">{error}</span>}
        </form>
        <div className="identity-account-switches">
          {mode !== 'register' && <button type="button" onClick={() => changeMode('register')}>Neuen Account erstellen</button>}
          {mode !== 'login' && <button type="button" onClick={() => changeMode('login')}>Bereits einen Account? Einloggen</button>}
          {mode !== 'guest' && <button type="button" onClick={() => changeMode('guest')}>Ohne Account als Gast spielen</button>}
        </div>
        <small>{mode === 'guest' ? 'Gastmodus: freie Starter-Stacks, ohne E-Mail. Account später freiwillig verknüpfen.' : 'Kostenloser Account. Kein Marketing – nur dein sicher gespeicherter Spielstand.'}</small>
      </section>
      <footer className="identity-footer"><span>SERVER AUTHORITATIVE</span><span>NO PAY TO WIN · JUST BETTER DEPLOYS</span></footer>
    </main>
  );
}
