interface CardHelpTipProps {
  onClose: () => void;
}

export function CardHelpTip({ onClose }: CardHelpTipProps) {
  return (
    <aside className="card-help-tip" role="status">
      <div>
        <b>Tipp</b>
        <span>Fahre mit der Maus über eine Karte oder tippe sie an, um Details und Begriffserklärungen zu sehen.</span>
      </div>
      <button type="button" onClick={onClose} aria-label="Tipp schließen">×</button>
    </aside>
  );
}
