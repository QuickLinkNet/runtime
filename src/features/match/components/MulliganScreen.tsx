import { GameCard } from '../../cards';
import type { PlayerView } from '../../../game/types';
import { Button } from '../../../ui/atoms';

interface MulliganScreenProps {
  player: PlayerView;
  pending: boolean;
  selectedIds: string[];
  onToggle: (instanceId: string) => void;
  onSubmit: () => void;
}

export function MulliganScreen({ player, pending, selectedIds, onToggle, onSubmit }: MulliganScreenProps) {
  return (
    <main className="screen mulligan-screen">
      <span className="eyebrow">STARTSEQUENZ</span>
      <h1>Initialisierung</h1>
      <p>Wähle beliebig viele Karten, die du ersetzen möchtest.</p>
      <div className="mulligan-cards">
        {player.hand.map((card) => (
          <GameCard
            key={card.instanceId}
            card={card}
            selected={selectedIds.includes(card.instanceId)}
            actionLabel="Auswahl umschalten"
            onClick={() => onToggle(card.instanceId)}
          />
        ))}
      </div>
      <Button variant="primary" disabled={pending || player.mulliganDone === true} onClick={onSubmit}>
        {player.mulliganDone ? 'Warte auf Gegenspieler …' : `${selectedIds.length || 'Keine'} ersetzen`}
      </Button>
    </main>
  );
}
