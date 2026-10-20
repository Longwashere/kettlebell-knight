import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { installNativeBackButton } from './tv/native';
import './index.css';

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
