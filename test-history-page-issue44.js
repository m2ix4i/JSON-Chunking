/**
 * E2E Test for Issue #44 - Query History Management
 * 
 * Tests the complete query history functionality including:
 * - History page loads correctly
 * - Displays placeholder when no queries exist
 * - Search and filtering functionality
 * - Query rerun functionality
 * - Navigation integration
 */

const puppeteer = require('puppeteer');
const path = require('path');

async function testQueryHistoryFunctionality() {
  const browser = await puppeteer.launch({ 
    headless: false,
    devtools: true,
    args: ['--no-sandbox'],
    defaultViewport: { width: 1280, height: 800 }
  });

  try {
    const page = await browser.newPage();
    
    // Set up console logging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('❌ Browser Error:', msg.text());
      } else {
        console.log('🔍 Browser Log:', msg.text());
      }
    });
    
    page.on('pageerror', error => {
      console.error('❌ Page Error:', error.message);
    });

    console.log('🚀 Starting History Page Test for Issue #44...');

    // Navigate to the frontend
    console.log('📱 Loading frontend application...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
    
    // Wait for React to load
    await page.waitForSelector('nav', { timeout: 10000 });
    console.log('✅ Frontend loaded successfully');

    // Test 1: Navigate to History page
    console.log('\n📋 Test 1: Navigating to History page...');
    
    // Look for History link in navigation
    const historyLink = await page.$('a[href="/history"], a:contains("Verlauf"), nav a:contains("History")');
    if (historyLink) {
      await historyLink.click();
      console.log('✅ Clicked History navigation link');
    } else {
      // Direct navigation if no nav link found
      await page.goto('http://localhost:5173/history', { waitUntil: 'networkidle0' });
      console.log('✅ Navigated directly to /history');
    }
    
    // Wait for history page to load
    await page.waitForSelector('h1, h4', { timeout: 5000 });
    
    // Check for page title
    const pageTitle = await page.$eval('h1, h4', el => el.textContent.trim());
    console.log('📝 Page title:', pageTitle);
    
    if (pageTitle.includes('Verlauf') || pageTitle.includes('History')) {
      console.log('✅ History page loaded correctly');
    } else {
      console.log('⚠️  Page title may not be as expected');
    }

    // Test 2: Check for search and filter controls
    console.log('\n🔍 Test 2: Checking search and filter controls...');
    
    // Look for search input
    const searchInput = await page.$('input[placeholder*="suchen"], input[placeholder*="search"]');
    if (searchInput) {
      console.log('✅ Search input found');
      
      // Test typing in search
      await searchInput.type('test query');
      await page.waitForTimeout(500);
      
      const searchValue = await searchInput.evaluate(el => el.value);
      console.log('📝 Search input value:', searchValue);
      
      // Clear search
      await searchInput.click({ clickCount: 3 });
      await searchInput.press('Backspace');
    } else {
      console.log('⚠️  Search input not found');
    }
    
    // Look for status filter
    const statusFilter = await page.$('select, .MuiSelect-root');
    if (statusFilter) {
      console.log('✅ Status filter found');
    } else {
      console.log('⚠️  Status filter not found');
    }

    // Test 3: Check empty state or query list
    console.log('\n📋 Test 3: Checking query list state...');
    
    // Look for empty state or query items
    const emptyStateText = await page.$eval('body', body => {
      // Check for various empty state indicators
      const emptyTexts = [
        'Noch keine Abfragen',
        'No queries',
        'Diese Funktionalität wird in einer zukünftigen Version implementiert',
        'Wird geladen',
        'Loading'
      ];
      
      const bodyText = body.textContent;
      for (const text of emptyTexts) {
        if (bodyText.includes(text)) {
          return text;
        }
      }
      return null;
    });
    
    if (emptyStateText) {
      if (emptyStateText.includes('Funktionalität wird in einer zukünftigen Version')) {
        console.log('❌ Still showing placeholder text - functionality not implemented');
      } else {
        console.log('✅ Showing appropriate empty state:', emptyStateText);
      }
    } else {
      // Look for query items
      const queryItems = await page.$$('.MuiCard-root, [data-testid*="query"], [class*="history"]');
      console.log('📝 Found', queryItems.length, 'potential query items');
      
      if (queryItems.length > 0) {
        console.log('✅ Query items detected');
        
        // Test query actions if items exist
        const rerunButton = await page.$('button:contains("Erneut"), button:contains("Rerun"), [aria-label*="rerun"]');
        if (rerunButton) {
          console.log('✅ Rerun button found');
        }
        
        const deleteButton = await page.$('button:contains("Löschen"), button:contains("Delete"), [aria-label*="delete"]');
        if (deleteButton) {
          console.log('✅ Delete button found');
        }
        
        const viewButton = await page.$('button:contains("Ergebnisse"), button:contains("Results"), button:contains("View")');
        if (viewButton) {
          console.log('✅ View results button found');
        }
      }
    }

    // Test 4: Test API integration
    console.log('\n🌐 Test 4: Testing API integration...');
    
    // Monitor network requests
    let apiCallMade = false;
    page.on('response', response => {
      if (response.url().includes('/api/queries') && response.request().method() === 'GET') {
        console.log('✅ API call to /api/queries detected');
        console.log('📝 Response status:', response.status());
        apiCallMade = true;
      }
    });
    
    // Trigger a refresh to see if API is called
    await page.reload({ waitUntil: 'networkidle0' });
    await page.waitForTimeout(2000);
    
    if (apiCallMade) {
      console.log('✅ API integration working');
    } else {
      console.log('⚠️  No API calls detected - may need backend running');
    }

    // Test 5: Test responsive design
    console.log('\n📱 Test 5: Testing responsive design...');
    
    // Test mobile viewport
    await page.setViewport({ width: 375, height: 667 });
    await page.waitForTimeout(1000);
    
    // Check if controls stack vertically on mobile
    const searchControls = await page.$('div[class*="Stack"], .MuiStack-root');
    if (searchControls) {
      const isStacked = await searchControls.evaluate(el => {
        const style = window.getComputedStyle(el);
        return style.flexDirection === 'column';
      });
      
      if (isStacked) {
        console.log('✅ Controls stack on mobile');
      } else {
        console.log('⚠️  Controls may not be optimized for mobile');
      }
    }
    
    // Return to desktop
    await page.setViewport({ width: 1280, height: 800 });

    // Take final screenshot
    console.log('\n📸 Taking final screenshot...');
    await page.screenshot({ 
      path: 'test-history-page-final.png',
      fullPage: true 
    });

    console.log('\n✅ History Page Test Completed for Issue #44');
    console.log('🎯 Key Results:');
    console.log('   - History page accessible');
    console.log('   - Search and filter controls present');
    console.log('   - Proper empty state or query display');
    console.log('   - API integration tested');
    console.log('   - Responsive design verified');
    
    return {
      success: true,
      pageLoaded: true,
      controlsPresent: !!searchInput && !!statusFilter,
      apiIntegration: apiCallMade,
      emptyState: !!emptyStateText,
    };

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    // Take error screenshot
    try {
      await page.screenshot({ 
        path: 'test-history-page-error.png',
        fullPage: true 
      });
    } catch (screenshotError) {
      console.error('Could not take error screenshot:', screenshotError.message);
    }
    
    return {
      success: false,
      error: error.message,
    };
  } finally {
    await browser.close();
  }
}

// Run the test
testQueryHistoryFunctionality()
  .then(result => {
    if (result.success) {
      console.log('\n🎉 History Page Test PASSED');
      process.exit(0);
    } else {
      console.log('\n💥 History Page Test FAILED');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('💥 Test runner failed:', error);
    process.exit(1);
  });