import { useI18n } from '../../i18n';

interface PlayerSlotProps {
  name?: string;
  label: string;
  waiting?: boolean;
}

export function PlayerSlot({ name, label, waiting }: PlayerSlotProps) {
  const { t } = useI18n();
  return (
    <div className={waiting ? 'player-slot waiting' : 'player-slot'}>
      <span>{label}</span>
      <div className="avatar">{name?.slice(0, 2).toUpperCase() ?? '··'}</div>
      <b>{name ?? t('ui.playerSlot.disconnected')}</b>
      <small>{t(waiting ? 'ui.playerSlot.waiting' : 'ui.playerSlot.ready')}</small>
    </div>
  );
}
