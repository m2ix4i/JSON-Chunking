/**
 * Application entry point.
 * Sets up React, error tracking, and global styles.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

// Service Worker registration for PWA
import './services/serviceWorker.ts';

// Global styles
import '@fontsource/inter/300.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';

// Error handling
const handleError = (error: Error, errorInfo?: any) => {
  console.error('Application error:', error, errorInfo);
  
  // In production, you might want to send errors to a service like Sentry
  if (import.meta.env.PROD) {
    // Example: Sentry.captureException(error);
  }
};

// Setup global error handlers
window.addEventListener('error', (event) => {
  handleError(new Error(event.message), {
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
  });
});

window.addEventListener('unhandledrejection', (event) => {
  handleError(new Error(`Unhandled promise rejection: ${event.reason}`));
});

// Render app
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);