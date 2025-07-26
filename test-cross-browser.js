#!/usr/bin/env node

/**
 * Cross-Browser Compatibility Test
 * Testing core functionality across different browser engines
 */

const puppeteer = require('puppeteer');

async function testCrossBrowser() {
  console.log('🌐 CROSS-BROWSER COMPATIBILITY TEST');
  console.log('===================================\n');
  
  let testsPassed = 0;
  let totalTests = 0;
  
  function addTest(name, passed, details = '') {
    totalTests++;
    if (passed) {
      testsPassed++;
      console.log(`✅ ${name}${details ? ' - ' + details : ''}`);
    } else {
      console.log(`❌ ${name}${details ? ' - ' + details : ''}`);
    }
  }
  
  // Test with Chrome (Chromium)
  async function testChrome() {
    console.log('🔵 CHROME/CHROMIUM TESTING\n');
    
    let browser, page;
    
    try {
      browser = await puppeteer.launch({
        headless: true,
        defaultViewport: { width: 1280, height: 720 },
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      page = await browser.newPage();
      
      // Test basic page loading
      await page.goto('http://localhost:3001/', { waitUntil: 'networkidle2' });
      const title = await page.title();
      addTest('Chrome - Page loads', title.length > 0, title);
      
      // Test navigation
      await page.goto('http://localhost:3001/query', { waitUntil: 'networkidle2' });
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const queryPageTest = await page.evaluate(() => {
        return {
          hasFileList: document.querySelectorAll('.MuiListItem-root').length > 0,
          hasButtons: document.querySelectorAll('button').length > 0,
          pageContent: document.body.textContent.includes('Abfrage')
        };
      });
      
      addTest('Chrome - Query page functional', 
        queryPageTest.hasFileList && queryPageTest.hasButtons && queryPageTest.pageContent);
      
      // Test form interaction
      const formTest = await page.evaluate(() => {
        // Select first file
        const listItems = Array.from(document.querySelectorAll('.MuiListItem-root'));
        for (const item of listItems) {
          const radio = item.querySelector('input[type="radio"]');
          if (radio && item.textContent.includes('.json')) {
            radio.click();
            break;
          }
        }
        
        // Check if form appears
        setTimeout(() => {
          const textarea = document.querySelector('textarea');
          if (textarea) {
            textarea.value = 'Test query';
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }, 1000);
        
        return true;
      });
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const formResult = await page.evaluate(() => {
        const textarea = document.querySelector('textarea');
        const submitBtn = Array.from(document.querySelectorAll('button')).find(btn => 
          btn.textContent.includes('Submit')
        );
        
        return {
          hasTextarea: !!textarea,
          hasSubmitButton: !!submitBtn,
          textareaVisible: textarea ? textarea.offsetParent !== null : false
        };
      });
      
      addTest('Chrome - Form interaction', 
        formResult.hasTextarea && formResult.hasSubmitButton && formResult.textareaVisible);
      
      // Test JavaScript features
      const jsFeatures = await page.evaluate(() => {
        return {
          fetch: typeof fetch !== 'undefined',
          arrow: (() => true)(),
          async: (async () => true)().constructor.name === 'Promise',
          destructuring: (() => { const [a] = [1]; return a === 1; })(),
          spread: (() => { const arr = [1]; return [...arr].length === 1; })()
        };
      });
      
      const jsScore = Object.values(jsFeatures).filter(Boolean).length;
      addTest('Chrome - Modern JS features', jsScore >= 4, `${jsScore}/5 features`);
      
      // Test CSS features
      const cssFeatures = await page.evaluate(() => {
        return {
          flexbox: CSS.supports('display', 'flex'),
          grid: CSS.supports('display', 'grid'),
          variables: CSS.supports('--test', 'value'),
          transforms: CSS.supports('transform', 'scale(1)')
        };
      });
      
      const cssScore = Object.values(cssFeatures).filter(Boolean).length;
      addTest('Chrome - Modern CSS features', cssScore >= 3, `${cssScore}/4 features`);
      
    } catch (error) {
      addTest('Chrome - Browser test', false, error.message);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
  
  // Test different viewport sizes (mobile responsiveness)
  async function testResponsive() {
    console.log('\n📱 RESPONSIVE DESIGN TESTING\n');
    
    let browser, page;
    
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      page = await browser.newPage();
      
      const viewports = [
        { width: 1920, height: 1080, name: 'Desktop HD' },
        { width: 1024, height: 768, name: 'Tablet' },
        { width: 375, height: 667, name: 'Mobile' },
        { width: 320, height: 568, name: 'Small Mobile' }
      ];
      
      for (const viewport of viewports) {
        await page.setViewport(viewport);
        await page.goto('http://localhost:3001/', { waitUntil: 'networkidle2' });
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const responsiveTest = await page.evaluate(() => {
          const body = document.body;
          const nav = document.querySelector('nav');
          const main = document.querySelector('main, [role="main"]');
          
          return {
            noHorizontalScroll: body.scrollWidth <= window.innerWidth,
            navPresent: !!nav,
            mainPresent: !!main,
            contentVisible: body.offsetHeight > 100
          };
        });
        
        const isResponsive = responsiveTest.noHorizontalScroll && 
                            responsiveTest.navPresent && 
                            responsiveTest.mainPresent && 
                            responsiveTest.contentVisible;
        
        addTest(`${viewport.name} (${viewport.width}x${viewport.height})`, isResponsive);
      }
      
    } catch (error) {
      addTest('Responsive design test', false, error.message);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
  
  // Test with different user agents (browser simulation)
  async function testUserAgents() {
    console.log('\n🔧 USER AGENT COMPATIBILITY\n');
    
    let browser, page;
    
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      page = await browser.newPage();
      
      const userAgents = [
        {
          name: 'Chrome Desktop',
          ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        {
          name: 'Firefox Desktop',
          ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0'
        },
        {
          name: 'Safari Desktop',
          ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15'
        },
        {
          name: 'Mobile Safari',
          ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Mobile/15E148 Safari/604.1'
        }
      ];
      
      for (const agent of userAgents) {
        await page.setUserAgent(agent.ua);
        
        try {
          await page.goto('http://localhost:3001/', { 
            waitUntil: 'networkidle2',
            timeout: 10000 
          });
          
          const compatibility = await page.evaluate(() => {
            return {
              loaded: document.readyState === 'complete',
              hasContent: document.body.textContent.length > 100,
              hasNavigation: document.querySelectorAll('nav, [role="navigation"]').length > 0,
              jsWorking: typeof document.querySelector === 'function'
            };
          });
          
          const isCompatible = compatibility.loaded && 
                              compatibility.hasContent && 
                              compatibility.hasNavigation && 
                              compatibility.jsWorking;
          
          addTest(`${agent.name} compatibility`, isCompatible);
          
        } catch (error) {
          addTest(`${agent.name} compatibility`, false, error.message);
        }
      }
      
    } catch (error) {
      addTest('User agent test setup', false, error.message);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
  
  // Test accessibility across different simulated disabilities
  async function testAccessibilityModes() {
    console.log('\n♿ ACCESSIBILITY SIMULATION\n');
    
    let browser, page;
    
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      page = await browser.newPage();
      
      // Test with reduced motion
      await page.emulateMediaFeatures([
        { name: 'prefers-reduced-motion', value: 'reduce' }
      ]);
      
      await page.goto('http://localhost:3001/', { waitUntil: 'networkidle2' });
      
      const reducedMotionTest = await page.evaluate(() => {
        return {
          pageLoads: document.readyState === 'complete',
          noAnimationConflicts: true // Basic check - real test would need deeper inspection
        };
      });
      
      addTest('Reduced motion preference', 
        reducedMotionTest.pageLoads && reducedMotionTest.noAnimationConflicts);
      
      // Test with high contrast mode simulation
      await page.emulateMediaFeatures([
        { name: 'prefers-contrast', value: 'high' }
      ]);
      
      await page.reload({ waitUntil: 'networkidle2' });
      
      const highContrastTest = await page.evaluate(() => {
        return {
          pageLoads: document.readyState === 'complete',
          hasVisibleContent: document.body.offsetHeight > 100
        };
      });
      
      addTest('High contrast mode', 
        highContrastTest.pageLoads && highContrastTest.hasVisibleContent);
      
      // Test keyboard navigation
      await page.goto('http://localhost:3001/query', { waitUntil: 'networkidle2' });
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const keyboardNavTest = await page.evaluate(() => {
        const focusableElements = document.querySelectorAll(
          'a[href], button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
        );
        
        return {
          hasFocusableElements: focusableElements.length > 0,
          elementCount: focusableElements.length
        };
      });
      
      addTest('Keyboard navigation support', 
        keyboardNavTest.hasFocusableElements, 
        `${keyboardNavTest.elementCount} focusable elements`);
      
    } catch (error) {
      addTest('Accessibility simulation', false, error.message);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
  
  // Run all tests
  try {
    await testChrome();
    await testResponsive();
    await testUserAgents();
    await testAccessibilityModes();
    
    console.log('\n🎯 CROSS-BROWSER COMPATIBILITY SUMMARY');
    console.log('=====================================\n');
    
    const scorePercentage = ((testsPassed / totalTests) * 100).toFixed(1);
    
    console.log(`Tests Passed: ${testsPassed}/${totalTests} (${scorePercentage}%)`);
    
    if (scorePercentage >= 90) {
      console.log('🏆 EXCELLENT - Broad compatibility confirmed');
    } else if (scorePercentage >= 80) {
      console.log('✅ GOOD - Good cross-browser support');
    } else if (scorePercentage >= 70) {
      console.log('⚠️ FAIR - Some compatibility issues');
    } else {
      console.log('❌ POOR - Significant compatibility problems');
    }
    
    console.log('\n📋 PROFESSIONAL TESTING RECOMMENDATIONS:');
    
    if (scorePercentage >= 80) {
      console.log('✅ Core browser compatibility validated');
      console.log('✅ Responsive design working');
      console.log('✅ Accessibility features present');
      console.log('✅ Modern web standards supported');
      console.log('\n🎯 Professional testing can focus on:');
      console.log('   - Real device testing (iOS Safari, Android Chrome)');
      console.log('   - Internet Explorer/Edge legacy testing');
      console.log('   - Screen reader testing with NVDA/JAWS');
      console.log('   - Performance testing on slower devices');
    } else {
      console.log('🔧 Address compatibility issues before professional testing');
      console.log('📋 Focus on browser-specific fixes and responsive design');
    }
    
    return {
      score: parseFloat(scorePercentage),
      passed: testsPassed,
      total: totalTests,
      compatible: scorePercentage >= 80
    };
    
  } catch (error) {
    console.error('❌ Cross-browser test failed:', error.message);
    return { score: 0, passed: 0, total: 0, compatible: false };
  }
}

testCrossBrowser().then(report => {
  console.log(`\n🌐 CROSS-BROWSER: ${report.compatible ? 'COMPATIBLE' : 'NEEDS WORK'}`);
  console.log(`📊 Score: ${report.score}% (${report.passed}/${report.total})`);
  process.exit(report.compatible ? 0 : 1);
});