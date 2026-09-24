import { GameCard } from '../../cards';
import { cardById } from '../../../game/catalog';
import type { GameState } from '../../../game/types';
import type { MatchSelection } from '../model/types';

interface HandDockProps {
  player: GameState['players'][string];
  selection: MatchSelection;
  myTurn: boolean;
  pending: boolean;
  onSelectCard: (instanceId: string) => void;
  onDebug: (targetId: string) => void;
  onEndTurn: () => void;
}

export function HandDock({ player, selection, myTurn, pending, onSelectCard, onDebug, onEndTurn }: HandDockProps) {
  const availableCompute = (player.compute ?? 0) + (player.temporaryCompute ?? 0);
  const bug = player.services.find((service) => service.definitionId === 'token-bug');

  return (
    <section className="hand-dock">
      <div className="compute-orb">
        <b>{availableCompute}</b>
        <span>/{player.maxCompute} Compute</span>
      </div>
      <div className="hand">
        {player.hand.map((card) => {
          const definition = cardById.get(card.definitionId);
          const affordable = (definition?.cost ?? 99) <= availableCompute;

          return (
            <GameCard
              key={card.instanceId}
              card={card}
              selected={selection?.kind === 'card' && selection.id === card.instanceId}
              playable={myTurn && affordable}
              actionLabel="Karte auswählen"
              onClick={() => onSelectCard(card.instanceId)}
            />
          );
        })}
      </div>
      <div className="turn-actions">
        {bug && (
          <button
            type="button"
            disabled={!myTurn || pending || availableCompute < 1}
            onClick={() => onDebug(bug.instanceId)}
          >
            DEBUG · 1
          </button>
        )}
        <button className="end-turn" type="button" disabled={!myTurn || pending} onClick={onEndTurn}>Zug beenden</button>
      </div>
    </section>
  );
}
