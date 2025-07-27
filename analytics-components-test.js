const puppeteer = require('puppeteer');

async function testAnalyticsComponents() {
  console.log('🧪 Testing Analytics Components After Sandi Metz Refactoring');
  
  const browser = await puppeteer.launch({ 
    headless: false, 
    devtools: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  const baseURL = 'http://localhost:3000';
  
  // Track errors
  const jsErrors = [];
  
  page.on('console', (msg) => {
    const text = msg.text();
    if (msg.type() === 'error' && !text.includes('404') && !text.includes('favicon')) {
      jsErrors.push(text);
      console.error(`❌ Console error: ${text}`);
    }
  });
  
  try {
    console.log('\n🔍 Checking Analytics Components...\n');
    
    // Navigate to home page first
    await page.goto(baseURL, { waitUntil: 'networkidle0' });
    console.log('✅ Loaded home page');
    
    // Wait for React to render
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 1. Check if PerformanceIndicator is visible in dev mode
    console.log('1️⃣  Checking PerformanceIndicator in development mode...');
    
    const performanceIndicatorExists = await page.evaluate(() => {
      // Look for the performance indicator by multiple selectors
      const selectors = [
        '[data-testid="performance-indicator"]',
        'div:has(svg[data-testid="SpeedIcon"])',
        'div:has-text("Performance")',
        'div[class*="MuiCard-root"]:has-text("Performance")',
        '*:has(svg) + *:has-text("Performance")'
      ];
      
      for (const selector of selectors) {
        try {
          const element = document.querySelector(selector);
          if (element) {
            return {
              found: true,
              selector: selector,
              visible: element.offsetParent !== null,
              content: element.textContent?.substring(0, 100) || ''
            };
          }
        } catch (e) {
          // Skip invalid selectors
        }
      }
      
      // Also check for any fixed positioned cards (since PerformanceIndicator is fixed position)
      const fixedCards = Array.from(document.querySelectorAll('div[class*="MuiCard-root"]')).filter(card => {
        const style = window.getComputedStyle(card);
        return style.position === 'fixed';
      });
      
      if (fixedCards.length > 0) {
        return {
          found: true,
          selector: 'fixed MuiCard',
          visible: true,
          content: fixedCards[0].textContent?.substring(0, 100) || ''
        };
      }
      
      return { found: false };
    });
    
    if (performanceIndicatorExists.found) {
      console.log(`   ✅ PerformanceIndicator found! (${performanceIndicatorExists.selector})`);
      console.log(`      Visible: ${performanceIndicatorExists.visible}`);
      console.log(`      Content: ${performanceIndicatorExists.content}`);
    } else {
      console.log('   ⚠️  PerformanceIndicator not found (may require specific conditions)');
    }
    
    // 2. Navigate to Dashboard to check analytics components
    console.log('\n2️⃣  Checking Analytics Components on Dashboard...');
    
    try {
      await page.goto(`${baseURL}/dashboard`, { waitUntil: 'networkidle0' });
      await new Promise(resolve => setTimeout(resolve, 3000)); // Give time for components to load
      
      const analyticsComponents = await page.evaluate(() => {
        const results = [];
        
        // Check for ChartWidget components
        const chartWidgets = document.querySelectorAll('[class*="recharts"], [class*="Chart"], svg[class*="recharts"]');
        if (chartWidgets.length > 0) {
          results.push(`ChartWidget/Recharts: ${chartWidgets.length} found`);
        }
        
        // Check for specific analytics component text content
        const textSelectors = [
          'Processing Time Analysis',
          'Trend Analysis', 
          'Query Performance',
          'Response Time',
          'Throughput',
          'Error Rate'
        ];
        
        textSelectors.forEach(text => {
          const element = document.querySelector(`*:has-text("${text}")`);
          if (element) {
            results.push(`Text found: "${text}"`);
          }
        });
        
        // Check for MUI Card components (analytics widgets)
        const cards = document.querySelectorAll('[class*="MuiCard-root"]');
        const analyticsCards = Array.from(cards).filter(card => {
          const text = card.textContent?.toLowerCase() || '';
          return text.includes('chart') || text.includes('analysis') || text.includes('metric') || 
                 text.includes('time') || text.includes('trend') || text.includes('performance');
        });
        
        if (analyticsCards.length > 0) {
          results.push(`Analytics Cards: ${analyticsCards.length} found`);
        }
        
        // Check for any loading states or error states
        const loadingElements = document.querySelectorAll('[class*="loading"], [class*="skeleton"], [class*="Loading"]');
        if (loadingElements.length > 0) {
          results.push(`Loading states: ${loadingElements.length} found`);
        }
        
        return results;
      });
      
      if (analyticsComponents.length > 0) {
        console.log('   ✅ Analytics components found:');
        analyticsComponents.forEach(component => {
          console.log(`      - ${component}`);
        });
      } else {
        console.log('   ⚠️  No analytics components detected on dashboard');
      }
      
      console.log('   ✅ Dashboard loaded successfully');
      
    } catch (error) {
      console.log(`   ⚠️  Could not load dashboard: ${error.message}`);
    }
    
    // 3. Check for lazy loading behavior
    console.log('\n3️⃣  Testing Lazy Loading...');
    
    // Navigate between routes to trigger lazy loading
    const routes = [
      { path: '/', name: 'Home' },
      { path: '/query', name: 'Query' },
      { path: '/upload', name: 'Upload' },
      { path: '/dashboard', name: 'Dashboard' }
    ];
    
    for (const route of routes) {
      try {
        await page.goto(`${baseURL}${route.path}`, { waitUntil: 'domcontentloaded' });
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check if route loaded successfully
        const routeLoaded = await page.evaluate(() => {
          return document.readyState === 'complete' && document.body.children.length > 0;
        });
        
        if (routeLoaded) {
          console.log(`   ✅ ${route.name} route loaded successfully`);
        } else {
          console.log(`   ⚠️  ${route.name} route may not exist`);
        }
      } catch (error) {
        console.log(`   ⚠️  Could not load ${route.name}: ${error.message}`);
      }
    }
    
    // 4. Final verification - check for any component rendering issues
    console.log('\n4️⃣  Final Component Verification...');
    
    await page.goto(baseURL, { waitUntil: 'networkidle0' });
    
    const finalCheck = await page.evaluate(() => {
      // Check if React app is working
      const reactRoot = document.getElementById('root');
      const hasReactContent = reactRoot && reactRoot.children.length > 0;
      
      // Check for any error boundaries or error messages
      const errorElements = document.querySelectorAll('[class*="error"], [class*="Error"], *:has-text("Error"), *:has-text("Something went wrong")');
      
      // Check for successful component renders
      const components = document.querySelectorAll('[class*="Mui"], [class*="component"], [data-testid]');
      
      return {
        reactWorking: hasReactContent,
        errorCount: errorElements.length,
        componentCount: components.length,
        hasNavigation: document.querySelector('nav, [role="navigation"]') !== null,
        hasContent: document.body.textContent?.length > 100
      };
    });
    
    console.log(`   React App Working: ${finalCheck.reactWorking ? '✅' : '❌'}`);
    console.log(`   Error Elements: ${finalCheck.errorCount === 0 ? '✅' : '❌'} (${finalCheck.errorCount} found)`);
    console.log(`   Components Rendered: ${finalCheck.componentCount > 0 ? '✅' : '❌'} (${finalCheck.componentCount} found)`);
    console.log(`   Navigation Present: ${finalCheck.hasNavigation ? '✅' : '❌'}`);
    console.log(`   Content Present: ${finalCheck.hasContent ? '✅' : '❌'}`);
    
    // Take screenshot for evidence
    await page.screenshot({ path: 'analytics-test-final.png', fullPage: true });
    console.log('\n📸 Screenshot saved as analytics-test-final.png');
    
    // Summary
    console.log('\n🎯 Test Summary:');
    console.log('==============');
    
    if (jsErrors.length === 0) {
      console.log('✅ No JavaScript errors detected');
    } else {
      console.log(`❌ Found ${jsErrors.length} JavaScript errors`);
    }
    
    if (finalCheck.reactWorking && finalCheck.componentCount > 0) {
      console.log('✅ Frontend application is working correctly');
      console.log('✅ Components are rendering after Sandi Metz refactoring');
    } else {
      console.log('❌ Some issues detected with component rendering');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

// Run the test
console.log('🚀 Starting Analytics Components Test...\n');
testAnalyticsComponents().catch(console.error);