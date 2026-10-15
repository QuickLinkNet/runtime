import type { TutorialProgress } from '../../game/types';
import { tutorialSteps } from './tutorialSteps';
import { useI18n } from '../../i18n';

interface TutorialCoachProps {
  tutorial: TutorialProgress;
  pending: boolean;
  onContinue: () => void;
  onExit: () => void;
}

export function TutorialCoach({ tutorial, pending, onContinue, onExit }: TutorialCoachProps) {
  const { t } = useI18n();
  const step = tutorialSteps[tutorial.key];
  return (
    <aside className={`tutorial-coach${tutorial.objectiveComplete ? ' is-complete' : ''}`} aria-live="polite">
      <div className="tutorial-coach-progress">
        <span>{step.eyebrow}</span>
        <b>{tutorial.step + 1}/{tutorial.totalSteps}</b>
      </div>
      <h2>{tutorial.objectiveComplete ? t('tutorial.goalReached') : step.title}</h2>
      <p>{tutorial.objectiveComplete ? step.success : step.instruction}</p>
      <strong>{tutorial.objectiveComplete ? t('tutorial.completedHint') : step.objective}</strong>
      <div className="tutorial-coach-actions">
        <button type="button" className="tutorial-skip" onClick={onExit}>{t('tutorial.exit')}</button>
        {tutorial.objectiveComplete && !tutorial.completed && (
          <button type="button" className="tutorial-next" disabled={pending} onClick={onContinue}>
            {t('tutorial.next')} <span aria-hidden="true">→</span>
          </button>
        )}
      </div>
    </aside>
  );
}
