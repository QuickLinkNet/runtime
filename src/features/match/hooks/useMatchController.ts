import { useEffect, useMemo, useState } from 'react';
import { cardById } from '../../../game/catalog';
import type { BoardEntity, GameAction, GameState } from '../../../game/types';
import { knownCardCost } from '../model/cardCost';
import { canPlayIntoServiceBoard, canPlayWithoutTarget, canSelectAttacker, canTargetCore, canTargetEntity, selectionPrompt } from '../model/targeting';
import type { MatchSelection } from '../model/types';
import { animationSpeedScale, storedAnimationSpeed, type AnimationSpeed } from '../model/animationSpeed';
import { cardPlaySfx, playSfx } from '../../../audio/sfx';
import { tutorialAllowsAction, tutorialAllowsCard, tutorialSteps } from '../../tutorial/tutorialSteps';
import { useI18n } from '../../../i18n';

interface UseMatchControllerOptions {
  state: GameState;
  pending: boolean;
  onAction: (action: GameAction) => Promise<void>;
}

export function useMatchController({ state, pending, onAction }: UseMatchControllerOptions) {
  const { t } = useI18n();
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
    playSfx('card-select');
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
      playSfx('ui-error');
      setInteractionNotice(t('match.notice.waitTurn'));
      return;
    }
    if (pending) {
      playSfx('ui-error');
      setInteractionNotice(t('match.notice.pending'));
      return;
    }
    const card = player.hand.find((item) => item.instanceId === instanceId);
    const definition = card ? cardById.get(card.definitionId) : undefined;
    if (card && definition) {
      if (state.tutorial && !tutorialAllowsCard(state, definition.id)) {
        playSfx('ui-error');
        setInteractionNotice(tutorialSteps[state.tutorial.key].objective);
        return;
      }
      const availableCompute = (player.compute ?? 0) + (player.temporaryCompute ?? 0);
      const effectiveCost = knownCardCost(state, card, definition);
      if (effectiveCost > availableCompute) {
        playSfx('ui-error');
        setInteractionNotice(t('match.notice.compute', { name: definition.name, cost: effectiveCost, available: availableCompute }));
        return;
      }
      if (!canPlayIntoServiceBoard(definition, player)) {
        playSfx('ui-error');
        setInteractionNotice(definition.type === 'service'
          ? t('match.notice.noServiceSlot')
          : t('match.notice.effectNoServiceSlot'));
        return;
      }
      playSfx('card-select');
      setSelection({ kind: 'card', id: instanceId, definition });
      if (definition.type === 'infrastructure' && player.infrastructure.length >= 2) {
        setInteractionNotice(t('match.notice.infrastructureFull'));
      } else {
        setInteractionNotice(t('match.notice.selected', { name: definition.name }));
      }
    }
  }

  function selectAttacker(entity: BoardEntity) {
    if (!myTurn) {
      playSfx('ui-error');
      setInteractionNotice(t('match.notice.attackOwnTurn'));
      return;
    }
    const definition = cardById.get(entity.definitionId);
    if (state.tutorial) {
      const expectedDefinition = state.tutorial.key === 'crash-service' ? 'infrastructure-chaos-monkey' : undefined;
      if (!['attack-core', 'crash-service', 'final-deploy'].includes(state.tutorial.key)
        || (expectedDefinition && definition?.id !== expectedDefinition)) {
        playSfx('ui-error');
        setInteractionNotice(tutorialSteps[state.tutorial.key].objective);
        return;
      }
    }
    if (entity.exhausted) { playSfx('ui-error'); setInteractionNotice(t('match.notice.exhausted')); }
    else if (entity.sandboxed) { playSfx('ui-error'); setInteractionNotice(t('match.notice.sandboxed')); }
    else if (definition?.cannotAttack) { playSfx('ui-error'); setInteractionNotice(t('match.notice.cannotAttack')); }
    else if (canSelectAttacker(entity)) {
      playSfx('card-select');
      setSelection({ kind: 'attacker', id: entity.instanceId });
      setInteractionNotice(t('match.notice.attackReady', { name: definition?.name ?? t('match.notice.serviceFallback') }));
    }
  }

  async function target(id: string) {
    if (!selection || pending || !myTurn) return;
    if (selection.kind === 'attacker') {
      const action: GameAction = { type: 'ATTACK', attackerId: selection.id, targetId: id };
      if (state.tutorial && !tutorialAllowsAction(state, action)) {
        playSfx('ui-error'); setInteractionNotice(tutorialSteps[state.tutorial.key].objective); return;
      }
      await onAction(action);
    } else {
      const action: GameAction = { type: 'PLAY_CARD', cardInstanceId: selection.id, targetId: id, overclock };
      if (state.tutorial && !tutorialAllowsAction(state, action)) {
        playSfx('ui-error'); setInteractionNotice(tutorialSteps[state.tutorial.key].objective); return;
      }
      await onAction(action);
      cardPlaySfx(selection.definition.type);
    }
    setSelection(null);
  }

  async function playWithoutTarget() {
    if (selection?.kind !== 'card') return;
    const action: GameAction = { type: 'PLAY_CARD', cardInstanceId: selection.id, overclock };
    if (state.tutorial && !tutorialAllowsAction(state, action)) {
      playSfx('ui-error'); setInteractionNotice(tutorialSteps[state.tutorial.key].objective); return;
    }
    await onAction(action);
    cardPlaySfx(selection.definition.type);
    setSelection(null);
  }

  async function decommission() {
    if (selection?.kind !== 'card' || selection.definition.type !== 'infrastructure') return;
    if (!player.canDecommission || pending || !myTurn) return;
    await onAction({ type: 'DECOMMISSION', cardInstanceId: selection.id });
    playSfx('infrastructure-deploy');
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
    decommission,
    canTargetEntity: (entity: BoardEntity, ownerId: string, zone: 'services' | 'infrastructure') => {
      if (!canTargetEntity(selection, state.viewerId, entity, ownerId, zone, state.turn)) return false;
      if (!state.tutorial || !selection) return true;
      const action: GameAction = selection.kind === 'attacker'
        ? { type: 'ATTACK', attackerId: selection.id, targetId: entity.instanceId }
        : { type: 'PLAY_CARD', cardInstanceId: selection.id, targetId: entity.instanceId, overclock };
      return tutorialAllowsAction(state, action);
    },
    canTargetCore: (ownerId: string) => {
      if (!canTargetCore(selection, state, ownerId)) return false;
      if (!state.tutorial || selection?.kind !== 'attacker') return true;
      return tutorialAllowsAction(state, { type: 'ATTACK', attackerId: selection.id, targetId: `core:${ownerId}` });
    },
  };
}
