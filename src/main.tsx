import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { GameProvider } from './game/GameContext';
import { App } from './app/App';
import { PwaControls } from './pwa/PwaControls';
import { BackgroundMusic } from './audio/BackgroundMusic';
import { registerServiceWorker } from './pwa/registerServiceWorker';
import './styles/match-theme.css';
import './styles/global.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter><GameProvider><App /></GameProvider></HashRouter>
    <BackgroundMusic />
    <PwaControls />
  </StrictMode>,
);

registerServiceWorker();
