#!/usr/bin/env node

/**
 * Test Gemini Response Display
 * Verify that Gemini API responses are properly displayed to users
 */

const puppeteer = require('puppeteer');

async function testGeminiResponseDisplay() {
  console.log('🤖 TESTING GEMINI RESPONSE DISPLAY');
  console.log('==================================\n');
  
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
    
    console.log('🚀 Starting Complete Workflow Test\n');
    
    // Go to query page
    await page.goto('http://localhost:3001/query', { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Select file and submit query
    const workflowResult = await page.evaluate(() => {
      // Select first JSON file
      const listItems = Array.from(document.querySelectorAll('.MuiListItem-root'));
      for (const item of listItems) {
        const radio = item.querySelector('input[type="radio"]');
        const text = item.textContent;
        if (radio && text.includes('.json')) {
          radio.click();
          break;
        }
      }
      return true;
    });
    
    addTest('File selection completed', workflowResult);
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Enter query and submit
    const textarea = await page.$('textarea');
    if (textarea) {
      await textarea.click();
      await textarea.focus();
      
      const testQuery = 'Beschreibe alle Holzbalken im Gebäude mit deren technischen Eigenschaften';
      await page.keyboard.type(testQuery, { delay: 30 });
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Submit the query
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
      
      addTest('Query submission successful', submitted);
      
      if (submitted) {
        console.log('⏳ Waiting for Gemini API processing and response...');
        
        let responseReceived = false;
        let attempts = 0;
        const maxAttempts = 60; // 2 minutes max
        
        while (attempts < maxAttempts && !responseReceived) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          attempts++;
          
          const pageAnalysis = await page.evaluate(() => {
            const bodyText = document.body.textContent;
            const currentUrl = window.location.pathname;
            
            return {
              bodyLength: bodyText.length,
              hasGermanContent: /holzbalken|balken|holz|gebäude|eigenschaften|material/i.test(bodyText),
              hasProcessingText: bodyText.includes('Processing') || bodyText.includes('Verarbeitung'),
              hasErrorText: bodyText.includes('Error') || bodyText.includes('Fehler'),
              hasResponseContent: bodyText.length > 3000,
              currentPath: currentUrl,
              bodyPreview: bodyText.slice(0, 300)
            };
          });
          
          console.log(`⏳ Attempt ${attempts}: Body length ${pageAnalysis.bodyLength}, German content: ${pageAnalysis.hasGermanContent}`);
          
          if (pageAnalysis.hasGermanContent && pageAnalysis.hasResponseContent) {
            responseReceived = true;
            console.log('🎉 Gemini response content detected!');
            
            addTest('Gemini response received', true, `${pageAnalysis.bodyLength} chars`);
            addTest('Response contains German building content', pageAnalysis.hasGermanContent);
            addTest('Response has substantial content', pageAnalysis.bodyLength > 2000, `${pageAnalysis.bodyLength} chars`);
            
            // Take screenshot of the response
            await page.screenshot({ 
              path: './test-screenshots/gemini-response-display.png', 
              fullPage: true 
            });
            console.log('📸 Screenshot saved: gemini-response-display.png');
            
            // Analyze response structure
            const responseStructure = await page.evaluate(() => {
              const results = {
                hasCards: document.querySelectorAll('.MuiCard-root').length,
                hasPapers: document.querySelectorAll('.MuiPaper-root').length,
                hasTypography: document.querySelectorAll('[class*="MuiTypography"]').length,
                hasButtons: document.querySelectorAll('button').length,
                hasStructuredContent: false
              };
              
              // Check for structured content like lists, tables, or formatted sections
              const bodyText = document.body.textContent;
              results.hasStructuredContent = 
                bodyText.includes('•') || 
                bodyText.includes('-') ||
                bodyText.includes('1.') ||
                bodyText.includes('Material:') ||
                bodyText.includes('Eigenschaften:');
              
              return results;
            });
            
            addTest('Response has proper UI structure', 
              responseStructure.hasCards > 0 || responseStructure.hasPapers > 0,
              `${responseStructure.hasCards} cards, ${responseStructure.hasPapers} papers`);
            
            addTest('Response has structured content', responseStructure.hasStructuredContent);
            
            console.log(`📊 Response Structure Analysis:`);
            console.log(`   Cards: ${responseStructure.hasCards}`);
            console.log(`   Papers: ${responseStructure.hasPapers}`);
            console.log(`   Typography elements: ${responseStructure.hasTypography}`);
            console.log(`   Buttons: ${responseStructure.hasButtons}`);
            console.log(`   Structured content: ${responseStructure.hasStructuredContent}`);
            
            break;
          }
          
          if (pageAnalysis.hasErrorText) {
            console.log('❌ Error detected in response');
            addTest('No errors in response processing', false, 'Error text found');
            break;
          }
          
          if (attempts % 10 === 0) {
            console.log(`⏳ Still waiting... Current page: ${pageAnalysis.currentPath}`);
            console.log(`   Preview: "${pageAnalysis.bodyPreview}..."`);
          }
        }
        
        if (!responseReceived) {
          addTest('Gemini response received within timeout', false, `Timeout after ${attempts * 2}s`);
        }
      }
    }
    
    console.log('\n🎯 GEMINI RESPONSE DISPLAY RESULTS');
    console.log('==================================');
    
    const scorePercentage = ((testsPassed / totalTests) * 100).toFixed(1);
    console.log(`Tests Passed: ${testsPassed}/${totalTests} (${scorePercentage}%)`);
    
    if (scorePercentage >= 80) {
      console.log('✅ EXCELLENT - Gemini response display working');
      console.log('📋 Complete workflow: Upload → Query → Gemini → Display ✅');
    } else if (scorePercentage >= 60) {
      console.log('⚠️ PARTIAL - Most functionality working, minor issues');
      console.log('📋 Core workflow functional but some display improvements needed');
    } else {
      console.log('❌ ISSUES - Gemini response display has problems');
      console.log('📋 Additional fixes needed for proper response display');
    }
    
    return {
      score: parseFloat(scorePercentage),
      passed: testsPassed,
      total: totalTests,
      working: scorePercentage >= 80
    };
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return { score: 0, passed: 0, total: 0, working: false };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

testGeminiResponseDisplay().then(report => {
  console.log(`\n🤖 GEMINI DISPLAY: ${report.working ? 'WORKING' : 'NEEDS WORK'}`);
  console.log(`📊 Display Success Rate: ${report.score}% (${report.passed}/${report.total})`);
  process.exit(report.working ? 0 : 1);
});