import type { GameEvent, PlayerView } from '../../../game/types';
import type { MatchSelection } from '../model/types';
import { MatchEventFeed } from './MatchEventFeed';
import { SelectionPrompt } from './SelectionPrompt';

interface MatchCenterProps {
  events: GameEvent[];
  players: Record<string, PlayerView>;
  selection: MatchSelection;
  selectionMessage: string;
  overclock: boolean;
  optionalTarget: boolean;
  onOverclockChange: (value: boolean) => void;
  onPlayWithoutTarget: () => void;
  onCancel: () => void;
}

export function MatchCenter({ events, players, selection, selectionMessage, overclock, optionalTarget, onOverclockChange, onPlayWithoutTarget, onCancel }: MatchCenterProps) {
  return (
    <div className="board-center">
      <MatchEventFeed events={events} players={players} />
      {selection && (
        <SelectionPrompt
          selection={selection}
          message={selectionMessage}
          overclock={overclock}
          optionalTarget={optionalTarget}
          onOverclockChange={onOverclockChange}
          onPlayWithoutTarget={onPlayWithoutTarget}
          onCancel={onCancel}
        />
      )}
    </div>
  );
}
