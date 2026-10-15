import { useI18n } from '../../i18n';

interface EmptySlotProps {
  kind: 'service' | 'infrastructure';
}

export function EmptySlot({ kind }: EmptySlotProps) {
  const { t } = useI18n();
  const label = t(kind === 'service' ? 'type.service' : 'type.infrastructure');

  return (
    <div className="empty-slot" aria-label={t('ui.emptySlot', { label })}>
      <span aria-hidden="true">{kind === 'service' ? 'S' : 'I'}</span>
    </div>
  );
}
