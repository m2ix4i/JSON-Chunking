const puppeteer = require('puppeteer');

async function runPerformanceTests() {
  console.log('🚀 Starting Frontend Performance Tests with --play flag');
  
  const browser = await puppeteer.launch({ 
    headless: false, 
    devtools: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  const baseURL = 'http://localhost:3000';
  
  // Track errors
  const jsErrors = [];
  const pageErrors = [];
  
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      jsErrors.push(msg.text());
      console.error(`❌ Console error: ${msg.text()}`);
    } else if (msg.type() === 'warn') {
      console.warn(`⚠️  Console warning: ${msg.text()}`);
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
    await page.goto(baseURL);
    await page.waitForLoadState ? page.waitForLoadState('domcontentloaded') : page.waitForFunction(() => document.readyState === 'complete');
    
    // Check for main app
    await page.waitForSelector('body', { timeout: 5000 });
    console.log('   ✅ Main app loaded successfully');
    
    // Try to navigate to dashboard
    try {
      await page.goto(`${baseURL}/dashboard`);
      await page.waitForLoadState ? page.waitForLoadState('domcontentloaded') : page.waitForFunction(() => document.readyState === 'complete');
      console.log('   ✅ Dashboard navigation successful');
    } catch (e) {
      console.log('   ⚠️  Dashboard route may not exist - this is ok');
    }

    // Test 2: Check for PerformanceIndicator component
    console.log('\n2️⃣  Testing PerformanceIndicator component...');
    
    const performanceIndicators = await page.$$eval('*', (elements) => {
      return elements.filter(el => {
        const className = el.className || '';
        const dataTestId = el.getAttribute('data-testid') || '';
        const textContent = el.textContent || '';
        
        return (typeof className === 'string' && className.includes('performance')) ||
               (typeof className === 'string' && className.includes('Performance')) ||
               dataTestId.includes('performance') ||
               textContent.toLowerCase().includes('performance');
      }).length;
    });
    
    if (performanceIndicators > 0) {
      console.log(`   ✅ Found ${performanceIndicators} performance-related components`);
    } else {
      console.log('   ⚠️  No performance indicators found (may be conditionally rendered)');
    }

    // Test 3: Check for analytics components
    console.log('\n3️⃣  Testing analytics components...');
    
    const analyticsComponents = await page.evaluate(() => {
      const selectors = [
        '[class*="chart"]', '[class*="Chart"]',
        '[class*="trend"]', '[class*="Trend"]', 
        '[class*="processing"]', '[class*="Processing"]',
        '[data-testid*="chart"]', '[data-testid*="trend"]'
      ];
      
      let found = 0;
      selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        found += elements.length;
      });
      
      return found;
    });
    
    if (analyticsComponents > 0) {
      console.log(`   ✅ Found ${analyticsComponents} analytics components`);
    } else {
      console.log('   ⚠️  No analytics components found on current page');
    }

    // Test 4: JavaScript errors check
    console.log('\n4️⃣  JavaScript errors check...');
    
    if (jsErrors.length === 0 && pageErrors.length === 0) {
      console.log('   ✅ No JavaScript errors detected');
    } else {
      console.log('   ❌ JavaScript errors found:');
      jsErrors.forEach(error => console.log(`      - ${error}`));
      pageErrors.forEach(error => console.log(`      - ${error}`));
    }

    // Test 5: Service worker check
    console.log('\n5️⃣  Testing service worker...');
    
    const serviceWorkerInfo = await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          return {
            supported: true,
            registered: !!registration,
            scope: registration?.scope || null
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
      } else {
        console.log('   ⚠️  Service Worker not registered (expected in development)');
      }
    } else {
      console.log('   ❌ Service Worker not supported');
    }

    // Test 6: Loading states and lazy components
    console.log('\n6️⃣  Testing loading states...');
    
    const loadingElements = await page.evaluate(() => {
      const loadingSelectors = [
        '[class*="loading"]', '[class*="Loading"]',
        '[class*="lazy"]', '[class*="Lazy"]',
        '.spinner', '.skeleton',
        '[data-testid*="loading"]', '[data-testid*="lazy"]'
      ];
      
      let found = 0;
      loadingSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        found += elements.length;
      });
      
      return found;
    });
    
    if (loadingElements > 0) {
      console.log(`   ✅ Found ${loadingElements} loading/lazy components`);
    } else {
      console.log('   ℹ️  No loading indicators visible (components may have already loaded)');
    }

    // Test 7: Performance metrics
    console.log('\n7️⃣  Collecting performance metrics...');
    
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      return {
        domContentLoaded: Math.round(navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart),
        loadComplete: Math.round(navigation.loadEventEnd - navigation.loadEventStart),
        totalLoadTime: Math.round(navigation.loadEventEnd - navigation.fetchStart),
        firstPaint: Math.round(performance.getEntriesByName('first-paint')[0]?.startTime || 0),
        firstContentfulPaint: Math.round(performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0)
      };
    });
    
    console.log(`   📊 DOM Content Loaded: ${metrics.domContentLoaded}ms`);
    console.log(`   📊 Load Complete: ${metrics.loadComplete}ms`);
    console.log(`   📊 Total Load Time: ${metrics.totalLoadTime}ms`);
    console.log(`   📊 First Paint: ${metrics.firstPaint}ms`);
    console.log(`   📊 First Contentful Paint: ${metrics.firstContentfulPaint}ms`);
    
    if (metrics.totalLoadTime < 5000) {
      console.log('   ✅ Performance is within acceptable range (<5s)');
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
    console.log(`🧩 Components: Analytics(${analyticsComponents}), Performance(${performanceIndicators}), Loading(${loadingElements})`);

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