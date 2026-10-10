import { useState } from 'react';
import { GameCard } from '../../cards';
import { api } from '../../../api/client';
import type { GameState, PlayerView } from '../../../game/types';
import { Button } from '../../../ui/atoms';

interface MatchResultProps { player: PlayerView; opponent: PlayerView; won: boolean; state: GameState; onRematch: () => void; onDeck: () => void; onExit: () => void }

function duration(startedAt: string | null, finishedAt: string | null) {
  if (!startedAt || !finishedAt) return '–';
  const seconds = Math.max(0, Math.round((Date.parse(finishedAt) - Date.parse(startedAt)) / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function resultCopy(reason: string | null, won: boolean) {
  if (reason === 'TIMEOUT') return won ? 'Der gegnerische Stack hat das Timeout-Limit erreicht.' : 'Dein Stack hat das Timeout-Limit erreicht.';
  return won ? 'Der gegnerische Core wurde kompromittiert.' : 'Dein Core hat seine Integrität verloren.';
}

export function MatchResult({ player, opponent, won, state, onRematch, onDeck, onExit }: MatchResultProps) {
  const stats = player.matchStats;
  const mvp = stats.mvpDefinitionId ? { instanceId: 'match-mvp', definitionId: stats.mvpDefinitionId } : null;
  const [feedback, setFeedback] = useState<'easy' | 'fair' | 'hard' | null>(null);
  const sendFeedback = async (rating: 'easy' | 'fair' | 'hard') => {
    setFeedback(rating);
    try { await api.submitMatchFeedback(state.roomCode, rating); } catch { setFeedback(null); }
  };
  return <main className={`screen game-over match-result ${won ? 'victory' : 'defeat'}`}>
    <section className="result-hero">
      <span className="eyebrow">MATCH ABSCHLUSS · TURN {state.turn}</span>
      <h1>{won ? 'DEPLOYMENT SUCCESSFUL' : 'SYSTEM COMPROMISED'}</h1><p>{resultCopy(state.finishReason, won)}</p>
      {state.reward.credits > 0 && <strong className="credits-reward">+{state.reward.credits} CREDITS{state.reward.winBonus > 0 ? ` · ${state.reward.matchCredits} MATCH + ${state.reward.winBonus} WIN` : ' · MATCH ABSCHLUSS'}</strong>}
      {state.reward.firstWinBooster && <strong className="first-win-reward">✦ ERSTER SIEG · BOOSTER FREIGESCHALTET</strong>}
    </section>
    <section className="result-summary" aria-label="Match-Statistik"><div className="result-score"><span><small>DEIN CORE</small>{player.name}<b>{Math.max(0, player.core)}</b></span><i>VS</i><span><small>GEGNERISCHER CORE</small>{opponent.name}<b>{Math.max(0, opponent.core)}</b></span></div><dl className="result-stats"><div><dt>DAUER</dt><dd>{duration(state.startedAt, state.finishedAt)}</dd></div><div><dt>CORE DAMAGE</dt><dd>{stats.coreDamageDealt}</dd></div><div><dt>KARTEN GESPIELT</dt><dd>{stats.cardsPlayed}</dd></div><div><dt>SERVICES DEPLOYED</dt><dd>{stats.servicesDeployed}</dd></div><div><dt>BUGS / REPLICAS</dt><dd>{stats.bugsCreated} / {stats.replicasCreated}</dd></div><div><dt>SERVICES CRASHED</dt><dd>{stats.servicesCrashed}</dd></div></dl></section>
    {(state.reward.mastery || state.reward.dailyProgress) && <section className="result-progression" aria-label="Dein Fortschritt"><div><span className="eyebrow">MISSION CONTROL</span><h2>Fortschritt gespeichert</h2>{state.reward.mastery && <p>+{state.reward.mastery.xpGain} XP für deine Stack-Fraktionen</p>}</div>{state.reward.dailyProgress && <div className="result-missions">{state.reward.dailyProgress.map((mission) => <span key={mission.key}>{mission.label} <b>{mission.progress}/{mission.goal}</b></span>)}</div>}</section>}
    {mvp && <section className="result-mvp"><div><span className="eyebrow">MVP CARD</span><h2>Dein größter Impact</h2><p>Diese Karte hat in diesem Match den größten Einfluss erzeugt.</p></div><GameCard card={mvp} detailsOnHover detailsOnTap /></section>}
    <section className="match-feedback" aria-label="Match-Feedback"><span className="eyebrow">BALANCE SIGNAL</span><b>Wie fühlte sich dieses Match an?</b><div>{([['easy', 'Zu leicht'], ['fair', 'Fair'], ['hard', 'Zu hart']] as const).map(([rating, label]) => <button type="button" key={rating} className={feedback === rating ? 'is-selected' : ''} disabled={feedback !== null} onClick={() => void sendFeedback(rating)}>{feedback === rating ? 'Danke · ' : ''}{label}</button>)}</div></section>
    <nav className="result-actions" aria-label="Nächste Schritte"><Button variant="primary" onClick={onRematch}>{state.mode === 'multi' ? 'Neue Lobby' : 'Nochmal'} <span aria-hidden="true">→</span></Button><Button variant="secondary" onClick={onDeck}>Deck anpassen</Button><Button variant="ghost" onClick={onExit}>Zurück zur Basis</Button></nav>
  </main>;
}
