import type { BoardEntity, PlayerView } from '../../../game/types';
import { BoardRow } from './BoardRow';

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
  return (
    <div className="battlefield-side">
      <section className={`battlefield-lane infrastructure-lane${infrastructureReplacementActive ? ' is-replacing' : ''}`} aria-label="Infrastructure-Bereich">
        <span className="battlefield-lane-label">
          {infrastructureReplacementActive ? 'AUSTAUSCH · KARTE WÄHLEN' : 'INFRASTRUCTURE · 2 SLOTS'}
        </span>
        <BoardRow
          kind="infrastructure"
          entities={player.infrastructure}
          targetable={infrastructureTargetable}
          onTarget={onTarget}
          targetActionLabel={infrastructureReplacementActive ? 'Diese Infrastructure ersetzen' : undefined}
        />
      </section>
      <section className="battlefield-lane service-lane" aria-label="Service-Bereich">
        <span className="battlefield-lane-label">SERVICES · 5 SLOTS</span>
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
