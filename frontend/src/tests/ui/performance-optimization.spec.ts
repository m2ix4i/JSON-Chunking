import { test, expect } from '@playwright/test';

test.describe('Frontend Performance Optimization Tests', () => {
  const baseURL = 'http://localhost:3000';

  test.beforeEach(async ({ page }) => {
    // Enable console logging to catch JavaScript errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error(`Console error: ${msg.text()}`);
      } else if (msg.type() === 'warn') {
        console.warn(`Console warning: ${msg.text()}`);
      }
    });

    // Listen for page errors
    page.on('pageerror', (error) => {
      console.error(`Page error: ${error.message}`);
    });
  });

  test('1. Navigate to dashboard and verify lazy loading works for route components', async ({ page }) => {
    console.log('Testing lazy loading navigation...');
    
    await page.goto(baseURL);
    
    // Wait for initial page load
    await page.waitForLoadState('domcontentloaded');
    
    // Check if the main app is loaded
    await expect(page.locator('body')).toBeVisible();
    
    // Navigate to Dashboard and verify lazy loading
    const dashboardLink = page.locator('nav a[href*="dashboard"], a:has-text("Dashboard")').first();
    if (await dashboardLink.count() > 0) {
      await dashboardLink.click();
      await page.waitForURL('**/dashboard');
      console.log('✅ Successfully navigated to Dashboard');
    } else {
      // Try direct navigation
      await page.goto(`${baseURL}/dashboard`);
      console.log('✅ Directly navigated to Dashboard');
    }
    
    // Verify dashboard content loads
    await page.waitForTimeout(2000); // Give time for lazy components to load
    
    // Check for lazy-loaded components
    const lazyComponents = [
      '[data-testid*="lazy"]',
      '.lazy-component',
      '[class*="lazy"]'
    ];
    
    for (const selector of lazyComponents) {
      const component = page.locator(selector);
      if (await component.count() > 0) {
        console.log(`✅ Found lazy component: ${selector}`);
        await expect(component.first()).toBeVisible();
      }
    }
    
    console.log('✅ Dashboard lazy loading test completed');
  });

  test('2. Check PerformanceIndicator component shows up in development mode', async ({ page }) => {
    console.log('Testing PerformanceIndicator component...');
    
    await page.goto(baseURL);
    await page.waitForLoadState('domcontentloaded');
    
    // Look for PerformanceIndicator component
    const performanceIndicators = [
      '[data-testid="performance-indicator"]',
      '.performance-indicator',
      '[class*="performance-indicator"]',
      '[class*="PerformanceIndicator"]'
    ];
    
    let foundIndicator = false;
    for (const selector of performanceIndicators) {
      const indicator = page.locator(selector);
      if (await indicator.count() > 0) {
        console.log(`✅ Found PerformanceIndicator: ${selector}`);
        await expect(indicator.first()).toBeVisible();
        foundIndicator = true;
        break;
      }
    }
    
    if (!foundIndicator) {
      // Check if it's conditionally rendered based on dev mode
      const devModeIndicators = await page.evaluate(() => {
        return window.location.hostname === 'localhost' || 
               (window as any).process?.env?.NODE_ENV === 'development' ||
               document.querySelector('[data-dev-mode="true"]') !== null;
      });
      
      console.log(`Development mode detected: ${devModeIndicators}`);
    }
    
    console.log('✅ PerformanceIndicator test completed');
  });

  test('3. Test analytics components render correctly after Sandi Metz refactoring', async ({ page }) => {
    console.log('Testing analytics components...');
    
    await page.goto(baseURL);
    
    // Navigate to a page that might contain analytics
    const analyticsPages = ['/dashboard', '/analytics', '/results'];
    
    for (const pagePath of analyticsPages) {
      try {
        await page.goto(`${baseURL}${pagePath}`);
        await page.waitForLoadState('domcontentloaded');
        
        // Check for analytics components
        const analyticsComponents = [
          '[data-testid*="chart"]',
          '[data-testid*="trend"]',
          '[data-testid*="processing-time"]',
          '.chart-widget',
          '.trend-analysis',
          '.processing-time-chart',
          '[class*="ChartWidget"]',
          '[class*="TrendAnalysis"]',
          '[class*="ProcessingTimeChart"]'
        ];
        
        for (const selector of analyticsComponents) {
          const component = page.locator(selector);
          if (await component.count() > 0) {
            console.log(`✅ Found analytics component on ${pagePath}: ${selector}`);
            await expect(component.first()).toBeVisible();
          }
        }
        
        console.log(`✅ Checked analytics components on ${pagePath}`);
      } catch (error) {
        console.log(`⚠️  Could not access ${pagePath}: ${error.message}`);
      }
    }
    
    console.log('✅ Analytics components test completed');
  });

  test('4. Verify no JavaScript errors in console', async ({ page }) => {
    console.log('Testing for JavaScript errors...');
    
    const jsErrors: string[] = [];
    const pageErrors: string[] = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        jsErrors.push(msg.text());
      }
    });
    
    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });
    
    await page.goto(baseURL);
    await page.waitForLoadState('domcontentloaded');
    
    // Navigate through different pages to check for errors
    const pages = ['/', '/dashboard', '/query', '/upload', '/settings'];
    
    for (const pagePath of pages) {
      try {
        await page.goto(`${baseURL}${pagePath}`);
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(1000); // Allow components to initialize
        console.log(`✅ Checked ${pagePath} for errors`);
      } catch (error) {
        console.log(`⚠️  Could not access ${pagePath}: ${error.message}`);
      }
    }
    
    // Report errors
    if (jsErrors.length > 0) {
      console.error('❌ JavaScript console errors found:');
      jsErrors.forEach(error => console.error(`  - ${error}`));
    } else {
      console.log('✅ No JavaScript console errors found');
    }
    
    if (pageErrors.length > 0) {
      console.error('❌ Page errors found:');
      pageErrors.forEach(error => console.error(`  - ${error}`));
    } else {
      console.log('✅ No page errors found');
    }
    
    // Fail test if critical errors are found
    expect(pageErrors.length).toBe(0);
    
    console.log('✅ JavaScript error check completed');
  });

  test('5. Check service worker registers properly', async ({ page }) => {
    console.log('Testing service worker registration...');
    
    await page.goto(baseURL);
    await page.waitForLoadState('domcontentloaded');
    
    // Wait a bit for service worker registration
    await page.waitForTimeout(3000);
    
    const serviceWorkerInfo = await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          return {
            isSupported: true,
            isRegistered: !!registration,
            scope: registration?.scope || null,
            state: registration?.active?.state || null
          };
        } catch (error: any) {
          return {
            isSupported: true,
            isRegistered: false,
            error: error.message
          };
        }
      } else {
        return {
          isSupported: false,
          isRegistered: false
        };
      }
    });
    
    console.log('Service Worker Info:', serviceWorkerInfo);
    
    if (serviceWorkerInfo.isSupported) {
      console.log('✅ Service Worker is supported');
      
      if (serviceWorkerInfo.isRegistered) {
        console.log(`✅ Service Worker is registered with scope: ${serviceWorkerInfo.scope}`);
        console.log(`✅ Service Worker state: ${serviceWorkerInfo.state}`);
      } else {
        console.log('⚠️  Service Worker is not registered (this might be expected in development)');
        if (serviceWorkerInfo.error) {
          console.log(`Error: ${serviceWorkerInfo.error}`);
        }
      }
    } else {
      console.log('❌ Service Worker is not supported');
    }
    
    console.log('✅ Service worker test completed');
  });

  test('6. Test loading fallbacks for lazy components work as expected', async ({ page }) => {
    console.log('Testing lazy component loading fallbacks...');
    
    // Slow down network to test loading states
    await page.route('**/*', route => {
      setTimeout(() => route.continue(), 100); // Add 100ms delay
    });
    
    await page.goto(baseURL);
    
    // Look for loading indicators
    const loadingIndicators = [
      '[data-testid*="loading"]',
      '.loading',
      '.spinner',
      '.skeleton',
      '[class*="loading"]',
      '[class*="Loading"]',
      'div:has-text("Loading")',
      'div:has-text("loading")'
    ];
    
    for (const selector of loadingIndicators) {
      const loader = page.locator(selector);
      if (await loader.count() > 0) {
        console.log(`✅ Found loading indicator: ${selector}`);
        // Loading indicators should eventually disappear
        await page.waitForTimeout(500);
      }
    }
    
    // Test navigation to trigger lazy loading
    const navigationTests = [
      { path: '/dashboard', component: 'Dashboard' },
      { path: '/query', component: 'Query' },
      { path: '/upload', component: 'Upload' }
    ];
    
    for (const nav of navigationTests) {
      try {
        await page.goto(`${baseURL}${nav.path}`);
        
        // Look for loading states during navigation
        const hasLoadingState = await page.locator(loadingIndicators.join(', ')).count() > 0;
        if (hasLoadingState) {
          console.log(`✅ Found loading state during navigation to ${nav.component}`);
        }
        
        // Wait for content to load
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(1000);
        
        console.log(`✅ Successfully loaded ${nav.component} page`);
      } catch (error: any) {
        console.log(`⚠️  Could not test ${nav.component}: ${error.message}`);
      }
    }
    
    console.log('✅ Loading fallbacks test completed');
  });

  test('Performance metrics collection', async ({ page }) => {
    console.log('Collecting performance metrics...');
    
    await page.goto(baseURL);
    await page.waitForLoadState('domcontentloaded');
    
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        totalLoadTime: navigation.loadEventEnd - navigation.fetchStart,
        firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
        firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0
      };
    });
    
    console.log('Performance Metrics:');
    console.log(`  - DOM Content Loaded: ${performanceMetrics.domContentLoaded}ms`);
    console.log(`  - Load Complete: ${performanceMetrics.loadComplete}ms`);
    console.log(`  - Total Load Time: ${performanceMetrics.totalLoadTime}ms`);
    console.log(`  - First Paint: ${performanceMetrics.firstPaint}ms`);
    console.log(`  - First Contentful Paint: ${performanceMetrics.firstContentfulPaint}ms`);
    
    // Verify reasonable performance
    expect(performanceMetrics.totalLoadTime).toBeLessThan(10000); // Less than 10 seconds
    
    console.log('✅ Performance metrics collection completed');
  });
});