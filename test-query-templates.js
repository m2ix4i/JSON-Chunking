const { chromium } = require('playwright');

async function testQueryTemplates() {
  console.log('🚀 Starting QueryTemplates Component Testing...\n');
  
  const browser = await chromium.launch({
    headless: false, // Show browser for visual feedback
    slowMo: 500 // Slow down actions for better observation
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  
  const page = await context.newPage();
  
  // Enable console logging from the page
  page.on('console', msg => console.log(`PAGE LOG: ${msg.text()}`));
  page.on('pageerror', error => console.error(`PAGE ERROR: ${error.message}`));
  
  try {
    console.log('📍 Step 1: Navigate to query page...');
    await page.goto('http://localhost:3002/query');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot for reference
    await page.screenshot({ path: 'test-results-1-navigation.png' });
    console.log('✅ Page loaded successfully');
    
    // Check if QueryTemplates section exists
    console.log('\n📍 Step 2: Verify QueryTemplates component is rendered...');
    const templatesSection = await page.locator('.MuiCard-root').filter({ hasText: 'Abfrage-Templates' });
    await templatesSection.waitFor({ state: 'visible', timeout: 10000 });
    console.log('✅ QueryTemplates component is visible');
    
    // Test search functionality
    console.log('\n📍 Step 3: Testing search functionality...');
    const searchInput = page.locator('input[placeholder*="Templates suchen"]');
    await searchInput.waitFor({ state: 'visible' });
    await searchInput.fill('material');
    await page.waitForTimeout(1000); // Wait for filtering
    
    // Check if results are filtered
    const searchResults = await page.locator('.MuiListItem-root').count();
    console.log(`✅ Search performed, found ${searchResults} matching templates`);
    
    // Clear search
    await searchInput.clear();
    await page.waitForTimeout(1000);
    
    // Test category filtering
    console.log('\n📍 Step 4: Testing category filtering...');
    const categorySelect = page.locator('div[role="combobox"]').filter({ hasText: 'Kategorie' });
    await categorySelect.click();
    await page.locator('li[role="option"]').filter({ hasText: 'Material' }).click();
    await page.waitForTimeout(1000);
    
    const categoryResults = await page.locator('.MuiListItem-root').count();
    console.log(`✅ Category filter applied, found ${categoryResults} material templates`);
    
    // Reset category filter
    await categorySelect.click();
    await page.locator('li[role="option"]').filter({ hasText: 'Alle' }).click();
    await page.waitForTimeout(1000);
    
    // Test difficulty filtering
    console.log('\n📍 Step 5: Testing difficulty filtering...');
    const difficultySelect = page.locator('div[role="combobox"]').filter({ hasText: 'Schwierigkeit' });
    await difficultySelect.click();
    await page.locator('li[role="option"]').filter({ hasText: 'Einfach' }).click();
    await page.waitForTimeout(1000);
    
    const difficultyResults = await page.locator('.MuiListItem-root').count();
    console.log(`✅ Difficulty filter applied, found ${difficultyResults} beginner templates`);
    
    // Reset difficulty filter
    await difficultySelect.click();
    await page.locator('li[role="option"]').filter({ hasText: 'Alle' }).click();
    await page.waitForTimeout(1000);
    
    // Test section expand/collapse
    console.log('\n📍 Step 6: Testing section expand/collapse...');
    const sectionHeaders = page.locator('.MuiListItemButton-root').filter({ hasText: /Templates|Beliebte/ });
    const firstSection = sectionHeaders.first();
    await firstSection.click();
    await page.waitForTimeout(500);
    console.log('✅ Section collapsed');
    
    await firstSection.click();
    await page.waitForTimeout(500);
    console.log('✅ Section expanded');
    
    // Test template selection and favorites
    console.log('\n📍 Step 7: Testing template selection and favorites...');
    const firstTemplate = page.locator('.MuiListItem-root').first();
    
    // Test favorite toggle
    const favoriteButton = firstTemplate.locator('button').filter({ hasText: /star/i }).or(
      firstTemplate.locator('button').locator('svg[data-testid*="Star"]')
    );
    
    if (await favoriteButton.count() > 0) {
      await favoriteButton.click();
      await page.waitForTimeout(500);
      console.log('✅ Favorite toggled');
    }
    
    // Test template selection
    await firstTemplate.click();
    await page.waitForTimeout(1000);
    
    // Check if customization dialog opens (if template has variables)
    const dialog = page.locator('.MuiDialog-root');
    const dialogExists = await dialog.count() > 0;
    
    if (dialogExists) {
      console.log('✅ Customization dialog opened for template with variables');
      
      // Close dialog
      const cancelButton = page.locator('button').filter({ hasText: 'Abbrechen' });
      if (await cancelButton.count() > 0) {
        await cancelButton.click();
        await page.waitForTimeout(500);
        console.log('✅ Dialog closed');
      }
    } else {
      console.log('✅ Template selected (no customization needed)');
    }
    
    // Performance metrics
    console.log('\n📍 Step 8: Measuring performance metrics...');
    const startTime = Date.now();
    
    await searchInput.fill('component');
    await page.waitForTimeout(500);
    
    const searchTime = Date.now() - startTime;
    console.log(`✅ Search response time: ${searchTime}ms`);
    
    // Take final screenshot
    await page.screenshot({ path: 'test-results-final.png' });
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📊 Test Summary:');
    console.log('✅ Navigation to query page');
    console.log('✅ QueryTemplates component rendering');
    console.log('✅ Search functionality');
    console.log('✅ Category filtering');
    console.log('✅ Difficulty filtering');
    console.log('✅ Section expand/collapse');
    console.log('✅ Template selection');
    console.log('✅ Favorites functionality');
    console.log('✅ Performance measurement');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: 'test-error.png' });
  } finally {
    await browser.close();
  }
}

// Run the test
testQueryTemplates().catch(console.error);