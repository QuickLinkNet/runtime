import { useState } from 'react';
import { GameCard } from '../../cards';
import { api } from '../../../api/client';
import type { GameState, PlayerView } from '../../../game/types';
import { Button } from '../../../ui/atoms';
import { useI18n } from '../../../i18n';

interface MatchResultProps { player: PlayerView; opponent: PlayerView; won: boolean; state: GameState; onRematch: () => void; onDeck: () => void; onExit: () => void }

function duration(startedAt: string | null, finishedAt: string | null) {
  if (!startedAt || !finishedAt) return '–';
  const seconds = Math.max(0, Math.round((Date.parse(finishedAt) - Date.parse(startedAt)) / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export function MatchResult({ player, opponent, won, state, onRematch, onDeck, onExit }: MatchResultProps) {
  const { t } = useI18n();
  const stats = player.matchStats;
  const mvp = stats.mvpDefinitionId ? { instanceId: 'match-mvp', definitionId: stats.mvpDefinitionId } : null;
  const [feedback, setFeedback] = useState<'easy' | 'fair' | 'hard' | null>(null);
  const sendFeedback = async (rating: 'easy' | 'fair' | 'hard') => {
    setFeedback(rating);
    try { await api.submitMatchFeedback(state.roomCode, rating); } catch { setFeedback(null); }
  };
  const resultCopy = state.finishReason === 'TIMEOUT'
    ? t(won ? 'match.result.timeoutOpponent' : 'match.result.timeoutPlayer')
    : t(won ? 'match.result.coreOpponent' : 'match.result.corePlayer');
  const feedbackOptions = [
    ['easy', t('match.result.feedback.easy')],
    ['fair', t('match.result.feedback.fair')],
    ['hard', t('match.result.feedback.hard')],
  ] as const;
  return <main className={`screen game-over match-result ${won ? 'victory' : 'defeat'}`}>
    <section className="result-hero">
      <span className="eyebrow">{t('match.result.eyebrow', { turn: state.turn })}</span>
      <h1>{won ? t('match.result.victory') : t('match.result.defeat')}</h1><p>{resultCopy}</p>
      {state.reward.credits > 0 && <strong className="credits-reward">{state.reward.winBonus > 0
        ? t('match.result.creditsWithBonus', { credits: state.reward.credits, match: state.reward.matchCredits, bonus: state.reward.winBonus })
        : t('match.result.creditsMatch', { credits: state.reward.credits })}</strong>}
      {state.reward.firstWinBooster && <strong className="first-win-reward">{t('match.result.firstWin')}</strong>}
    </section>
    <section className="result-summary" aria-label={t('match.result.statsAria')}><div className="result-score"><span><small>{t('match.result.yourCore')}</small>{player.name}<b>{Math.max(0, player.core)}</b></span><i>{t('match.result.vs')}</i><span><small>{t('match.result.opponentCore')}</small>{opponent.name}<b>{Math.max(0, opponent.core)}</b></span></div><dl className="result-stats"><div><dt>{t('match.result.duration')}</dt><dd>{duration(state.startedAt, state.finishedAt)}</dd></div><div><dt>{t('match.result.coreDamage')}</dt><dd>{stats.coreDamageDealt}</dd></div><div><dt>{t('match.result.cardsPlayed')}</dt><dd>{stats.cardsPlayed}</dd></div><div><dt>{t('match.result.servicesDeployed')}</dt><dd>{stats.servicesDeployed}</dd></div><div><dt>{t('match.result.bugsReplicas')}</dt><dd>{stats.bugsCreated} / {stats.replicasCreated}</dd></div><div><dt>{t('match.result.servicesCrashed')}</dt><dd>{stats.servicesCrashed}</dd></div></dl></section>
    {(state.reward.mastery || state.reward.dailyProgress) && <section className="result-progression" aria-label={t('match.result.progressAria')}><div><span className="eyebrow">{t('match.result.missionControl')}</span><h2>{t('match.result.progressSaved')}</h2>{state.reward.mastery && <p>{t('match.result.masteryXp', { xp: state.reward.mastery.xpGain })}</p>}</div>{state.reward.dailyProgress && <div className="result-missions">{state.reward.dailyProgress.map((mission) => <span key={mission.key}>{t(`contract.${mission.key}.label`)} <b>{mission.progress}/{mission.goal}</b></span>)}</div>}</section>}
    {mvp && <section className="result-mvp"><div><span className="eyebrow">{t('match.result.mvpEyebrow')}</span><h2>{t('match.result.mvpTitle')}</h2><p>{t('match.result.mvpText')}</p></div><GameCard card={mvp} detailsOnHover detailsOnTap /></section>}
    <section className="match-feedback" aria-label={t('match.result.feedbackAria')}><span className="eyebrow">{t('match.result.feedbackEyebrow')}</span><b>{t('match.result.feedbackQuestion')}</b><div>{feedbackOptions.map(([rating, label]) => <button type="button" key={rating} className={feedback === rating ? 'is-selected' : ''} disabled={feedback !== null} onClick={() => void sendFeedback(rating)}>{feedback === rating ? t('match.result.feedback.thanks') : ''}{label}</button>)}</div></section>
    <nav className="result-actions" aria-label={t('match.result.nextAria')}><Button variant="primary" onClick={onRematch}>{state.mode === 'multi' ? t('match.result.newLobby') : t('match.result.again')} <span aria-hidden="true">→</span></Button><Button variant="secondary" onClick={onDeck}>{t('match.result.adjustDeck')}</Button><Button variant="ghost" onClick={onExit}>{t('match.result.backBase')}</Button></nav>
  </main>;
}
