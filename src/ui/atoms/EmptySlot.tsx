interface EmptySlotProps {
  kind: 'service' | 'infrastructure';
}

export function EmptySlot({ kind }: EmptySlotProps) {
  const label = kind === 'service' ? 'Service' : 'Infrastructure';

  return (
    <div className="empty-slot" aria-label={`Leerer ${label}-Slot`}>
      <span aria-hidden="true">{kind === 'service' ? 'S' : 'I'}</span>
    </div>
  );
}
