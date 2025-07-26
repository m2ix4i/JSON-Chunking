const { chromium } = require('playwright');

async function testQueryTemplatesSimplified() {
  console.log('🚀 Starting Simplified QueryTemplates Component Testing...\n');
  
  const browser = await chromium.launch({
    headless: false,
    slowMo: 1000
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  
  const page = await context.newPage();
  
  // Enable console logging
  page.on('console', msg => console.log(`PAGE: ${msg.text()}`));
  page.on('pageerror', error => console.error(`ERROR: ${error.message}`));
  
  try {
    console.log('📍 Step 1: Navigate to query page...');
    await page.goto('http://localhost:3002/query');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
    
    // Take screenshot to see what's on the page
    await page.screenshot({ path: 'page-initial.png' });
    
    // Check page title
    const title = await page.title();
    console.log(`✅ Page title: ${title}`);
    
    // Get page content to see what's rendered
    const bodyText = await page.locator('body').textContent();
    console.log(`📄 Page contains: ${bodyText.substring(0, 200)}...`);
    
    // Look for any cards or components
    const cards = await page.locator('.MuiCard-root, .card, [class*="card"]').count();
    console.log(`📦 Found ${cards} card elements`);
    
    // Look for template-related text
    const templateText = await page.locator('text=Template, text=Abfrage').count();
    console.log(`📝 Found ${templateText} template-related elements`);
    
    // Look for any input fields
    const inputs = await page.locator('input').count();
    console.log(`🔍 Found ${inputs} input elements`);
    
    // Look for navigation
    const navigation = await page.locator('nav, .navigation, [class*="nav"]').count();
    console.log(`🧭 Found ${navigation} navigation elements`);
    
    // Check for React error boundaries
    const errors = await page.locator('text=Something went wrong, text=Error').count();
    console.log(`❌ Found ${errors} error messages`);
    
    // Try to find the QueryTemplates component by text content
    const queryTemplatesHeading = await page.locator('text=Abfrage-Templates').count();
    if (queryTemplatesHeading > 0) {
      console.log('✅ Found QueryTemplates heading!');
      
      // Test basic interaction
      const searchInput = page.locator('input[placeholder*="suchen"], input[placeholder*="search"]');
      const searchCount = await searchInput.count();
      console.log(`🔍 Found ${searchCount} search inputs`);
      
      if (searchCount > 0) {
        await searchInput.first().fill('test');
        await page.waitForTimeout(1000);
        console.log('✅ Search input test completed');
      }
    } else {
      console.log('❌ QueryTemplates heading not found');
    }
    
    // Check current URL
    const currentUrl = page.url();
    console.log(`🌐 Current URL: ${currentUrl}`);
    
    // Take final screenshot
    await page.screenshot({ path: 'page-final.png' });
    
    console.log('\n📋 Test Summary:');
    console.log(`- Page loads: ✅`);
    console.log(`- Cards found: ${cards}`);
    console.log(`- Template elements: ${templateText}`);
    console.log(`- Input fields: ${inputs}`);
    console.log(`- Navigation: ${navigation}`);
    console.log(`- Errors: ${errors}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: 'error-screenshot.png' });
  } finally {
    // Keep browser open for manual inspection
    console.log('\n🔍 Browser will stay open for 30 seconds for manual inspection...');
    await page.waitForTimeout(30000);
    await browser.close();
  }
}

testQueryTemplatesSimplified().catch(console.error);