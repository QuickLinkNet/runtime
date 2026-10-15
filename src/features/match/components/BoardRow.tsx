import { GameCard } from '../../cards';
import { EmptySlot } from '../../../ui/atoms';
import type { BoardEntity, GameState } from '../../../game/types';
import { useI18n } from '../../../i18n';

interface BoardRowProps {
  entities: GameState['players'][string]['services'];
  kind: 'service' | 'infrastructure';
  targetable: (entity: BoardEntity) => boolean;
  onTarget: (id: string) => void;
  onSelect?: (entity: BoardEntity) => void;
  selectedId?: string;
  targetActionLabel?: string;
}

export function BoardRow({ entities, kind, targetable, onTarget, onSelect, selectedId, targetActionLabel }: BoardRowProps) {
  const { t } = useI18n();
  const slots = kind === 'service' ? 5 : 2;
  const label = kind === 'service' ? t('common.services') : t('common.infrastructure');

  return (
    <div className={`board-row ${kind === 'infrastructure' ? 'infra-row' : ''}`} aria-label={label}>
      {Array.from({ length: slots }, (_, index) => {
        const entity = entities[index];

        if (!entity) return <EmptySlot kind={kind} key={index} />;

        const validTarget = targetable(entity);
        const cardAction = validTarget
          ? () => onTarget(entity.instanceId)
          : onSelect
            ? () => onSelect(entity)
            : undefined;

        return (
          <GameCard
            key={entity.instanceId}
            card={entity}
            compact
            selected={selectedId === entity.instanceId}
            targetable={validTarget}
            combatId={entity.instanceId}
            actionLabel={validTarget ? (targetActionLabel ?? t('match.chooseTarget')) : t('match.selectService')}
            onClick={cardAction}
          />
        );
      })}
    </div>
  );
}
