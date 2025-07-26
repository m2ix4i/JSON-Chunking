#!/usr/bin/env node

/**
 * Debug Submit Button State
 */

const puppeteer = require('puppeteer');

async function debugSubmitButton() {
  console.log('🔍 Debug: Submit Button State\n');
  
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
    
    // Select file
    const files = await page.evaluate(() => {
      const listItems = Array.from(document.querySelectorAll('.MuiListItem-root'));
      return listItems.map(item => {
        const radio = item.querySelector('input[type="radio"]');
        const primaryText = item.querySelector('.MuiListItemText-primary');
        if (radio && primaryText && radio.value && primaryText.textContent.includes('.json')) {
          return radio.value;
        }
      }).filter(Boolean)[0];
    });
    
    if (files) {
      await page.evaluate((fileId) => {
        const listItems = Array.from(document.querySelectorAll('.MuiListItem-root'));
        for (const item of listItems) {
          const radio = item.querySelector('input[type="radio"]');
          if (radio && radio.value === fileId) {
            radio.click();
            break;
          }
        }
      }, files);
      
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    console.log('📋 Initial button state:');
    let buttonState = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.map(btn => ({
        text: btn.textContent.trim(),
        type: btn.type,
        disabled: btn.disabled,
        className: btn.className
      }));
    });
    console.log(JSON.stringify(buttonState, null, 2));
    
    console.log('\\n📝 Entering query with React events...');
    await page.evaluate(() => {
      const textareas = document.querySelectorAll('textarea');
      if (textareas.length > 0) {
        const textarea = textareas[0];
        
        // Simulate user typing
        textarea.focus();
        textarea.value = '';
        
        // Type the query character by character to trigger React properly
        const query = "Zeige mir alle Holzbalken aus Fichte im Erdgeschoss";
        
        for (let i = 0; i < query.length; i++) {
          textarea.value = query.substring(0, i + 1);
          
          // Dispatch events that React expects
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
          textarea.dispatchEvent(new Event('change', { bubbles: true }));
        }
        
        // Final events
        textarea.dispatchEvent(new Event('blur', { bubbles: true }));
      }
    });
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('\\n📋 Button state after query entry:');
    buttonState = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.map(btn => ({
        text: btn.textContent.trim(),
        type: btn.type,
        disabled: btn.disabled,
        className: btn.className
      }));
    });
    console.log(JSON.stringify(buttonState, null, 2));
    
    console.log('\\n📋 Textarea state:');
    const textareaState = await page.evaluate(() => {
      const textareas = document.querySelectorAll('textarea');
      return Array.from(textareas).map(ta => ({
        value: ta.value,
        length: ta.value.length,
        required: ta.required,
        disabled: ta.disabled
      }));
    });
    console.log(JSON.stringify(textareaState, null, 2));
    
    // Try clicking the submit button
    console.log('\\n🚀 Attempting to click submit button...');
    const clicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const submitBtn = buttons.find(btn => btn.textContent.includes('Submit Query'));
      
      if (submitBtn) {
        console.log('Submit button found:', {
          text: submitBtn.textContent,
          disabled: submitBtn.disabled,
          type: submitBtn.type
        });
        
        if (!submitBtn.disabled) {
          submitBtn.click();
          return true;
        } else {
          return 'disabled';
        }
      }
      return false;
    });
    
    console.log(`Click result: ${clicked}`);
    
    if (clicked === true) {
      console.log('✅ Submit button clicked successfully');
      
      // Wait and check for any response
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const responseCheck = await page.evaluate(() => {
        return {
          bodyText: document.body.textContent.includes('Holzbalken'),
          alerts: Array.from(document.querySelectorAll('.MuiAlert-root')).map(a => a.textContent),
          loading: document.querySelectorAll('.MuiCircularProgress-root').length > 0
        };
      });
      
      console.log('Response check:', responseCheck);
    }
    
    await page.screenshot({ 
      path: './test-screenshots/debug-submit-button.png', 
      fullPage: true 
    });
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

debugSubmitButton();