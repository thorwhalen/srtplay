/** Entry point: load saved settings, then mount the app. */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { initSettings } from './player/store';
import { App } from './ui/App';
import './styles.css';

void initSettings();
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
