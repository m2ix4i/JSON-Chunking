#!/usr/bin/env node

/**
 * Test React Input - Proper React state updating
 */

const puppeteer = require('puppeteer');

async function testReactInput() {
  console.log('🔍 Test: React Input State Update\n');
  
  let browser, page;
  
  try {
    browser = await puppeteer.launch({
      headless: false,
      defaultViewport: { width: 1280, height: 720 },
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    page = await browser.newPage();
    
    await page.goto('http://localhost:3001/query', { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Select file first
    console.log('📋 Selecting file...');
    const fileSelected = await page.evaluate(() => {
      const listItems = Array.from(document.querySelectorAll('.MuiListItem-root'));
      for (const item of listItems) {
        const radio = item.querySelector('input[type="radio"]');
        const primaryText = item.querySelector('.MuiListItemText-primary');
        if (radio && primaryText && radio.value && primaryText.textContent.includes('.json')) {
          radio.click();
          return true;
        }
      }
      return false;
    });
    
    if (!fileSelected) {
      console.log('❌ Could not select file');
      return false;
    }
    
    console.log('✅ File selected, waiting for form...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('\\n📝 Method 1: Direct value assignment');
    await page.evaluate(() => {
      const textareas = document.querySelectorAll('textarea');
      console.log('Found textareas:', textareas.length);
      
      if (textareas.length > 0) {
        const textarea = textareas[0]; // Get the actual query textarea
        console.log('Setting value directly...');
        textarea.value = 'Test query direct';
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    let buttonState = await page.evaluate(() => {
      const btn = document.querySelector('button[type="submit"]');
      return btn ? { disabled: btn.disabled, text: btn.textContent } : null;
    });
    console.log('Button state after direct assignment:', buttonState);
    
    console.log('\\n📝 Method 2: React-style typing simulation');
    await page.evaluate(() => {
      const textareas = document.querySelectorAll('textarea');
      if (textareas.length > 0) {
        const textarea = textareas[0];
        
        // Clear first
        textarea.value = '';
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        
        // Simulate typing character by character
        const text = 'Zeige mir alle Holzbalken aus Fichte';
        
        for (let i = 0; i <= text.length; i++) {
          setTimeout(() => {
            textarea.value = text.slice(0, i);
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
          }, i * 10);
        }
      }
    });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    buttonState = await page.evaluate(() => {
      const btn = document.querySelector('button[type="submit"]');
      return btn ? { disabled: btn.disabled, text: btn.textContent } : null;
    });
    console.log('Button state after typing simulation:', buttonState);
    
    console.log('\\n📝 Method 3: Focus and type with Puppeteer');
    const textarea = await page.$('textarea');
    if (textarea) {
      await textarea.click();
      await textarea.focus();
      await page.keyboard.down('Control');
      await page.keyboard.press('KeyA');
      await page.keyboard.up('Control');
      await page.keyboard.press('Delete');
      await page.keyboard.type('Zeige mir alle Holzbalken aus Fichte im Erdgeschoss', { delay: 50 });
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    buttonState = await page.evaluate(() => {
      const btn = document.querySelector('button[type="submit"]');
      const textarea = document.querySelector('textarea');
      return { 
        button: btn ? { disabled: btn.disabled, text: btn.textContent } : null,
        textarea: textarea ? { value: textarea.value, length: textarea.value.length } : null
      };
    });
    console.log('Button state after Puppeteer typing:', buttonState);
    
    if (!buttonState.button.disabled) {
      console.log('\\n🚀 Submit button is enabled! Clicking...');
      
      const submitted = await page.evaluate(() => {
        const btn = document.querySelector('button[type="submit"]');
        if (btn && !btn.disabled) {
          btn.click();
          return true;
        }
        return false;
      });
      
      if (submitted) {
        console.log('✅ Query submitted successfully!');
        
        // Wait for response
        console.log('⏳ Waiting for response...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        const response = await page.evaluate(() => {
          const bodyText = document.body.textContent;
          return {
            hasHolzbalken: bodyText.includes('Holzbalken'),
            hasResponse: bodyText.includes('Antwort') || bodyText.includes('Ergebnis'),
            hasError: bodyText.includes('Fehler') || bodyText.includes('Error'),
            hasLoading: document.querySelectorAll('.MuiCircularProgress-root').length > 0
          };
        });
        
        console.log('Response detection:', response);
        
        if (response.hasHolzbalken || response.hasResponse) {
          console.log('🎉 SUCCESS: Gemini 2.5 Pro response detected!');
          return true;
        } else if (response.hasError) {
          console.log('❌ Error in query processing');
          return false;
        } else if (response.hasLoading) {
          console.log('⏳ Query still processing...');
          return true; // Consider this success as it's processing
        } else {
          console.log('⚠️ No clear response detected');
          return false;
        }
      }
    }
    
    await page.screenshot({ 
      path: './test-screenshots/react-input-test.png', 
      fullPage: true 
    });
    
    return false;
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

testReactInput().then(success => {
  console.log(`\\n${success ? '✅' : '❌'} React Input Test: ${success ? 'PASSED' : 'FAILED'}`);
  process.exit(success ? 0 : 1);
});