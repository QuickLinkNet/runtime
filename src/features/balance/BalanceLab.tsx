import { cardById, domainLabels } from '../../game/catalog';
import { factionProfile } from '../../game/factions';
import type { BalanceReport } from '../../game/types';
import { Button } from '../../ui/atoms';

interface BalanceLabProps {
  report: BalanceReport | null;
  pending: boolean;
  onRun: (matchesPerPair: number) => void;
  onReview: (recommendationId: string, status: 'accepted' | 'dismissed') => void;
}

const confidenceLabel = (value: string) => value === 'high' ? 'hoch' : value === 'medium' ? 'mittel' : 'niedrig';
export function BalanceLab({ report, pending, onRun, onReview }: BalanceLabProps) {
  const data = report?.report;
  const reviews = report?.reviews ?? {};
  const cardAudit = data?.cardAudit ?? [];
  const auditIssues = cardAudit.filter((item) => item.status !== 'solid');
  const referenceArchetypes = data?.archetypes.filter((item) => item.suite === 'reference') ?? [];
  const referenceMatchups = data?.matchups.filter((item) => item.suite === 'reference') ?? [];
  const archetypeNames = new Map(data?.archetypes.map((item) => [item.id, item.name]) ?? []);
  return <section className="balance-lab">
    <header>
      <div><span className="eyebrow">RUNTIME BALANCE LAB 3.0</span><h2>Evidence, nicht Bauchgefühl.</h2><p>Referenzdecks und eine vollständige Fraktionsmatrix testen alle 90 Karten. Das Lab trennt Simulation, echte Matches und Fraktionslücken – und schlägt Änderungen nur zur Prüfung vor.</p></div>
      <div className="balance-lab-actions">
        <Button variant="secondary" disabled={pending} onClick={() => onRun(2)}>Smoke · 260</Button>
        <Button variant="secondary" disabled={pending} onClick={() => onRun(6)}>Signal · 780</Button>
        <Button variant="primary" disabled={pending} onClick={() => onRun(12)}>{pending ? 'Simulation läuft …' : 'Tiefentest · 1.560'}</Button>
      </div>
    </header>
    {!data ? <div className="balance-empty"><b>Noch kein Balance-Report.</b><span>Smoke deckt Regressionen auf. Für echte Kartenentscheidungen zuerst den Tiefentest und danach reale Matchdaten nutzen.</span></div> : <>
      <div className="balance-summary">
        <span><b>{data.summary.simulatedMatches}</b> Matches</span><span><b>{data.summary.cardsCovered}/{data.summary.cardsTotal}</b> Karten</span><span><b>{data.summary.testDecks}</b> Testdecks</span><span><b>{data.summary.averageTurns}</b> Ø Züge</span><span><b>{data.summary.firstPlayerWinRate}%</b> Spieler eins</span><span><b>{data.summary.guardTerminations}</b> Guard-Enden</span><span className={`balance-confidence is-${data.quality.simulationConfidence}`}>Simulation: {confidenceLabel(data.quality.simulationConfidence)}</span><small>Report: {report?.createdAt}</small>
      </div>
      <div className="balance-method"><b>So lesen</b><span>{data.quality.method}</span><em>{data.quality.nextStep}</em></div>
      <div className="balance-live-signal"><b>Echte Matchdaten: {data.live.recordedMatches}</b><span>{data.live.recordedMatches === 0 ? 'Noch keine Signale – Simulation ist die Grundlage, nicht die finale Wahrheit.' : `Feedback: ${data.live.feedback.fair} fair · ${data.live.feedback.easy} zu leicht · ${data.live.feedback.hard} zu hart`}</span></div>
      <div className="balance-columns">
        <article><h3>Referenz-Stacks</h3>{referenceArchetypes.map((item) => <div className="balance-row" key={item.id}><span><b>{item.name}</b><small>{item.games} Spiele · 95%: {item.winRateInterval.low}–{item.winRateInterval.high}% · {confidenceLabel(item.confidence)}</small></span><strong className={item.winRate < 45 ? 'low' : item.winRate > 55 ? 'high' : ''}>{item.winRate}%</strong></div>)}</article>
        <article><h3>Härteste kuratierte Matchups</h3>{[...referenceMatchups].sort((a, b) => b.imbalance - a.imbalance).slice(0, 5).map((item) => <div className="balance-row" key={`${item.left}-${item.right}`}><span><b>{archetypeNames.get(item.left) ?? item.left} vs {archetypeNames.get(item.right) ?? item.right}</b><small>{item.games} Spiele · {item.leftWinRate}% / {item.rightWinRate}% · Ø {item.avgTurns} Züge</small></span><strong className={item.imbalance >= 15 ? 'high' : ''}>{item.imbalance} pp</strong></div>)}</article>
      </div>
      <div className="balance-columns">
        <article><h3>Kuratierte Fraktionssignale</h3><p className="balance-card-note">Nur handgebaute Referenz-Stacks fließen in diese Balanceanzeige ein.</p>{data.factions.map((item) => { const faction = factionProfile(item.id); return <div className="balance-row" key={item.id}><span><b>{domainLabels[item.id]} · {faction?.identity}</b><small>{item.games} Decksignale · 95%: {item.winRateInterval.low}–{item.winRateInterval.high}%</small></span><strong className={item.winRate < 45 ? 'low' : item.winRate > 55 ? 'high' : ''}>{item.winRate}%</strong></div>; })}<details className="balance-card-details"><summary>Coverage-Funktionslauf anzeigen · kein Balanceurteil</summary><div>{(data.coverageFactions ?? []).map((item) => <div className="balance-row" key={item.id}><span><b>{domainLabels[item.id]}</b><small>{item.games} technische Testsignale</small></span><strong>{item.winRate}%</strong></div>)}</div></details></article>
        <article><h3>Rollen-Lücken im Kartenpool</h3>{data.coverage.length === 0 ? <p className="balance-empty-copy">Alle Rollen haben die Zielmenge erreicht.</p> : data.coverage.slice(0, 6).map((item) => <div className="balance-row" key={`${item.domain}-${item.role}`}><span><b>{domainLabels[item.domain]} · {item.role}</b><small>{item.cards}/{item.target} Karten im Pool</small></span><strong className="low">−{item.gap}</strong></div>)}</article>
      </div>
      <div className="balance-columns">
        <article><h3>Review-Queue</h3>{data.recommendations.map((item) => {
          const review = reviews[item.id];
          return <div className={`balance-recommendation is-${item.tone}`} key={item.id}><div><b>{item.scope}</b><small>{item.tone} · {item.samples} Samples · {confidenceLabel(item.confidence)}</small></div><span>{item.evidence}</span><em>{item.proposal}</em><div className="balance-review-actions">{review ? <i className={`is-${review.status}`}>{review.status === 'accepted' ? 'Für Playtest markiert' : review.status === 'dismissed' ? 'Verworfen' : 'Offen'}</i> : <><button type="button" disabled={pending} onClick={() => onReview(item.id, 'accepted')}>Playtest vormerken</button><button type="button" disabled={pending} onClick={() => onReview(item.id, 'dismissed')}>Verwerfen</button></>}</div></div>;
        })}</article>
        <article><h3>Karten: Nutzung statt Urteil</h3><p className="balance-card-note">Impact ist kein Beweis für Stärke. Karten werden erst bei ausreichenden Samples als Kandidat markiert.</p>{data.cards.slice(0, 7).map((item) => <div className="balance-row" key={item.definitionId}><span><b>{cardById.get(item.definitionId)?.name ?? item.definitionId}</b><small>{domainLabels[item.domain]} · {item.games}/{item.possibleGames} Spiele · {item.playConversion}% Hand→Play</small></span><strong>{item.impactPerGame}</strong></div>)}{data.cards.length > 7 && <details className="balance-card-details"><summary>Alle {data.cards.length} Kartenmetriken anzeigen</summary><div>{data.cards.slice(7).map((item) => <div className="balance-row" key={item.definitionId}><span><b>{cardById.get(item.definitionId)?.name ?? item.definitionId}</b><small>{domainLabels[item.domain]} · {item.games}/{item.possibleGames} Spiele · {item.playConversion}% Hand→Play</small></span><strong>{item.impactPerGame}</strong></div>)}</div></details>}</article>
      </div>
      <div className="balance-columns">
        <article className="card-audit-queue"><h3>Card Auditor · Design-Review</h3><p className="balance-card-note">Prueft Timing, bleibenden Spielwert, Textklarheit und bekannte Text/Engine-Abweichungen. Es aendert nie selbst Karten.</p>{auditIssues.length === 0 ? <p className="balance-empty-copy">Keine Karte ist aktuell fuer ein Design-Review markiert.</p> : auditIssues.map((item) => <div className={`card-audit-item is-${item.status}`} key={item.definitionId}><div><b>{item.name}</b><small>{domainLabels[item.domain]} · {item.type} · Score {item.score}/100</small></div><span>{item.summary}</span>{item.proposals.map((proposal) => <em key={proposal}>{proposal}</em>)}</div>)}</article>
        <article className="card-audit-all"><h3>Vollstaendiger Karten-Audit</h3><p className="balance-card-note">{cardAudit.length} spielbare Karten werden bewertet – auch die stabilen, unauffaelligen Karten.</p><details><summary>Alle {cardAudit.length} Karten anzeigen</summary><div>{cardAudit.map((item) => <div className={`card-audit-row is-${item.status}`} key={item.definitionId}><span><b>{item.name}</b><small>{domainLabels[item.domain]} · {item.type}</small></span><strong>{item.score}</strong><em>{item.status === 'solid' ? 'stabil' : item.status === 'watch' ? 'beobachten' : 'Review'}</em></div>)}</div></details></article>
      </div>
    </>}
  </section>;
}
