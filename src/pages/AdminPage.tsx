import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { cardById } from '../game/catalog';
import type { AdminOverview, AdminPlayerDetail, AdminPlayerSummary } from '../game/types';
import { Button } from '../ui/atoms';

interface AdminPageProps {
  onBack: () => void;
}

function date(value: string) {
  const parsed = new Date(value.replace(' ', 'T') + 'Z');
  return Number.isNaN(parsed.valueOf()) ? value : new Intl.DateTimeFormat('de-DE', { dateStyle: 'short', timeStyle: 'short' }).format(parsed);
}

function auditLabel(action: string) {
  if (action === 'player_progression_updated') return 'Credits/Packs geändert';
  if (action === 'all_collections_reset') return 'Alle Sammlungen zurückgesetzt';
  if (action === 'guest_players_deleted') return 'Gastprofile gelöscht';
  return action;
}

export function AdminPage({ onBack }: AdminPageProps) {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [players, setPlayers] = useState<AdminPlayerSummary[]>([]);
  const [selected, setSelected] = useState<AdminPlayerDetail | null>(null);
  const [query, setQuery] = useState('');
  const [credits, setCredits] = useState('0');
  const [boosters, setBoosters] = useState('0');
  const [components, setComponents] = useState('0');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [resetArmed, setResetArmed] = useState(false);
  const [resetAccepted, setResetAccepted] = useState(false);
  const [resetPhrase, setResetPhrase] = useState('');
  const [guestDeleteArmed, setGuestDeleteArmed] = useState(false);
  const [guestDeleteAccepted, setGuestDeleteAccepted] = useState(false);
  const [guestDeletePhrase, setGuestDeletePhrase] = useState('');

  async function load(queryValue = query) {
    setPending(true);
    setError(null);
    try {
      const [nextOverview, nextPlayers] = await Promise.all([api.adminOverview(), api.adminPlayers(queryValue)]);
      setOverview(nextOverview);
      setPlayers(nextPlayers.players);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Admin-Daten konnten nicht geladen werden.');
    } finally {
      setPending(false);
    }
  }

  useEffect(() => { void load(''); }, []);

  async function selectPlayer(playerId: string) {
    setPending(true);
    setError(null);
    try {
      const detail = await api.adminPlayer(playerId);
      setSelected(detail);
      setCredits(String(detail.player.credits));
      setBoosters(String(detail.player.boosterBalance));
      setComponents(String(detail.player.components));
      setNotice(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Spieler konnte nicht geladen werden.');
    } finally {
      setPending(false);
    }
  }

  async function savePlayer() {
    if (!selected) return;
    const nextCredits = Number(credits);
    const nextBoosters = Number(boosters);
    const nextComponents = Number(components);
    if (!Number.isSafeInteger(nextCredits) || nextCredits < 0 || !Number.isSafeInteger(nextBoosters) || nextBoosters < 0 || !Number.isSafeInteger(nextComponents) || nextComponents < 0) {
      setError('Credits und Packs müssen ganze, nichtnegative Zahlen sein.');
      return;
    }
    setPending(true);
    setError(null);
    try {
      const detail = await api.adminUpdatePlayer(selected.player.id, nextCredits, nextBoosters, nextComponents);
      setSelected(detail);
      setNotice('Spielerfortschritt gespeichert und protokolliert.');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Spielerfortschritt konnte nicht gespeichert werden.');
    } finally {
      setPending(false);
    }
  }

  async function resetCollections() {
    if (!resetAccepted || resetPhrase !== 'RESET ALL') return;
    setPending(true);
    setError(null);
    try {
      const result = await api.adminResetCollections();
      setNotice(`${result.deletedCopies} Kartenkopien wurden aus allen Sammlungen entfernt.`);
      setResetArmed(false);
      setResetAccepted(false);
      setResetPhrase('');
      if (selected) await selectPlayer(selected.player.id);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Sammlungen konnten nicht zurückgesetzt werden.');
    } finally {
      setPending(false);
    }
  }

  async function deleteGuestPlayers() {
    if (!guestDeleteAccepted || guestDeletePhrase !== 'DELETE GUESTS') return;
    setPending(true);
    setError(null);
    try {
      const result = await api.adminDeleteGuestPlayers();
      setNotice(`${result.deletedPlayers} Gastprofile und ${result.deletedOwnedMatches} zugehörige Matches wurden gelöscht.`);
      setGuestDeleteArmed(false);
      setGuestDeleteAccepted(false);
      setGuestDeletePhrase('');
      setSelected(null);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Gastprofile konnten nicht gelöscht werden.');
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="admin-screen">
      <header className="admin-header">
        <div><span className="eyebrow">RESTRICTED OPERATIONS</span><h1>Admin Console</h1><p>Spieler, Fortschritt und Economy serverseitig verwalten.</p></div>
        <Button onClick={onBack}>← Menü</Button>
      </header>

      {error && <p className="admin-message is-error">{error}</p>}
      {notice && <p className="admin-message is-ok">{notice}</p>}

      <section className="admin-overview" aria-label="Systemübersicht">
        <article><span>SPIELER</span><b>{overview?.summary.players ?? '–'}</b><small>{overview?.summary.accounts ?? 0} Accounts</small></article>
        <article><span>CREDITS</span><b>{overview?.summary.credits ?? '–'}</b><small>im Umlauf</small></article>
        <article><span>UNGEÖFFNET</span><b>{overview?.summary.unopenedBoosters ?? '–'}</b><small>Booster</small></article>
        <article><span>KARTEN</span><b>{overview?.summary.collectedCards ?? '–'}</b><small>Sammlungskopien</small></article>
      </section>

      <section className="admin-workspace">
        <div className="admin-players">
          <header><div><span className="eyebrow">PLAYER DIRECTORY</span><h2>Spieler</h2></div><form onSubmit={(event) => { event.preventDefault(); void load(query); }}><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name oder E-Mail" /><Button disabled={pending}>Suchen</Button></form></header>
          <div className="admin-player-list">
            {players.map((player) => <button key={player.id} type="button" className={selected?.player.id === player.id ? 'active' : ''} onClick={() => void selectPlayer(player.id)}>
              <span><b>{player.name}</b><small>{player.account_email ?? 'Gastprofil'} · zuletzt {date(player.last_seen_at)}</small></span>
              <i>{player.credits} C · {player.boosterBalance} P</i>
            </button>)}
            {!pending && players.length === 0 && <p>Keine Spieler gefunden.</p>}
          </div>
        </div>

        <aside className="admin-detail">
          {!selected ? <div className="admin-empty"><b>Spieler auswählen</b><span>Details, Karten und Economy-Steuerung erscheinen hier.</span></div> : <>
            <header><div><span className="eyebrow">PLAYER DETAIL</span><h2>{selected.player.name}</h2><p>{selected.player.account_email ?? 'Gastprofil'} · seit {date(selected.player.created_at)}</p></div></header>
            <dl className="admin-player-stats"><div><dt>MATCHES</dt><dd>{selected.player.matchesPlayed}</dd></div><div><dt>SIEGE</dt><dd>{selected.player.wins}</dd></div><div><dt>KARTEN</dt><dd>{selected.cards.reduce((total, card) => total + Number(card.quantity), 0)}</dd></div><div><dt>GEÖFFNET</dt><dd>{selected.player.totalBoostersOpened}</dd></div></dl>
            <div className="admin-progression"><span className="eyebrow">ECONOMY CONTROL</span><label>Credits<input type="number" min="0" max="1000000" value={credits} onChange={(event) => setCredits(event.target.value)} /></label><label>Ungeöffnete Packs<input type="number" min="0" max="10000" value={boosters} onChange={(event) => setBoosters(event.target.value)} /></label><Button variant="primary" disabled={pending} onClick={() => void savePlayer()}>Fortschritt speichern</Button></div>
            <div className="admin-collection"><span className="eyebrow">SAMMLUNG · {selected.cards.length} TYPEN</span>{selected.cards.length ? <ul>{selected.cards.map((card) => <li key={card.definitionId}><span>{cardById.get(card.definitionId)?.name ?? card.definitionId}</span><b>×{card.quantity}</b></li>)}</ul> : <p>Noch keine Karten.</p>}</div>
          </>}
        </aside>
      </section>

      <section className="admin-danger">
        <div><span className="eyebrow">IRREVERSIBLE OPERATION</span><h2>Erworbene Karten zurücksetzen</h2><p>Entfernt Erweiterungskarten aller Spieler. Das permanente Basis-Set, Credits, Packs, Accounts und Decks bleiben erhalten.</p></div>
        {!resetArmed ? <Button variant="secondary" onClick={() => setResetArmed(true)}>Reset vorbereiten</Button> : <div className="admin-reset-confirm"><label><input type="checkbox" checked={resetAccepted} onChange={(event) => setResetAccepted(event.target.checked)} /> Ich verstehe, dass alle Kartenkopien gelöscht werden.</label><label>Tippe <b>RESET ALL</b><input value={resetPhrase} onChange={(event) => setResetPhrase(event.target.value)} autoComplete="off" /></label><Button variant="primary" disabled={!resetAccepted || resetPhrase !== 'RESET ALL' || pending} onClick={() => void resetCollections()}>Endgültig zurücksetzen</Button><Button variant="ghost" onClick={() => { setResetArmed(false); setResetAccepted(false); setResetPhrase(''); }}>Abbrechen</Button></div>}
      </section>

      <section className="admin-danger admin-danger-guests">
        <div><span className="eyebrow">GUEST CLEANUP</span><h2>Alle nicht registrierten Spieler löschen</h2><p>Entfernt ausschließlich Gastprofile. Ihre eigenen Matches werden mit entfernt; bei fremden Matches verschwinden nur die Gast-Teilnahmen.</p></div>
        {!guestDeleteArmed ? <Button variant="secondary" onClick={() => setGuestDeleteArmed(true)}>Gastprofile bereinigen</Button> : <div className="admin-reset-confirm"><label><input type="checkbox" checked={guestDeleteAccepted} onChange={(event) => setGuestDeleteAccepted(event.target.checked)} /> Ich verstehe, dass Gastprofile endgültig gelöscht werden.</label><label>Tippe <b>DELETE GUESTS</b><input value={guestDeletePhrase} onChange={(event) => setGuestDeletePhrase(event.target.value)} autoComplete="off" /></label><Button variant="primary" disabled={!guestDeleteAccepted || guestDeletePhrase !== 'DELETE GUESTS' || pending} onClick={() => void deleteGuestPlayers()}>Gastprofile endgültig löschen</Button><Button variant="ghost" onClick={() => { setGuestDeleteArmed(false); setGuestDeleteAccepted(false); setGuestDeletePhrase(''); }}>Abbrechen</Button></div>}
      </section>

      <section className="admin-audit"><header><span className="eyebrow">AUDIT LOG</span><h2>Letzte Admin-Aktionen</h2></header>{overview?.recentAudit.length ? <ol>{overview.recentAudit.map((entry) => <li key={entry.id}><span><b>{auditLabel(entry.action)}</b><small>{entry.adminName}{entry.targetName ? ` → ${entry.targetName}` : ''}</small></span><time>{date(entry.createdAt)}</time></li>)}</ol> : <p>Noch keine Admin-Aktionen.</p>}</section>
    </main>
  );
}
