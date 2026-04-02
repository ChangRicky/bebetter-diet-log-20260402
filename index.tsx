
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initLiff } from './services/liffService';

// Initialize LIFF before rendering (non-blocking — app renders regardless)
initLiff();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
