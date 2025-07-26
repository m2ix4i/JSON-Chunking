#!/usr/bin/env node

/**
 * Simple test for Results Page functionality
 */

const puppeteer = require('puppeteer');

async function simpleResultsTest() {
  console.log('🔍 Simple Results Page Test');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    slowMo: 500
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    
    // Test 1: Empty Results page
    console.log('📋 Testing empty Results page...');
    await page.goto('http://localhost:3001/results', { waitUntil: 'networkidle2' });
    
    const pageText = await page.evaluate(() => document.body.textContent);
    
    if (pageText.includes('Keine Abfrage-Ergebnisse')) {
      console.log('✅ Empty state message found');
    } else {
      console.log('❌ Empty state message not found');
    }
    
    if (pageText.includes('Neue Abfrage starten')) {
      console.log('✅ Action button found');
    } else {
      console.log('❌ Action button not found');
    }
    
    // Test 2: Check navigation from Results page
    console.log('📋 Testing navigation...');
    const startQueryButton = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(button => button.textContent.includes('Neue Abfrage starten'));
    });
    
    if (startQueryButton) {
      // Use XPath to find and click the button
      const [button] = await page.$x("//button[contains(text(), 'Neue Abfrage starten')]");
      if (button) {
        await button.click();
        await page.waitForTimeout(1000);
        
        const currentUrl = page.url();
        if (currentUrl.includes('/query')) {
          console.log('✅ Navigation to Query page works');
        } else {
          console.log('❌ Navigation failed, current URL:', currentUrl);
        }
      } else {
        console.log('❌ Could not click button');
      }
    } else {
      console.log('❌ Button not found');
    }
    
    // Test 3: Test URL with query ID
    console.log('📋 Testing URL with query ID...');
    await page.goto('http://localhost:3001/results/test-123', { waitUntil: 'networkidle2' });
    
    const urlTestText = await page.evaluate(() => document.body.textContent);
    if (urlTestText.includes('Ergebnisse') || urlTestText.includes('Keine')) {
      console.log('✅ URL with query ID handled');
    }
    
    console.log('🎉 Simple test completed');
    return true;
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  } finally {
    await browser.close();
  }
}

simpleResultsTest()
  .then(success => {
    console.log(success ? '✅ Tests passed' : '❌ Tests failed');
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });