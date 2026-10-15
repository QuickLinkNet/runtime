import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { cardById } from '../game/catalog';
import type { AdminOverview, AdminPlayerDetail, AdminPlayerSummary } from '../game/types';
import { Button } from '../ui/atoms';
import { useI18n } from '../i18n';
import { BalanceLab } from '../features/balance/BalanceLab';
import type { BalanceReport } from '../game/types';

interface AdminPageProps {
  onBack: () => void;
}

export function AdminPage({ onBack }: AdminPageProps) {
  const { t, locale } = useI18n();
  const date = (value: string) => {
    const parsed = new Date(value.replace(' ', 'T') + 'Z');
    return Number.isNaN(parsed.valueOf()) ? value : new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeStyle: 'short' }).format(parsed);
  };
  const auditLabel = (action: string) => ['player_progression_updated', 'all_collections_reset', 'guest_players_deleted'].includes(action) ? t(`admin.audit.${action}`) : action;
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
  const [balanceReport, setBalanceReport] = useState<BalanceReport | null>(null);

  async function load(queryValue = query) {
    setPending(true);
    setError(null);
    try {
      const [nextOverview, nextPlayers, nextBalance] = await Promise.all([api.adminOverview(), api.adminPlayers(queryValue), api.adminBalanceReport()]);
      setOverview(nextOverview);
      setPlayers(nextPlayers.players);
      setBalanceReport(nextBalance.report);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('admin.error.load'));
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
      setError(reason instanceof Error ? reason.message : t('admin.error.player'));
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
      setError(t('admin.error.numbers'));
      return;
    }
    setPending(true);
    setError(null);
    try {
      const detail = await api.adminUpdatePlayer(selected.player.id, nextCredits, nextBoosters, nextComponents);
      setSelected(detail);
      setNotice(t('admin.notice.saved'));
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('admin.error.save'));
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
      setNotice(t('admin.notice.copiesDeleted', { count: result.deletedCopies }));
      setResetArmed(false);
      setResetAccepted(false);
      setResetPhrase('');
      if (selected) await selectPlayer(selected.player.id);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('admin.error.reset'));
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
      setNotice(t('admin.notice.guestsDeleted', { players: result.deletedPlayers, matches: result.deletedOwnedMatches }));
      setGuestDeleteArmed(false);
      setGuestDeleteAccepted(false);
      setGuestDeletePhrase('');
      setSelected(null);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('admin.error.deleteGuests'));
    } finally {
      setPending(false);
    }
  }

  async function runBalanceSimulation(matchesPerPair: number) {
    setPending(true);
    setError(null);
    try {
      const report = await api.adminRunBalanceSimulation(matchesPerPair);
      setBalanceReport(report);
      setNotice(t('admin.notice.simulated', { count: report.simulatedMatches }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('admin.error.simulation'));
    } finally {
      setPending(false);
    }
  }

  async function reviewBalanceRecommendation(recommendationId: string, status: 'accepted' | 'dismissed') {
    if (!balanceReport) return;
    setPending(true); setError(null);
    try {
      const result = await api.adminReviewBalanceRecommendation(balanceReport.id, recommendationId, status);
      setBalanceReport({ ...balanceReport, reviews: result.reviews });
      setNotice(t(status === 'accepted' ? 'admin.notice.accepted' : 'admin.notice.dismissed'));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('admin.error.review'));
    } finally { setPending(false); }
  }

  return (
    <main className="admin-screen">
      <header className="admin-header">
        <div><span className="eyebrow">{t('admin.eyebrow')}</span><h1>{t('admin.title')}</h1><p>{t('admin.intro')}</p></div>
        <Button onClick={onBack}>← {t('account.menu')}</Button>
      </header>

      {error && <p className="admin-message is-error">{error}</p>}
      {notice && <p className="admin-message is-ok">{notice}</p>}

      <section className="admin-overview" aria-label={t('admin.overviewAria')}>
        <article><span>{t('admin.players')}</span><b>{overview?.summary.players ?? '–'}</b><small>{t('admin.accounts', { count: overview?.summary.accounts ?? 0 })}</small></article>
        <article><span>{t('common.credits')}</span><b>{overview?.summary.credits ?? '–'}</b><small>{t('admin.inCirculation')}</small></article>
        <article><span>{t('admin.unopened')}</span><b>{overview?.summary.unopenedBoosters ?? '–'}</b><small>{t('common.booster')}</small></article>
        <article><span>{t('common.cards').toUpperCase()}</span><b>{overview?.summary.collectedCards ?? '–'}</b><small>{t('admin.collectionCopies')}</small></article>
      </section>

      <BalanceLab report={balanceReport} pending={pending} onRun={(matchesPerPair) => void runBalanceSimulation(matchesPerPair)} onReview={(recommendationId, status) => void reviewBalanceRecommendation(recommendationId, status)} />

      <section className="admin-workspace">
        <div className="admin-players">
          <header><div><span className="eyebrow">{t('admin.playerDirectory')}</span><h2>{t('admin.playersTitle')}</h2></div><form onSubmit={(event) => { event.preventDefault(); void load(query); }}><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('admin.searchPlaceholder')} /><Button disabled={pending}>{t('common.search')}</Button></form></header>
          <div className="admin-player-list">
            {players.map((player) => <button key={player.id} type="button" className={selected?.player.id === player.id ? 'active' : ''} onClick={() => void selectPlayer(player.id)}>
              <span><b>{player.name}</b><small>{player.account_email ?? t('admin.guestProfile')} · {t('admin.lastSeen', { date: date(player.last_seen_at) })}</small></span>
              <i>{player.credits} C · {player.boosterBalance} P</i>
            </button>)}
            {!pending && players.length === 0 && <p>{t('admin.noPlayers')}</p>}
          </div>
        </div>

        <aside className="admin-detail">
          {!selected ? <div className="admin-empty"><b>{t('admin.selectPlayer')}</b><span>{t('admin.selectPlayerHint')}</span></div> : <>
            <header><div><span className="eyebrow">{t('admin.playerDetail')}</span><h2>{selected.player.name}</h2><p>{selected.player.account_email ?? t('admin.guestProfile')} · {t('admin.since', { date: date(selected.player.created_at) })}</p></div></header>
            <dl className="admin-player-stats"><div><dt>{t('admin.matches')}</dt><dd>{selected.player.matchesPlayed}</dd></div><div><dt>{t('admin.wins')}</dt><dd>{selected.player.wins}</dd></div><div><dt>{t('common.cards').toUpperCase()}</dt><dd>{selected.cards.reduce((total, card) => total + Number(card.quantity), 0)}</dd></div><div><dt>{t('admin.opened')}</dt><dd>{selected.player.totalBoostersOpened}</dd></div></dl>
            <div className="admin-progression"><span className="eyebrow">{t('admin.economyControl')}</span><label>{t('common.credits')}<input type="number" min="0" max="1000000" value={credits} onChange={(event) => setCredits(event.target.value)} /></label><label>{t('admin.unopenedPacks')}<input type="number" min="0" max="10000" value={boosters} onChange={(event) => setBoosters(event.target.value)} /></label><Button variant="primary" disabled={pending} onClick={() => void savePlayer()}>{t('admin.saveProgress')}</Button></div>
            <div className="admin-collection"><span className="eyebrow">{t('admin.collectionTypes', { count: selected.cards.length })}</span>{selected.cards.length ? <ul>{selected.cards.map((card) => <li key={card.definitionId}><span>{cardById.get(card.definitionId)?.name ?? card.definitionId}</span><b>×{card.quantity}</b></li>)}</ul> : <p>{t('admin.noCards')}</p>}</div>
          </>}
        </aside>
      </section>

      <section className="admin-danger">
        <div><span className="eyebrow">{t('admin.irreversible')}</span><h2>{t('admin.resetCardsTitle')}</h2><p>{t('admin.resetCardsBody')}</p></div>
        {!resetArmed ? <Button variant="secondary" onClick={() => setResetArmed(true)}>{t('admin.prepareReset')}</Button> : <div className="admin-reset-confirm"><label><input type="checkbox" checked={resetAccepted} onChange={(event) => setResetAccepted(event.target.checked)} /> {t('admin.confirmDeleteCopies')}</label><label>{t('admin.typePhrase')} <b>RESET ALL</b><input value={resetPhrase} onChange={(event) => setResetPhrase(event.target.value)} autoComplete="off" /></label><Button variant="primary" disabled={!resetAccepted || resetPhrase !== 'RESET ALL' || pending} onClick={() => void resetCollections()}>{t('admin.finalReset')}</Button><Button variant="ghost" onClick={() => { setResetArmed(false); setResetAccepted(false); setResetPhrase(''); }}>{t('common.cancel')}</Button></div>}
      </section>

      <section className="admin-danger admin-danger-guests">
        <div><span className="eyebrow">{t('admin.guestCleanup')}</span><h2>{t('admin.deleteGuestsTitle')}</h2><p>{t('admin.deleteGuestsBody')}</p></div>
        {!guestDeleteArmed ? <Button variant="secondary" onClick={() => setGuestDeleteArmed(true)}>{t('admin.cleanGuests')}</Button> : <div className="admin-reset-confirm"><label><input type="checkbox" checked={guestDeleteAccepted} onChange={(event) => setGuestDeleteAccepted(event.target.checked)} /> {t('admin.confirmDeleteGuests')}</label><label>{t('admin.typePhrase')} <b>DELETE GUESTS</b><input value={guestDeletePhrase} onChange={(event) => setGuestDeletePhrase(event.target.value)} autoComplete="off" /></label><Button variant="primary" disabled={!guestDeleteAccepted || guestDeletePhrase !== 'DELETE GUESTS' || pending} onClick={() => void deleteGuestPlayers()}>{t('admin.finalDeleteGuests')}</Button><Button variant="ghost" onClick={() => { setGuestDeleteArmed(false); setGuestDeleteAccepted(false); setGuestDeletePhrase(''); }}>{t('common.cancel')}</Button></div>}
      </section>

      <section className="admin-audit"><header><span className="eyebrow">{t('admin.auditLog')}</span><h2>{t('admin.recentActions')}</h2></header>{overview?.recentAudit.length ? <ol>{overview.recentAudit.map((entry) => <li key={entry.id}><span><b>{auditLabel(entry.action)}</b><small>{entry.adminName}{entry.targetName ? ` → ${entry.targetName}` : ''}</small></span><time>{date(entry.createdAt)}</time></li>)}</ol> : <p>{t('admin.noActions')}</p>}</section>
    </main>
  );
}
