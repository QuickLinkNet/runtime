import { cardById } from '../../game/catalog';
import { factionProfile } from '../../game/factions';
import type { BalanceConfidence, BalanceReport, Domain } from '../../game/types';
import { useI18n } from '../../i18n';
import { Button } from '../../ui/atoms';

interface BalanceLabProps {
  report: BalanceReport | null;
  pending: boolean;
  onRun: (matchesPerPair: number) => void;
  onReview: (recommendationId: string, status: 'accepted' | 'dismissed') => void;
}

export function BalanceLab({ report, pending, onRun, onReview }: BalanceLabProps) {
  const { t } = useI18n();
  const data = report?.report;
  const reviews = report?.reviews ?? {};
  const cardAudit = data?.cardAudit ?? [];
  const auditIssues = cardAudit.filter((item) => item.status !== 'solid');
  const referenceArchetypes = data?.archetypes.filter((item) => item.suite === 'reference') ?? [];
  const referenceMatchups = data?.matchups.filter((item) => item.suite === 'reference') ?? [];
  const archetypeNames = new Map(data?.archetypes.map((item) => [item.id, item.name]) ?? []);
  const confidenceLabel = (value: BalanceConfidence) => t(`balance.confidence.${value}`);
  const domainLabel = (domain: Domain) => t(`domain.${domain}`);

  return <section className="balance-lab">
    <header>
      <div>
        <span className="eyebrow">{t('balance.eyebrow')}</span>
        <h2>{t('balance.title')}</h2>
        <p>{t('balance.intro')}</p>
      </div>
      <div className="balance-lab-actions">
        <Button variant="secondary" disabled={pending} onClick={() => onRun(2)}>{t('balance.smoke')}</Button>
        <Button variant="secondary" disabled={pending} onClick={() => onRun(6)}>{t('balance.signal')}</Button>
        <Button variant="primary" disabled={pending} onClick={() => onRun(12)}>{pending ? t('balance.running') : t('balance.deep')}</Button>
      </div>
    </header>
    {!data ? <div className="balance-empty"><b>{t('balance.emptyTitle')}</b><span>{t('balance.emptyCopy')}</span></div> : <>
      <div className="balance-summary">
        <span><b>{data.summary.simulatedMatches}</b> {t('balance.matches')}</span>
        <span><b>{data.summary.cardsCovered}/{data.summary.cardsTotal}</b> {t('balance.cards')}</span>
        <span><b>{data.summary.testDecks}</b> {t('balance.testDecks')}</span>
        <span><b>{data.summary.averageTurns}</b> {t('balance.avgTurns')}</span>
        <span><b>{data.summary.firstPlayerWinRate}%</b> {t('balance.firstPlayer')}</span>
        <span><b>{data.summary.guardTerminations}</b> {t('balance.guardEnds')}</span>
        <span className={`balance-confidence is-${data.quality.simulationConfidence}`}>{t('balance.simulation')}: {confidenceLabel(data.quality.simulationConfidence)}</span>
        <small>{t('balance.report')}: {report?.createdAt}</small>
      </div>
      <div className="balance-method"><b>{t('balance.reading')}</b><span>{data.quality.method}</span><em>{data.quality.nextStep}</em></div>
      <div className="balance-live-signal">
        <b>{t('balance.liveData')}: {data.live.recordedMatches}</b>
        <span>{data.live.recordedMatches === 0 ? t('balance.noSignals') : t('balance.feedback', data.live.feedback)}</span>
      </div>
      <div className="balance-columns">
        <article><h3>{t('balance.referenceStacks')}</h3>{referenceArchetypes.map((item) => <div className="balance-row" key={item.id}><span><b>{item.name}</b><small>{t('balance.gamesInterval', { games: item.games, low: item.winRateInterval.low, high: item.winRateInterval.high, confidence: confidenceLabel(item.confidence) })}</small></span><strong className={item.winRate < 45 ? 'low' : item.winRate > 55 ? 'high' : ''}>{item.winRate}%</strong></div>)}</article>
        <article><h3>{t('balance.hardMatchups')}</h3>{[...referenceMatchups].sort((a, b) => b.imbalance - a.imbalance).slice(0, 5).map((item) => <div className="balance-row" key={`${item.left}-${item.right}`}><span><b>{archetypeNames.get(item.left) ?? item.left} vs {archetypeNames.get(item.right) ?? item.right}</b><small>{t('balance.matchupStats', { games: item.games, left: item.leftWinRate, right: item.rightWinRate, turns: item.avgTurns })}</small></span><strong className={item.imbalance >= 15 ? 'high' : ''}>{item.imbalance} pp</strong></div>)}</article>
      </div>
      <div className="balance-columns">
        <article><h3>{t('balance.curatedSignals')}</h3><p className="balance-card-note">{t('balance.curatedNote')}</p>{data.factions.map((item) => { const faction = factionProfile(item.id); return <div className="balance-row" key={item.id}><span><b>{domainLabel(item.id)} · {faction?.identity}</b><small>{t('balance.deckSignals', { games: item.games, low: item.winRateInterval.low, high: item.winRateInterval.high })}</small></span><strong className={item.winRate < 45 ? 'low' : item.winRate > 55 ? 'high' : ''}>{item.winRate}%</strong></div>; })}<details className="balance-card-details"><summary>{t('balance.coverageRun')}</summary><div>{(data.coverageFactions ?? []).map((item) => <div className="balance-row" key={item.id}><span><b>{domainLabel(item.id)}</b><small>{t('balance.technicalSignals', { games: item.games })}</small></span><strong>{item.winRate}%</strong></div>)}</div></details></article>
        <article><h3>{t('balance.roleGaps')}</h3>{data.coverage.length === 0 ? <p className="balance-empty-copy">{t('balance.rolesComplete')}</p> : data.coverage.slice(0, 6).map((item) => <div className="balance-row" key={`${item.domain}-${item.role}`}><span><b>{domainLabel(item.domain)} · {item.role}</b><small>{t('balance.poolCards', { cards: item.cards, target: item.target })}</small></span><strong className="low">−{item.gap}</strong></div>)}</article>
      </div>
      <div className="balance-columns">
        <article><h3>{t('balance.reviewQueue')}</h3>{data.recommendations.map((item) => {
          const review = reviews[item.id];
          const reviewLabel = review?.status === 'accepted' ? t('balance.accepted') : review?.status === 'dismissed' ? t('balance.dismissed') : t('balance.open');
          return <div className={`balance-recommendation is-${item.tone}`} key={item.id}><div><b>{item.scope}</b><small>{t('balance.samples', { tone: item.tone, samples: item.samples, confidence: confidenceLabel(item.confidence) })}</small></div><span>{item.evidence}</span><em>{item.proposal}</em><div className="balance-review-actions">{review ? <i className={`is-${review.status}`}>{reviewLabel}</i> : <><button type="button" disabled={pending} onClick={() => onReview(item.id, 'accepted')}>{t('balance.queuePlaytest')}</button><button type="button" disabled={pending} onClick={() => onReview(item.id, 'dismissed')}>{t('balance.dismiss')}</button></>}</div></div>;
        })}</article>
        <article><h3>{t('balance.cardUsage')}</h3><p className="balance-card-note">{t('balance.cardUsageNote')}</p>{data.cards.slice(0, 7).map((item) => <div className="balance-row" key={item.definitionId}><span><b>{cardById.get(item.definitionId)?.name ?? item.definitionId}</b><small>{domainLabel(item.domain)} · {t('balance.cardStats', { games: item.games, possible: item.possibleGames, conversion: item.playConversion })}</small></span><strong>{item.impactPerGame}</strong></div>)}{data.cards.length > 7 && <details className="balance-card-details"><summary>{t('balance.allMetrics', { count: data.cards.length })}</summary><div>{data.cards.slice(7).map((item) => <div className="balance-row" key={item.definitionId}><span><b>{cardById.get(item.definitionId)?.name ?? item.definitionId}</b><small>{domainLabel(item.domain)} · {t('balance.cardStats', { games: item.games, possible: item.possibleGames, conversion: item.playConversion })}</small></span><strong>{item.impactPerGame}</strong></div>)}</div></details>}</article>
      </div>
      <div className="balance-columns">
        <article className="card-audit-queue"><h3>{t('balance.auditor')}</h3><p className="balance-card-note">{t('balance.auditorNote')}</p>{auditIssues.length === 0 ? <p className="balance-empty-copy">{t('balance.noReview')}</p> : auditIssues.map((item) => <div className={`card-audit-item is-${item.status}`} key={item.definitionId}><div><b>{cardById.get(item.definitionId)?.name ?? item.name}</b><small>{domainLabel(item.domain)} · {t(`type.${item.type}`)} · {t('balance.score', { score: item.score })}</small></div><span>{item.summary}</span>{item.proposals.map((proposal) => <em key={proposal}>{proposal}</em>)}</div>)}</article>
        <article className="card-audit-all"><h3>{t('balance.fullAudit')}</h3><p className="balance-card-note">{t('balance.auditCount', { count: cardAudit.length })}</p><details><summary>{t('balance.showAllCards', { count: cardAudit.length })}</summary><div>{cardAudit.map((item) => <div className={`card-audit-row is-${item.status}`} key={item.definitionId}><span><b>{cardById.get(item.definitionId)?.name ?? item.name}</b><small>{domainLabel(item.domain)} · {t(`type.${item.type}`)}</small></span><strong>{item.score}</strong><em>{t(`balance.status.${item.status}`)}</em></div>)}</div></details></article>
      </div>
    </>}
  </section>;
}
