#!/usr/bin/env node

/**
 * Test Navigation and Upload Workflow Issues
 */

const puppeteer = require('puppeteer');

async function testNavigationAndUpload() {
  console.log('🔍 Testing Navigation and Upload Issues\n');
  
  let browser, page;
  
  try {
    browser = await puppeteer.launch({
      headless: false,
      defaultViewport: { width: 1280, height: 720 },
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    page = await browser.newPage();
    
    console.log('🧭 Navigation Testing...\n');
    
    // Go to dashboard first
    await page.goto('http://localhost:3001/', { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Analyze sidebar structure
    const sidebarAnalysis = await page.evaluate(() => {
      // Look for navigation elements
      const navElements = document.querySelectorAll('nav, [role="navigation"], .sidebar, .navigation');
      const allLinks = document.querySelectorAll('a');
      const allButtons = Array.from(document.querySelectorAll('button'));
      const listItems = document.querySelectorAll('li');
      
      // Find MUI navigation elements
      const muiListItems = document.querySelectorAll('.MuiListItem-root');
      const muiButtons = document.querySelectorAll('.MuiButton-root');
      
      return {
        navElements: navElements.length,
        allLinks: allLinks.length,
        allButtons: allButtons.length,
        listItems: listItems.length,
        muiListItems: muiListItems.length,
        muiButtons: muiButtons.length,
        navigationContent: Array.from(navElements).map(nav => ({
          tag: nav.tagName,
          text: nav.textContent.trim().slice(0, 200),
          children: nav.children.length
        })),
        linkTexts: Array.from(allLinks).map(link => ({
          text: link.textContent.trim(),
          href: link.href
        })),
        buttonTexts: allButtons.map(btn => ({
          text: btn.textContent.trim(),
          onClick: !!btn.onclick,
          type: btn.type
        }))
      };
    });
    
    console.log('Sidebar Analysis:');
    console.log(`  Navigation elements: ${sidebarAnalysis.navElements}`);
    console.log(`  Total links: ${sidebarAnalysis.allLinks}`);
    console.log(`  Total buttons: ${sidebarAnalysis.allButtons}`);
    console.log(`  MUI list items: ${sidebarAnalysis.muiListItems}`);
    
    console.log('\nNavigation Content:');
    sidebarAnalysis.navigationContent.forEach((nav, i) => {
      console.log(`  ${i + 1}. <${nav.tag}> with ${nav.children} children`);
      console.log(`     Text: "${nav.text.slice(0, 100)}..."`);
    });
    
    console.log('\nLinks found:');
    sidebarAnalysis.linkTexts.forEach((link, i) => {
      if (link.text && link.text.length > 0) {
        console.log(`  ${i + 1}. "${link.text}" → ${link.href}`);
      }
    });
    
    console.log('\nButtons found:');
    sidebarAnalysis.buttonTexts.forEach((btn, i) => {
      if (btn.text && btn.text.length > 0) {
        console.log(`  ${i + 1}. "${btn.text}" (${btn.type || 'button'})`);
      }
    });
    
    // Test specific navigation methods
    console.log('\n🔍 Testing Navigation Methods...\n');
    
    // Method 1: Try clicking on visible navigation items
    const navClickTest = await page.evaluate(() => {
      const results = [];
      
      // Look for clickable navigation items
      const clickableItems = [
        ...document.querySelectorAll('a[href]'),
        ...document.querySelectorAll('button'),
        ...document.querySelectorAll('[role="button"]'),
        ...document.querySelectorAll('.MuiListItem-root'),
        ...document.querySelectorAll('.MuiButton-root')
      ];
      
      clickableItems.forEach((item, i) => {
        const text = item.textContent.trim();
        const isVisible = item.offsetParent !== null;
        const href = item.href || '';
        
        if (text && isVisible) {
          results.push({
            index: i,
            text,
            tag: item.tagName,
            href,
            clickable: true
          });
        }
      });
      
      return results;
    });
    
    console.log('Clickable navigation items:');
    navClickTest.forEach(item => {
      console.log(`  "${item.text}" (${item.tag}) ${item.href ? '→ ' + item.href : ''}`);
    });
    
    // Test upload page navigation
    console.log('\n📤 Upload Page Testing...\n');
    
    await page.goto('http://localhost:3001/upload', { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const uploadPageAnalysis = await page.evaluate(() => {
      // Look for upload-specific elements
      const fileInputs = document.querySelectorAll('input[type="file"]');
      const dropZones = document.querySelectorAll('[data-testid*="drop"], .dropzone, .drop-zone, [class*="drop"]');
      const uploadButtons = Array.from(document.querySelectorAll('button')).filter(btn => 
        btn.textContent.toLowerCase().includes('upload') ||
        btn.textContent.toLowerCase().includes('hochladen') ||
        btn.type === 'submit'
      );
      
      // Check for drag & drop related classes/attributes
      const dragDropElements = document.querySelectorAll('[draggable], [ondrop], [ondragover]');
      
      // Look for file-related UI components
      const muiComponents = {
        cards: document.querySelectorAll('.MuiCard-root'),
        papers: document.querySelectorAll('.MuiPaper-root'),
        boxes: document.querySelectorAll('.MuiBox-root'),
        containers: document.querySelectorAll('.MuiContainer-root')
      };
      
      return {
        fileInputs: fileInputs.length,
        fileInputsVisible: Array.from(fileInputs).filter(input => input.offsetParent !== null).length,
        dropZones: dropZones.length,
        uploadButtons: uploadButtons.length,
        uploadButtonTexts: uploadButtons.map(btn => btn.textContent.trim()),
        dragDropElements: dragDropElements.length,
        muiComponents: {
          cards: muiComponents.cards.length,
          papers: muiComponents.papers.length,
          boxes: muiComponents.boxes.length,
          containers: muiComponents.containers.length
        },
        pageContent: document.body.textContent.slice(0, 500)
      };
    });
    
    console.log('Upload Page Analysis:');
    console.log(`  File inputs: ${uploadPageAnalysis.fileInputs} (${uploadPageAnalysis.fileInputsVisible} visible)`);
    console.log(`  Drop zones: ${uploadPageAnalysis.dropZones}`);
    console.log(`  Upload buttons: ${uploadPageAnalysis.uploadButtons}`);
    console.log(`  Upload button texts: ${uploadPageAnalysis.uploadButtonTexts.join(', ')}`);
    console.log(`  Drag & drop elements: ${uploadPageAnalysis.dragDropElements}`);
    console.log(`  MUI Cards: ${uploadPageAnalysis.muiComponents.cards}`);
    console.log(`  MUI Papers: ${uploadPageAnalysis.muiComponents.papers}`);
    
    console.log('\nPage content preview:');
    console.log(`"${uploadPageAnalysis.pageContent}..."`);
    
    // Test file input interaction
    if (uploadPageAnalysis.fileInputsVisible > 0) {
      console.log('\n🧪 Testing file input interaction...');
      
      const fileInputTest = await page.evaluate(() => {
        const fileInput = document.querySelector('input[type="file"]');
        if (fileInput) {
          // Try to trigger file input
          try {
            fileInput.click();
            return { clicked: true, multiple: fileInput.multiple, accept: fileInput.accept };
          } catch (error) {
            return { clicked: false, error: error.message };
          }
        }
        return { clicked: false, error: 'No file input found' };
      });
      
      console.log(`File input click: ${fileInputTest.clicked ? 'SUCCESS' : 'FAILED'}`);
      if (fileInputTest.clicked) {
        console.log(`  Multiple files: ${fileInputTest.multiple}`);
        console.log(`  Accept types: ${fileInputTest.accept || 'any'}`);
      } else {
        console.log(`  Error: ${fileInputTest.error}`);
      }
    }
    
    // Take screenshots for analysis
    await page.screenshot({ 
      path: './test-screenshots/navigation-upload-analysis.png', 
      fullPage: true 
    });
    console.log('\n📸 Screenshot saved: navigation-upload-analysis.png');
    
    return {
      navigation: sidebarAnalysis,
      upload: uploadPageAnalysis,
      success: true
    };
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return { success: false, error: error.message };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

testNavigationAndUpload().then(result => {
  console.log(`\n${result.success ? '✅' : '❌'} Navigation & Upload Analysis: ${result.success ? 'COMPLETED' : 'FAILED'}`);
  process.exit(result.success ? 0 : 1);
});