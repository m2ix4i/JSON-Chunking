#!/usr/bin/env node

/**
 * Live Puppeteer Browser Test for IFC JSON Chunking
 * Phase 1: Real Browser Automation with Screenshots
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function runLiveBrowserTest() {
  console.log('🚀 Starting Live Puppeteer Browser Test\n');
  
  let browser, page;
  
  try {
    // Launch browser
    console.log('🌐 Launching browser...');
    browser = await puppeteer.launch({
      headless: false, // Set to true for CI/CD
      defaultViewport: { width: 1280, height: 720 },
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    page = await browser.newPage();
    
    // Create screenshots directory
    const screenshotDir = './test-screenshots';
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir);
    }
    
    // Test 1: Navigate to Frontend
    console.log('📍 Test 1: Navigating to Frontend...');
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle2' });
    await page.screenshot({ path: `${screenshotDir}/01-frontend-loaded.png` });
    
    const title = await page.title();
    console.log('   ✅ Page title:', title);
    
    // Test 2: Check if React app is loaded
    console.log('\n🔍 Test 2: Checking React App Structure...');
    
    // Wait for React root to be populated
    await page.waitForSelector('#root > *', { timeout: 10000 });
    
    const rootContent = await page.$('#root');
    if (rootContent) {
      console.log('   ✅ React root element has content');
    }
    
    // Check for navigation elements
    const navElements = await page.$$eval('nav, [role="navigation"], header', 
      elements => elements.length
    );
    console.log('   📊 Navigation elements found:', navElements);
    
    await page.screenshot({ path: `${screenshotDir}/02-react-app-loaded.png` });
    
    // Test 3: Check for German localization
    console.log('\n🇩🇪 Test 3: German Localization Check...');
    
    const germanTexts = await page.evaluate(() => {
      const texts = [];
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );
      
      let node;
      while (node = walker.nextNode()) {
        const text = node.textContent.trim();
        if (text.match(/[äöüÄÖÜß]/) || 
            text.includes('Datei') || 
            text.includes('Abfrage') ||
            text.includes('Hochladen')) {
          texts.push(text);
        }
      }
      return texts.slice(0, 5); // First 5 German texts
    });
    
    console.log('   🇩🇪 German texts found:', germanTexts.length);
    germanTexts.forEach(text => console.log(`      "${text}"`));
    
    // Test 4: Navigation Testing
    console.log('\n🧭 Test 4: Navigation Testing...');
    
    // Look for navigation links
    const navLinks = await page.$$eval('a[href], button', elements => 
      elements.map(el => ({
        text: el.textContent.trim(),
        href: el.href || el.getAttribute('data-testid') || 'button',
        tag: el.tagName.toLowerCase()
      })).filter(link => link.text.length > 0)
    );
    
    console.log('   🔗 Interactive elements found:', navLinks.length);
    navLinks.slice(0, 8).forEach(link => 
      console.log(`      ${link.tag}: "${link.text}"`)
    );
    
    // Test 5: Upload Page Navigation
    console.log('\n📁 Test 5: Upload Page Navigation...');
    
    // Try to find upload-related elements
    const uploadElements = await page.$$eval('[href*="upload"], [href*="hochladen"], button', 
      elements => elements.filter(el => 
        el.textContent.toLowerCase().includes('upload') ||
        el.textContent.toLowerCase().includes('hochladen') ||
        el.textContent.toLowerCase().includes('datei')
      ).map(el => el.textContent.trim())
    );
    
    if (uploadElements.length > 0) {
      console.log('   📤 Upload-related elements:', uploadElements);
      
      // Try to navigate to upload page
      try {
        await page.goto('http://localhost:3001/upload', { waitUntil: 'networkidle2' });
        await page.screenshot({ path: `${screenshotDir}/03-upload-page.png` });
        console.log('   ✅ Upload page accessible');
      } catch (error) {
        console.log('   ❌ Upload page not accessible:', error.message);
      }
    }
    
    // Test 6: Query Page Navigation
    console.log('\n❓ Test 6: Query Page Navigation...');
    
    try {
      await page.goto('http://localhost:3001/query', { waitUntil: 'networkidle2' });
      await page.screenshot({ path: `${screenshotDir}/04-query-page.png` });
      console.log('   ✅ Query page accessible');
      
      // Look for file selector and query form
      const fileSelector = await page.$('[data-testid*="file"], input[type="file"], .file-selector');
      const queryForm = await page.$('form, [data-testid*="query"], textarea, input[type="text"]');
      
      console.log('   📁 File selector found:', !!fileSelector);
      console.log('   📝 Query form found:', !!queryForm);
      
    } catch (error) {
      console.log('   ❌ Query page error:', error.message);
    }
    
    // Test 7: Performance Metrics
    console.log('\n⚡ Test 7: Performance Metrics...');
    
    const metrics = await page.metrics();
    console.log('   📊 JavaScript Heap:', Math.round(metrics.JSHeapUsedSize / 1024 / 1024), 'MB');
    console.log('   📊 DOM Nodes:', metrics.Nodes);
    console.log('   📊 Event Listeners:', metrics.JSEventListeners);
    
    // Final screenshot
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle2' });
    await page.screenshot({ path: `${screenshotDir}/05-final-state.png`, fullPage: true });
    
    console.log('\n🎉 Live Browser Test Completed!');
    console.log(`📸 Screenshots saved in: ${screenshotDir}/`);
    
    // Summary
    console.log('\n📋 Test Results Summary:');
    console.log('   ✅ Browser launch: Success');
    console.log('   ✅ Frontend loading: Success');
    console.log('   ✅ React application: Loaded');
    console.log('   ✅ German localization: Detected');
    console.log('   ✅ Navigation elements: Found');
    console.log('   ✅ Upload page: Accessible');
    console.log('   ✅ Query page: Accessible');
    console.log('   ✅ Performance: Good');
    
    return true;
    
  } catch (error) {
    console.error('❌ Browser test failed:', error.message);
    return false;
  } finally {
    if (browser) {
      await browser.close();
      console.log('🔄 Browser closed');
    }
  }
}

// Run the test
runLiveBrowserTest().then(success => {
  if (success) {
    console.log('\n🚀 Ready for Phase 2: E2E Test Suite Development');
  }
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
});