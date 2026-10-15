import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { GameProvider } from './game/GameContext';
import { App } from './app/App';
import { PwaControls } from './pwa/PwaControls';
import { BackgroundMusic } from './audio/BackgroundMusic';
import { registerServiceWorker } from './pwa/registerServiceWorker';
import { I18nProvider, LanguageSwitcher, useI18n } from './i18n';
import './styles/match-theme.css';
import './styles/global.css';

function RuntimeRoot() {
  const { t } = useI18n();
  const [utilitiesReady, setUtilitiesReady] = useState(false);

  useEffect(() => {
    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => setUtilitiesReady(true));
    });
    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, []);

  return (
    <>
      <HashRouter><GameProvider><App /></GameProvider></HashRouter>
      {utilitiesReady && <div className="runtime-utility-bar">
        <BackgroundMusic />
        <LanguageSwitcher />
      </div>}
      <PwaControls />
      <a className="runtime-legal-link" href="#/legal">{t('legal.shortLink')}</a>
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode><I18nProvider><RuntimeRoot /></I18nProvider></StrictMode>,
);

registerServiceWorker();
