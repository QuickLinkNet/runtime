import { GameCard } from '../../cards';
import type { GameState, PlayerView } from '../../../game/types';
import { Button } from '../../../ui/atoms';

interface MatchResultProps {
  player: PlayerView;
  opponent: PlayerView;
  won: boolean;
  state: GameState;
  onRematch: () => void;
  onDeck: () => void;
  onExit: () => void;
}

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
  return (
    <main className={`screen game-over match-result ${won ? 'victory' : 'defeat'}`}>
      <section className="result-hero">
        <span className="eyebrow">MATCH ABSCHLUSS · TURN {state.turn}</span>
        <h1>{won ? 'DEPLOYMENT SUCCESSFUL' : 'SYSTEM COMPROMISED'}</h1>
        <p>{resultCopy(state.finishReason, won)}</p>
        {state.reward.credits > 0 && <strong className="credits-reward">+{state.reward.credits} CREDITS{state.reward.winBonus > 0 ? ` · ${state.reward.matchCredits} MATCH + ${state.reward.winBonus} WIN` : ' · MATCH ABSCHLUSS'}</strong>}
        {state.reward.firstWinBooster && <strong className="first-win-reward">✦ ERSTER SIEG · BOOSTER FREIGESCHALTET</strong>}
      </section>

      <section className="result-summary" aria-label="Match-Statistik">
        <div className="result-score">
          <span><small>DEIN CORE</small>{player.name}<b>{Math.max(0, player.core)}</b></span>
          <i>VS</i>
          <span><small>GEGNERISCHER CORE</small>{opponent.name}<b>{Math.max(0, opponent.core)}</b></span>
        </div>
        <dl className="result-stats">
          <div><dt>DAUER</dt><dd>{duration(state.startedAt, state.finishedAt)}</dd></div>
          <div><dt>CORE DAMAGE</dt><dd>{stats.coreDamageDealt}</dd></div>
          <div><dt>KARTEN GESPIELT</dt><dd>{stats.cardsPlayed}</dd></div>
          <div><dt>SERVICES DEPLOYED</dt><dd>{stats.servicesDeployed}</dd></div>
          <div><dt>BUGS / REPLICAS</dt><dd>{stats.bugsCreated} / {stats.replicasCreated}</dd></div>
          <div><dt>SERVICES CRASHED</dt><dd>{stats.servicesCrashed}</dd></div>
        </dl>
      </section>

      {mvp && <section className="result-mvp"><div><span className="eyebrow">MVP CARD</span><h2>Dein größter Impact</h2><p>Diese Karte hat in diesem Match den größten Einfluss erzeugt.</p></div><GameCard card={mvp} detailsOnHover detailsOnTap /></section>}

      <nav className="result-actions" aria-label="Nächste Schritte">
        <Button variant="primary" onClick={onRematch}>{state.mode === 'multi' ? 'Neue Lobby' : 'Nochmal'} <span aria-hidden="true">→</span></Button>
        <Button variant="secondary" onClick={onDeck}>Deck anpassen</Button>
        <Button variant="ghost" onClick={onExit}>Zurück zur Basis</Button>
      </nav>
    </main>
  );
}
