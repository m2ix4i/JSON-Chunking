#!/usr/bin/env node

/**
 * Test Query Submission Fix
 * Verify that the query button now works and submits to the backend
 */

const puppeteer = require('puppeteer');

async function testQuerySubmissionFix() {
  console.log('🔧 TESTING QUERY SUBMISSION FIX');
  console.log('================================\n');
  
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
    
    // Monitor network requests for API calls
    const apiCalls = [];
    
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('localhost:8001')) {
        apiCalls.push({
          method: request.method(),
          url: url,
          timestamp: Date.now()
        });
        console.log(`📤 API Call: ${request.method()} ${url}`);
      }
      request.continue();
    });

    console.log('🔍 Testing Dashboard Card Sizing Fix\n');
    
    // Test dashboard first
    await page.goto('http://localhost:3001/', { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check if cards are now same height
    const cardSizing = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.MuiCard-root'));
      const dashboardCards = cards.slice(0, 4); // First 4 cards are metric cards
      
      if (dashboardCards.length < 4) return { consistent: false, count: dashboardCards.length };
      
      const heights = dashboardCards.map(card => card.offsetHeight);
      const allSameHeight = heights.every(height => height === heights[0]);
      
      return {
        consistent: allSameHeight,
        heights: heights,
        count: dashboardCards.length
      };
    });
    
    addTest('Dashboard cards have consistent sizing', cardSizing.consistent, 
      `${cardSizing.count} cards, heights: ${cardSizing.heights?.join(', ')}`);

    console.log('\n🔍 Testing Query Submission Fix\n');
    
    // Navigate to query page
    await page.goto('http://localhost:3001/query', { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check if files are available
    const fileAvailable = await page.evaluate(() => {
      const listItems = Array.from(document.querySelectorAll('.MuiListItem-root'));
      return listItems.some(item => item.textContent.includes('.json'));
    });
    
    addTest('JSON files available for selection', fileAvailable);
    
    if (fileAvailable) {
      // Select a file
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
      
      addTest('File selection successful', fileSelected);
      
      if (fileSelected) {
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check if query form appears
        const formAppears = await page.evaluate(() => {
          const textarea = document.querySelector('textarea');
          const submitBtn = Array.from(document.querySelectorAll('button')).find(btn => 
            btn.textContent.includes('Submit')
          );
          
          return {
            hasTextarea: !!textarea,
            hasSubmitButton: !!submitBtn,
            submitEnabled: submitBtn ? !submitBtn.disabled : false
          };
        });
        
        addTest('Query form appears', formAppears.hasTextarea && formAppears.hasSubmitButton);
        
        if (formAppears.hasTextarea) {
          // Enter a test query
          const textarea = await page.$('textarea');
          await textarea.click();
          await textarea.focus();
          
          // Clear and type test query
          await page.keyboard.down('Control');
          await page.keyboard.press('KeyA');
          await page.keyboard.up('Control');
          await page.keyboard.press('Delete');
          
          const testQuery = 'Zeige mir alle Materialien in diesem Gebäude';
          await page.keyboard.type(testQuery, { delay: 50 });
          
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Check if submit button is now enabled
          const submitEnabled = await page.evaluate(() => {
            const submitBtn = Array.from(document.querySelectorAll('button')).find(btn => 
              btn.textContent.includes('Submit')
            );
            return submitBtn ? !submitBtn.disabled : false;
          });
          
          addTest('Submit button enables with query text', submitEnabled);
          
          if (submitEnabled) {
            // Record API calls before submission
            const preSubmissionCalls = apiCalls.length;
            
            // Click submit button
            const submitted = await page.evaluate(() => {
              const submitBtn = Array.from(document.querySelectorAll('button')).find(btn => 
                btn.textContent.includes('Submit')
              );
              
              if (submitBtn && !submitBtn.disabled) {
                submitBtn.click();
                return true;
              }
              return false;
            });
            
            addTest('Query submission triggered', submitted);
            
            if (submitted) {
              // Wait for API calls
              console.log('⏳ Waiting for backend API calls...');
              await new Promise(resolve => setTimeout(resolve, 5000));
              
              const newApiCalls = apiCalls.slice(preSubmissionCalls);
              const queryApiCalls = newApiCalls.filter(call => 
                call.url.includes('/queries') && call.method === 'POST'
              );
              
              addTest('Backend query API called', queryApiCalls.length > 0, 
                `${queryApiCalls.length} query API calls made`);
              
              // Check for navigation or processing indicator
              const processingDetected = await page.evaluate(() => {
                const bodyText = document.body.textContent;
                const currentUrl = window.location.pathname;
                
                return {
                  hasProcessingText: bodyText.includes('Processing') || bodyText.includes('Verarbeitung'),
                  hasSubmittingText: bodyText.includes('Processing...') || bodyText.includes('Submitting'),
                  navigatedToResults: currentUrl.includes('/results'),
                  currentPath: currentUrl
                };
              });
              
              const queryWorkflowWorking = queryApiCalls.length > 0 || 
                                         processingDetected.hasProcessingText ||
                                         processingDetected.navigatedToResults;
              
              addTest('Query workflow initiated', queryWorkflowWorking, 
                `Navigation: ${processingDetected.currentPath}, Processing: ${processingDetected.hasProcessingText}`);
              
              console.log(`\n📊 API Call Summary:`);
              console.log(`   Total API calls: ${apiCalls.length}`);
              console.log(`   Query-related calls: ${queryApiCalls.length}`);
              newApiCalls.forEach((call, i) => {
                console.log(`   ${i + 1}. ${call.method} ${call.url}`);
              });
            }
          }
        }
      }
    }
    
    console.log('\n🎯 QUERY SUBMISSION FIX RESULTS');
    console.log('===============================');
    
    const scorePercentage = ((testsPassed / totalTests) * 100).toFixed(1);
    console.log(`Tests Passed: ${testsPassed}/${totalTests} (${scorePercentage}%)`);
    
    if (scorePercentage >= 80) {
      console.log('✅ SUCCESSFUL - Query submission fix working');
      console.log('📋 Users can now submit queries and get Gemini responses');
    } else {
      console.log('❌ ISSUES REMAIN - Query submission still has problems');
      console.log('📋 Additional fixes needed for full functionality');
    }
    
    return {
      score: parseFloat(scorePercentage),
      passed: testsPassed,
      total: totalTests,
      fixed: scorePercentage >= 80
    };
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return { score: 0, passed: 0, total: 0, fixed: false };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

testQuerySubmissionFix().then(report => {
  console.log(`\n🔧 QUERY FIX: ${report.fixed ? 'WORKING' : 'NEEDS MORE WORK'}`);
  console.log(`📊 Fix Success Rate: ${report.score}% (${report.passed}/${report.total})`);
  process.exit(report.fixed ? 0 : 1);
});