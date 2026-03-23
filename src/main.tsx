import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// @ts-ignore
import { registerSW } from 'virtual:pwa-register';

// Auto-update mechanism: forces connected devices to get the latest version
const updateSW = registerSW({
  onNeedRefresh() {
    // When a new version is detected, automatically install it and reload!
    if (updateSW) updateSW(true);
  },
  onOfflineReady() {
    console.log('L\'application est prête pour le mode hors-ligne');
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
