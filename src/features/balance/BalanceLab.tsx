import { cardById, domainLabels } from '../../game/catalog';
import { factionProfile } from '../../game/factions';
import type { BalanceReport } from '../../game/types';
import { Button } from '../../ui/atoms';

interface BalanceLabProps { report: BalanceReport | null; pending: boolean; onRun: (matchesPerPair: number) => void; }

export function BalanceLab({ report, pending, onRun }: BalanceLabProps) {
  const data = report?.report;
  return <section className="balance-lab">
    <header><div><span className="eyebrow">RUNTIME BALANCE LAB</span><h2>Simulation & Fraktions-Audit</h2><p>Die KI ändert keine Werte selbst. Sie erzeugt nachvollziehbare Signale für Buffs, Nerfs und neue Synergien.</p></div><div className="balance-lab-actions"><Button variant="secondary" disabled={pending} onClick={() => onRun(6)}>Schnelltest · 96</Button><Button variant="primary" disabled={pending} onClick={() => onRun(25)}>{pending ? 'Simulation läuft …' : 'Voller Report · 400'}</Button></div></header>
    {!data ? <div className="balance-empty"><b>Noch kein Balance-Report.</b><span>Der volle Report spielt alle vier Archetypen gegeneinander – inklusive Startvorteil-Ausgleich über viele Partien.</span></div> : <>
      <div className="balance-summary"><span><b>{data.summary.simulatedMatches}</b> Matches</span><span><b>{data.summary.averageTurns}</b> Ø Züge</span><span><b>{data.summary.draws}</b> Timeout-Entscheidungen</span><small>Report: {report?.createdAt}</small></div>
      <div className="balance-live-signal"><b>Echte Matchdaten: {data.live.recordedMatches}</b><span>{data.live.recordedMatches === 0 ? 'Sobald Kollegen Matches beenden, erscheinen hier reale Fraktions-Signale.' : `Top-Signal: ${data.live.factions[0] ? `${domainLabels[data.live.factions[0].id]} ${data.live.factions[0].winRate}%` : 'wird berechnet'}`}</span></div>
      <div className="balance-columns">
        <article><h3>Archetypen</h3>{data.archetypes.map((item) => <div className="balance-row" key={item.id}><span><b>{item.name}</b><small>{item.games} Spiele · Ø {item.avgTurns} Züge</small></span><strong className={item.winRate < 45 ? 'low' : item.winRate > 55 ? 'high' : ''}>{item.winRate}%</strong></div>)}</article>
        <article><h3>Fraktions-Signal</h3>{data.factions.map((item) => { const faction = factionProfile(item.id); return <div className="balance-row" key={item.id}><span><b>{domainLabels[item.id]} · {faction?.identity}</b><small>{faction?.verbs.join(' · ')}</small></span><strong className={item.winRate < 45 ? 'low' : item.winRate > 55 ? 'high' : ''}>{item.winRate}%</strong></div>; })}</article>
      </div>
      <div className="balance-columns">
        <article><h3>Empfehlungen</h3>{data.recommendations.map((item, index) => <div className={`balance-recommendation is-${item.tone}`} key={`${item.scope}-${index}`}><b>{item.scope}</b><span>{item.message}</span></div>)}</article>
        <article><h3>Karten mit höchstem Impact</h3>{data.cards.slice(0, 6).map((item) => <div className="balance-row" key={item.definitionId}><span><b>{cardById.get(item.definitionId)?.name ?? item.definitionId}</b><small>{domainLabels[item.domain]} · {item.games} Einsätze</small></span><strong>{item.impactPerGame}</strong></div>)}</article>
      </div>
    </>}
  </section>;
}
