#!/usr/bin/env node

/**
 * Debug Query Submit Button - Investigate why submit button stays disabled
 */

const puppeteer = require('puppeteer');

async function debugQuerySubmit() {
  console.log('🔍 Debug: Query Submit Button Issue\n');
  
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
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('\n📋 Step 1: Initial page state');
    const initialState = await page.evaluate(() => {
      const files = document.querySelectorAll('.MuiListItem-root');
      const textareas = document.querySelectorAll('textarea');
      const buttons = Array.from(document.querySelectorAll('button'));
      
      return {
        fileItems: files.length,
        textareas: textareas.length,
        buttons: buttons.map(btn => ({
          text: btn.textContent.trim(),
          disabled: btn.disabled,
          type: btn.type || 'button'
        }))
      };
    });
    
    console.log(`Files available: ${initialState.fileItems}`);
    console.log(`Textareas: ${initialState.textareas}`);
    console.log('Buttons found:');
    initialState.buttons.forEach((btn, i) => {
      console.log(`  ${i + 1}. "${btn.text}" (${btn.type}) - ${btn.disabled ? 'DISABLED' : 'ENABLED'}`);
    });
    
    console.log('\n📋 Step 2: Select a file');
    const fileSelected = await page.evaluate(() => {
      const listItems = Array.from(document.querySelectorAll('.MuiListItem-root'));
      for (const item of listItems) {
        const radio = item.querySelector('input[type="radio"]');
        const text = item.textContent;
        if (radio && text.includes('.json') && radio.value) {
          console.log('Selecting file:', text.trim());
          radio.click();
          return radio.value;
        }
      }
      return null;
    });
    
    if (!fileSelected) {
      console.log('❌ No file could be selected');
      return false;
    }
    
    console.log(`✅ File selected: ${fileSelected}`);
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('\n📋 Step 3: Check form state after file selection');
    const afterFileSelection = await page.evaluate(() => {
      const textareas = document.querySelectorAll('textarea');
      const buttons = Array.from(document.querySelectorAll('button'));
      const submitBtn = buttons.find(btn => 
        btn.textContent.includes('Submit') || btn.textContent.includes('Query')
      );
      
      return {
        textareaCount: textareas.length,
        textareaVisible: textareas.length > 0 ? textareas[0].offsetParent !== null : false,
        submitButton: submitBtn ? {
          text: submitBtn.textContent.trim(),
          disabled: submitBtn.disabled,
          visible: submitBtn.offsetParent !== null
        } : null
      };
    });
    
    console.log(`Textarea visible: ${afterFileSelection.textareaVisible}`);
    if (afterFileSelection.submitButton) {
      console.log(`Submit button: "${afterFileSelection.submitButton.text}" - ${afterFileSelection.submitButton.disabled ? 'DISABLED' : 'ENABLED'}`);
    } else {
      console.log('❌ No submit button found');
    }
    
    if (!afterFileSelection.textareaVisible) {
      console.log('❌ Query form not visible - stopping test');
      return false;
    }
    
    console.log('\n📋 Step 4: Test different input methods');
    
    // Method 1: Direct value assignment
    console.log('🧪 Method 1: Direct value assignment');
    await page.evaluate(() => {
      const textarea = document.querySelector('textarea');
      if (textarea) {
        textarea.value = 'Test query method 1';
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    let buttonState = await page.evaluate(() => {
      const submitBtn = Array.from(document.querySelectorAll('button')).find(btn => 
        btn.textContent.includes('Submit') || btn.textContent.includes('Query')
      );
      const textarea = document.querySelector('textarea');
      return {
        button: submitBtn ? { disabled: submitBtn.disabled, text: submitBtn.textContent.trim() } : null,
        textarea: textarea ? { value: textarea.value, length: textarea.value.length } : null
      };
    });
    
    console.log(`Button after method 1: ${buttonState.button ? (buttonState.button.disabled ? 'DISABLED' : 'ENABLED') : 'NOT FOUND'}`);
    console.log(`Textarea value: "${buttonState.textarea?.value}" (${buttonState.textarea?.length} chars)`);
    
    // Method 2: Focus and keyboard typing
    console.log('\n🧪 Method 2: Keyboard typing');
    const textarea = await page.$('textarea');
    if (textarea) {
      await textarea.click();
      await textarea.focus();
      
      // Clear existing content
      await page.keyboard.down('Control');
      await page.keyboard.press('KeyA');
      await page.keyboard.up('Control');
      await page.keyboard.press('Delete');
      
      // Type new content
      await page.keyboard.type('Zeige mir alle Holzbalken aus Fichte im Erdgeschoss', { delay: 50 });
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    buttonState = await page.evaluate(() => {
      const submitBtn = Array.from(document.querySelectorAll('button')).find(btn => 
        btn.textContent.includes('Submit') || btn.textContent.includes('Query')
      );
      const textarea = document.querySelector('textarea');
      return {
        button: submitBtn ? { disabled: submitBtn.disabled, text: submitBtn.textContent.trim() } : null,
        textarea: textarea ? { value: textarea.value, length: textarea.value.length } : null
      };
    });
    
    console.log(`Button after method 2: ${buttonState.button ? (buttonState.button.disabled ? 'DISABLED' : 'ENABLED') : 'NOT FOUND'}`);
    console.log(`Textarea value: "${buttonState.textarea?.value}" (${buttonState.textarea?.length} chars)`);
    
    // Method 3: Inspect React state
    console.log('\n🧪 Method 3: React state inspection');
    const reactState = await page.evaluate(() => {
      const textarea = document.querySelector('textarea');
      if (textarea) {
        // Try to access React internal state
        const reactKey = Object.keys(textarea).find(key => key.startsWith('__reactInternalInstance') || key.startsWith('_reactInternalFiber'));
        if (reactKey) {
          return { hasReactState: true, reactKey };
        }
      }
      return { hasReactState: false };
    });
    
    console.log(`React state accessible: ${reactState.hasReactState}`);
    
    // Check form validation logic
    console.log('\n📋 Step 5: Form validation analysis');
    const validationCheck = await page.evaluate(() => {
      const form = document.querySelector('form');
      const textarea = document.querySelector('textarea');
      const submitBtn = Array.from(document.querySelectorAll('button')).find(btn => 
        btn.textContent.includes('Submit') || btn.textContent.includes('Query')
      );
      
      // Check if button is disabled due to form validation
      const textareaValue = textarea ? textarea.value.trim() : '';
      const isButtonDisabled = submitBtn ? submitBtn.disabled : true;
      
      // Look for validation attributes
      const hasRequired = textarea ? textarea.required : false;
      const hasMinLength = textarea ? textarea.minLength > 0 : false;
      
      return {
        hasForm: !!form,
        textareaValue,
        textareaLength: textareaValue.length,
        isButtonDisabled,
        hasRequired,
        hasMinLength,
        buttonHTML: submitBtn ? submitBtn.outerHTML : 'No button'
      };
    });
    
    console.log(`Form present: ${validationCheck.hasForm}`);
    console.log(`Textarea value: "${validationCheck.textareaValue}" (${validationCheck.textareaLength} chars)`);
    console.log(`Button disabled: ${validationCheck.isButtonDisabled}`);
    console.log(`Required attribute: ${validationCheck.hasRequired}`);
    console.log(`Min length: ${validationCheck.hasMinLength}`);
    
    // Try to click the button regardless
    console.log('\n📋 Step 6: Force button click attempt');
    const clickResult = await page.evaluate(() => {
      const submitBtn = Array.from(document.querySelectorAll('button')).find(btn => 
        btn.textContent.includes('Submit') || btn.textContent.includes('Query')
      );
      
      if (submitBtn) {
        try {
          submitBtn.click();
          return { clicked: true, disabled: submitBtn.disabled };
        } catch (error) {
          return { clicked: false, error: error.message, disabled: submitBtn.disabled };
        }
      }
      return { clicked: false, error: 'Button not found' };
    });
    
    console.log(`Click attempt: ${clickResult.clicked ? 'SUCCESS' : 'FAILED'}`);
    if (clickResult.error) {
      console.log(`Error: ${clickResult.error}`);
    }
    
    // Wait and check for any response
    if (clickResult.clicked) {
      console.log('\n⏳ Waiting for response...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const responseCheck = await page.evaluate(() => {
        const bodyText = document.body.textContent;
        return {
          hasProcessing: bodyText.includes('Processing') || bodyText.includes('Verarbeitung'),
          hasError: bodyText.includes('Error') || bodyText.includes('Fehler'),
          hasResponse: bodyText.includes('Holzbalken') || bodyText.includes('Antwort'),
          loadingSpinners: document.querySelectorAll('.MuiCircularProgress-root').length
        };
      });
      
      console.log(`Processing: ${responseCheck.hasProcessing}`);
      console.log(`Error: ${responseCheck.hasError}`);
      console.log(`Response: ${responseCheck.hasResponse}`);
      console.log(`Loading spinners: ${responseCheck.loadingSpinners}`);
    }
    
    // Take screenshot for analysis
    await page.screenshot({ 
      path: './test-screenshots/debug-query-submit.png', 
      fullPage: true 
    });
    console.log('\n📸 Screenshot saved: debug-query-submit.png');
    
    return clickResult.clicked;
    
  } catch (error) {
    console.error('❌ Debug test failed:', error.message);
    return false;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

debugQuerySubmit().then(success => {
  console.log(`\n${success ? '✅' : '❌'} Query Submit Debug: ${success ? 'BUTTON CLICKED' : 'BUTTON ISSUE'}`);
  process.exit(success ? 0 : 1);
});