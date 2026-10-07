import { useState, type FormEvent } from 'react';
import { api, setToken } from '../api/client';
import type { PlayerIdentity } from '../game/types';
import { cacheIdentity } from '../pwa/identityCache';
import { Button } from '../ui/atoms';

export function AccountPage({ identity, onLinked, onBack }: { identity: PlayerIdentity; onLinked: (identity: PlayerIdentity) => void; onBack: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function link(event: FormEvent) {
    event.preventDefault();
    if (password !== confirm) { setError('Die Passwörter stimmen nicht überein.'); return; }
    setPending(true);
    setError('');
    try {
      const result = await api.linkAccount(email, password);
      setToken(result.token);
      cacheIdentity(result.player);
      onLinked(result.player);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Account konnte nicht verbunden werden.');
      setPending(false);
    }
  }

  return (
    <main className="screen account-screen">
      <header className="screen-header"><div><span className="eyebrow">OPTIONAL ACCOUNT</span><h1>{identity.isAccount ? 'Account gesichert' : 'Stack dauerhaft sichern'}</h1><p>{identity.isAccount ? `Verbunden als ${identity.accountEmail}.` : 'Dein Gastprofil, Fortschritt und aktueller Stack werden direkt übernommen.'}</p></div><Button onClick={onBack}>← Menü</Button></header>
      {identity.isAccount ? <section className="account-status"><b>✓ ACCOUNT AKTIV</b><p>Sammlung, Booster und dein eigener Stack sind auf diesem und weiteren Geräten verfügbar.</p></section> : <section className="account-layout"><article><span className="eyebrow">GUEST → ACCOUNT</span><h2>Kein Neustart. Kein Verlust.</h2><p>Der aktuelle Name, das Tutorial, Booster und sämtliche Fortschritte bleiben an diesem Profil. Nur die Anmeldung kommt dazu.</p><ul><li>Eigene Decks bauen und speichern</li><li>Booster und Sammlung freischalten</li><li>Auf einem anderen Gerät anmelden</li></ul></article><form className="account-form" onSubmit={link}><label htmlFor="link-email">E-Mail</label><input id="link-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@beispiel.de" /><label htmlFor="link-password">Passwort</label><input id="link-password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mindestens 8 Zeichen" /><label htmlFor="link-confirm">Passwort wiederholen</label><input id="link-confirm" type="password" autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} placeholder="Passwort wiederholen" />{error && <span className="form-error">{error}</span>}<Button variant="primary" type="submit" disabled={pending || !email || password.length < 8 || confirm !== password}>{pending ? 'Sichere Profil …' : 'Account verknüpfen →'}</Button><small>Kein Marketing. Login dient nur zum Sichern deines Spielstands.</small></form></section>}
    </main>
  );
}
