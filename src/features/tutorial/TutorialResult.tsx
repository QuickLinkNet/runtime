import type { TutorialProgress } from '../../game/types';
import { Button } from '../../ui/atoms';

export function TutorialResult({ tutorial, onExit }: { tutorial: TutorialProgress; onExit: () => void }) {
  return (
    <main className="tutorial-result">
      <div className="tutorial-result-scan" aria-hidden="true" />
      <span className="eyebrow">TRAINING COMPLETE · 08/08</span>
      <h1>READY FOR<br /><em>PRODUCTION.</em></h1>
      <p>Du hast Services deployed, Infrastructure verwaltet, BUGs debuggt und den gegnerischen Core heruntergefahren.</p>
      <div className="tutorial-reward">
        <span>ABSCHLUSSBONUS</span>
        <strong>{tutorial.rewardGranted ? '+1 Booster' : 'Tutorial abgeschlossen'}</strong>
        <small>{tutorial.rewardGranted ? 'Dein Booster wartet im Lab.' : 'Die einmalige Belohnung wurde bereits abgeholt.'}</small>
      </div>
      <Button variant="primary" onClick={onExit}>Zur Kommandozentrale <span aria-hidden="true">→</span></Button>
    </main>
  );
}
