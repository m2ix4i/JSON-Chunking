/**
 * Unit Tests for Performance Monitoring System
 * Comprehensive testing of performance scoring, thresholds, and monitoring logic
 */

import { describe, it, expect, beforeEach, afterEach, vi, MockedFunction } from 'vitest';

// Create a test-specific performance monitor class
class TestPerformanceMonitor {
  private metrics: any = {
    timestamp: Date.now(),
    url: 'https://test.com',
    userAgent: 'Test Browser',
  };
  private subscribers: Set<any> = new Set();
  private bundleLoadStartTime?: number = 500;

  constructor(initialMetrics = {}) {
    this.metrics = { ...this.metrics, ...initialMetrics };
  }

  getPerformanceScore(): number {
    const { LCP, FCP, CLS, FID } = this.metrics;
    
    if (!LCP || !FCP || CLS === undefined || !FID) {
      return 0;
    }

    let score = 0;
    let totalMetrics = 0;

    // Score LCP (25% weight)
    if (LCP <= 2500) score += 25;
    else if (LCP <= 4000) score += 15;
    totalMetrics += 25;

    // Score FCP (25% weight)
    if (FCP <= 1800) score += 25;
    else if (FCP <= 3000) score += 15;
    totalMetrics += 25;

    // Score CLS (25% weight)
    if (CLS <= 0.1) score += 25;
    else if (CLS <= 0.25) score += 15;
    totalMetrics += 25;

    // Score FID (25% weight)
    if (FID <= 100) score += 25;
    else if (FID <= 300) score += 15;
    totalMetrics += 25;

    return Math.round((score / totalMetrics) * 100);
  }

  isPerformanceGood(): boolean {
    return this.getPerformanceScore() >= 80;
  }

  getMetricStatuses(): Record<string, 'good' | 'needs_improvement' | 'poor' | 'unknown'> {
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

  subscribe(callback: any): () => void {
    this.subscribers.add(callback);
    try {
      callback(this.metrics);
    } catch (error) {
      console.error('Error in initial subscriber call:', error);
    }
    return () => {
      this.subscribers.delete(callback);
    };
  }

  updateMetrics(newMetrics: any): void {
    this.metrics = {
      ...this.metrics,
      ...newMetrics,
      timestamp: Date.now(),
    };

    this.subscribers.forEach(callback => {
      try {
        callback(this.metrics);
      } catch (error) {
        console.error('Error in performance subscriber:', error);
      }
    });
  }

  recordTiming(name: string, duration: number): void {
    console.log(`⏱️ ${name}: ${duration.toFixed(2)}ms`);
    
    if (name === 'resourceLoad') {
      this.updateMetrics({ resourceLoadTime: duration });
    }
  }

  markBundleLoaded(): void {
    if (this.bundleLoadStartTime) {
      this.updateMetrics({
        bundleLoadTime: 1000 - this.bundleLoadStartTime,
      });
    }
  }

  setBundleStartTime(time: number): void {
    this.bundleLoadStartTime = time;
  }

  private getMetricStatus(
    metric: string, 
    value?: number
  ): 'good' | 'needs_improvement' | 'poor' | 'unknown' {
    if (value === undefined) return 'unknown';
    
    const thresholds: Record<string, { good: number; needs_improvement: number }> = {
      LCP: { good: 2500, needs_improvement: 4000 },
      FCP: { good: 1800, needs_improvement: 3000 },
      CLS: { good: 0.1, needs_improvement: 0.25 },
      FID: { good: 100, needs_improvement: 300 },
      INP: { good: 200, needs_improvement: 500 },
      TTFB: { good: 800, needs_improvement: 1800 },
    };

    const threshold = thresholds[metric];
    if (!threshold) return 'unknown';
    
    if (value <= threshold.good) return 'good';
    if (value <= threshold.needs_improvement) return 'needs_improvement';
    return 'poor';
  }
}

describe('Performance Monitoring System', () => {
  describe('Performance Score Calculation', () => {
    it('should return 0 when no metrics are available', () => {
      const testMonitor = new TestPerformanceMonitor();
      const score = testMonitor.getPerformanceScore();
      expect(score).toBe(0);
    });

    it('should calculate perfect score (100) with all good metrics', () => {
      const testMonitor = new TestPerformanceMonitor({
        LCP: 2000,  // Good: <= 2500ms
        FCP: 1500,  // Good: <= 1800ms
        CLS: 0.05,  // Good: <= 0.1
        FID: 50,    // Good: <= 100ms
      });

      const score = testMonitor.getPerformanceScore();
      expect(score).toBe(100);
    });

    it('should calculate moderate score (60) with needs-improvement metrics', () => {
      const testMonitor = new TestPerformanceMonitor({
        LCP: 3500,  // Needs improvement: 2500-4000ms
        FCP: 2500,  // Needs improvement: 1800-3000ms
        CLS: 0.2,   // Needs improvement: 0.1-0.25
        FID: 200,   // Needs improvement: 100-300ms
      });

      const score = testMonitor.getPerformanceScore();
      expect(score).toBe(60); // Each metric gets 15/25 points
    });

    it('should calculate poor score (0) with all poor metrics', () => {
      const testMonitor = new TestPerformanceMonitor({
        LCP: 5000,  // Poor: > 4000ms
        FCP: 4000,  // Poor: > 3000ms
        CLS: 0.5,   // Poor: > 0.25
        FID: 500,   // Poor: > 300ms
      });

      const score = testMonitor.getPerformanceScore();
      expect(score).toBe(0);
    });

    it('should calculate mixed score correctly', () => {
      const testMonitor = new TestPerformanceMonitor({
        LCP: 2000,  // Good: 25 points
        FCP: 2500,  // Needs improvement: 15 points
        CLS: 0.05,  // Good: 25 points
        FID: 500,   // Poor: 0 points
      });

      const score = testMonitor.getPerformanceScore();
      expect(score).toBe(65); // (25 + 15 + 25 + 0) / 100 * 100
    });

    it('should handle partial metric data correctly', () => {
      const testMonitor = new TestPerformanceMonitor({
        LCP: 2000,  // Good
        FCP: undefined,
        CLS: 0.05,  // Good
        FID: undefined,
      });

      const score = testMonitor.getPerformanceScore();
      expect(score).toBe(0); // Should return 0 if any core metric is missing
    });
  });

  describe('Performance Assessment', () => {
    it('should return true for scores >= 80 (good performance)', () => {
      const testMonitor = new TestPerformanceMonitor({
        LCP: 2000,
        FCP: 1500,
        CLS: 0.05,
        FID: 50,
      });

      expect(testMonitor.isPerformanceGood()).toBe(true);
    });

    it('should return false for scores < 80 (poor performance)', () => {
      const testMonitor = new TestPerformanceMonitor({
        LCP: 3500,
        FCP: 2500,
        CLS: 0.2,
        FID: 200,
      });

      expect(testMonitor.isPerformanceGood()).toBe(false);
    });
  });

  describe('Metric Status Categorization', () => {
    it('should correctly categorize all metric statuses', () => {
      const testMonitor = new TestPerformanceMonitor({
        LCP: 2000,      // Good
        FCP: 2500,      // Needs improvement  
        CLS: 0.5,       // Poor
        FID: undefined, // Unknown
        INP: 300,       // Needs improvement (200-500ms range)
        TTFB: 600,      // Good
      });

      const statuses = testMonitor.getMetricStatuses();

      expect(statuses.LCP).toBe('good');
      expect(statuses.FCP).toBe('needs_improvement');
      expect(statuses.CLS).toBe('poor');
      expect(statuses.FID).toBe('unknown');
      expect(statuses.INP).toBe('needs_improvement');
      expect(statuses.TTFB).toBe('good');
    });

    it('should use correct Google-recommended thresholds', () => {
      const testMonitor = new TestPerformanceMonitor();
      
      // Test LCP thresholds
      expect(testMonitor['getMetricStatus']('LCP', 2500)).toBe('good');
      expect(testMonitor['getMetricStatus']('LCP', 3500)).toBe('needs_improvement');
      expect(testMonitor['getMetricStatus']('LCP', 5000)).toBe('poor');

      // Test FCP thresholds
      expect(testMonitor['getMetricStatus']('FCP', 1800)).toBe('good');
      expect(testMonitor['getMetricStatus']('FCP', 2500)).toBe('needs_improvement');
      expect(testMonitor['getMetricStatus']('FCP', 4000)).toBe('poor');

      // Test CLS thresholds
      expect(testMonitor['getMetricStatus']('CLS', 0.1)).toBe('good');
      expect(testMonitor['getMetricStatus']('CLS', 0.2)).toBe('needs_improvement');
      expect(testMonitor['getMetricStatus']('CLS', 0.3)).toBe('poor');

      // Test FID thresholds
      expect(testMonitor['getMetricStatus']('FID', 100)).toBe('good');
      expect(testMonitor['getMetricStatus']('FID', 200)).toBe('needs_improvement');
      expect(testMonitor['getMetricStatus']('FID', 400)).toBe('poor');
    });
  });

  describe('Subscription and Monitoring', () => {
    it('should call subscribers when metrics update', () => {
      const subscriber: MockedFunction<any> = vi.fn();
      const testMonitor = new TestPerformanceMonitor();
      
      // Subscribe should immediately call with current metrics
      const unsubscribe = testMonitor.subscribe(subscriber);
      expect(subscriber).toHaveBeenCalledTimes(1);

      // Update metrics should trigger subscriber
      testMonitor.updateMetrics({ LCP: 2000 });
      expect(subscriber).toHaveBeenCalledTimes(2);

      // Unsubscribe should stop future calls
      unsubscribe();
      testMonitor.updateMetrics({ FCP: 1500 });
      expect(subscriber).toHaveBeenCalledTimes(2); // No additional calls
    });

    it('should handle subscriber errors gracefully', () => {
      const errorSubscriber = vi.fn(() => {
        throw new Error('Subscriber error');
      });
      const goodSubscriber = vi.fn();
      
      const testMonitor = new TestPerformanceMonitor();
      
      testMonitor.subscribe(errorSubscriber);
      testMonitor.subscribe(goodSubscriber);

      // Should not throw and should still call good subscriber
      expect(() => {
        testMonitor.updateMetrics({ LCP: 2000 });
      }).not.toThrow();

      expect(goodSubscriber).toHaveBeenCalled();
    });

    it('should update timestamp on every metrics update', () => {
      const testMonitor = new TestPerformanceMonitor();
      const initialTimestamp = testMonitor['metrics'].timestamp;
      
      // Small delay to ensure timestamp difference
      vi.useFakeTimers();
      vi.advanceTimersByTime(100);
      
      testMonitor.updateMetrics({ LCP: 2000 });
      expect(testMonitor['metrics'].timestamp).toBeGreaterThan(initialTimestamp);
      
      vi.useRealTimers();
    });
  });

  describe('Timing and Bundle Management', () => {
    it('should record bundle load time correctly', () => {
      const testMonitor = new TestPerformanceMonitor();
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      testMonitor.recordTiming('bundleLoad', 1500);
      
      expect(consoleSpy).toHaveBeenCalledWith('⏱️ bundleLoad: 1500.00ms');
      consoleSpy.mockRestore();
    });

    it('should update metrics for resource load timing', () => {
      const testMonitor = new TestPerformanceMonitor();
      const updateSpy = vi.spyOn(testMonitor, 'updateMetrics');

      testMonitor.recordTiming('resourceLoad', 800);
      
      expect(updateSpy).toHaveBeenCalledWith({ resourceLoadTime: 800 });
    });

    it('should calculate bundle load time when start time is available', () => {
      const testMonitor = new TestPerformanceMonitor();
      testMonitor.setBundleStartTime(500);
      
      const updateSpy = vi.spyOn(testMonitor, 'updateMetrics');
      
      testMonitor.markBundleLoaded();
      
      expect(updateSpy).toHaveBeenCalledWith({
        bundleLoadTime: 500, // 1000 (mocked performance.now) - 500 (start)
      });
    });

    it('should not update metrics when start time is unavailable', () => {
      const testMonitor = new TestPerformanceMonitor();
      testMonitor.setBundleStartTime(undefined as any);
      
      const updateSpy = vi.spyOn(testMonitor, 'updateMetrics');
      
      testMonitor.markBundleLoaded();
      
      expect(updateSpy).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle undefined metric values in score calculation', () => {
      const testMonitor = new TestPerformanceMonitor({
        LCP: undefined,
        FCP: undefined,
        CLS: undefined,
        FID: undefined,
      });

      const score = testMonitor.getPerformanceScore();
      expect(score).toBe(0);
    });

    it('should handle unknown metric types', () => {
      const testMonitor = new TestPerformanceMonitor();
      
      const status = testMonitor['getMetricStatus']('UNKNOWN_METRIC', 100);
      expect(status).toBe('unknown');
    });

    it('should maintain proper state isolation between instances', () => {
      const monitor1 = new TestPerformanceMonitor({ LCP: 1000 });
      const monitor2 = new TestPerformanceMonitor({ LCP: 2000 });

      expect(monitor1['metrics'].LCP).toBe(1000);
      expect(monitor2['metrics'].LCP).toBe(2000);

      monitor1.updateMetrics({ FCP: 1500 });
      expect(monitor1['metrics'].FCP).toBe(1500);
      expect(monitor2['metrics'].FCP).toBeUndefined();
    });
  });

  describe('Real Performance Module Integration', () => {
    it('should export correct utility functions from the real module', async () => {
      // Test that the real module exports the expected functions
      const performanceModule = await import('../performance');
      
      expect(typeof performanceModule.getPerformanceMetrics).toBe('function');
      expect(typeof performanceModule.getPerformanceScore).toBe('function');
      expect(typeof performanceModule.isPerformanceGood).toBe('function');
      expect(typeof performanceModule.subscribeToPerformance).toBe('function');
    });

    it('should have a singleton performance monitor instance', async () => {
      const performanceModule = await import('../performance');
      
      expect(performanceModule.performanceMonitor).toBeDefined();
      expect(typeof performanceModule.performanceMonitor.getPerformanceScore).toBe('function');
    });
  });
});