import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { keywordDefinitions } from '../../../game/keywordDefinitions';
import { Button } from '../../../ui/atoms';
import { useI18n } from '../../../i18n';

export function GlossaryModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
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
        <button className="modal-close" type="button" onClick={onClose} aria-label={t('card.glossary.close')}>×</button>
        <header><span className="eyebrow">{t('card.glossary.eyebrow')}</span><h2 id="glossary-title">{t('card.glossary.title')}</h2><p>{t('card.glossary.description')}</p></header>
        <div className="glossary-grid">
          {keywordDefinitions.map((definition) => (
            <article key={definition.id}>
              <b>{t(`keyword.${definition.id}.label`)}</b>
              <p>{t(`keyword.${definition.id}.full`)}</p>
            </article>
          ))}
        </div>
        <footer className="modal-actions"><Button variant="primary" onClick={onClose}>{t('card.glossary.understood')}</Button></footer>
      </section>
    </div>,
    document.body,
  );
}
