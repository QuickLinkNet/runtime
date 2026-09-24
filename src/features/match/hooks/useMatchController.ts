import { useEffect, useMemo, useState } from 'react';
import { cardById } from '../../../game/catalog';
import type { BoardEntity, GameAction, GameState } from '../../../game/types';
import { canPlayWithoutTarget, canSelectAttacker, canTargetCore, canTargetEntity } from '../model/targeting';
import type { MatchSelection } from '../model/types';

interface UseMatchControllerOptions {
  state: GameState;
  pending: boolean;
  onAction: (action: GameAction) => Promise<void>;
}

export function useMatchController({ state, pending, onAction }: UseMatchControllerOptions) {
  const [selection, setSelection] = useState<MatchSelection>(null);
  const [mulligan, setMulligan] = useState<string[]>([]);
  const [overclock, setOverclock] = useState(false);
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [showCardTip, setShowCardTip] = useState(() => localStorage.getItem('runtime.cardHelpSeen') !== '1');
  const [now, setNow] = useState(Date.now());

  const player = state.players[state.viewerId];
  const opponentId = state.order.find((id) => id !== state.viewerId);
  const opponent = opponentId ? state.players[opponentId] : undefined;
  const myTurn = state.activePlayerId === state.viewerId;
  const seconds = state.turnDeadlineAt
    ? Math.max(0, Math.ceil((new Date(state.turnDeadlineAt).getTime() - now) / 1000))
    : null;
  const latestEvents = useMemo(() => state.events.slice(-4).reverse(), [state.events]);
  const optionalTarget = canPlayWithoutTarget(selection, player, opponent);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setSelection(null);
    setOverclock(false);
  }, [state.turn, state.status]);

  useEffect(() => {
    if (state.status === 'active' && showCardTip) localStorage.setItem('runtime.cardHelpSeen', '1');
  }, [showCardTip, state.status]);

  function toggleMulligan(instanceId: string) {
    setMulligan((items) => items.includes(instanceId)
      ? items.filter((id) => id !== instanceId)
      : [...items, instanceId]);
  }

  function selectHandCard(instanceId: string) {
    if (!myTurn || pending) return;
    const card = player.hand.find((item) => item.instanceId === instanceId);
    const definition = card ? cardById.get(card.definitionId) : undefined;
    if (definition) setSelection({ kind: 'card', id: instanceId, definition });
  }

  function selectAttacker(entity: BoardEntity) {
    if (myTurn && canSelectAttacker(entity)) setSelection({ kind: 'attacker', id: entity.instanceId });
  }

  async function target(id: string) {
    if (!selection || pending || !myTurn) return;
    if (selection.kind === 'attacker') {
      await onAction({ type: 'ATTACK', attackerId: selection.id, targetId: id });
    } else {
      await onAction({ type: 'PLAY_CARD', cardInstanceId: selection.id, targetId: id, overclock });
    }
    setSelection(null);
  }

  async function playWithoutTarget() {
    if (selection?.kind !== 'card') return;
    await onAction({ type: 'PLAY_CARD', cardInstanceId: selection.id, overclock });
    setSelection(null);
  }

  return {
    player,
    opponent,
    myTurn,
    seconds,
    latestEvents,
    selection,
    mulligan,
    overclock,
    glossaryOpen,
    showCardTip,
    optionalTarget,
    setOverclock,
    setGlossaryOpen,
    setShowCardTip,
    setSelection,
    toggleMulligan,
    selectHandCard,
    selectAttacker,
    target,
    playWithoutTarget,
    canTargetEntity: (entity: BoardEntity, ownerId: string, zone: 'services' | 'infrastructure') => (
      canTargetEntity(selection, state.viewerId, entity, ownerId, zone)
    ),
    canTargetCore: (ownerId: string) => canTargetCore(selection, state, ownerId),
  };
}
