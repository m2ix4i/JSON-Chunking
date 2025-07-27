/**
 * PWA Components
 * Progressive Web App components for offline support and installation
 */

export { default as InstallPrompt } from './InstallPrompt';
export { default as UpdateNotification } from './UpdateNotification';
export { default as OfflineIndicator } from './OfflineIndicator';

// Re-export types if needed
export type { 
  ServiceWorkerStatus,
  ServiceWorkerEventCallbacks,
  BeforeInstallPromptEvent,
  ServiceWorkerUpdateEvent 
} from '@services/serviceWorker';