import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// @ts-ignore
import { registerSW } from 'virtual:pwa-register';

// Auto-update mechanism: forces connected devices to get the latest version
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

// Periodic check for updates (every 1 hour)
setInterval(() => {
  updateSW();
}, 60 * 60 * 1000);

// Check for updates when coming back online
window.addEventListener('online', () => {
  console.log('Connexion rétablie, vérification des mises à jour...');
  updateSW();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
