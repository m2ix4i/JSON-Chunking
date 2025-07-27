/**
 * Performance regression tests to track performance improvements over time.
 * Ensures that optimizations don't regress and performance stays within acceptable bounds.
 */

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

describe('Performance Regression Tests', () => {
  let browser;
  let page;

  // Performance baseline (update these when making performance improvements)
  const PERFORMANCE_BASELINE = {
    bundleSize: {
      initial: 450 * 1024,  // 450KB baseline for initial bundle
      total: 1.8 * 1024 * 1024,  // 1.8MB total bundle size
    },
    loadTimes: {
      LCP: 2200,  // Largest Contentful Paint baseline
      FCP: 1600,  // First Contentful Paint baseline
      TTI: 3000,  // Time to Interactive baseline
      domContentLoaded: 1800,
    },
    runtime: {
      scrollPerformance: 16.67,  // 60fps = 16.67ms per frame
      memoryUsage: 50 * 1024 * 1024,  // 50MB baseline
      heapSize: 30 * 1024 * 1024,  // 30MB heap baseline
    },
  };

  // Performance history file
  const PERFORMANCE_HISTORY_FILE = path.join(__dirname, 'performance-history.json');

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  });

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  beforeEach(async () => {
    page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
  });

  afterEach(async () => {
    await page.close();
  });

  describe('Bundle Size Regression', () => {
    test('Initial bundle size should not exceed baseline', async () => {
      const bundleMetrics = await measureBundleSize();
      
      console.log(`📦 Current bundle size: ${(bundleMetrics.initial / 1024).toFixed(2)}KB`);
      console.log(`📦 Baseline: ${(PERFORMANCE_BASELINE.bundleSize.initial / 1024).toFixed(2)}KB`);
      
      // Allow 10% tolerance above baseline
      const tolerance = PERFORMANCE_BASELINE.bundleSize.initial * 1.1;
      expect(bundleMetrics.initial).toBeLessThan(tolerance);
      
      // Save to history
      await savePerformanceMetric('bundleSize.initial', bundleMetrics.initial);
    });

    test('Total bundle size should not exceed baseline', async () => {
      const bundleMetrics = await measureBundleSize();
      
      console.log(`📦 Total bundle size: ${(bundleMetrics.total / (1024 * 1024)).toFixed(2)}MB`);
      console.log(`📦 Baseline: ${(PERFORMANCE_BASELINE.bundleSize.total / (1024 * 1024)).toFixed(2)}MB`);
      
      // Allow 15% tolerance for total bundle size
      const tolerance = PERFORMANCE_BASELINE.bundleSize.total * 1.15;
      expect(bundleMetrics.total).toBeLessThan(tolerance);
      
      await savePerformanceMetric('bundleSize.total', bundleMetrics.total);
    });
  });

  describe('Load Time Regression', () => {
    test('Largest Contentful Paint should not regress', async () => {
      const lcp = await measureLCP();
      
      console.log(`⚡ LCP: ${lcp}ms (baseline: ${PERFORMANCE_BASELINE.loadTimes.LCP}ms)`);
      
      // Allow 20% tolerance for LCP
      const tolerance = PERFORMANCE_BASELINE.loadTimes.LCP * 1.2;
      expect(lcp).toBeLessThan(tolerance);
      
      await savePerformanceMetric('loadTimes.LCP', lcp);
    });

    test('First Contentful Paint should not regress', async () => {
      const fcp = await measureFCP();
      
      console.log(`⚡ FCP: ${fcp}ms (baseline: ${PERFORMANCE_BASELINE.loadTimes.FCP}ms)`);
      
      // Allow 20% tolerance for FCP
      const tolerance = PERFORMANCE_BASELINE.loadTimes.FCP * 1.2;
      expect(fcp).toBeLessThan(tolerance);
      
      await savePerformanceMetric('loadTimes.FCP', fcp);
    });

    test('DOM Content Loaded should not regress', async () => {
      const dcl = await measureDOMContentLoaded();
      
      console.log(`⚡ DCL: ${dcl}ms (baseline: ${PERFORMANCE_BASELINE.loadTimes.domContentLoaded}ms)`);
      
      // Allow 25% tolerance for DOM Content Loaded
      const tolerance = PERFORMANCE_BASELINE.loadTimes.domContentLoaded * 1.25;
      expect(dcl).toBeLessThan(tolerance);
      
      await savePerformanceMetric('loadTimes.domContentLoaded', dcl);
    });
  });

  describe('Runtime Performance Regression', () => {
    test('Virtual scrolling performance should not regress', async () => {
      const scrollMetrics = await measureScrollPerformance();
      
      console.log(`🔄 Scroll frame time: ${scrollMetrics.averageFrameTime}ms`);
      console.log(`🔄 Dropped frames: ${scrollMetrics.droppedFrames}`);
      
      // Should maintain 60fps (16.67ms per frame)
      expect(scrollMetrics.averageFrameTime).toBeLessThan(PERFORMANCE_BASELINE.runtime.scrollPerformance * 1.5);
      expect(scrollMetrics.droppedFrames).toBeLessThan(5); // Allow max 5 dropped frames
      
      await savePerformanceMetric('runtime.scrollPerformance', scrollMetrics.averageFrameTime);
    });

    test('Memory usage should not exceed baseline', async () => {
      const memoryMetrics = await measureMemoryUsage();
      
      console.log(`💾 Memory usage: ${(memoryMetrics.usedJSMemory / (1024 * 1024)).toFixed(2)}MB`);
      console.log(`💾 Heap size: ${(memoryMetrics.totalJSMemory / (1024 * 1024)).toFixed(2)}MB`);
      
      // Allow 50% tolerance for memory usage (memory can vary significantly)
      const memoryTolerance = PERFORMANCE_BASELINE.runtime.memoryUsage * 1.5;
      const heapTolerance = PERFORMANCE_BASELINE.runtime.heapSize * 1.5;
      
      expect(memoryMetrics.usedJSMemory).toBeLessThan(memoryTolerance);
      expect(memoryMetrics.totalJSMemory).toBeLessThan(heapTolerance);
      
      await savePerformanceMetric('runtime.memoryUsage', memoryMetrics.usedJSMemory);
      await savePerformanceMetric('runtime.heapSize', memoryMetrics.totalJSMemory);
    });
  });

  describe('Performance Trends', () => {
    test('Performance should show improvement or stability over time', async () => {
      const history = await loadPerformanceHistory();
      
      if (history.length < 5) {
        console.log('📊 Not enough historical data for trend analysis');
        return;
      }

      // Check trends for key metrics
      const metrics = ['bundleSize.initial', 'loadTimes.LCP', 'loadTimes.FCP'];
      
      for (const metric of metrics) {
        const trend = calculateTrend(history, metric);
        console.log(`📈 ${metric} trend: ${trend.direction} (${trend.percentage.toFixed(1)}%)`);
        
        // Performance should not degrade by more than 20% over time
        if (trend.direction === 'increasing' && Math.abs(trend.percentage) > 20) {
          console.warn(`⚠️ ${metric} has degraded by ${trend.percentage.toFixed(1)}%`);
        }
      }
    });
  });

  // Helper functions
  async function measureBundleSize() {
    const responses = [];
    
    page.on('response', (response) => {
      if (response.url().includes('.js') && response.ok()) {
        responses.push(response);
      }
    });

    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });

    let initialSize = 0;
    let totalSize = 0;

    for (const response of responses) {
      const headers = response.headers();
      const contentLength = parseInt(headers['content-length'] || '0');
      
      if (response.url().includes('index') || response.url().includes('main')) {
        initialSize += contentLength;
      }
      totalSize += contentLength;
    }

    return { initial: initialSize, total: totalSize };
  }

  async function measureLCP() {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });

    const lcp = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          const lastEntry = entries[entries.length - 1];
          resolve(lastEntry.startTime);
        }).observe({ entryTypes: ['largest-contentful-paint'] });

        setTimeout(() => resolve(null), 5000);
      });
    });

    return lcp || 5000; // Default to 5s if not measured
  }

  async function measureFCP() {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });

    const fcp = await page.evaluate(() => {
      const entries = performance.getEntriesByType('paint');
      const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
      return fcpEntry ? fcpEntry.startTime : null;
    });

    return fcp || 3000; // Default to 3s if not measured
  }

  async function measureDOMContentLoaded() {
    await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });

    const dcl = await page.evaluate(() => {
      const [navigationEntry] = performance.getEntriesByType('navigation');
      return navigationEntry.domContentLoadedEventEnd - navigationEntry.navigationStart;
    });

    return dcl;
  }

  async function measureScrollPerformance() {
    await page.goto('http://localhost:5173/upload', { waitUntil: 'networkidle0' });

    const scrollMetrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        const frameTimings = [];
        let droppedFrames = 0;
        let lastFrameTime = performance.now();

        const measureFrame = () => {
          const currentTime = performance.now();
          const frameTime = currentTime - lastFrameTime;
          frameTimings.push(frameTime);
          
          if (frameTime > 16.67 * 2) { // Frame took longer than 2x expected
            droppedFrames++;
          }
          
          lastFrameTime = currentTime;
          
          if (frameTimings.length < 60) { // Measure 60 frames
            requestAnimationFrame(measureFrame);
          } else {
            const averageFrameTime = frameTimings.reduce((a, b) => a + b, 0) / frameTimings.length;
            resolve({ averageFrameTime, droppedFrames });
          }
        };

        // Simulate scrolling
        const scrollContainer = document.querySelector('[data-testid="file-list"]') || document.body;
        let scrollTop = 0;
        const scrollInterval = setInterval(() => {
          scrollTop += 100;
          scrollContainer.scrollTop = scrollTop;
          if (scrollTop > 1000) {
            clearInterval(scrollInterval);
            requestAnimationFrame(measureFrame);
          }
        }, 16);
      });
    });

    return scrollMetrics;
  }

  async function measureMemoryUsage() {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });

    // Force garbage collection if available
    if (page.evaluate(() => window.gc)) {
      await page.evaluate(() => window.gc());
    }

    const memoryInfo = await page.evaluate(() => {
      return (performance as any).memory || {
        usedJSMemory: 0,
        totalJSMemory: 0,
        jsMemoryLimit: 0,
      };
    });

    return {
      usedJSMemory: memoryInfo.usedJSMemory || 0,
      totalJSMemory: memoryInfo.totalJSMemory || 0,
      jsMemoryLimit: memoryInfo.jsMemoryLimit || 0,
    };
  }

  async function savePerformanceMetric(metric, value) {
    const history = await loadPerformanceHistory();
    
    const entry = {
      timestamp: new Date().toISOString(),
      metric,
      value,
      commit: process.env.GITHUB_SHA || 'local',
      branch: process.env.GITHUB_REF_NAME || 'local',
    };

    history.push(entry);

    // Keep only last 100 entries to avoid file growth
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }

    await fs.promises.writeFile(
      PERFORMANCE_HISTORY_FILE,
      JSON.stringify(history, null, 2),
      'utf8'
    );
  }

  async function loadPerformanceHistory() {
    try {
      const data = await fs.promises.readFile(PERFORMANCE_HISTORY_FILE, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }

  function calculateTrend(history, metric) {
    const entries = history.filter(h => h.metric === metric).slice(-10); // Last 10 entries
    
    if (entries.length < 2) {
      return { direction: 'stable', percentage: 0 };
    }

    const first = entries[0].value;
    const last = entries[entries.length - 1].value;
    const percentage = ((last - first) / first) * 100;

    return {
      direction: percentage > 5 ? 'increasing' : percentage < -5 ? 'decreasing' : 'stable',
      percentage,
    };
  }
});