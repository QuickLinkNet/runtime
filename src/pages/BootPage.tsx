import { useI18n } from '../i18n';

export function BootPage() {
  const { t } = useI18n();
  return (
    <main className="boot-screen">
      <div className="boot-logo">RUNTIME<span>_</span></div>
      <div className="boot-line"><i /></div>
      <p>{t('boot.initializing')}</p>
    </main>
  );
}
