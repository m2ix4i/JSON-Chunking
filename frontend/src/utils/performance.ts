/**
 * Performance monitoring utilities with Web Vitals integration.
 * Tracks Core Web Vitals and provides performance insights.
 */

import { onCLS, onFCP, onFID, onINP, onLCP, onTTFB, type Metric } from 'web-vitals';

export interface PerformanceMetrics {
  // Core Web Vitals
  CLS: number | null;      // Cumulative Layout Shift
  FCP: number | null;      // First Contentful Paint
  FID: number | null;      // First Input Delay (deprecated, use INP)
  INP: number | null;      // Interaction to Next Paint
  LCP: number | null;      // Largest Contentful Paint
  TTFB: number | null;     // Time to First Byte
  
  // Custom metrics
  navigationStart: number;
  domContentLoaded: number;
  loadComplete: number;
  
  // Performance scores
  performanceScore: number;
  warnings: string[];
}

export interface PerformanceThresholds {
  CLS: { good: 0.1; poor: 0.25 };
  FCP: { good: 1800; poor: 3000 };
  FID: { good: 100; poor: 300 };
  INP: { good: 200; poor: 500 };
  LCP: { good: 2500; poor: 4000 };
  TTFB: { good: 800; poor: 1800 };
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics;
  private callbacks: ((metrics: PerformanceMetrics) => void)[] = [];
  private isMonitoring: boolean = false;

  constructor() {
    this.metrics = {
      CLS: null,
      FCP: null,
      FID: null,
      INP: null,
      LCP: null,
      TTFB: null,
      navigationStart: performance.timeOrigin,
      domContentLoaded: 0,
      loadComplete: 0,
      performanceScore: 0,
      warnings: [],
    };
  }

  /**
   * Initialize performance monitoring
   */
  public init(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    
    // Track Core Web Vitals
    onCLS(this.handleMetric);
    onFCP(this.handleMetric);
    onFID(this.handleMetric);
    onINP(this.handleMetric);
    onLCP(this.handleMetric);
    onTTFB(this.handleMetric);
    
    // Track DOM events
    this.trackDOMEvents();
    
    // Track custom performance metrics
    this.trackCustomMetrics();
    
    console.log('🚀 Performance monitoring initialized');
  }

  /**
   * Subscribe to performance metric updates
   */
  public subscribe(callback: (metrics: PerformanceMetrics) => void): () => void {
    this.callbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.callbacks.indexOf(callback);
      if (index > -1) {
        this.callbacks.splice(index, 1);
      }
    };
  }

  /**
   * Get current performance metrics
   */
  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Calculate performance score (0-100)
   */
  public calculateScore(): number {
    const thresholds: PerformanceThresholds = {
      CLS: { good: 0.1, poor: 0.25 },
      FCP: { good: 1800, poor: 3000 },
      FID: { good: 100, poor: 300 },
      INP: { good: 200, poor: 500 },
      LCP: { good: 2500, poor: 4000 },
      TTFB: { good: 800, poor: 1800 },
    };

    let totalScore = 0;
    let metricsCount = 0;

    // Score each metric
    Object.keys(thresholds).forEach((metricName) => {
      const value = this.metrics[metricName as keyof PerformanceMetrics] as number | null;
      if (value !== null) {
        const threshold = thresholds[metricName as keyof PerformanceThresholds];
        let score = 100;
        
        if (value > threshold.poor) {
          score = 0;
        } else if (value > threshold.good) {
          // Linear interpolation between good and poor
          const range = threshold.poor - threshold.good;
          const excess = value - threshold.good;
          score = Math.max(0, 100 - (excess / range) * 100);
        }
        
        totalScore += score;
        metricsCount++;
      }
    });

    return metricsCount > 0 ? Math.round(totalScore / metricsCount) : 0;
  }

  /**
   * Generate performance warnings
   */
  public generateWarnings(): string[] {
    const warnings: string[] = [];
    const thresholds: PerformanceThresholds = {
      CLS: { good: 0.1, poor: 0.25 },
      FCP: { good: 1800, poor: 3000 },
      FID: { good: 100, poor: 300 },
      INP: { good: 200, poor: 500 },
      LCP: { good: 2500, poor: 4000 },
      TTFB: { good: 800, poor: 1800 },
    };

    // Check each metric against thresholds
    if (this.metrics.LCP && this.metrics.LCP > thresholds.LCP.poor) {
      warnings.push(`Largest Contentful Paint is slow (${this.metrics.LCP}ms). Consider optimizing images and critical resources.`);
    }
    
    if (this.metrics.FCP && this.metrics.FCP > thresholds.FCP.poor) {
      warnings.push(`First Contentful Paint is slow (${this.metrics.FCP}ms). Optimize critical rendering path.`);
    }
    
    if (this.metrics.CLS && this.metrics.CLS > thresholds.CLS.poor) {
      warnings.push(`Cumulative Layout Shift is high (${this.metrics.CLS}). Add size attributes to images and reserve space for dynamic content.`);
    }
    
    if (this.metrics.INP && this.metrics.INP > thresholds.INP.poor) {
      warnings.push(`Interaction to Next Paint is slow (${this.metrics.INP}ms). Optimize JavaScript execution and reduce main thread blocking.`);
    }
    
    if (this.metrics.TTFB && this.metrics.TTFB > thresholds.TTFB.poor) {
      warnings.push(`Time to First Byte is slow (${this.metrics.TTFB}ms). Optimize server response time and consider CDN.`);
    }

    return warnings;
  }

  /**
   * Handle Web Vitals metric updates
   */
  private handleMetric = (metric: Metric): void => {
    // Update metrics
    this.metrics[metric.name as keyof PerformanceMetrics] = metric.value as any;
    
    // Recalculate score and warnings
    this.metrics.performanceScore = this.calculateScore();
    this.metrics.warnings = this.generateWarnings();
    
    // Notify subscribers
    this.notifySubscribers();
    
    // Log metric for debugging
    console.log(`📊 ${metric.name}: ${metric.value}`, {
      score: this.metrics.performanceScore,
      delta: metric.delta,
      id: metric.id,
    });
  };

  /**
   * Track DOM events
   */
  private trackDOMEvents(): void {
    // DOM Content Loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.metrics.domContentLoaded = performance.now();
        this.notifySubscribers();
      });
    } else {
      this.metrics.domContentLoaded = performance.now();
    }

    // Window Load
    if (document.readyState !== 'complete') {
      window.addEventListener('load', () => {
        this.metrics.loadComplete = performance.now();
        this.notifySubscribers();
      });
    } else {
      this.metrics.loadComplete = performance.now();
    }
  }

  /**
   * Track custom performance metrics
   */
  private trackCustomMetrics(): void {
    // Track long tasks
    if ('PerformanceObserver' in window) {
      try {
        const longTaskObserver = new PerformanceObserver((list) => {
          const longTasks = list.getEntries();
          if (longTasks.length > 0) {
            console.warn(`⚠️ Detected ${longTasks.length} long tasks`, longTasks);
          }
        });
        longTaskObserver.observe({ entryTypes: ['longtask'] });
      } catch (e) {
        console.warn('Long task observer not supported');
      }
    }

    // Track navigation timing
    if (performance.getEntriesByType) {
      const navigationEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
      if (navigationEntries.length > 0) {
        const nav = navigationEntries[0];
        console.log('📈 Navigation Timing:', {
          domContentLoaded: nav.domContentLoadedEventEnd - nav.domContentLoadedEventStart,
          loadComplete: nav.loadEventEnd - nav.loadEventStart,
          ttfb: nav.responseStart - nav.requestStart,
        });
      }
    }
  }

  /**
   * Notify all subscribers of metric updates
   */
  private notifySubscribers(): void {
    this.callbacks.forEach(callback => {
      try {
        callback(this.getMetrics());
      } catch (error) {
        console.error('Performance callback error:', error);
      }
    });
  }

  /**
   * Export performance report
   */
  public exportReport(): string {
    const report = {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      metrics: this.getMetrics(),
      performanceEntries: {
        navigation: performance.getEntriesByType('navigation'),
        resource: performance.getEntriesByType('resource').slice(-10), // Last 10 resources
        paint: performance.getEntriesByType('paint'),
      },
    };

    return JSON.stringify(report, null, 2);
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// Auto-initialize in browser environment
if (typeof window !== 'undefined') {
  // Initialize after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      performanceMonitor.init();
    });
  } else {
    performanceMonitor.init();
  }
}

// Helper functions
export const getPerformanceMetrics = () => performanceMonitor.getMetrics();
export const subscribeToPerformance = (callback: (metrics: PerformanceMetrics) => void) =>
  performanceMonitor.subscribe(callback);
export const exportPerformanceReport = () => performanceMonitor.exportReport();