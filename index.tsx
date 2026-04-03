
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initLiff } from './services/liffService';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

// Wait for LIFF to fully initialize (including profile fetch) before rendering.
// This ensures getLiffUserName() is ready when cards are composed.
// Timeout after 3s so the app still loads even if LIFF fails.
const liffReady = Promise.race([
  initLiff(),
  new Promise<void>((resolve) => setTimeout(resolve, 3000)),
]);

liffReady.then(() => {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
