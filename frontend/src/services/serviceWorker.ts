/**
 * Service Worker implementation for static asset caching
 * Uses Workbox for advanced caching strategies and offline support
 */

import { Workbox } from 'workbox-window';

interface ServiceWorkerConfig {
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onWaiting?: (registration: ServiceWorkerRegistration) => void;
  onOfflineReady?: () => void;
  onNeedRefresh?: () => void;
}

export type ServiceWorkerStatus = 'unsupported' | 'inactive' | 'active' | 'waiting' | 'installing';

interface PWAInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// Production service worker path
const swUrl = `/sw.js`;

// Check if service worker is supported
const isServiceWorkerSupported = typeof navigator !== 'undefined' && 'serviceWorker' in navigator;

// Check if app is running on localhost
const isLocalhost = Boolean(
  typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '[::1]' ||
    window.location.hostname.match(
      /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/
    )
  )
);

/**
 * Register service worker with caching strategies
 */
export async function registerServiceWorker(config: ServiceWorkerConfig = {}) {
  if (!isServiceWorkerSupported) {
    console.warn('Service workers are not supported');
    return;
  }

  if (import.meta.env.DEV && !isLocalhost) {
    console.warn('Service worker only works in production or localhost');
    return;
  }

  try {
    const wb = new Workbox(swUrl);

    // Handle waiting service worker
    wb.addEventListener('waiting', (event) => {
      console.log('Service worker waiting to activate');
      config.onWaiting?.(event.sw as any);
      config.onNeedRefresh?.();
    });

    // Handle successful registration
    wb.addEventListener('installed', (event) => {
      if (event.isUpdate) {
        console.log('Service worker updated');
        config.onUpdate?.(event.sw as any);
        config.onNeedRefresh?.();
      } else {
        console.log('Service worker installed');
        config.onSuccess?.(event.sw as any);
        config.onOfflineReady?.();
      }
    });

    // Handle activation
    wb.addEventListener('activated', (event) => {
      console.log('Service worker activated');
      if (event.isUpdate) {
        // Refresh page after activation if it's an update
        window.location.reload();
      }
    });

    // Handle runtime caching
    wb.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'CACHE_UPDATED') {
        console.log('Cache updated:', event.data.payload);
      }
    });

    // Register the service worker
    const registration = await wb.register();
    
    console.log('Service worker registered successfully:', registration);
    return registration;

  } catch (error) {
    console.error('Service worker registration failed:', error);
    throw error;
  }
}

/**
 * Unregister service worker
 */
export async function unregisterServiceWorker() {
  if (!isServiceWorkerSupported) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const result = await registration.unregister();
    console.log('Service worker unregistered:', result);
    return result;
  } catch (error) {
    console.error('Service worker unregistration failed:', error);
    return false;
  }
}

/**
 * Skip waiting service worker and activate immediately
 */
export async function skipWaitingAndReload() {
  if (!isServiceWorkerSupported) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    
    if (registration.waiting) {
      // Send skip waiting message
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      
      // Listen for activation and reload
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    }
  } catch (error) {
    console.error('Skip waiting failed:', error);
  }
}

/**
 * Check if app can work offline
 */
export function checkOfflineCapability(): Promise<boolean> {
  return new Promise((resolve) => {
    if (!isServiceWorkerSupported) {
      resolve(false);
      return;
    }

    navigator.serviceWorker.ready.then((registration) => {
      if (registration.active) {
        // Test cache availability
        caches.has('ifc-chunking-runtime-cache').then((hasCache) => {
          resolve(hasCache);
        }).catch(() => {
          resolve(false);
        });
      } else {
        resolve(false);
      }
    }).catch(() => {
      resolve(false);
    });
  });
}

/**
 * Get cached resources information
 */
export async function getCacheInfo() {
  if (!isServiceWorkerSupported) {
    return { caches: [], totalSize: 0 };
  }

  try {
    const cacheNames = await caches.keys();
    const cacheInfo = [];
    let totalSize = 0;

    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      
      // Estimate cache size (rough calculation)
      let cacheSize = 0;
      for (const request of keys) {
        const response = await cache.match(request);
        if (response) {
          const blob = await response.blob();
          cacheSize += blob.size;
        }
      }

      cacheInfo.push({
        name: cacheName,
        size: cacheSize,
        entries: keys.length,
      });

      totalSize += cacheSize;
    }

    return { caches: cacheInfo, totalSize };
  } catch (error) {
    console.error('Failed to get cache info:', error);
    return { caches: [], totalSize: 0 };
  }
}

/**
 * Clear all caches
 */
export async function clearAllCaches() {
  if (!isServiceWorkerSupported) {
    return false;
  }

  try {
    const cacheNames = await caches.keys();
    const deletePromises = cacheNames.map(cacheName => caches.delete(cacheName));
    const results = await Promise.all(deletePromises);
    
    console.log('All caches cleared');
    return results.every(result => result);
  } catch (error) {
    console.error('Failed to clear caches:', error);
    return false;
  }
}

/**
 * Update service worker manually
 */
export async function updateServiceWorker() {
  if (!isServiceWorkerSupported) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const updatedRegistration = await registration.update();
    
    console.log('Service worker update initiated');
    return updatedRegistration;
  } catch (error) {
    console.error('Service worker update failed:', error);
    return false;
  }
}

/**
 * Get service worker status
 */
export function getServiceWorkerStatus() {
  if (!isServiceWorkerSupported) {
    return 'unsupported';
  }

  return navigator.serviceWorker.controller ? 'active' : 'inactive';
}

// Auto-register service worker in production
if (import.meta.env.PROD) {
  registerServiceWorker({
    onSuccess: () => {
      console.log('App is ready to work offline');
    },
    onUpdate: () => {
      console.log('New version available');
    },
    onOfflineReady: () => {
      console.log('App is cached and ready for offline use');
    },
    onNeedRefresh: () => {
      console.log('App needs to be refreshed to get the latest version');
    },
  });
}

/**
 * Service Worker Manager Class
 * Provides a simplified interface for managing service worker functionality
 */
class ServiceWorkerManager {
  private deferredPrompt: PWAInstallPromptEvent | null = null;
  private status: ServiceWorkerStatus = 'inactive';
  private callbacks: ServiceWorkerConfig = {};
  private statusChangeListeners: Array<(status: ServiceWorkerStatus) => void> = [];

  constructor() {
    this.initializePWAPrompt();
    this.updateStatus();
  }

  private initializePWAPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e as PWAInstallPromptEvent;
      this.updateStatus();
    });

    window.addEventListener('appinstalled', () => {
      console.log('PWA was installed');
      this.deferredPrompt = null;
      this.updateStatus();
    });
  }

  private updateStatus() {
    const newStatus = getServiceWorkerStatus() as ServiceWorkerStatus;
    if (newStatus !== this.status) {
      this.status = newStatus;
      this.notifyStatusChange();
    }
  }

  private notifyStatusChange() {
    this.statusChangeListeners.forEach(listener => listener(this.status));
  }

  async register(config: ServiceWorkerConfig = {}) {
    this.callbacks = config;
    const registration = await registerServiceWorker(config);
    this.updateStatus();
    return registration;
  }

  async unregister() {
    const result = await unregisterServiceWorker();
    this.updateStatus();
    return result;
  }

  async update() {
    const result = await updateServiceWorker();
    this.updateStatus();
    return result;
  }

  async installPWA(): Promise<boolean> {
    if (!this.deferredPrompt) {
      return false;
    }

    try {
      this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('User accepted the PWA install prompt');
        this.deferredPrompt = null;
        return true;
      } else {
        console.log('User dismissed the PWA install prompt');
        return false;
      }
    } catch (error) {
      console.error('Error during PWA installation:', error);
      return false;
    }
  }

  async checkForUpdates() {
    return await updateServiceWorker();
  }

  getStatus(): ServiceWorkerStatus {
    return this.status;
  }

  canInstallPWA(): boolean {
    return !!this.deferredPrompt;
  }

  setCallbacks(config: ServiceWorkerConfig) {
    this.callbacks = { ...this.callbacks, ...config };
  }

  onStatusChange(callback: (status: ServiceWorkerStatus) => void): () => void {
    this.statusChangeListeners.push(callback);
    return () => {
      const index = this.statusChangeListeners.indexOf(callback);
      if (index > -1) {
        this.statusChangeListeners.splice(index, 1);
      }
    };
  }

  async clearCaches() {
    return await clearAllCaches();
  }

  async getCacheInfo() {
    return await getCacheInfo();
  }

  async checkOfflineCapability() {
    return await checkOfflineCapability();
  }
}

// Export singleton instance
export const serviceWorkerManager = new ServiceWorkerManager();

export default {
  register: registerServiceWorker,
  unregister: unregisterServiceWorker,
  skipWaitingAndReload,
  checkOfflineCapability,
  getCacheInfo,
  clearAllCaches,
  updateServiceWorker,
  getServiceWorkerStatus,
  serviceWorkerManager,
};