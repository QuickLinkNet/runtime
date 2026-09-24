import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { keywordDefinitions } from '../../../game/keywordDefinitions';
import { Button } from '../../../ui/atoms';

export function GlossaryModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className="modal-backdrop glossary-modal" role="presentation" onMouseDown={(event) => {
      if (event.currentTarget === event.target) onClose();
    }}>
      <section className="modal-shell glossary-shell" role="dialog" aria-modal="true" aria-labelledby="glossary-title">
        <button className="modal-close" type="button" onClick={onClose} aria-label="Regelglossar schließen">×</button>
        <header><span className="eyebrow">QUICK REFERENCE</span><h2 id="glossary-title">RUNTIME-Regeln</h2><p>Die wichtigsten Kartenarten, Werte und Keywords auf einen Blick.</p></header>
        <div className="glossary-grid">
          {keywordDefinitions.map((definition) => (
            <article key={definition.id}>
              <b>{definition.label}</b>
              <p>{definition.fullDescription}</p>
            </article>
          ))}
        </div>
        <footer className="modal-actions"><Button variant="primary" onClick={onClose}>Verstanden</Button></footer>
      </section>
    </div>,
    document.body,
  );
}
