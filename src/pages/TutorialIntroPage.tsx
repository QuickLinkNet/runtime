import { Button } from '../ui/atoms';

interface TutorialIntroPageProps {
  completed: boolean;
  pending: boolean;
  onStart: () => void;
  onBack: () => void;
}

const modules = [
  ['01', 'DEPLOY', 'Compute einsetzen und Services bereitstellen'],
  ['02', 'DEFEND', 'Infrastructure, BUGs und PATCH verstehen'],
  ['03', 'DEBUG', 'Kämpfen, crashen und Slots verwalten'],
  ['04', 'SHIP', 'Den gegnerischen Core herunterfahren'],
];

export function TutorialIntroPage({ completed, pending, onStart, onBack }: TutorialIntroPageProps) {
  return (
    <main className="tutorial-intro-screen">
      <header className="tutorial-intro-header">
        <div className="brand-small">RUNTIME<span>_</span></div>
        <span>GUIDED BOOT SEQUENCE · 08 MODULES</span>
      </header>
      <section className="tutorial-intro-copy">
        <span className="eyebrow">{completed ? 'TRAINING REPLAY' : 'FIRST DEPLOYMENT'}</span>
        <h1>Vom ersten Service<br />bis <em>Production.</em></h1>
        <p>Acht kurze, echte Spielsituationen. Der Runtime Coach lässt nur den nächsten sinnvollen Schritt zu und erklärt sofort, was auf dem Board passiert.</p>
        <div className="tutorial-intro-actions">
          <Button variant="primary" disabled={pending} onClick={onStart}>
            {pending ? 'Training wird geladen …' : completed ? 'Tutorial wiederholen' : 'Training starten'} <span aria-hidden="true">→</span>
          </Button>
          <Button variant="ghost" onClick={onBack}>{completed ? 'Zurück' : 'Vorerst überspringen'}</Button>
        </div>
        {!completed && <small>Der erste Abschluss schaltet einen Booster frei.</small>}
      </section>
      <section className="tutorial-module-list" aria-label="Tutorial-Inhalte">
        {modules.map(([number, title, description]) => (
          <article key={number}>
            <span>{number}</span>
            <div><strong>{title}</strong><p>{description}</p></div>
          </article>
        ))}
      </section>
      <footer className="tutorial-intro-footer"><span>SERVER AUTHORITATIVE</span><span>CA. 5 MINUTEN</span></footer>
    </main>
  );
}
