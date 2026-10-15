interface ErrorToastProps {
  message: string;
  onClose: () => void;
}

export function ErrorToast({ message, onClose }: ErrorToastProps) {
  const { t } = useI18n();
  return (
    <div className="error-toast" role="alert">
      <span>{message}</span>
      <button type="button" onClick={onClose} aria-label={t('ui.error.close')}>×</button>
    </div>
  );
}
import { useI18n } from '../../i18n';
