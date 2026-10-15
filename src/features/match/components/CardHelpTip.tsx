import { useI18n } from '../../../i18n';

interface CardHelpTipProps {
  onClose: () => void;
}

export function CardHelpTip({ onClose }: CardHelpTipProps) {
  const { t } = useI18n();
  return (
    <aside className="card-help-tip" role="status">
      <div>
        <b>{t('match.tip')}</b>
        <span>{t('match.tip.text')}</span>
      </div>
      <button type="button" onClick={onClose} aria-label={t('match.tip.close')}>×</button>
    </aside>
  );
}
