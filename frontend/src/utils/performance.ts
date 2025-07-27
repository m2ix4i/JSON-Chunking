/**
 * Performance monitoring utility with Web Vitals tracking
 * Provides real-time performance metrics collection and monitoring
 */

import { getCLS, getFCP, getFID, getLCP, getTTFB, getINP } from 'web-vitals';

export interface PerformanceMetrics {
  // Core Web Vitals
  LCP?: number; // Largest Contentful Paint
  FCP?: number; // First Contentful Paint
  CLS?: number; // Cumulative Layout Shift
  FID?: number; // First Input Delay
  INP?: number; // Interaction to Next Paint
  TTFB?: number; // Time to First Byte
  
  // Custom metrics
  timestamp: number;
  url: string;
  userAgent: string;
  connectionType?: string;
  
  // Bundle metrics
  bundleLoadTime?: number;
  resourceLoadTime?: number;
  memoryUsage?: number;
}

export interface PerformanceThresholds {
  LCP: { good: number; needs_improvement: number };
  FCP: { good: number; needs_improvement: number };
  CLS: { good: number; needs_improvement: number };
  FID: { good: number; needs_improvement: number };
  INP: { good: number; needs_improvement: number };
  TTFB: { good: number; needs_improvement: number };
}

export type PerformanceSubscriber = (metrics: PerformanceMetrics) => void;

// Performance thresholds based on Google's recommendations
const PERFORMANCE_THRESHOLDS: PerformanceThresholds = {
  LCP: { good: 2500, needs_improvement: 4000 },
  FCP: { good: 1800, needs_improvement: 3000 },
  CLS: { good: 0.1, needs_improvement: 0.25 },
  FID: { good: 100, needs_improvement: 300 },
  INP: { good: 200, needs_improvement: 500 },
  TTFB: { good: 800, needs_improvement: 1800 },
};

class PerformanceMonitor {
  private metrics: PerformanceMetrics;
  private subscribers: Set<PerformanceSubscriber> = new Set();
  private isInitialized = false;
  private bundleLoadStartTime?: number;

  constructor() {
    this.metrics = {
      timestamp: Date.now(),
      url: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      connectionType: this.getConnectionType(),
    };
  }

  /**
   * Initialize performance monitoring
   */
  public initialize(): void {
    if (this.isInitialized || typeof window === 'undefined') {
      return;
    }

    this.isInitialized = true;
    this.bundleLoadStartTime = performance.now();

    // Initialize Web Vitals monitoring
    this.initializeWebVitals();
    
    // Monitor resource loading
    this.monitorResourceLoading();
    
    // Monitor memory usage
    this.monitorMemoryUsage();
    
    // Set up periodic reporting
    this.startPeriodicReporting();

    console.log('🚀 Performance monitoring initialized');
  }

  /**
   * Subscribe to performance metric updates
   */
  public subscribe(callback: PerformanceSubscriber): () => void {
    this.subscribers.add(callback);
    
    // Immediately call with current metrics
    callback(this.metrics);
    
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Get current performance metrics
   */
  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Get performance score (0-100)
   */
  public getPerformanceScore(): number {
    const { LCP, FCP, CLS, FID } = this.metrics;
    
    if (!LCP || !FCP || CLS === undefined || !FID) {
      return 0;
    }

    let score = 0;
    let totalMetrics = 0;

    // Score LCP (25% weight)
    if (LCP <= PERFORMANCE_THRESHOLDS.LCP.good) score += 25;
    else if (LCP <= PERFORMANCE_THRESHOLDS.LCP.needs_improvement) score += 15;
    totalMetrics += 25;

    // Score FCP (25% weight)
    if (FCP <= PERFORMANCE_THRESHOLDS.FCP.good) score += 25;
    else if (FCP <= PERFORMANCE_THRESHOLDS.FCP.needs_improvement) score += 15;
    totalMetrics += 25;

    // Score CLS (25% weight)
    if (CLS <= PERFORMANCE_THRESHOLDS.CLS.good) score += 25;
    else if (CLS <= PERFORMANCE_THRESHOLDS.CLS.needs_improvement) score += 15;
    totalMetrics += 25;

    // Score FID (25% weight)
    if (FID <= PERFORMANCE_THRESHOLDS.FID.good) score += 25;
    else if (FID <= PERFORMANCE_THRESHOLDS.FID.needs_improvement) score += 15;
    totalMetrics += 25;

    return Math.round((score / totalMetrics) * 100);
  }

  /**
   * Check if performance meets good thresholds
   */
  public isPerformanceGood(): boolean {
    return this.getPerformanceScore() >= 80;
  }

  /**
   * Get performance status for each metric
   */
  public getMetricStatuses(): Record<string, 'good' | 'needs_improvement' | 'poor' | 'unknown'> {
    const { LCP, FCP, CLS, FID, INP, TTFB } = this.metrics;
    
    return {
      LCP: this.getMetricStatus('LCP', LCP),
      FCP: this.getMetricStatus('FCP', FCP),
      CLS: this.getMetricStatus('CLS', CLS),
      FID: this.getMetricStatus('FID', FID),
      INP: this.getMetricStatus('INP', INP),
      TTFB: this.getMetricStatus('TTFB', TTFB),
    };
  }

  /**
   * Mark bundle load completion
   */
  public markBundleLoaded(): void {
    if (this.bundleLoadStartTime) {
      this.updateMetrics({
        bundleLoadTime: performance.now() - this.bundleLoadStartTime,
      });
    }
  }

  /**
   * Record custom timing
   */
  public recordTiming(name: string, duration: number): void {
    console.log(`⏱️ ${name}: ${duration.toFixed(2)}ms`);
    
    // Store custom timings (could be extended to track specific operations)
    if (name === 'resourceLoad') {
      this.updateMetrics({ resourceLoadTime: duration });
    }
  }

  private initializeWebVitals(): void {
    // Get Core Web Vitals
    getCLS((metric) => {
      this.updateMetrics({ CLS: metric.value });
    });

    getFCP((metric) => {
      this.updateMetrics({ FCP: metric.value });
    });

    getFID((metric) => {
      this.updateMetrics({ FID: metric.value });
    });

    getLCP((metric) => {
      this.updateMetrics({ LCP: metric.value });
    });

    getTTFB((metric) => {
      this.updateMetrics({ TTFB: metric.value });
    });

    // Get INP (newer metric)
    getINP((metric) => {
      this.updateMetrics({ INP: metric.value });
    });
  }

  private monitorResourceLoading(): void {
    if (typeof window === 'undefined') return;

    // Monitor navigation timing
    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        const resourceLoadTime = navigation.loadEventEnd - navigation.loadEventStart;
        this.recordTiming('resourceLoad', resourceLoadTime);
      }
    });

    // Monitor resource performance
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.entryType === 'resource' && entry.name.includes('.js')) {
          console.log(`📦 Resource loaded: ${entry.name} (${entry.duration.toFixed(2)}ms)`);
        }
      });
    });

    observer.observe({ entryTypes: ['resource'] });
  }

  private monitorMemoryUsage(): void {
    if (typeof window === 'undefined' || !('memory' in performance)) return;

    const updateMemoryUsage = () => {
      const memory = (performance as any).memory;
      if (memory) {
        this.updateMetrics({
          memoryUsage: memory.usedJSHeapSize,
        });
      }
    };

    // Initial measurement
    updateMemoryUsage();

    // Periodic measurements
    setInterval(updateMemoryUsage, 30000); // Every 30 seconds
  }

  private startPeriodicReporting(): void {
    // Report metrics every 5 minutes
    setInterval(() => {
      const score = this.getPerformanceScore();
      const statuses = this.getMetricStatuses();
      
      console.log(`📊 Performance Score: ${score}/100`);
      console.log('📈 Metric Statuses:', statuses);
      
      if (score < 60) {
        console.warn('⚠️ Performance score is below recommended threshold');
      }
    }, 5 * 60 * 1000);
  }

  private getMetricStatus(
    metric: keyof PerformanceThresholds, 
    value?: number
  ): 'good' | 'needs_improvement' | 'poor' | 'unknown' {
    if (value === undefined) return 'unknown';
    
    const thresholds = PERFORMANCE_THRESHOLDS[metric];
    if (value <= thresholds.good) return 'good';
    if (value <= thresholds.needs_improvement) return 'needs_improvement';
    return 'poor';
  }

  private getConnectionType(): string | undefined {
    if (typeof navigator === 'undefined') return undefined;
    
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    return connection?.effectiveType || undefined;
  }

  private updateMetrics(newMetrics: Partial<PerformanceMetrics>): void {
    this.metrics = {
      ...this.metrics,
      ...newMetrics,
      timestamp: Date.now(),
    };

    // Notify subscribers
    this.subscribers.forEach(callback => {
      try {
        callback(this.metrics);
      } catch (error) {
        console.error('Error in performance subscriber:', error);
      }
    });
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Auto-initialize in browser environment
if (typeof window !== 'undefined') {
  // Initialize after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      performanceMonitor.initialize();
    });
  } else {
    performanceMonitor.initialize();
  }
  
  // Mark bundle as loaded when window loads
  window.addEventListener('load', () => {
    performanceMonitor.markBundleLoaded();
  });
}

// Utility functions
export const getPerformanceMetrics = () => performanceMonitor.getMetrics();
export const getPerformanceScore = () => performanceMonitor.getPerformanceScore();
export const isPerformanceGood = () => performanceMonitor.isPerformanceGood();
export const subscribeToPerformance = (callback: PerformanceSubscriber) => 
  performanceMonitor.subscribe(callback);

export default performanceMonitor;