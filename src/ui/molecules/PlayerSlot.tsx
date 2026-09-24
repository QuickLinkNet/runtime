interface PlayerSlotProps {
  name?: string;
  label: string;
  waiting?: boolean;
}

export function PlayerSlot({ name, label, waiting }: PlayerSlotProps) {
  return (
    <div className={waiting ? 'player-slot waiting' : 'player-slot'}>
      <span>{label}</span>
      <div className="avatar">{name?.slice(0, 2).toUpperCase() ?? '··'}</div>
      <b>{name ?? 'Nicht verbunden'}</b>
      <small>{waiting ? 'Verbindung ausstehend' : 'Bereit'}</small>
    </div>
  );
}
