import { useState } from 'react';
import { useI18n } from '../i18n';
import { Button } from '../ui/atoms';

interface MultiplayerPageProps {
  pending: boolean;
  error: string | null;
  onBack: () => void;
  onCreate: () => void;
  onJoin: (code: string) => void;
}

export function MultiplayerPage({ pending, error, onBack, onCreate, onJoin }: MultiplayerPageProps) {
  const { t } = useI18n();
  const [code, setCode] = useState('');

  return (
    <main className="screen multiplayer-screen">
      <button className="back-link" onClick={onBack}>← {t('multiplayer.mainMenu')}</button>
      <span className="eyebrow">{t('multiplayer.eyebrow')}</span>
      <h1>{t('multiplayer.title')}</h1>
      <p>{t('multiplayer.intro')}</p>
      <div className="connection-grid">
        <article>
          <span className="mode-number">A</span><h2>{t('multiplayer.createTitle')}</h2>
          <p>{t('multiplayer.createBody')}</p>
          <Button variant="primary" disabled={pending} onClick={onCreate}>{t('multiplayer.create')}</Button>
        </article>
        <article>
          <span className="mode-number">B</span><h2>{t('multiplayer.joinTitle')}</h2>
          <p>{t('multiplayer.joinBody')}</p>
          <input className="room-input" value={code} onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5))} placeholder="ABCDE" />
          <Button variant="secondary" disabled={pending || code.length !== 5} onClick={() => onJoin(code)}>{t('multiplayer.connect')}</Button>
        </article>
      </div>
      {error && <p className="form-error">{error}</p>}
    </main>
  );
}
