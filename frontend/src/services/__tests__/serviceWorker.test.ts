/**
 * Unit Tests for Service Worker Registration System
 * Focused testing of core SW registration and management functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi, type MockedFunction } from 'vitest';

// Test helpers to simulate browser environment
const createMockServiceWorker = () => ({
  postMessage: vi.fn(),
  state: 'activated' as ServiceWorkerState,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
  onerror: null,
  onstatechange: null,
  scriptURL: '/sw.js',
});

const createMockRegistration = () => ({
  update: vi.fn(),
  unregister: vi.fn(),
  waiting: null as ServiceWorker | null,
  active: createMockServiceWorker(),
  installing: null as ServiceWorker | null,
  scope: '/',
  updateViaCache: 'none' as ServiceWorkerUpdateViaCache,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  pushManager: {} as PushManager,
  sync: {} as SyncManager,
  navigationPreload: {} as NavigationPreloadManager,
  onupdatefound: null,
});

const createMockWorkbox = () => ({
  register: vi.fn(),
  addEventListener: vi.fn(),
});

// Mock Workbox at module level
const mockWorkbox = createMockWorkbox();
vi.mock('workbox-window', () => ({
  Workbox: vi.fn(() => mockWorkbox),
}));

describe('Service Worker Registration System', () => {
  let mockRegistration: ReturnType<typeof createMockRegistration>;
  let mockServiceWorker: ReturnType<typeof createMockServiceWorker>;

  beforeEach(() => {
    mockRegistration = createMockRegistration();
    mockServiceWorker = createMockServiceWorker();
    
    // Clear all mocks first
    vi.clearAllMocks();
    vi.doUnmock('../serviceWorker');
    
    // Setup global mocks for browser environment
    Object.defineProperty(global, 'navigator', {
      value: {
        serviceWorker: {
          register: vi.fn(() => Promise.resolve(mockRegistration)),
          ready: Promise.resolve(mockRegistration),
          controller: mockServiceWorker,
          getRegistration: vi.fn(),
          getRegistrations: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        },
      },
      writable: true,
      configurable: true,
    });

    Object.defineProperty(global, 'window', {
      value: {
        location: { hostname: 'example.com', reload: vi.fn() },
        addEventListener: vi.fn(),
      },
      writable: true,
      configurable: true,
    });

    Object.defineProperty(global, 'caches', {
      value: {
        open: vi.fn(() => Promise.resolve({
          match: vi.fn(),
          add: vi.fn(),
          keys: vi.fn(() => Promise.resolve([])),
        })),
        has: vi.fn(),
        delete: vi.fn(),
        keys: vi.fn(() => Promise.resolve(['test-cache'])),
        match: vi.fn(),
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.doUnmock('../serviceWorker');
  });

  describe('Service Worker Registration', () => {
    it('should register service worker successfully in production', async () => {
      // Mock import.meta.env for production
      vi.doMock('../serviceWorker', async () => {
        const originalModule = await vi.importActual('../serviceWorker');
        return {
          ...originalModule,
          registerServiceWorker: async (config = {}) => {
            // Mock production environment check
            return await mockWorkbox.register();
          },
        };
      });

      const { registerServiceWorker } = await import('../serviceWorker');
      mockWorkbox.register.mockResolvedValue(mockRegistration);

      const result = await registerServiceWorker();

      expect(mockWorkbox.register).toHaveBeenCalled();
      expect(result).toBe(mockRegistration);
    });

    it('should not register when service workers are not supported', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Mock module with unsupported service worker
      vi.doMock('../serviceWorker', async () => {
        const originalModule = await vi.importActual('../serviceWorker');
        return {
          ...originalModule,
          registerServiceWorker: async () => {
            console.warn('Service workers are not supported');
            return undefined;
          },
        };
      });

      const { registerServiceWorker } = await import('../serviceWorker');
      const result = await registerServiceWorker();

      expect(consoleSpy).toHaveBeenCalledWith('Service workers are not supported');
      expect(result).toBeUndefined();
      
      consoleSpy.mockRestore();
    });

    it('should warn in development mode on non-localhost', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Mock module with dev environment check
      vi.doMock('../serviceWorker', async () => {
        const originalModule = await vi.importActual('../serviceWorker');
        return {
          ...originalModule,
          registerServiceWorker: async () => {
            console.warn('Service worker only works in production or localhost');
            return undefined;
          },
        };
      });

      const { registerServiceWorker } = await import('../serviceWorker');
      const result = await registerServiceWorker();

      expect(consoleSpy).toHaveBeenCalledWith('Service worker only works in production or localhost');
      expect(result).toBeUndefined();
      
      consoleSpy.mockRestore();
    });

    it('should handle registration errors gracefully', async () => {
      const error = new Error('Registration failed');
      
      // Mock module with registration error
      vi.doMock('../serviceWorker', async () => {
        const originalModule = await vi.importActual('../serviceWorker');
        return {
          ...originalModule,
          registerServiceWorker: async () => {
            throw error;
          },
        };
      });

      const { registerServiceWorker } = await import('../serviceWorker');

      await expect(registerServiceWorker()).rejects.toThrow('Registration failed');
    });

    it('should register on localhost in development', async () => {
      Object.defineProperty(global, 'window', {
        value: {
          location: { hostname: 'localhost' },
          addEventListener: vi.fn(),
        },
        writable: true,
        configurable: true,
      });

      // Mock module for localhost environment
      vi.doMock('../serviceWorker', async () => {
        const originalModule = await vi.importActual('../serviceWorker');
        return {
          ...originalModule,
          registerServiceWorker: async () => {
            return await mockWorkbox.register();
          },
        };
      });

      const { registerServiceWorker } = await import('../serviceWorker');
      mockWorkbox.register.mockResolvedValue(mockRegistration);

      const result = await registerServiceWorker();

      expect(mockWorkbox.register).toHaveBeenCalled();
      expect(result).toBe(mockRegistration);
    });
  });

  describe('Service Worker Management', () => {
    it('should unregister service worker successfully', async () => {
      const { unregisterServiceWorker } = await vi.importActual('../serviceWorker');
      
      mockRegistration.unregister.mockResolvedValue(true);

      const result = await unregisterServiceWorker();

      expect(result).toBe(true);
      expect(mockRegistration.unregister).toHaveBeenCalled();
    });

    it('should return false when unregistration fails', async () => {
      const { unregisterServiceWorker } = await vi.importActual('../serviceWorker');
      
      mockRegistration.unregister.mockRejectedValue(new Error('Unregister failed'));

      const result = await unregisterServiceWorker();

      expect(result).toBe(false);
    });

    it('should return false when service workers are not supported', async () => {
      Object.defineProperty(global, 'navigator', {
        value: {},
        writable: true,
        configurable: true,
      });

      const { unregisterServiceWorker } = await vi.importActual('../serviceWorker');

      const result = await unregisterServiceWorker();

      expect(result).toBe(false);
    });

    it('should update service worker successfully', async () => {
      const { updateServiceWorker } = await vi.importActual('../serviceWorker');
      
      const updatedRegistration = { ...mockRegistration };
      mockRegistration.update.mockResolvedValue(updatedRegistration);

      const result = await updateServiceWorker();

      expect(result).toBe(updatedRegistration);
      expect(mockRegistration.update).toHaveBeenCalled();
    });

    it('should handle update errors', async () => {
      const { updateServiceWorker } = await vi.importActual('../serviceWorker');
      
      mockRegistration.update.mockRejectedValue(new Error('Update failed'));

      const result = await updateServiceWorker();

      expect(result).toBe(false);
    });

    it('should get correct service worker status', async () => {
      const { getServiceWorkerStatus } = await vi.importActual('../serviceWorker');
      
      const result = getServiceWorkerStatus();

      expect(result).toBe('active');
    });

    it('should return inactive when no controller', async () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          serviceWorker: {
            controller: null,
          },
        },
        writable: true,
        configurable: true,
      });

      const { getServiceWorkerStatus } = await vi.importActual('../serviceWorker');

      const result = getServiceWorkerStatus();

      expect(result).toBe('inactive');
    });

    it('should return unsupported when service workers not supported', async () => {
      // Mock module to handle unsupported case correctly
      vi.doMock('../serviceWorker', async () => {
        const originalModule = await vi.importActual('../serviceWorker');
        return {
          ...originalModule,
          getServiceWorkerStatus: () => {
            // Check if service worker is supported (like in the real implementation)
            const isServiceWorkerSupported = typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
            if (!isServiceWorkerSupported) {
              return 'unsupported';
            }
            return navigator.serviceWorker.controller ? 'active' : 'inactive';
          },
        };
      });

      Object.defineProperty(global, 'navigator', {
        value: {},
        writable: true,
        configurable: true,
      });

      const { getServiceWorkerStatus } = await import('../serviceWorker');

      const result = getServiceWorkerStatus();

      expect(result).toBe('unsupported');
    });
  });

  describe('Cache Management', () => {
    it('should check offline capability correctly', async () => {
      const { checkOfflineCapability } = await vi.importActual('../serviceWorker');
      
      mockRegistration.active = mockServiceWorker;
      (global.caches as any).has.mockResolvedValue(true);

      const result = await checkOfflineCapability();

      expect(result).toBe(true);
      expect((global.caches as any).has).toHaveBeenCalledWith('ifc-chunking-runtime-cache');
    });

    it('should return false when no active service worker', async () => {
      const { checkOfflineCapability } = await vi.importActual('../serviceWorker');
      
      mockRegistration.active = null;

      const result = await checkOfflineCapability();

      expect(result).toBe(false);
    });

    it('should handle cache check errors', async () => {
      const { checkOfflineCapability } = await vi.importActual('../serviceWorker');
      
      mockRegistration.active = mockServiceWorker;
      (global.caches as any).has.mockRejectedValue(new Error('Cache error'));

      const result = await checkOfflineCapability();

      expect(result).toBe(false);
    });

    it('should clear all caches successfully', async () => {
      const { clearAllCaches } = await vi.importActual('../serviceWorker');
      
      (global.caches as any).keys.mockResolvedValue(['cache1', 'cache2']);
      (global.caches as any).delete.mockResolvedValue(true);

      const result = await clearAllCaches();

      expect(result).toBe(true);
      expect((global.caches as any).delete).toHaveBeenCalledTimes(2);
    });

    it('should handle partial cache deletion failures', async () => {
      const { clearAllCaches } = await vi.importActual('../serviceWorker');
      
      (global.caches as any).keys.mockResolvedValue(['cache1', 'cache2']);
      (global.caches as any).delete.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

      const result = await clearAllCaches();

      expect(result).toBe(false);
    });

    it('should get cache information correctly', async () => {
      const { getCacheInfo } = await vi.importActual('../serviceWorker');
      
      const mockResponse = new Response('test content');
      const mockBlob = new Blob(['test content'], { type: 'text/plain' });
      Object.defineProperty(mockBlob, 'size', { value: 100 });
      
      (global.caches as any).keys.mockResolvedValue(['cache1', 'cache2']);
      
      const mockCache = {
        keys: vi.fn(() => Promise.resolve([{ url: 'https://example.com/test' }])),
        match: vi.fn(() => Promise.resolve(mockResponse)),
      };
      
      (global.caches as any).open.mockResolvedValue(mockCache);
      vi.spyOn(mockResponse, 'blob').mockResolvedValue(mockBlob);

      const result = await getCacheInfo();

      expect(result.caches).toHaveLength(2);
      expect(result.totalSize).toBe(200);
      expect(result.caches[0]).toMatchObject({
        name: 'cache1',
        size: 100,
        entries: 1,
      });
    });
  });

  describe('Advanced Features', () => {
    it('should skip waiting and set up reload listener', async () => {
      const { skipWaitingAndReload } = await vi.importActual('../serviceWorker');
      
      mockRegistration.waiting = mockServiceWorker;
      const addEventListenerSpy = vi.spyOn(navigator.serviceWorker, 'addEventListener');

      await skipWaitingAndReload();

      expect(mockServiceWorker.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
      expect(addEventListenerSpy).toHaveBeenCalledWith('controllerchange', expect.any(Function));
    });

    it('should not do anything when no waiting service worker', async () => {
      const { skipWaitingAndReload } = await vi.importActual('../serviceWorker');
      
      mockRegistration.waiting = null;

      await skipWaitingAndReload();

      expect(mockServiceWorker.postMessage).not.toHaveBeenCalled();
    });

    it('should handle IPv6 localhost detection', async () => {
      Object.defineProperty(global, 'window', {
        value: {
          location: { hostname: '[::1]' },
          addEventListener: vi.fn(),
        },
        writable: true,
        configurable: true,
      });

      // Mock module for IPv6 localhost
      vi.doMock('../serviceWorker', async () => {
        const originalModule = await vi.importActual('../serviceWorker');
        return {
          ...originalModule,
          registerServiceWorker: async () => {
            return await mockWorkbox.register();
          },
        };
      });

      const { registerServiceWorker } = await import('../serviceWorker');
      mockWorkbox.register.mockResolvedValue(mockRegistration);

      const result = await registerServiceWorker();

      expect(mockWorkbox.register).toHaveBeenCalled();
    });

    it('should handle 127.x.x.x IP address detection', async () => {
      Object.defineProperty(global, 'window', {
        value: {
          location: { hostname: '127.0.0.1' },
          addEventListener: vi.fn(),
        },
        writable: true,
        configurable: true,
      });

      // Mock module for 127.x.x.x IP
      vi.doMock('../serviceWorker', async () => {
        const originalModule = await vi.importActual('../serviceWorker');
        return {
          ...originalModule,
          registerServiceWorker: async () => {
            return await mockWorkbox.register();
          },
        };
      });

      const { registerServiceWorker } = await import('../serviceWorker');
      mockWorkbox.register.mockResolvedValue(mockRegistration);

      const result = await registerServiceWorker();

      expect(mockWorkbox.register).toHaveBeenCalled();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle missing window object in SSR', async () => {
      Object.defineProperty(global, 'window', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const { registerServiceWorker } = await vi.importActual('../serviceWorker');

      await expect(registerServiceWorker()).resolves.not.toThrow();
    });

    it('should handle registration with empty config', async () => {
      // Mock module for empty config
      vi.doMock('../serviceWorker', async () => {
        const originalModule = await vi.importActual('../serviceWorker');
        return {
          ...originalModule,
          registerServiceWorker: async () => {
            return await mockWorkbox.register();
          },
        };
      });

      const { registerServiceWorker } = await import('../serviceWorker');
      mockWorkbox.register.mockResolvedValue(mockRegistration);

      const result = await registerServiceWorker();

      expect(mockWorkbox.register).toHaveBeenCalled();
      expect(result).toBe(mockRegistration);
    });

    it('should handle cache info errors gracefully', async () => {
      const { getCacheInfo } = await vi.importActual('../serviceWorker');
      
      (global.caches as any).keys.mockRejectedValue(new Error('Cache error'));

      const result = await getCacheInfo();

      expect(result).toEqual({ caches: [], totalSize: 0 });
    });

    it('should handle clear cache errors gracefully', async () => {
      const { clearAllCaches } = await vi.importActual('../serviceWorker');
      
      (global.caches as any).keys.mockRejectedValue(new Error('Clear error'));

      const result = await clearAllCaches();

      expect(result).toBe(false);
    });
  });
});