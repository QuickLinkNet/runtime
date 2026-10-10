import { type CSSProperties } from 'react';
import { GlossaryModal } from '../cards';
import type { GameAction, GameState } from '../../game/types';
import { BattlefieldSide } from './components/BattlefieldSide';
import { CardHelpTip } from './components/CardHelpTip';
import { CombatFeedbackLayer } from './components/CombatFeedbackLayer';
import { HandDock } from './components/HandDock';
import { InteractionNotice } from './components/InteractionNotice';
import { MatchCenter } from './components/MatchCenter';
import { MatchResult } from './components/MatchResult';
import { MatchTopbar } from './components/MatchTopbar';
import { MulliganScreen } from './components/MulliganScreen';
import { PlayerStrip } from './components/PlayerStrip';
import { TurnBanner } from './components/TurnBanner';
import { WaitingLobby } from './components/WaitingLobby';
import { useMatchController } from './hooks/useMatchController';
import { useMatchSounds } from './hooks/useMatchSounds';
import { playSfx } from '../../audio/sfx';
import { TutorialCoach } from '../tutorial/TutorialCoach';
import { TutorialResult } from '../tutorial/TutorialResult';
import { tutorialSteps } from '../tutorial/tutorialSteps';

interface MatchBoardProps {
  state: GameState;
  pending: boolean;
  syncStatus: 'connected' | 'reconnecting' | 'offline';
  onAction: (action: GameAction) => Promise<void>;
  onRematch: () => void;
  onDeck: () => void;
  onExit: () => void;
}

export function MatchBoard({ state, pending, syncStatus, onAction, onRematch, onDeck, onExit }: MatchBoardProps) {
  useMatchSounds(state);
  const interactionPending = pending || syncStatus !== 'connected';
  const match = useMatchController({ state, pending: interactionPending, onAction });

  if (!match.opponent) {
    return <WaitingLobby state={state} pending={interactionPending} onExit={onExit} />;
  }

  if (state.status === 'mulligan') {
    return (
      <MulliganScreen
        player={match.player}
        pending={interactionPending}
        selectedIds={match.mulligan}
        onToggle={match.toggleMulligan}
        onSubmit={() => { playSfx('command-execute'); void onAction({ type: 'MULLIGAN', cardInstanceIds: match.mulligan }); }}
      />
    );
  }

  if (state.status === 'finished') {
    if (state.mode === 'tutorial' && state.tutorial) {
      return <TutorialResult tutorial={state.tutorial} onExit={onExit} />;
    }
    return (
      <MatchResult
        player={match.player}
        opponent={match.opponent}
        won={state.winnerId === state.viewerId}
        state={state}
        onRematch={onRematch}
        onDeck={onDeck}
        onExit={onExit}
      />
    );
  }

  const opponent = match.opponent;
  const player = match.player;

  return (
    <>
      <main
        className={`match-screen${state.mode === 'tutorial' ? ' tutorial-mode' : ''}`}
        data-tutorial-focus={state.tutorial ? tutorialSteps[state.tutorial.key].focus : undefined}
        style={{ '--motion-scale': match.animationScale } as CSSProperties}
      >
        <MatchTopbar
          roomCode={state.roomCode}
          turn={state.turn}
          myTurn={match.myTurn}
          opponentName={opponent.name}
          seconds={match.seconds}
          syncStatus={syncStatus}
          animationSpeed={match.animationSpeed}
          onAnimationSpeedChange={match.setAnimationSpeed}
          onOpenGlossary={() => match.setGlossaryOpen(true)}
          onExit={onExit}
        />
        {state.incident && <aside className="match-incident"><span>WEEKLY INCIDENT</span><b>{state.incident.name}</b><small>{state.incident.description}</small></aside>}

        <TurnBanner turn={state.turn} myTurn={match.myTurn} opponentName={opponent.name} animationScale={match.animationScale} />
        {state.tutorial && (
          <TutorialCoach
            tutorial={state.tutorial}
            pending={interactionPending}
            onContinue={() => { playSfx('command-execute'); void onAction({ type: 'CONTINUE_TUTORIAL' }); }}
            onExit={onExit}
          />
        )}
        <InteractionNotice message={match.interactionNotice} />
        <CombatFeedbackLayer state={state} animationScale={match.animationScale} />

        {match.showCardTip && state.mode !== 'tutorial' && <CardHelpTip onClose={() => match.setShowCardTip(false)} />}

        <section className="board" aria-label="Spielfeld">
          <div className="player-zone enemy-zone">
            <PlayerStrip
              player={opponent}
              enemy
              active={state.activePlayerId === opponent.id}
              targetable={match.canTargetCore(opponent.id)}
              onCore={() => match.target(`core:${opponent.id}`)}
            />
            <BattlefieldSide
              player={opponent}
              infrastructureTargetable={(entity) => match.canTargetEntity(entity, opponent.id, 'infrastructure')}
              serviceTargetable={(entity) => match.canTargetEntity(entity, opponent.id, 'services')}
              onTarget={match.target}
            />
          </div>

          <MatchCenter
            events={match.latestEvents}
            players={state.players}
            selection={match.selection}
            selectionMessage={match.selectionMessage}
            overclock={match.overclock}
            optionalTarget={match.optionalTarget}
            onOverclockChange={match.setOverclock}
            onPlayWithoutTarget={match.playWithoutTarget}
            onCancel={() => match.setSelection(null)}
          />

          <div className="player-zone own-zone">
            <BattlefieldSide
              player={player}
              infrastructureTargetable={(entity) => match.canTargetEntity(entity, player.id, 'infrastructure')}
              serviceTargetable={(entity) => match.canTargetEntity(entity, player.id, 'services')}
              onTarget={match.target}
              onServiceSelect={match.selectAttacker}
              selectedServiceId={match.selection?.kind === 'attacker' ? match.selection.id : undefined}
              infrastructureReplacementActive={match.selection?.kind === 'card'
                && match.selection.definition.type === 'infrastructure'
                && player.infrastructure.length >= 2}
            />
            <PlayerStrip
              player={player}
              active={match.myTurn}
              targetable={match.canTargetCore(player.id)}
              onCore={() => match.target(`core:${player.id}`)}
            />
          </div>
        </section>

        <HandDock
          state={state}
          player={player}
          selection={match.selection}
          myTurn={match.myTurn}
          pending={interactionPending}
          onSelectCard={match.selectHandCard}
          onDebug={(targetId) => onAction({ type: 'DEBUG', targetId })}
          onDecommission={() => { void match.decommission(); }}
          onEndTurn={() => { playSfx('command-execute'); void onAction({ type: 'END_TURN' }); }}
        />
      </main>
      <GlossaryModal open={match.glossaryOpen} onClose={() => match.setGlossaryOpen(false)} />
    </>
  );
}
