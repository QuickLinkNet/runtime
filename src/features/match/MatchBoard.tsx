import { GlossaryModal } from '../cards';
import type { GameAction, GameState } from '../../game/types';
import { BoardRow } from './components/BoardRow';
import { CardHelpTip } from './components/CardHelpTip';
import { HandDock } from './components/HandDock';
import { MatchCenter } from './components/MatchCenter';
import { MatchResult } from './components/MatchResult';
import { MatchTopbar } from './components/MatchTopbar';
import { MulliganScreen } from './components/MulliganScreen';
import { PlayerStrip } from './components/PlayerStrip';
import { WaitingLobby } from './components/WaitingLobby';
import { useMatchController } from './hooks/useMatchController';
import { eventLabel } from './model/eventLabels';

interface MatchBoardProps {
  state: GameState;
  pending: boolean;
  onAction: (action: GameAction) => Promise<void>;
  onExit: () => void;
}

export function MatchBoard({ state, pending, onAction, onExit }: MatchBoardProps) {
  const match = useMatchController({ state, pending, onAction });

  if (!match.opponent) {
    return <WaitingLobby state={state} pending={pending} onExit={onExit} />;
  }

  if (state.status === 'mulligan') {
    return (
      <MulliganScreen
        player={match.player}
        pending={pending}
        selectedIds={match.mulligan}
        onToggle={match.toggleMulligan}
        onSubmit={() => onAction({ type: 'MULLIGAN', cardInstanceIds: match.mulligan })}
      />
    );
  }

  if (state.status === 'finished') {
    return (
      <MatchResult
        player={match.player}
        opponent={match.opponent}
        won={state.winnerId === state.viewerId}
        onExit={onExit}
      />
    );
  }

  const opponent = match.opponent;
  const player = match.player;

  return (
    <>
      <main className="match-screen">
        <MatchTopbar
          roomCode={state.roomCode}
          turn={state.turn}
          myTurn={match.myTurn}
          opponentName={opponent.name}
          seconds={match.seconds}
          onOpenGlossary={() => match.setGlossaryOpen(true)}
          onExit={onExit}
        />

        {match.showCardTip && <CardHelpTip onClose={() => match.setShowCardTip(false)} />}

        <section className="board" aria-label="Spielfeld">
          <div className="player-zone enemy-zone">
            <PlayerStrip
              player={opponent}
              enemy
              active={state.activePlayerId === opponent.id}
              targetable={match.canTargetCore(opponent.id)}
              onCore={() => match.target(`core:${opponent.id}`)}
            />
            <div className="battlefield-side">
              <BoardRow
                kind="infrastructure"
                entities={opponent.infrastructure}
                targetable={(entity) => match.canTargetEntity(entity, opponent.id, 'infrastructure')}
                onTarget={match.target}
              />
              <BoardRow
                kind="service"
                entities={opponent.services}
                targetable={(entity) => match.canTargetEntity(entity, opponent.id, 'services')}
                onTarget={match.target}
              />
            </div>
          </div>

          <MatchCenter
            events={match.latestEvents}
            selection={match.selection}
            overclock={match.overclock}
            optionalTarget={match.optionalTarget}
            onOverclockChange={match.setOverclock}
            onPlayWithoutTarget={match.playWithoutTarget}
            onCancel={() => match.setSelection(null)}
            getEventLabel={eventLabel}
          />

          <div className="player-zone own-zone">
            <div className="battlefield-side">
              <BoardRow
                kind="service"
                entities={player.services}
                targetable={(entity) => match.canTargetEntity(entity, player.id, 'services')}
                onTarget={match.target}
                onSelect={match.selectAttacker}
                selectedId={match.selection?.kind === 'attacker' ? match.selection.id : undefined}
              />
              <BoardRow
                kind="infrastructure"
                entities={player.infrastructure}
                targetable={(entity) => match.canTargetEntity(entity, player.id, 'infrastructure')}
                onTarget={match.target}
              />
            </div>
            <PlayerStrip
              player={player}
              active={match.myTurn}
              targetable={match.canTargetCore(player.id)}
              onCore={() => match.target(`core:${player.id}`)}
            />
          </div>
        </section>

        <HandDock
          player={player}
          selection={match.selection}
          myTurn={match.myTurn}
          pending={pending}
          onSelectCard={match.selectHandCard}
          onDebug={(targetId) => onAction({ type: 'DEBUG', targetId })}
          onEndTurn={() => onAction({ type: 'END_TURN' })}
        />
      </main>
      <GlossaryModal open={match.glossaryOpen} onClose={() => match.setGlossaryOpen(false)} />
    </>
  );
}
