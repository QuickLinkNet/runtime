import type { TutorialProgress } from '../../game/types';
import { Button } from '../../ui/atoms';
import { useI18n } from '../../i18n';

export function TutorialResult({ tutorial, onExit }: { tutorial: TutorialProgress; onExit: () => void }) {
  const { t } = useI18n();
  const [titleFirst, titleSecond] = t('tutorial.result.title').split('|');
  return (
    <main className="tutorial-result">
      <div className="tutorial-result-scan" aria-hidden="true" />
      <span className="eyebrow">{t('tutorial.result.eyebrow')}</span>
      <h1>{titleFirst}<br /><em>{titleSecond}</em></h1>
      <p>{t('tutorial.result.description')}</p>
      <div className="tutorial-reward">
        <span>{t('tutorial.result.bonus')}</span>
        <strong>{tutorial.rewardGranted ? t('tutorial.result.booster') : t('tutorial.result.completed')}</strong>
        <small>{tutorial.rewardGranted ? t('tutorial.result.boosterWaiting') : t('tutorial.result.rewardClaimed')}</small>
      </div>
      <Button variant="primary" onClick={onExit}>{t('tutorial.result.back')} <span aria-hidden="true">→</span></Button>
    </main>
  );
}
