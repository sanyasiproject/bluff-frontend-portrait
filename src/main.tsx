import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { unlockAudio } from './lib/sounds';
import { unlockSpeech } from './lib/speech';
import { startI18n } from './lib/i18n/dom';
import './styles.css';
// table themes and card backs, after the base styles so they win
import './styles/looks.css';
import './styles/missions.css';
import './styles/pass.css';
import './styles/shop.css';
import './styles/shop-fx.css';
import './styles/secrets.css';
import './styles/league.css';
import './styles/rivals.css';
import './styles/ranked.css';
import './styles/admin-stats.css';
import './styles/daily.css';
import './styles/room-chat.css';
import './styles/voice.css';
import './styles/twists.css';
import './styles/replay.css';
// avatar rings, shine and picker layout, last so they win
import './styles/avatars.css';
import './styles/lang.css';
import './styles/shield.css';
import './styles/c7power.css';
import './styles/rang.css';
import './styles/friends.css';
// night lobby design system, then the app's night skin over the screens above, last so they win
import './styles/night.css';
import './styles/night-app.css';
import './styles/night-home.css';
import './styles/night-pages.css';
// round 6 upright polish, last of all
import './styles/polish6.css';

for (const type of ['click', 'touchend'] as const) {
  window.addEventListener(type, unlockSpeech, { once: true, capture: true });
}
// kept on: phones can suspend audio in the background, and the next tap resumes it
window.addEventListener('pointerdown', unlockAudio, { capture: true, passive: true });

// a new deploy removed an old lazy chunk this open page still asks for: load the new app, at most once a minute
window.addEventListener('vite:preloadError', (e) => {
  try {
    const last = Number(sessionStorage.getItem('bluff.chunkReload')) || 0;
    if (Date.now() - last < 60_000) return;
    sessionStorage.setItem('bluff.chunkReload', String(Date.now()));
  } catch {
    return;
  }
  e.preventDefault();
  location.reload();
});

// service worker only in production builds so it never caches the dev server
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

// Hindi, when chosen, is applied over the rendered page
startI18n();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary where="app">
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
