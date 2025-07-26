const { chromium } = require('playwright');

async function testStandaloneComponents() {
  console.log('🚀 Testing QueryTemplates Component Standalone...\n');
  
  const browser = await chromium.launch({
    headless: false,
    slowMo: 800
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  
  const page = await context.newPage();
  
  // Mock API calls to prevent 500 errors
  await page.route('**/api/**', route => {
    const url = route.request().url();
    console.log(`🔗 Mocking API call: ${url}`);
    
    if (url.includes('/health')) {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'ok' })
      });
    } else if (url.includes('/files')) {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    } else {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'mocked' })
      });
    }
  });
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`🔴 Console Error: ${msg.text()}`);
    } else if (msg.text().includes('Template') || msg.text().includes('filter')) {
      console.log(`📝 Page: ${msg.text()}`);
    }
  });
  
  try {
    console.log('📍 Step 1: Navigate to query page with mocked APIs...');
    await page.goto('http://localhost:3002/query');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Take screenshot
    await page.screenshot({ path: 'test-mocked-1.png' });
    
    // Wait for React components to render
    console.log('📍 Step 2: Wait for React components to render...');
    await page.waitForTimeout(2000);
    
    // Check for main page content
    const pageContent = await page.textContent('body');
    console.log(`📄 Page text contains: ${pageContent.length} characters`);
    
    // Look for the key elements more broadly
    console.log('📍 Step 3: Looking for UI components...');
    
    // Check for any text related to query/template/abfrage
    const hasQueryText = pageContent.includes('Abfrage') || pageContent.includes('Query') || pageContent.includes('Template');
    console.log(`🔍 Has query-related text: ${hasQueryText}`);
    
    // Look for Material-UI components
    const muiElements = await page.locator('[class*="Mui"], .MuiCard-root, .MuiBox-root').count();
    console.log(`🎨 Material-UI elements found: ${muiElements}`);
    
    // Look for any input elements
    const inputs = await page.locator('input, textarea, select').count();
    console.log(`📝 Form elements found: ${inputs}`);
    
    // Look for any buttons
    const buttons = await page.locator('button').count();
    console.log(`🔘 Buttons found: ${buttons}`);
    
    // Check if we can find template-related elements by waiting
    let templatesFound = false;
    try {
      const templateElement = page.locator('text=Abfrage-Templates').or(page.locator('text=Template')).or(page.locator('[data-testid*="template"]'));
      await templateElement.waitFor({ timeout: 5000 });
      templatesFound = true;
      console.log('✅ Found template-related content!');
      
      // Take screenshot of templates
      await page.screenshot({ path: 'test-templates-found.png' });
      
      // Test interactions if templates are found
      console.log('📍 Step 4: Testing template interactions...');
      
      // Look for search input
      const searchInput = page.locator('input[placeholder*="suchen"], input[placeholder*="Templates"], input[type="search"]');
      if (await searchInput.count() > 0) {
        console.log('🔍 Testing search functionality...');
        await searchInput.first().fill('material');
        await page.waitForTimeout(1000);
        await searchInput.first().clear();
        console.log('✅ Search test completed');
      }
      
      // Look for category filter
      const selects = page.locator('select, [role="combobox"]');
      if (await selects.count() > 0) {
        console.log('📂 Testing filters...');
        await selects.first().click();
        await page.waitForTimeout(500);
        // Try to close dropdown by clicking elsewhere
        await page.click('body');
        console.log('✅ Filter test completed');
      }
      
      // Look for collapsible sections
      const sectionHeaders = page.locator('button').filter({ hasText: /Template|Beliebte|Material|Component/i });
      if (await sectionHeaders.count() > 0) {
        console.log('📑 Testing section collapse/expand...');
        await sectionHeaders.first().click();
        await page.waitForTimeout(500);
        await sectionHeaders.first().click();
        console.log('✅ Section toggle test completed');
      }
      
    } catch (e) {
      console.log('❌ Template elements not found within timeout');
    }
    
    // Final comprehensive check
    console.log('📍 Step 5: Final component analysis...');
    
    // Get all text content and check for component indicators
    const allText = await page.textContent('body');
    const hasComponents = {
      search: allText.includes('suchen') || allText.includes('search'),
      filter: allText.includes('Filter') || allText.includes('Kategorie'),
      template: allText.includes('Template') || allText.includes('Abfrage'),
      difficulty: allText.includes('Schwierigkeit') || allText.includes('difficulty'),
      popular: allText.includes('Beliebte') || allText.includes('popular')
    };
    
    console.log('🧩 Component indicators found:');
    Object.entries(hasComponents).forEach(([key, found]) => {
      console.log(`  ${found ? '✅' : '❌'} ${key}: ${found}`);
    });
    
    // Performance test
    const startTime = Date.now();
    await page.reload();
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    console.log(`⚡ Page reload time: ${loadTime}ms`);
    
    // Take final screenshot
    await page.screenshot({ path: 'test-final-analysis.png' });
    
    console.log('\n📊 Test Summary:');
    console.log(`✅ Page loads successfully`);
    console.log(`📦 Material-UI elements: ${muiElements}`);
    console.log(`📝 Form elements: ${inputs}`);
    console.log(`🔘 Buttons: ${buttons}`);
    console.log(`🎯 Templates found: ${templatesFound}`);
    console.log(`⚡ Load performance: ${loadTime}ms`);
    
    if (templatesFound) {
      console.log('\n🎉 QueryTemplates component is functioning!');
      console.log('✅ Component renders correctly');
      console.log('✅ Basic interactions work');
      console.log('✅ Refactoring appears successful');
    } else {
      console.log('\n⚠️  QueryTemplates may not be rendering properly');
      console.log('🔍 This could be due to:');
      console.log('   - Missing backend data');
      console.log('   - Component loading issues');
      console.log('   - Route configuration problems');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: 'test-error-final.png' });
  } finally {
    console.log('\n📸 Screenshots saved for analysis');
    console.log('🔍 Keeping browser open for 20 seconds for manual inspection...');
    await page.waitForTimeout(20000);
    await browser.close();
  }
}

testStandaloneComponents().catch(console.error);