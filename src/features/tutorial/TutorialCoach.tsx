import type { TutorialProgress } from '../../game/types';
import { tutorialSteps } from './tutorialSteps';

interface TutorialCoachProps {
  tutorial: TutorialProgress;
  pending: boolean;
  onContinue: () => void;
  onExit: () => void;
}

export function TutorialCoach({ tutorial, pending, onContinue, onExit }: TutorialCoachProps) {
  const step = tutorialSteps[tutorial.key];
  return (
    <aside className={`tutorial-coach${tutorial.objectiveComplete ? ' is-complete' : ''}`} aria-live="polite">
      <div className="tutorial-coach-progress">
        <span>{step.eyebrow}</span>
        <b>{tutorial.step + 1}/{tutorial.totalSteps}</b>
      </div>
      <h2>{tutorial.objectiveComplete ? 'Ziel erreicht' : step.title}</h2>
      <p>{tutorial.objectiveComplete ? step.success : step.instruction}</p>
      <strong>{tutorial.objectiveComplete ? 'Lektionen werden als echte Spielsituationen geladen.' : step.objective}</strong>
      <div className="tutorial-coach-actions">
        <button type="button" className="tutorial-skip" onClick={onExit}>Tutorial verlassen</button>
        {tutorial.objectiveComplete && !tutorial.completed && (
          <button type="button" className="tutorial-next" disabled={pending} onClick={onContinue}>
            Nächste Lektion <span aria-hidden="true">→</span>
          </button>
        )}
      </div>
    </aside>
  );
}
