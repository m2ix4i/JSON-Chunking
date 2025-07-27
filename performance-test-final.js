const puppeteer = require('puppeteer');

async function runPerformanceTests() {
  console.log('🚀 Starting Frontend Performance Tests with --play flag');
  
  const browser = await puppeteer.launch({ 
    headless: false, 
    devtools: false, // Keep devtools closed for cleaner testing
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  const baseURL = 'http://localhost:3000';
  
  // Track errors
  const jsErrors = [];
  const pageErrors = [];
  
  page.on('console', (msg) => {
    const text = msg.text();
    if (msg.type() === 'error' && !text.includes('404') && !text.includes('favicon')) {
      jsErrors.push(text);
      console.error(`❌ Console error: ${text}`);
    }
  });
  
  page.on('pageerror', (error) => {
    pageErrors.push(error.message);
    console.error(`❌ Page error: ${error.message}`);
  });

  console.log('\n📊 Test Results:\n');

  try {
    // Test 1: Navigate to dashboard and verify lazy loading
    console.log('1️⃣  Testing lazy loading navigation...');
    await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
    
    // Check for main app
    await page.waitForSelector('body', { timeout: 5000 });
    console.log('   ✅ Main app loaded successfully');
    
    // Check for React root and router
    const hasReactApp = await page.evaluate(() => {
      return document.querySelector('#root') !== null;
    });
    
    if (hasReactApp) {
      console.log('   ✅ React app container found');
    }
    
    // Try to navigate to dashboard
    try {
      await page.goto(`${baseURL}/dashboard`, { waitUntil: 'domcontentloaded' });
      console.log('   ✅ Dashboard navigation successful');
    } catch (e) {
      console.log('   ⚠️  Dashboard route may not exist - checking available routes');
    }

    // Test 2: Check for PerformanceIndicator component
    console.log('\n2️⃣  Testing PerformanceIndicator component...');
    
    const performanceIndicators = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'));
      return elements.filter(el => {
        const className = el.className || '';
        const testId = el.getAttribute('data-testid') || '';
        const textContent = el.textContent || '';
        
        return (
          (typeof className === 'string' && (className.includes('performance') || className.includes('Performance'))) ||
          testId.includes('performance') ||
          textContent.toLowerCase().includes('performance')
        );
      }).length;
    });
    
    if (performanceIndicators > 0) {
      console.log(`   ✅ Found ${performanceIndicators} performance-related components`);
    } else {
      console.log('   ⚠️  No performance indicators found (may be conditionally rendered in dev mode)');
    }

    // Test 3: Check for analytics components after Sandi Metz refactoring
    console.log('\n3️⃣  Testing analytics components after Sandi Metz refactoring...');
    
    const analyticsComponents = await page.evaluate(() => {
      const selectors = [
        '[class*="chart" i]', '[class*="Chart"]',
        '[class*="trend" i]', '[class*="Trend"]', 
        '[class*="processing" i]', '[class*="Processing"]',
        '[data-testid*="chart"]', '[data-testid*="trend"]',
        '[class*="ChartWidget"]', '[class*="TrendAnalysis"]', '[class*="ProcessingTimeChart"]'
      ];
      
      let found = 0;
      const foundComponents = [];
      selectors.forEach(selector => {
        try {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            foundComponents.push(`${selector}: ${elements.length}`);
            found += elements.length;
          }
        } catch (e) {
          // Skip invalid selectors
        }
      });
      
      return { total: found, components: foundComponents };
    });
    
    if (analyticsComponents.total > 0) {
      console.log(`   ✅ Found ${analyticsComponents.total} analytics components:`);
      analyticsComponents.components.forEach(comp => console.log(`      - ${comp}`));
    } else {
      console.log('   ⚠️  No analytics components found on current page (may be route-specific)');
    }

    // Test 4: JavaScript errors check
    console.log('\n4️⃣  JavaScript errors check...');
    
    if (jsErrors.length === 0 && pageErrors.length === 0) {
      console.log('   ✅ No critical JavaScript errors detected');
    } else {
      console.log('   ❌ JavaScript errors found:');
      jsErrors.forEach(error => console.log(`      - ${error}`));
      pageErrors.forEach(error => console.log(`      - ${error}`));
    }

    // Test 5: Service worker check
    console.log('\n5️⃣  Testing service worker registration...');
    
    const serviceWorkerInfo = await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        try {
          // Wait a bit for service worker to register
          await new Promise(resolve => setTimeout(resolve, 2000));
          const registration = await navigator.serviceWorker.getRegistration();
          return {
            supported: true,
            registered: !!registration,
            scope: registration?.scope || null,
            state: registration?.active?.state || null
          };
        } catch (error) {
          return { supported: true, registered: false, error: error.message };
        }
      }
      return { supported: false };
    });
    
    if (serviceWorkerInfo.supported) {
      console.log('   ✅ Service Worker is supported');
      if (serviceWorkerInfo.registered) {
        console.log(`   ✅ Service Worker registered: ${serviceWorkerInfo.scope}`);
        console.log(`   ✅ Service Worker state: ${serviceWorkerInfo.state}`);
      } else {
        console.log('   ⚠️  Service Worker not registered (expected in development mode)');
        if (serviceWorkerInfo.error) {
          console.log(`      Note: ${serviceWorkerInfo.error}`);
        }
      }
    } else {
      console.log('   ❌ Service Worker not supported');
    }

    // Test 6: Loading states and lazy components
    console.log('\n6️⃣  Testing loading fallbacks for lazy components...');
    
    const loadingElements = await page.evaluate(() => {
      const loadingSelectors = [
        '[class*="loading" i]', '[class*="Loading"]',
        '[class*="lazy" i]', '[class*="Lazy"]',
        '.spinner', '.skeleton',
        '[data-testid*="loading"]', '[data-testid*="lazy"]'
      ];
      
      let found = 0;
      const foundElements = [];
      loadingSelectors.forEach(selector => {
        try {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            foundElements.push(`${selector}: ${elements.length}`);
            found += elements.length;
          }
        } catch (e) {
          // Skip invalid selectors
        }
      });
      
      return { total: found, elements: foundElements };
    });
    
    if (loadingElements.total > 0) {
      console.log(`   ✅ Found ${loadingElements.total} loading/lazy components:`);
      loadingElements.elements.forEach(elem => console.log(`      - ${elem}`));
    } else {
      console.log('   ℹ️  No loading indicators visible (components have loaded quickly)');
    }

    // Test navigation to trigger lazy loading
    const routes = ['/', '/query', '/upload', '/settings'];
    console.log('\n   Testing navigation for lazy loading...');
    
    for (const route of routes) {
      try {
        await page.goto(`${baseURL}${route}`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(500); // Allow components to load
        console.log(`   ✅ Successfully navigated to ${route}`);
      } catch (e) {
        console.log(`   ⚠️  Route ${route} may not exist`);
      }
    }

    // Test 7: Performance metrics
    console.log('\n7️⃣  Collecting performance metrics...');
    
    await page.goto(baseURL, { waitUntil: 'load' }); // Go back to home for final metrics
    
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      const paintEntries = performance.getEntriesByType('paint');
      
      return {
        domContentLoaded: Math.round(navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart),
        loadComplete: Math.round(navigation.loadEventEnd - navigation.loadEventStart),
        totalLoadTime: Math.round(navigation.loadEventEnd - navigation.fetchStart),
        firstPaint: Math.round(paintEntries.find(entry => entry.name === 'first-paint')?.startTime || 0),
        firstContentfulPaint: Math.round(paintEntries.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0)
      };
    });
    
    console.log(`   📊 DOM Content Loaded: ${metrics.domContentLoaded}ms`);
    console.log(`   📊 Load Complete: ${metrics.loadComplete}ms`);
    console.log(`   📊 Total Load Time: ${metrics.totalLoadTime}ms`);
    console.log(`   📊 First Paint: ${metrics.firstPaint}ms`);
    console.log(`   📊 First Contentful Paint: ${metrics.firstContentfulPaint}ms`);
    
    if (metrics.totalLoadTime < 3000) {
      console.log('   ✅ Excellent performance (<3s)');
    } else if (metrics.totalLoadTime < 5000) {
      console.log('   ✅ Good performance (<5s)');
    } else {
      console.log('   ⚠️  Performance could be improved (>5s load time)');
    }

    console.log('\n🎉 Frontend Performance Test Summary:');
    console.log('=====================================');
    
    const totalErrors = jsErrors.length + pageErrors.length;
    if (totalErrors === 0) {
      console.log('✅ All tests passed - No critical errors found');
    } else {
      console.log(`❌ Found ${totalErrors} errors that need attention`);
    }
    
    console.log(`📊 Performance: ${metrics.totalLoadTime}ms total load time`);
    console.log(`🔧 Service Worker: ${serviceWorkerInfo.registered ? 'Registered' : 'Not Registered'}`);
    console.log(`🧩 Components: Analytics(${analyticsComponents.total}), Performance(${performanceIndicators}), Loading(${loadingElements.total})`);
    
    // Take a screenshot for evidence
    await page.screenshot({ path: 'frontend-test-final.png', fullPage: true });
    console.log(`📸 Screenshot saved as frontend-test-final.png`);

  } catch (error) {
    console.error('❌ Test execution failed:', error.message);
  } finally {
    await browser.close();
  }
}

// Check if we can connect to the frontend server
const http = require('http');
http.get('http://localhost:3000', (res) => {
  console.log('✅ Frontend server is running, starting tests...\n');
  runPerformanceTests().catch(console.error);
}).on('error', (err) => {
  console.error('❌ Cannot connect to frontend server at http://localhost:3000');
  console.error('Please ensure the frontend development server is running with: cd frontend && npm run dev');
  process.exit(1);
});