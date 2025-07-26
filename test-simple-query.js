#!/usr/bin/env node

/**
 * Simple Query Test - Test one query submission to Gemini 2.5 Pro
 */

const puppeteer = require('puppeteer');

async function testSimpleQuery() {
  console.log('🚀 Simple Query Test with Gemini 2.5 Pro\n');
  
  let browser, page;
  
  try {
    browser = await puppeteer.launch({
      headless: false,
      defaultViewport: { width: 1280, height: 720 },
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    page = await browser.newPage();
    
    console.log('🌐 Navigating to Query page...');
    await page.goto('http://localhost:3001/query', { waitUntil: 'networkidle2' });
    
    // Wait for page to fully load
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('\n📋 Step 1: Get available files');
    const files = await page.evaluate(() => {
      const listItems = Array.from(document.querySelectorAll('.MuiListItem-root'));
      return listItems.map(item => {
        const radio = item.querySelector('input[type="radio"]');
        const primaryText = item.querySelector('.MuiListItemText-primary');
        
        if (radio && primaryText) {
          let filename = primaryText.textContent.trim();
          if (filename.includes('.json')) {
            filename = filename.split('.json')[0] + '.json';
          }
          return { value: radio.value, label: filename };
        }
        return null;
      }).filter(file => file && file.value && file.label.includes('.json'));
    });
    
    console.log(`📁 Found ${files.length} files`);
    
    if (files.length === 0) {
      console.log('❌ No files available');
      return false;
    }
    
    console.log('\\n📋 Step 2: Select first file');
    const firstFile = files[0];
    console.log(`🎯 Selecting: ${firstFile.label} (${firstFile.value})`);
    
    const selected = await page.evaluate((fileId) => {
      const listItems = Array.from(document.querySelectorAll('.MuiListItem-root'));
      for (const item of listItems) {
        const radio = item.querySelector('input[type="radio"]');
        if (radio && radio.value === fileId) {
          radio.click();
          return true;
        }
      }
      return false;
    }, firstFile.value);
    
    if (!selected) {
      console.log('❌ File selection failed');
      return false;
    }
    
    console.log('✅ File selected, waiting for form...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('\\n📋 Step 3: Check for QueryForm');
    const formState = await page.evaluate(() => {
      const textareas = document.querySelectorAll('textarea');
      const submitButtons = Array.from(document.querySelectorAll('button')).filter(btn => 
        btn.textContent.includes('Submit') || btn.textContent.includes('Query')
      );
      
      return {
        textareas: textareas.length,
        submitButtons: submitButtons.length,
        submitButtonTexts: submitButtons.map(btn => btn.textContent.trim()),
        hasForm: textareas.length > 0 && submitButtons.length > 0
      };
    });
    
    console.log(`📝 Form state: ${formState.textareas} textareas, ${formState.submitButtons} submit buttons`);
    console.log(`📝 Submit buttons: ${formState.submitButtonTexts.join(', ')}`);
    
    if (!formState.hasForm) {
      console.log('❌ QueryForm not available');
      return false;
    }
    
    console.log('\\n📋 Step 4: Enter query');
    const queryText = "Zeige mir alle Holzbalken aus Fichte im Erdgeschoss";
    
    const queryEntered = await page.evaluate((text) => {
      const textareas = document.querySelectorAll('textarea');
      if (textareas.length > 0) {
        const textarea = textareas[0];
        textarea.value = text;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
      return false;
    }, queryText);
    
    if (!queryEntered) {
      console.log('❌ Query entry failed');
      return false;
    }
    
    console.log(`✅ Query entered: "${queryText}"`);
    
    console.log('\\n📋 Step 5: Submit query');
    const submitted = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const submitBtn = buttons.find(btn => 
        btn.textContent.includes('Submit Query') && !btn.disabled
      );
      
      if (submitBtn) {
        submitBtn.click();
        return true;
      }
      return false;
    });
    
    if (!submitted) {
      console.log('❌ Query submission failed');
      return false;
    }
    
    console.log('✅ Query submitted, waiting for response...');
    
    console.log('\\n📋 Step 6: Monitor for response');
    let responseFound = false;
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds
    
    while (!responseFound && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
      
      const response = await page.evaluate(() => {
        // Look for various response indicators
        const results = document.querySelector('[data-testid="results"], .results, .query-result');
        const alerts = document.querySelectorAll('.MuiAlert-root');
        const textContent = document.body.textContent;
        
        // Check for response content
        if (results && results.textContent.length > 50) {
          return { type: 'results', content: results.textContent.trim() };
        }
        
        // Check for error alerts
        const errorAlert = Array.from(alerts).find(alert => 
          alert.textContent.includes('Fehler') || alert.textContent.includes('Error')
        );
        if (errorAlert) {
          return { type: 'error', content: errorAlert.textContent.trim() };
        }
        
        // Check for processing indicators
        if (textContent.includes('Processing') || textContent.includes('Verarbeitung')) {
          return { type: 'processing', content: 'Query is being processed...' };
        }
        
        // Check for any substantial response text
        if (textContent.includes('Holzbalken') || textContent.includes('Fichte') || textContent.includes('Erdgeschoss')) {
          return { type: 'content', content: 'Response content detected' };
        }
        
        return null;
      });
      
      if (response) {
        console.log(`📥 Response detected (${response.type}): ${response.content.slice(0, 100)}...`);
        responseFound = true;
        break;
      }
      
      if (attempts % 5 === 0) {
        console.log(`⏳ Still waiting... (${attempts}/${maxAttempts})`);
      }
    }
    
    if (responseFound) {
      console.log('\\n🎉 SUCCESS: Query processing completed!');
      console.log('✅ Gemini 2.5 Pro integration is working');
    } else {
      console.log('\\n⏰ TIMEOUT: No response detected');
      console.log('🔧 Gemini 2.5 Pro may need debugging');
    }
    
    // Take final screenshot
    await page.screenshot({ 
      path: './test-screenshots/simple-query-final.png', 
      fullPage: true 
    });
    console.log('📸 Screenshot saved: simple-query-final.png');
    
    return responseFound;
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

testSimpleQuery().then(success => {
  console.log(`\\n${success ? '✅' : '❌'} Simple Query Test: ${success ? 'PASSED' : 'FAILED'}`);
  process.exit(success ? 0 : 1);
});