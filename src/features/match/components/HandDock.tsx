import type { CSSProperties } from 'react';
import { GameCard } from '../../cards';
import { cardById } from '../../../game/catalog';
import type { GameState } from '../../../game/types';
import type { MatchSelection } from '../model/types';
import { knownCardCost } from '../model/cardCost';
import { tutorialAllowsAction, tutorialAllowsCard } from '../../tutorial/tutorialSteps';

interface HandDockProps {
  state: GameState;
  player: GameState['players'][string];
  selection: MatchSelection;
  myTurn: boolean;
  pending: boolean;
  onSelectCard: (instanceId: string) => void;
  onDebug: (targetId: string) => void;
  onDecommission: () => void;
  onEndTurn: () => void;
}

export function HandDock({ state, player, selection, myTurn, pending, onSelectCard, onDebug, onDecommission, onEndTurn }: HandDockProps) {
  const availableCompute = (player.compute ?? 0) + (player.temporaryCompute ?? 0);
  const bug = player.services.find((service) => service.definitionId === 'token-bug');
  const selectedInfrastructure = selection?.kind === 'card' && selection.definition.type === 'infrastructure';

  return (
    <section className="hand-dock">
      <div className="compute-orb">
        <b>{availableCompute}</b>
        <span>/{player.maxCompute} Compute</span>
      </div>
      <div className="hand">
        {player.hand.map((card, index) => {
          const definition = cardById.get(card.definitionId);
          const effectiveCost = definition ? knownCardCost(state, card, definition) : 99;
          const affordable = effectiveCost <= availableCompute;
          const tutorialPlayable = !state.tutorial || tutorialAllowsCard(state, card.definitionId);
          const center = (player.hand.length - 1) / 2;
          const distance = index - center;
          const handStyle = {
            '--hand-rotation': `${distance * 2.2}deg`,
            '--hand-rise': `${Math.abs(distance) * 3}px`,
            '--hand-order': index + 1,
          } as CSSProperties;

          return (
            <GameCard
              key={card.instanceId}
              card={card}
              selected={selection?.kind === 'card' && selection.id === card.instanceId}
              playable={myTurn && affordable && tutorialPlayable}
              displayCost={effectiveCost}
              style={handStyle}
              actionLabel="Karte auswählen"
              onClick={() => onSelectCard(card.instanceId)}
            />
          );
        })}
      </div>
      <div className="turn-actions">
        {selectedInfrastructure && (
          <button type="button" disabled={!myTurn || pending || !player.canDecommission || state.mode === 'tutorial'} onClick={onDecommission}>
            Dekommissionieren · Ziehe 1
          </button>
        )}
        {bug && (
          <button
            type="button"
            disabled={!myTurn || pending || availableCompute < 1 || (state.tutorial !== undefined
              && !tutorialAllowsAction(state, { type: 'DEBUG', targetId: bug.instanceId }))}
            onClick={() => onDebug(bug.instanceId)}
          >
            DEBUG · 1
          </button>
        )}
        <span className="hand-limit">Hand {player.hand.length}/10</span>
        <button className="end-turn" type="button" disabled={!myTurn || pending || state.mode === 'tutorial'} onClick={onEndTurn}>Zug beenden</button>
      </div>
    </section>
  );
}
