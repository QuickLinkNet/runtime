import { Button } from '../ui/atoms';
import { useI18n } from '../i18n';

interface TutorialIntroPageProps {
  completed: boolean;
  pending: boolean;
  onStart: () => void;
  onBack: () => void;
}

export function TutorialIntroPage({ completed, pending, onStart, onBack }: TutorialIntroPageProps) {
  const { t } = useI18n();
  const modules = ['deploy', 'defend', 'debug', 'ship'].map((key, index) => [String(index + 1).padStart(2, '0'), t(`tutorial.module.${key}.title`), t(`tutorial.module.${key}.body`)]);
  return (
    <main className="tutorial-intro-screen">
      <header className="tutorial-intro-header">
        <div className="brand-small">RUNTIME<span>_</span></div>
        <span>{t('tutorial.sequence')}</span>
      </header>
      <section className="tutorial-intro-copy">
        <span className="eyebrow">{t(completed ? 'tutorial.replayEyebrow' : 'tutorial.firstEyebrow')}</span>
        <h1>{t('tutorial.titleStart')}<br />{t('tutorial.titleEnd')} <em>{t('tutorial.production')}</em></h1>
        <p>{t('tutorial.intro')}</p>
        <div className="tutorial-intro-actions">
          <Button variant="primary" disabled={pending} onClick={onStart}>
            {t(pending ? 'tutorial.loading' : completed ? 'tutorial.replay' : 'tutorial.start')} <span aria-hidden="true">→</span>
          </Button>
          <Button variant="ghost" onClick={onBack}>{t(completed ? 'common.back' : 'tutorial.skip')}</Button>
        </div>
        {!completed && <small>{t('tutorial.reward')}</small>}
      </section>
      <section className="tutorial-module-list" aria-label={t('tutorial.contentsAria')}>
        {modules.map(([number, title, description]) => (
          <article key={number}>
            <span>{number}</span>
            <div><strong>{title}</strong><p>{description}</p></div>
          </article>
        ))}
      </section>
      <footer className="tutorial-intro-footer"><span>{t('tutorial.serverAuthoritative')}</span><span>{t('tutorial.duration')}</span></footer>
    </main>
  );
}
