#!/usr/bin/env node

/**
 * Debug Query Page State - Check if QueryForm appears after file selection
 */

const puppeteer = require('puppeteer');

async function debugQueryPage() {
  console.log('🔍 Debug: Query Page State After File Selection\n');
  
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
    
    // Wait for page to load completely
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('\n📋 Step 1: Check available files');
    const availableFiles = await page.evaluate(() => {
      const listItems = Array.from(document.querySelectorAll('.MuiListItem-root'));
      return listItems.map(item => {
        const radio = item.querySelector('input[type="radio"]');
        const primaryText = item.querySelector('.MuiListItemText-primary');
        
        if (radio && primaryText) {
          let filename = primaryText.textContent.trim();
          if (filename.includes('.json')) {
            filename = filename.split('.json')[0] + '.json';
          }
          
          return {
            value: radio.value,
            checked: radio.checked,
            label: filename
          };
        }
        return null;
      }).filter(file => file && file.value && file.label.includes('.json'));
    });
    
    console.log(`📁 Found ${availableFiles.length} files:`);
    availableFiles.forEach((file, index) => 
      console.log(`   ${index + 1}. ${file.label} (${file.value}) ${file.checked ? '●' : '○'}`)
    );
    
    if (availableFiles.length === 0) {
      console.log('❌ No files available - cannot test file selection');
      return;
    }
    
    console.log('\n📋 Step 2: Check initial page state');
    const initialState = await page.evaluate(() => {
      const queryForms = document.querySelectorAll('form, [data-testid*="query"], textarea, input[type="text"]');
      const alerts = document.querySelectorAll('.MuiAlert-root');
      const gridItems = document.querySelectorAll('.MuiGrid-item');
      
      return {
        queryFormsCount: queryForms.length,
        alertsCount: alerts.length,
        gridItemsCount: gridItems.length,
        alertTexts: Array.from(alerts).map(alert => alert.textContent.trim()),
        hasQueryForm: queryForms.length > 0,
        hasFileRequiredAlert: Array.from(alerts).some(alert => 
          alert.textContent.includes('Dateiauswahl erforderlich')
        )
      };
    });
    
    console.log(`🔍 Initial state:`);
    console.log(`   Query forms: ${initialState.queryFormsCount}`);
    console.log(`   Alerts: ${initialState.alertsCount}`);
    console.log(`   Grid items: ${initialState.gridItemsCount}`);
    console.log(`   Has "file required" alert: ${initialState.hasFileRequiredAlert}`);
    console.log(`   Alert texts: ${initialState.alertTexts.join(', ')}`);
    
    console.log('\n📋 Step 3: Select first available file');
    const firstFile = availableFiles[0];
    console.log(`🎯 Selecting: ${firstFile.label} (${firstFile.value})`);
    
    const selectionResult = await page.evaluate((fileId) => {
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
    
    console.log(`✅ File selection: ${selectionResult ? 'SUCCESS' : 'FAILED'}`);
    
    if (!selectionResult) {
      console.log('❌ Cannot continue - file selection failed');
      return;
    }
    
    // Wait for React state update
    console.log('⏳ Waiting for React state update...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('\n📋 Step 4: Check state after file selection');
    const afterSelectionState = await page.evaluate(() => {
      const queryForms = document.querySelectorAll('form, [data-testid*="query"], textarea, input[type="text"]');
      const alerts = document.querySelectorAll('.MuiAlert-root');
      const gridItems = document.querySelectorAll('.MuiGrid-item');
      const selectedRadio = document.querySelector('input[type="radio"]:checked');
      
      return {
        queryFormsCount: queryForms.length,
        alertsCount: alerts.length,
        gridItemsCount: gridItems.length,
        alertTexts: Array.from(alerts).map(alert => alert.textContent.trim()),
        hasQueryForm: queryForms.length > 0,
        hasFileSelectedAlert: Array.from(alerts).some(alert => 
          alert.textContent.includes('Ausgewählt:')
        ),
        selectedFileValue: selectedRadio ? selectedRadio.value : null,
        selectedFileText: selectedRadio ? selectedRadio.closest('.MuiListItem-root')?.querySelector('.MuiListItemText-primary')?.textContent?.trim() : null
      };
    });
    
    console.log(`🔍 After selection state:`);
    console.log(`   Query forms: ${afterSelectionState.queryFormsCount}`);
    console.log(`   Alerts: ${afterSelectionState.alertsCount}`);
    console.log(`   Grid items: ${afterSelectionState.gridItemsCount}`);
    console.log(`   Has "file selected" alert: ${afterSelectionState.hasFileSelectedAlert}`);
    console.log(`   Selected file: ${afterSelectionState.selectedFileText} (${afterSelectionState.selectedFileValue})`);
    console.log(`   Alert texts: ${afterSelectionState.alertTexts.join(', ')}`);
    
    console.log('\n📋 Step 5: Look for QueryForm specifically');
    const queryFormDetails = await page.evaluate(() => {
      // Look for various query form indicators
      const textareas = Array.from(document.querySelectorAll('textarea'));
      const submitButtons = Array.from(document.querySelectorAll('button[type="submit"], button'));
      const forms = Array.from(document.querySelectorAll('form'));
      const queryInputs = Array.from(document.querySelectorAll('input[label*="query"], input[placeholder*="query"], textarea[label*="query"]'));
      
      const queryFormContainer = document.querySelector('[data-testid="query-form"]') || 
                                 document.querySelector('.query-form') ||
                                 forms.find(form => form.textContent.includes('Query') || form.textContent.includes('Abfrage'));
      
      return {
        textareas: textareas.length,
        submitButtons: submitButtons.map(btn => btn.textContent.trim()),
        forms: forms.length,
        queryInputs: queryInputs.length,
        hasQueryFormContainer: !!queryFormContainer,
        queryFormHTML: queryFormContainer ? queryFormContainer.outerHTML.slice(0, 500) : 'Not found'
      };
    });
    
    console.log(`🔍 QueryForm details:`);
    console.log(`   Textareas: ${queryFormDetails.textareas}`);
    console.log(`   Submit buttons: ${queryFormDetails.submitButtons.join(', ')}`);
    console.log(`   Forms: ${queryFormDetails.forms}`);
    console.log(`   Query inputs: ${queryFormDetails.queryInputs}`);
    console.log(`   Has QueryForm container: ${queryFormDetails.hasQueryFormContainer}`);
    
    // Take final screenshot
    await page.screenshot({ 
      path: './test-screenshots/debug-query-page-final.png', 
      fullPage: true 
    });
    console.log('\n📸 Screenshot saved: debug-query-page-final.png');
    
    console.log('\n🎯 Diagnosis:');
    if (afterSelectionState.hasQueryForm) {
      console.log('✅ QueryForm IS appearing after file selection');
    } else {
      console.log('❌ QueryForm NOT appearing after file selection');
      console.log('🔧 Possible issues:');
      console.log('   - React state not updating properly');
      console.log('   - selectedFile state not being set');
      console.log('   - QueryForm component not rendering');
      console.log('   - CSS hiding the form');
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

debugQueryPage();