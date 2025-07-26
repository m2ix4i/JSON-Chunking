/**
 * Setup file for performance tests
 */

// Extend Jest matchers for performance assertions
expect.extend({
  toBeLessThanMs(received, expected) {
    const pass = received < expected;
    if (pass) {
      return {
        message: () => `Expected ${received}ms not to be less than ${expected}ms`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected ${received}ms to be less than ${expected}ms`,
        pass: false,
      };
    }
  },

  toBeWithinRange(received, floor, ceiling) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () => `Expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },

  toHavePerformanceScore(received, expectedScore) {
    const pass = received >= expectedScore;
    if (pass) {
      return {
        message: () => `Expected performance score ${received} not to be at least ${expectedScore}`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected performance score ${received} to be at least ${expectedScore}`,
        pass: false,
      };
    }
  },
});

// Global test configuration
global.PERFORMANCE_TEST_CONFIG = {
  // Base URL for testing (can be overridden by environment variables)
  baseUrl: process.env.TEST_BASE_URL || 'http://localhost:5173',
  
  // Browser configuration
  browser: {
    headless: process.env.CI === 'true' || process.env.HEADLESS === 'true',
    slowMo: process.env.SLOW_MO ? parseInt(process.env.SLOW_MO) : 0,
    devtools: process.env.DEVTOOLS === 'true',
  },
  
  // Test timeouts
  timeouts: {
    pageLoad: 30000,
    navigation: 10000,
    element: 5000,
  },
  
  // Performance thresholds (can be overridden per test)
  thresholds: {
    LCP: parseInt(process.env.LCP_THRESHOLD) || 2500,
    FCP: parseInt(process.env.FCP_THRESHOLD) || 1800,
    CLS: parseFloat(process.env.CLS_THRESHOLD) || 0.1,
    TTFB: parseInt(process.env.TTFB_THRESHOLD) || 800,
    loadTime: parseInt(process.env.LOAD_TIME_THRESHOLD) || 3000,
    bundleSize: parseInt(process.env.BUNDLE_SIZE_THRESHOLD) || 500 * 1024,
  },
};

// Console logging for performance test results
global.logPerformanceResult = (metric, value, threshold, unit = 'ms') => {
  const status = value <= threshold ? '✅' : '❌';
  const percentage = threshold > 0 ? ((value / threshold) * 100).toFixed(1) : 'N/A';
  
  console.log(`${status} ${metric}: ${value}${unit} (threshold: ${threshold}${unit}, ${percentage}%)`);
};

// Helper function to wait for network idle
global.waitForNetworkIdle = async (page, timeout = 5000) => {
  return page.waitForFunction(
    () => {
      const requests = window.performance.getEntriesByType('resource');
      const recentRequests = requests.filter(
        (request) => Date.now() - request.responseEnd < 500
      );
      return recentRequests.length === 0;
    },
    { timeout }
  );
};

// Clean up environment variables for consistent testing
delete process.env.NODE_ENV; // Let the app determine its own environment

console.log('🚀 Performance test setup complete');
console.log(`📊 Base URL: ${global.PERFORMANCE_TEST_CONFIG.baseUrl}`);
console.log(`🎯 Performance thresholds:`, global.PERFORMANCE_TEST_CONFIG.thresholds);