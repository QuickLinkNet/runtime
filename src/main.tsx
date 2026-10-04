import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { GameProvider } from './game/GameContext';
import { App } from './app/App';
import { PwaControls } from './pwa/PwaControls';
import { registerServiceWorker } from './pwa/registerServiceWorker';
import './styles/match-theme.css';
import './styles/global.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GameProvider><App /></GameProvider>
    <PwaControls />
  </StrictMode>,
);

registerServiceWorker();
