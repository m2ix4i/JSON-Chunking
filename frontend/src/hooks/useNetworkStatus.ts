/**
 * Network status hook
 * Provides network connectivity and sync status information
 */

import { useState, useEffect, useCallback } from 'react';
import { syncService, SyncStats } from '@/services/sync';
import { serviceWorkerManager, ServiceWorkerStatus } from '@/services/serviceWorker';

export interface NetworkStatus {
  isOnline: boolean;
  connectionType: 'slow-2g' | '2g' | '3g' | '4g' | 'unknown';
  downlink: number;
  effectiveType: string;
  rtt: number;
}

export interface PWAStatus {
  isInstalled: boolean;
  isInstallable: boolean;
  updateAvailable: boolean;
  isControlling: boolean;
}

export interface UseNetworkStatusReturn {
  // Network connectivity
  isOnline: boolean;
  connectionQuality: 'fast' | 'medium' | 'slow' | 'offline';
  networkStatus: NetworkStatus;
  
  // PWA status
  pwaStatus: PWAStatus;
  
  // Sync status
  syncStats: SyncStats;
  isSync: boolean;
  
  // Actions
  forcSync: () => Promise<boolean>;
  installPWA: () => Promise<boolean>;
  updatePWA: () => Promise<void>;
  
  // Utilities
  retryLastAction: () => void;
}

/**
 * Hook for monitoring network status and sync state
 */
export const useNetworkStatus = (): UseNetworkStatusReturn => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isOnline: navigator.onLine,
    connectionType: 'unknown',
    downlink: 0,
    effectiveType: 'unknown',
    rtt: 0
  });
  const [pwaStatus, setPwaStatus] = useState<PWAStatus>({
    isInstalled: false,
    isInstallable: false,
    updateAvailable: false,
    isControlling: false
  });
  const [syncStats, setSyncStats] = useState<SyncStats>({
    pendingCount: 0,
    completedCount: 0,
    failedCount: 0,
    lastSyncTime: 0,
    isOnline: false
  });
  const [isSync, setIsSync] = useState(false);
  const [lastAction, setLastAction] = useState<(() => void) | null>(null);

  /**
   * Update network information from Network Information API
   */
  const updateNetworkInfo = useCallback(() => {
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;

    if (connection) {
      setNetworkStatus(prev => ({
        ...prev,
        isOnline: navigator.onLine,
        connectionType: connection.effectiveType || 'unknown',
        downlink: connection.downlink || 0,
        effectiveType: connection.effectiveType || 'unknown',
        rtt: connection.rtt || 0
      }));
    } else {
      setNetworkStatus(prev => ({
        ...prev,
        isOnline: navigator.onLine
      }));
    }
  }, []);

  /**
   * Update PWA status from service worker
   */
  const updatePWAStatus = useCallback(() => {
    const swStatus = serviceWorkerManager.getStatus();
    setPwaStatus({
      isInstalled: window.matchMedia('(display-mode: standalone)').matches,
      isInstallable: swStatus.isInstallable,
      updateAvailable: swStatus.updateAvailable,
      isControlling: swStatus.isControlling
    });
  }, []);

  /**
   * Update sync statistics
   */
  const updateSyncStats = useCallback(() => {
    const stats = syncService.getSyncStats();
    setSyncStats(stats);
    setIsSync(stats.pendingCount > 0);
  }, []);

  /**
   * Handle online/offline events
   */
  const handleOnline = useCallback(() => {
    setIsOnline(true);
    updateNetworkInfo();
    updateSyncStats();
  }, [updateNetworkInfo, updateSyncStats]);

  const handleOffline = useCallback(() => {
    setIsOnline(false);
    updateNetworkInfo();
    updateSyncStats();
  }, [updateNetworkInfo, updateSyncStats]);

  /**
   * Force sync operation
   */
  const forcSync = useCallback(async (): Promise<boolean> => {
    if (!isOnline) {
      console.warn('Cannot sync while offline');
      return false;
    }

    setLastAction(() => forcSync);
    
    try {
      const success = await syncService.forcSync();
      updateSyncStats();
      return success;
    } catch (error) {
      console.error('Force sync failed:', error);
      return false;
    }
  }, [isOnline, updateSyncStats]);

  /**
   * Install PWA
   */
  const installPWA = useCallback(async (): Promise<boolean> => {
    setLastAction(() => installPWA);
    
    try {
      const success = await serviceWorkerManager.installPWA();
      updatePWAStatus();
      return success;
    } catch (error) {
      console.error('PWA installation failed:', error);
      return false;
    }
  }, [updatePWAStatus]);

  /**
   * Update PWA
   */
  const updatePWA = useCallback(async (): Promise<void> => {
    setLastAction(() => updatePWA);
    
    try {
      await serviceWorkerManager.update();
      updatePWAStatus();
    } catch (error) {
      console.error('PWA update failed:', error);
      throw error;
    }
  }, [updatePWAStatus]);

  /**
   * Retry last action
   */
  const retryLastAction = useCallback(() => {
    if (lastAction) {
      lastAction();
    }
  }, [lastAction]);

  /**
   * Determine connection quality
   */
  const connectionQuality = useCallback((): 'fast' | 'medium' | 'slow' | 'offline' => {
    if (!isOnline) return 'offline';
    
    const { downlink, effectiveType, rtt } = networkStatus;
    
    // Use effective type if available
    if (effectiveType) {
      switch (effectiveType) {
        case '4g':
          return 'fast';
        case '3g':
          return 'medium';
        case '2g':
        case 'slow-2g':
          return 'slow';
        default:
          break;
      }
    }
    
    // Fallback to downlink and RTT analysis
    if (downlink > 1.5 && rtt < 200) return 'fast';
    if (downlink > 0.5 && rtt < 500) return 'medium';
    if (isOnline) return 'slow';
    
    return 'offline';
  }, [isOnline, networkStatus]);

  // Set up event listeners
  useEffect(() => {
    // Network status listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Network Information API listener
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;

    if (connection) {
      connection.addEventListener('change', updateNetworkInfo);
    }

    // Service worker status listener
    const unsubscribeServiceWorker = serviceWorkerManager.onStatusChange(() => {
      updatePWAStatus();
    });

    // Sync service listener
    const unsubscribeSync = syncService.onConnectionChange(() => {
      updateSyncStats();
    });

    // Set up sync event callbacks
    syncService.setEventCallbacks({
      onSyncStart: () => setIsSync(true),
      onSyncComplete: () => updateSyncStats(),
      onSyncError: () => updateSyncStats(),
      onConnectionChange: (online) => {
        setIsOnline(online);
        updateNetworkInfo();
      }
    });

    // Initial updates
    updateNetworkInfo();
    updatePWAStatus();
    updateSyncStats();

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if (connection) {
        connection.removeEventListener('change', updateNetworkInfo);
      }
      
      unsubscribeServiceWorker();
      unsubscribeSync();
    };
  }, [handleOnline, handleOffline, updateNetworkInfo, updatePWAStatus, updateSyncStats]);

  // Periodic sync stats update
  useEffect(() => {
    const interval = setInterval(updateSyncStats, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, [updateSyncStats]);

  return {
    isOnline,
    connectionQuality: connectionQuality(),
    networkStatus,
    pwaStatus,
    syncStats,
    isSync,
    forcSync,
    installPWA,
    updatePWA,
    retryLastAction
  };
};

export default useNetworkStatus;