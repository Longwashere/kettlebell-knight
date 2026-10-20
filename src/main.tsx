import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { installNativeBackButton } from './tv/native';
import './index.css';

installNativeBackButton();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
