import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Service Worker registration for offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then(registration => {
        console.log('SW registered: ', registration);

        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (
                newWorker.state === 'installed' &&
                navigator.serviceWorker.controller
              ) {
                // New content is available, notify user
                console.log('New content is available; please refresh.');
              }
            });
          }
        });
      })
      .catch(registrationError => {
        console.log('SW registration failed: ', registrationError);
      });

    // Listen for messages from service worker
    navigator.serviceWorker.addEventListener('message', event => {
      if (event.data) {
        switch (event.data.type) {
          case 'SYNC_EVALUATIONS':
            // Trigger evaluation sync in the app
            window.dispatchEvent(
              new CustomEvent('sw-sync-evaluations', {
                detail: event.data,
              })
            );
            break;
          case 'SYNC_OFFLINE_NOTIFICATIONS':
            // Trigger offline notification sync
            window.dispatchEvent(
              new CustomEvent('sw-sync-notifications', {
                detail: event.data,
              })
            );
            break;
          case 'NETWORK_STATUS':
            // Update network status
            window.dispatchEvent(
              new CustomEvent('sw-network-status', {
                detail: event.data,
              })
            );
            break;
          default:
            console.log('Unknown service worker message:', event.data);
        }
      }
    });
  });
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
