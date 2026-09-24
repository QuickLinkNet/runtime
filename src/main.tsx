import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { GameProvider } from './game/GameContext';
import { App } from './app/App';
import './styles/match-theme.css';
import './styles/global.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GameProvider><App /></GameProvider>
  </StrictMode>,
);
