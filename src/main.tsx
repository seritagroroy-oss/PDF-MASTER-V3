import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';

// @ts-ignore
import { registerSW } from 'virtual:pwa-register';

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('Nouvelle version détectée, installation automatique...');
    updateSW(true);
  },
  onOfflineReady() {
    console.log("Prêt pour l'utilisation hors-ligne");
  },
});

setInterval(() => { updateSW(); }, 60 * 60 * 1000);

window.addEventListener('online', () => {
  console.log('Connexion rétablie, vérification des mises à jour...');
  updateSW();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
