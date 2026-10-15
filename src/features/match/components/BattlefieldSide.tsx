import type { BoardEntity, PlayerView } from '../../../game/types';
import { BoardRow } from './BoardRow';
import { useI18n } from '../../../i18n';

interface BattlefieldSideProps {
  player: PlayerView;
  infrastructureTargetable: (entity: BoardEntity) => boolean;
  serviceTargetable: (entity: BoardEntity) => boolean;
  onTarget: (id: string) => void;
  onServiceSelect?: (entity: BoardEntity) => void;
  selectedServiceId?: string;
  infrastructureReplacementActive?: boolean;
}

export function BattlefieldSide({
  player,
  infrastructureTargetable,
  serviceTargetable,
  onTarget,
  onServiceSelect,
  selectedServiceId,
  infrastructureReplacementActive = false,
}: BattlefieldSideProps) {
  const { t } = useI18n();
  return (
    <div className="battlefield-side">
      <section className={`battlefield-lane infrastructure-lane${infrastructureReplacementActive ? ' is-replacing' : ''}`} aria-label={t('match.infrastructureArea')}>
        <span className="battlefield-lane-label">
          {infrastructureReplacementActive ? t('match.replaceChoose') : t('match.infrastructureSlots')}
        </span>
        <BoardRow
          kind="infrastructure"
          entities={player.infrastructure}
          targetable={infrastructureTargetable}
          onTarget={onTarget}
          targetActionLabel={infrastructureReplacementActive ? t('match.replaceInfrastructure') : undefined}
        />
      </section>
      <section className="battlefield-lane service-lane" aria-label={t('match.servicesArea')}>
        <span className="battlefield-lane-label">{t('match.serviceSlots')}</span>
        <BoardRow
          kind="service"
          entities={player.services}
          targetable={serviceTargetable}
          onTarget={onTarget}
          onSelect={onServiceSelect}
          selectedId={selectedServiceId}
        />
      </section>
    </div>
  );
}
