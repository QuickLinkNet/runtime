import { useEffect, useMemo, useState } from 'react';
import { cardById } from '../../../game/catalog';
import type { BoardEntity, GameAction, GameState } from '../../../game/types';
import { knownCardCost } from '../model/cardCost';
import { canPlayWithoutTarget, canSelectAttacker, canTargetCore, canTargetEntity, selectionPrompt } from '../model/targeting';
import type { MatchSelection } from '../model/types';
import { animationSpeedScale, storedAnimationSpeed, type AnimationSpeed } from '../model/animationSpeed';

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
  const [interactionNotice, setInteractionNotice] = useState<string | null>(null);
  const [animationSpeed, setAnimationSpeedState] = useState<AnimationSpeed>(storedAnimationSpeed);
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
  const selectionMessage = selectionPrompt(selection, player);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setSelection(null);
    setOverclock(false);
  }, [state.turn, state.status]);

  useEffect(() => {
    if (!interactionNotice) return;
    const timer = window.setTimeout(() => setInteractionNotice(null), 2200);
    return () => window.clearTimeout(timer);
  }, [interactionNotice]);

  useEffect(() => {
    if (state.status === 'active' && showCardTip) localStorage.setItem('runtime.cardHelpSeen', '1');
  }, [showCardTip, state.status]);

  function toggleMulligan(instanceId: string) {
    setMulligan((items) => items.includes(instanceId)
      ? items.filter((id) => id !== instanceId)
      : [...items, instanceId]);
  }

  function setAnimationSpeed(value: AnimationSpeed) {
    localStorage.setItem('runtime.animationSpeed', value);
    setAnimationSpeedState(value);
  }

  function selectHandCard(instanceId: string) {
    if (!myTurn) {
      setInteractionNotice('Warte auf deinen Zug.');
      return;
    }
    if (pending) {
      setInteractionNotice('Die vorherige Aktion wird noch verarbeitet.');
      return;
    }
    const card = player.hand.find((item) => item.instanceId === instanceId);
    const definition = card ? cardById.get(card.definitionId) : undefined;
    if (card && definition) {
      const availableCompute = (player.compute ?? 0) + (player.temporaryCompute ?? 0);
      const effectiveCost = knownCardCost(state, card, definition);
      if (effectiveCost > availableCompute) {
        setInteractionNotice(`${definition.name} braucht ${effectiveCost} Compute. Du hast ${availableCompute}.`);
        return;
      }
      setSelection({ kind: 'card', id: instanceId, definition });
      setInteractionNotice(`${definition.name} ausgewählt.`);
    }
  }

  function selectAttacker(entity: BoardEntity) {
    if (!myTurn) {
      setInteractionNotice('Angreifen kannst du nur in deinem Zug.');
      return;
    }
    const definition = cardById.get(entity.definitionId);
    if (entity.exhausted) setInteractionNotice('Dieser Service ist noch erschöpft.');
    else if (entity.sandboxed) setInteractionNotice('Dieser Service befindet sich in der Sandbox.');
    else if (definition?.cannotAttack) setInteractionNotice('Dieser Service kann nicht angreifen.');
    else if (canSelectAttacker(entity)) {
      setSelection({ kind: 'attacker', id: entity.instanceId });
      setInteractionNotice(`${definition?.name ?? 'Service'} ist angriffsbereit.`);
    }
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
    interactionNotice,
    selectionMessage,
    animationSpeed,
    animationScale: animationSpeedScale[animationSpeed],
    setOverclock,
    setGlossaryOpen,
    setShowCardTip,
    setSelection,
    setAnimationSpeed,
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
