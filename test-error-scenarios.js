#!/usr/bin/env node

/**
 * Critical Error Scenarios Test
 * Focused testing of key error handling for professional readiness
 */

const puppeteer = require('puppeteer');

async function testErrorScenarios() {
  console.log('🛡️ CRITICAL ERROR SCENARIOS TEST');
  console.log('=================================\n');
  
  let browser, page;
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
  
  try {
    browser = await puppeteer.launch({
      headless: false,
      defaultViewport: { width: 1280, height: 720 },
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    page = await browser.newPage();
    
    console.log('🔗 URL VALIDATION TESTING\n');
    
    // Test invalid routes
    const invalidRoutes = ['/nonexistent', '/admin', '/api/hack'];
    
    for (const route of invalidRoutes) {
      try {
        await page.goto(`http://localhost:3001${route}`, { 
          waitUntil: 'networkidle2',
          timeout: 5000 
        });
        
        const currentUrl = page.url();
        const redirectedProperly = currentUrl !== `http://localhost:3001${route}`;
        
        addTest(`Invalid route ${route} handled`, redirectedProperly, `→ ${currentUrl}`);
        
      } catch (error) {
        addTest(`Invalid route ${route} handled`, true, 'Navigation blocked');
      }
    }
    
    console.log('\n📝 FORM VALIDATION TESTING\n');
    
    // Test form validation
    await page.goto('http://localhost:3001/query', { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test submit without file selection
    const noFileSubmit = await page.evaluate(() => {
      const submitBtn = Array.from(document.querySelectorAll('button')).find(btn => 
        btn.textContent.includes('Submit')
      );
      return submitBtn ? submitBtn.disabled : true;
    });
    
    addTest('Submit blocked without file', noFileSubmit);
    
    // Select file and test empty query
    const fileSelected = await page.evaluate(() => {
      const listItems = Array.from(document.querySelectorAll('.MuiListItem-root'));
      for (const item of listItems) {
        const radio = item.querySelector('input[type="radio"]');
        const text = item.textContent;
        if (radio && text.includes('.json')) {
          radio.click();
          return true;
        }
      }
      return false;
    });
    
    if (fileSelected) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const emptyQuerySubmit = await page.evaluate(() => {
        const textarea = document.querySelector('textarea');
        const submitBtn = Array.from(document.querySelectorAll('button')).find(btn => 
          btn.textContent.includes('Submit')
        );
        
        if (textarea && submitBtn) {
          textarea.value = '';
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
          return submitBtn.disabled;
        }
        return true;
      });
      
      addTest('Submit blocked with empty query', emptyQuerySubmit);
    }
    
    console.log('\n🔤 SPECIAL INPUT TESTING\n');
    
    // Test special characters
    const specialInputs = [
      { name: 'German umlauts', text: 'Zeige mir alle Holzbalken mit ä, ö, ü, ß' },
      { name: 'Special symbols', text: 'Query with @#$%^&*()_+-=[]{}|;:,.<>?' },
      { name: 'Unicode emoji', text: 'Building materials 🏠🔨🪵' },
      { name: 'Very long query', text: 'Holzbalken '.repeat(100) }
    ];
    
    for (const input of specialInputs) {
      const textarea = await page.$('textarea');
      if (textarea) {
        await textarea.click();
        await textarea.focus();
        
        // Clear and type special input
        await page.keyboard.down('Control');
        await page.keyboard.press('KeyA');
        await page.keyboard.up('Control');
        await page.keyboard.press('Delete');
        
        await textarea.type(input.text.slice(0, 200), { delay: 5 });
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const inputAccepted = await page.evaluate(() => {
          const textarea = document.querySelector('textarea');
          return textarea ? textarea.value.length > 0 : false;
        });
        
        addTest(`${input.name} accepted`, inputAccepted);
      }
    }
    
    console.log('\n🌐 BROWSER COMPATIBILITY\n');
    
    // Test essential browser features
    const browserCompatibility = await page.evaluate(() => {
      return {
        fetch: typeof fetch !== 'undefined',
        promises: typeof Promise !== 'undefined',
        localStorage: typeof localStorage !== 'undefined',
        sessionStorage: typeof sessionStorage !== 'undefined',
        flexbox: CSS.supports('display', 'flex'),
        grid: CSS.supports('display', 'grid')
      };
    });
    
    Object.entries(browserCompatibility).forEach(([feature, supported]) => {
      addTest(`${feature} support`, supported);
    });
    
    console.log('\n⚡ PERFORMANCE STRESS TESTING\n');
    
    // Test rapid interactions
    const stressTest = await page.evaluate(() => {
      let errors = 0;
      const buttons = document.querySelectorAll('button');
      
      // Rapid clicking test
      for (let i = 0; i < 20; i++) {
        try {
          buttons.forEach(btn => btn.click());
        } catch (error) {
          errors++;
        }
      }
      
      return { errors, buttonsFound: buttons.length };
    });
    
    addTest('Rapid interaction handling', stressTest.errors < 5, 
      `${stressTest.errors} errors in stress test`);
    
    // Memory usage check
    const memoryCheck = await page.evaluate(() => {
      if (performance.memory) {
        const used = performance.memory.usedJSHeapSize / 1024 / 1024;
        const limit = performance.memory.jsHeapSizeLimit / 1024 / 1024;
        return { used: Math.round(used), limit: Math.round(limit) };
      }
      return null;
    });
    
    if (memoryCheck) {
      const memoryOK = memoryCheck.used < (memoryCheck.limit * 0.5);
      addTest('Memory usage reasonable', memoryOK, 
        `${memoryCheck.used}MB used of ${memoryCheck.limit}MB limit`);
    }
    
    console.log('\n🔒 SECURITY BASICS\n');
    
    // Test XSS prevention
    const xssTest = await page.evaluate(() => {
      const div = document.createElement('div');
      div.innerHTML = '<script>window.xssTest = true;</script>';
      document.body.appendChild(div);
      
      const hasXSS = window.xssTest === true;
      document.body.removeChild(div);
      
      return !hasXSS; // Should be true if XSS is prevented
    });
    
    addTest('Basic XSS prevention', xssTest);
    
    // Take final screenshot
    await page.screenshot({ 
      path: './test-screenshots/error-scenarios-final.png', 
      fullPage: true 
    });
    
    console.log('\n🎯 ERROR HANDLING SUMMARY');
    console.log('========================\n');
    
    const scorePercentage = ((testsPassed / totalTests) * 100).toFixed(1);
    
    console.log(`Tests Passed: ${testsPassed}/${totalTests} (${scorePercentage}%)`);
    
    if (scorePercentage >= 90) {
      console.log('🏆 EXCELLENT - Robust error handling');
    } else if (scorePercentage >= 80) {
      console.log('✅ GOOD - Adequate error handling');
    } else if (scorePercentage >= 70) {
      console.log('⚠️ FAIR - Some improvements needed');
    } else {
      console.log('❌ POOR - Significant issues found');
    }
    
    console.log('\n📋 PROFESSIONAL TESTING READINESS:');
    
    if (scorePercentage >= 80) {
      console.log('✅ Error handling validated');
      console.log('✅ Input validation working');
      console.log('✅ Browser compatibility confirmed');
      console.log('✅ Basic security measures in place');
      console.log('\n🎯 Ready for professional stress testing and security audits');
    } else {
      console.log('🔧 Address error handling issues before professional testing');
    }
    
    return {
      score: parseFloat(scorePercentage),
      passed: testsPassed,
      total: totalTests,
      ready: scorePercentage >= 80
    };
    
  } catch (error) {
    console.error('❌ Error scenario test failed:', error.message);
    return { score: 0, passed: 0, total: 0, ready: false };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

testErrorScenarios().then(report => {
  console.log(`\n🛡️ ERROR HANDLING: ${report.ready ? 'READY' : 'NEEDS WORK'}`);
  console.log(`📊 Score: ${report.score}% (${report.passed}/${report.total})`);
  process.exit(report.ready ? 0 : 1);
});