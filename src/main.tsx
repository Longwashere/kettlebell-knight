import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { installNativeBackButton, installTvViewport } from './tv/native';
import { installGraphicsMode } from './tv/graphicsMode';
import './index.css';

installTvViewport();
installGraphicsMode();
installNativeBackButton();

// GitHub Pages phone companion: register the service worker so it can be installed to the home screen
if (import.meta.env.VITE_PHONE_SITE === 'true' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch((err) => {
      console.warn('[pwa] Service worker registration failed:', err);
    });
  });
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
