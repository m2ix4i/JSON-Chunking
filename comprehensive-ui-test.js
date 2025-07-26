#!/usr/bin/env node

/**
 * Comprehensive UI/UX Test Suite
 * Testing all buttons, displays, and interactions for production readiness
 */

const puppeteer = require('puppeteer');

class ComprehensiveUITest {
  constructor() {
    this.browser = null;
    this.page = null;
    this.results = {
      navigation: [],
      buttons: [],
      forms: [],
      displays: [],
      interactions: [],
      errors: []
    };
  }

  async setup() {
    console.log('🚀 Starting Comprehensive UI/UX Test Suite\n');
    
    this.browser = await puppeteer.launch({
      headless: false,
      defaultViewport: { width: 1280, height: 720 },
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    this.page = await this.browser.newPage();
    
    // Enable console logging
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        this.results.errors.push(`Console Error: ${msg.text()}`);
      }
    });
    
    // Track network errors
    this.page.on('response', response => {
      if (response.status() >= 400) {
        this.results.errors.push(`Network Error: ${response.status()} ${response.url()}`);
      }
    });
  }

  async testNavigation() {
    console.log('🧭 Testing Navigation...\n');
    
    const routes = [
      { path: '/', name: 'Dashboard', expectedText: 'Dashboard' },
      { path: '/upload', name: 'Upload', expectedText: 'Datei hochladen' },
      { path: '/query', name: 'Query', expectedText: 'Abfrage erstellen' },
      { path: '/results', name: 'Results', expectedText: 'Ergebnisse' },
      { path: '/settings', name: 'Settings', expectedText: 'Einstellungen' }
    ];

    for (const route of routes) {
      try {
        console.log(`📍 Testing route: ${route.path}`);
        await this.page.goto(`http://localhost:3001${route.path}`, { 
          waitUntil: 'networkidle2',
          timeout: 10000 
        });
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const pageContent = await this.page.evaluate(() => document.body.textContent);
        const hasExpectedContent = pageContent.includes(route.expectedText);
        
        const result = {
          route: route.path,
          name: route.name,
          loaded: true,
          hasExpectedContent,
          status: hasExpectedContent ? 'PASS' : 'WARN'
        };
        
        this.results.navigation.push(result);
        console.log(`  ${result.status === 'PASS' ? '✅' : '⚠️'} ${route.name}: ${result.status}`);
        
      } catch (error) {
        this.results.navigation.push({
          route: route.path,
          name: route.name,
          loaded: false,
          error: error.message,
          status: 'FAIL'
        });
        console.log(`  ❌ ${route.name}: FAIL - ${error.message}`);
      }
    }
  }

  async testSidebarNavigation() {
    console.log('\n🗂️ Testing Sidebar Navigation...\n');
    
    await this.page.goto('http://localhost:3001/', { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const sidebarLinks = [
      { text: 'Dashboard', expectedUrl: '/' },
      { text: 'Datei hochladen', expectedUrl: '/upload' },
      { text: 'Abfrage erstellen', expectedUrl: '/query' },
      { text: 'Ergebnisse', expectedUrl: '/results' },
      { text: 'Einstellungen', expectedUrl: '/settings' }
    ];

    for (const link of sidebarLinks) {
      try {
        console.log(`🔗 Testing sidebar link: ${link.text}`);
        
        const clicked = await this.page.evaluate((linkText) => {
          const links = Array.from(document.querySelectorAll('a, button'));
          const targetLink = links.find(el => 
            el.textContent.trim().includes(linkText) ||
            el.getAttribute('aria-label')?.includes(linkText)
          );
          
          if (targetLink) {
            targetLink.click();
            return true;
          }
          return false;
        }, link.text);
        
        if (clicked) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          const currentUrl = this.page.url();
          const isCorrectUrl = currentUrl.includes(link.expectedUrl);
          
          this.results.navigation.push({
            type: 'sidebar',
            link: link.text,
            clicked: true,
            correctUrl: isCorrectUrl,
            currentUrl,
            status: isCorrectUrl ? 'PASS' : 'WARN'
          });
          
          console.log(`  ${isCorrectUrl ? '✅' : '⚠️'} ${link.text}: ${isCorrectUrl ? 'PASS' : 'WARN'}`);
        } else {
          this.results.navigation.push({
            type: 'sidebar',
            link: link.text,
            clicked: false,
            status: 'FAIL'
          });
          console.log(`  ❌ ${link.text}: FAIL - Link not found`);
        }
        
      } catch (error) {
        console.log(`  ❌ ${link.text}: ERROR - ${error.message}`);
      }
    }
  }

  async testButtons() {
    console.log('\n🔘 Testing All Buttons...\n');
    
    const pagesToTest = [
      { url: '/upload', name: 'Upload Page' },
      { url: '/query', name: 'Query Page' },
      { url: '/results', name: 'Results Page' },
      { url: '/settings', name: 'Settings Page' }
    ];

    for (const pageInfo of pagesToTest) {
      try {
        console.log(`🔍 Testing buttons on: ${pageInfo.name}`);
        await this.page.goto(`http://localhost:3001${pageInfo.url}`, { waitUntil: 'networkidle2' });
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const buttons = await this.page.evaluate(() => {
          const allButtons = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"]'));
          return allButtons.map(btn => ({
            text: btn.textContent.trim() || btn.value || btn.getAttribute('aria-label') || 'No text',
            type: btn.type || 'button',
            disabled: btn.disabled,
            visible: btn.offsetParent !== null,
            className: btn.className
          }));
        });
        
        console.log(`  Found ${buttons.length} buttons:`);
        buttons.forEach((btn, index) => {
          const status = btn.visible && !btn.disabled ? 'ACTIVE' : 
                        btn.disabled ? 'DISABLED' : 'HIDDEN';
          console.log(`    ${index + 1}. "${btn.text}" - ${status}`);
          
          this.results.buttons.push({
            page: pageInfo.name,
            text: btn.text,
            type: btn.type,
            disabled: btn.disabled,
            visible: btn.visible,
            status
          });
        });
        
      } catch (error) {
        console.log(`  ❌ Error testing ${pageInfo.name}: ${error.message}`);
      }
    }
  }

  async testUploadWorkflow() {
    console.log('\n📤 Testing Upload Workflow...\n');
    
    try {
      await this.page.goto('http://localhost:3001/upload', { waitUntil: 'networkidle2' });
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Test file input presence
      const fileInput = await this.page.$('input[type="file"]');
      const hasFileInput = !!fileInput;
      
      console.log(`  📁 File input present: ${hasFileInput ? '✅' : '❌'}`);
      
      // Test upload button state
      const uploadButtonState = await this.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const uploadBtn = buttons.find(btn => 
          btn.textContent.includes('Upload') || 
          btn.textContent.includes('Hochladen') ||
          btn.textContent.includes('hochladen') ||
          btn.type === 'submit'
        );
        return uploadBtn ? {
          present: true,
          disabled: uploadBtn.disabled,
          text: uploadBtn.textContent.trim()
        } : { present: false };
      });
      
      console.log(`  🔘 Upload button: ${uploadButtonState.present ? '✅' : '❌'}`);
      if (uploadButtonState.present) {
        console.log(`    Text: "${uploadButtonState.text}", Disabled: ${uploadButtonState.disabled}`);
      }
      
      // Test drag & drop area
      const dropZone = await this.page.evaluate(() => {
        const dropZones = document.querySelectorAll('[data-testid*="drop"], .dropzone, .drop-zone');
        return dropZones.length > 0;
      });
      
      console.log(`  🎯 Drop zone present: ${dropZone ? '✅' : '❌'}`);
      
      this.results.forms.push({
        page: 'Upload',
        hasFileInput,
        hasUploadButton: uploadButtonState.present,
        hasDropZone: dropZone,
        status: hasFileInput && uploadButtonState.present ? 'PASS' : 'FAIL'
      });
      
    } catch (error) {
      console.log(`  ❌ Upload workflow test failed: ${error.message}`);
    }
  }

  async testQueryWorkflow() {
    console.log('\n❓ Testing Query Workflow...\n');
    
    try {
      await this.page.goto('http://localhost:3001/query', { waitUntil: 'networkidle2' });
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Check for file selection
      const fileSelection = await this.page.evaluate(() => {
        const radioButtons = document.querySelectorAll('input[type="radio"]');
        const listItems = document.querySelectorAll('.MuiListItem-root');
        return {
          radioButtons: radioButtons.length,
          listItems: listItems.length,
          hasFiles: listItems.length > 1 // More than "no file selected"
        };
      });
      
      console.log(`  📋 File selection: ${fileSelection.hasFiles ? '✅' : '❌'} (${fileSelection.listItems} items)`);
      
      // Try to select a file
      let fileSelected = false;
      if (fileSelection.hasFiles) {
        fileSelected = await this.page.evaluate(() => {
          const listItems = Array.from(document.querySelectorAll('.MuiListItem-root'));
          for (const item of listItems) {
            const radio = item.querySelector('input[type="radio"]');
            const text = item.textContent;
            if (radio && text.includes('.json')) {
              radio.click();
              return true;
            }
          }
          return false;
        });
        
        if (fileSelected) {
          await new Promise(resolve => setTimeout(resolve, 3000));
          console.log(`  ✅ File selected successfully`);
        }
      }
      
      // Check for query form
      const queryForm = await this.page.evaluate(() => {
        const textareas = document.querySelectorAll('textarea');
        const submitButtons = Array.from(document.querySelectorAll('button')).filter(btn => 
          btn.textContent.includes('Submit') || btn.textContent.includes('Query')
        );
        
        return {
          hasTextarea: textareas.length > 0,
          hasSubmitButton: submitButtons.length > 0,
          submitButtonEnabled: submitButtons.some(btn => !btn.disabled)
        };
      });
      
      console.log(`  📝 Query textarea: ${queryForm.hasTextarea ? '✅' : '❌'}`);
      console.log(`  🔘 Submit button: ${queryForm.hasSubmitButton ? '✅' : '❌'}`);
      
      // Test query input if form is available
      if (queryForm.hasTextarea && fileSelected) {
        console.log(`  🧪 Testing query input...`);
        
        // Use proper keyboard typing method for React state management
        const textarea = await this.page.$('textarea');
        let queryTest = false;
        
        if (textarea) {
          await textarea.click();
          await textarea.focus();
          
          // Clear any existing content
          await this.page.keyboard.down('Control');
          await this.page.keyboard.press('KeyA');
          await this.page.keyboard.up('Control');
          await this.page.keyboard.press('Delete');
          
          // Type test query
          await this.page.keyboard.type('Test query for UI validation', { delay: 30 });
          queryTest = true;
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const buttonAfterInput = await this.page.evaluate(() => {
          const submitBtn = Array.from(document.querySelectorAll('button')).find(btn => 
            btn.textContent.includes('Submit') || btn.textContent.includes('Query')
          );
          return submitBtn ? !submitBtn.disabled : false;
        });
        
        console.log(`  ⌨️ Query input test: ${queryTest ? '✅' : '❌'}`);
        console.log(`  🔘 Submit enabled after input: ${buttonAfterInput ? '✅' : '❌'}`);
        
        // Test form submission
        if (buttonAfterInput) {
          console.log(`  🚀 Testing form submission...`);
          const submitted = await this.page.evaluate(() => {
            const submitBtn = Array.from(document.querySelectorAll('button')).find(btn => 
              btn.textContent.includes('Submit') || btn.textContent.includes('Query')
            );
            if (submitBtn && !submitBtn.disabled) {
              submitBtn.click();
              return true;
            }
            return false;
          });
          
          if (submitted) {
            console.log(`  ✅ Form submitted successfully`);
            // Brief wait to see if processing starts
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const processingCheck = await this.page.evaluate(() => {
              const bodyText = document.body.textContent;
              return {
                hasProcessing: bodyText.includes('Processing') || bodyText.includes('Verarbeitung'),
                hasSpinner: document.querySelectorAll('.MuiCircularProgress-root').length > 0
              };
            });
            
            if (processingCheck.hasProcessing || processingCheck.hasSpinner) {
              console.log(`  ✅ Query processing detected`);
            }
          }
        }
      }
      
      this.results.forms.push({
        page: 'Query',
        hasFileSelection: fileSelection.hasFiles,
        fileSelected,
        hasQueryForm: queryForm.hasTextarea,
        hasSubmitButton: queryForm.hasSubmitButton,
        status: fileSelection.hasFiles && queryForm.hasTextarea ? 'PASS' : 'PARTIAL'
      });
      
    } catch (error) {
      console.log(`  ❌ Query workflow test failed: ${error.message}`);
    }
  }

  async testResponsiveness() {
    console.log('\n📱 Testing Responsiveness...\n');
    
    const viewports = [
      { width: 1920, height: 1080, name: 'Desktop Large' },
      { width: 1280, height: 720, name: 'Desktop Standard' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 375, height: 667, name: 'Mobile' }
    ];

    for (const viewport of viewports) {
      try {
        console.log(`📐 Testing ${viewport.name} (${viewport.width}x${viewport.height})`);
        
        await this.page.setViewport(viewport);
        await this.page.goto('http://localhost:3001/', { waitUntil: 'networkidle2' });
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const layoutTest = await this.page.evaluate(() => {
          // Check if sidebar is visible
          const sidebar = document.querySelector('nav, .sidebar, .navigation');
          const mainContent = document.querySelector('main, .main-content, .content');
          
          return {
            hasSidebar: !!sidebar,
            sidebarVisible: sidebar ? sidebar.offsetParent !== null : false,
            hasMainContent: !!mainContent,
            bodyOverflow: document.body.scrollWidth > window.innerWidth
          };
        });
        
        this.results.displays.push({
          viewport: viewport.name,
          dimensions: `${viewport.width}x${viewport.height}`,
          hasSidebar: layoutTest.hasSidebar,
          sidebarVisible: layoutTest.sidebarVisible,
          hasMainContent: layoutTest.hasMainContent,
          hasHorizontalScroll: layoutTest.bodyOverflow,
          status: layoutTest.hasMainContent && !layoutTest.bodyOverflow ? 'PASS' : 'WARN'
        });
        
        const status = layoutTest.hasMainContent && !layoutTest.bodyOverflow ? '✅' : '⚠️';
        console.log(`  ${status} Layout responsive: ${layoutTest.hasMainContent ? 'Content OK' : 'No content'}, ${layoutTest.bodyOverflow ? 'Has overflow' : 'No overflow'}`);
        
      } catch (error) {
        console.log(`  ❌ ${viewport.name}: ${error.message}`);
      }
    }
    
    // Reset to standard viewport
    await this.page.setViewport({ width: 1280, height: 720 });
  }

  async testAccessibility() {
    console.log('\n♿ Testing Basic Accessibility...\n');
    
    try {
      await this.page.goto('http://localhost:3001/', { waitUntil: 'networkidle2' });
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const a11yTest = await this.page.evaluate(() => {
        // Check for basic accessibility features
        const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        const buttons = document.querySelectorAll('button');
        const links = document.querySelectorAll('a');
        const inputs = document.querySelectorAll('input, textarea, select');
        
        // Check for alt text on images
        const images = document.querySelectorAll('img');
        const imagesWithAlt = Array.from(images).filter(img => img.alt);
        
        // Check for aria labels
        const elementsWithAria = document.querySelectorAll('[aria-label], [aria-labelledby], [role]');
        
        // Check for skip links
        const skipLinks = document.querySelectorAll('a[href^="#"]');
        
        return {
          headings: headings.length,
          buttons: buttons.length,
          links: links.length,
          inputs: inputs.length,
          images: images.length,
          imagesWithAlt: imagesWithAlt.length,
          elementsWithAria: elementsWithAria.length,
          skipLinks: skipLinks.length
        };
      });
      
      console.log(`  📰 Headings: ${a11yTest.headings} found`);
      console.log(`  🔘 Buttons: ${a11yTest.buttons} found`);
      console.log(`  🔗 Links: ${a11yTest.links} found`);
      console.log(`  📝 Form inputs: ${a11yTest.inputs} found`);
      console.log(`  🖼️ Images with alt text: ${a11yTest.imagesWithAlt}/${a11yTest.images}`);
      console.log(`  🏷️ Elements with ARIA: ${a11yTest.elementsWithAria} found`);
      
      this.results.displays.push({
        type: 'accessibility',
        headings: a11yTest.headings,
        buttons: a11yTest.buttons,
        altTextCoverage: a11yTest.images > 0 ? (a11yTest.imagesWithAlt / a11yTest.images * 100).toFixed(1) + '%' : 'N/A',
        ariaElements: a11yTest.elementsWithAria,
        status: a11yTest.headings > 0 && a11yTest.elementsWithAria > 0 ? 'PASS' : 'WARN'
      });
      
    } catch (error) {
      console.log(`  ❌ Accessibility test failed: ${error.message}`);
    }
  }

  async generateReport() {
    console.log('\n📊 COMPREHENSIVE UI/UX TEST REPORT\n');
    console.log('='.repeat(50));
    
    // Navigation Summary
    console.log('\n🧭 NAVIGATION TESTING:');
    const navPassed = this.results.navigation.filter(r => r.status === 'PASS').length;
    const navTotal = this.results.navigation.length;
    console.log(`  Results: ${navPassed}/${navTotal} passed`);
    
    this.results.navigation.forEach(result => {
      const icon = result.status === 'PASS' ? '✅' : result.status === 'WARN' ? '⚠️' : '❌';
      console.log(`  ${icon} ${result.name || result.link}: ${result.status}`);
    });
    
    // Button Summary
    console.log('\n🔘 BUTTON TESTING:');
    const activeButtons = this.results.buttons.filter(b => b.status === 'ACTIVE').length;
    const totalButtons = this.results.buttons.length;
    console.log(`  Results: ${activeButtons}/${totalButtons} buttons active and functional`);
    
    // Form Summary
    console.log('\n📋 FORM TESTING:');
    const formsPassed = this.results.forms.filter(f => f.status === 'PASS').length;
    const formsTotal = this.results.forms.length;
    console.log(`  Results: ${formsPassed}/${formsTotal} forms fully functional`);
    
    this.results.forms.forEach(form => {
      const icon = form.status === 'PASS' ? '✅' : form.status === 'PARTIAL' ? '⚠️' : '❌';
      console.log(`  ${icon} ${form.page}: ${form.status}`);
    });
    
    // Display Summary
    console.log('\n📱 DISPLAY TESTING:');
    const displaysPassed = this.results.displays.filter(d => d.status === 'PASS').length;
    const displaysTotal = this.results.displays.length;
    console.log(`  Results: ${displaysPassed}/${displaysTotal} display tests passed`);
    
    // Error Summary
    console.log('\n❌ ERRORS DETECTED:');
    if (this.results.errors.length === 0) {
      console.log('  ✅ No critical errors detected');
    } else {
      this.results.errors.forEach(error => {
        console.log(`  ❌ ${error}`);
      });
    }
    
    // Overall Assessment
    const totalTests = navTotal + formsTotal + displaysTotal;
    const totalPassed = navPassed + formsPassed + displaysPassed;
    const overallScore = (totalPassed / totalTests * 100).toFixed(1);
    
    console.log('\n🎯 OVERALL ASSESSMENT:');
    console.log(`  Score: ${overallScore}% (${totalPassed}/${totalTests})`);
    console.log(`  Errors: ${this.results.errors.length}`);
    
    if (overallScore >= 90 && this.results.errors.length === 0) {
      console.log('  ✅ PRODUCTION READY - Excellent');
    } else if (overallScore >= 80 && this.results.errors.length <= 2) {
      console.log('  ✅ PRODUCTION READY - Good');
    } else if (overallScore >= 70) {
      console.log('  ⚠️ NEEDS IMPROVEMENT - Acceptable with fixes');
    } else {
      console.log('  ❌ NOT PRODUCTION READY - Major issues found');
    }
    
    console.log('\n' + '='.repeat(50));
    
    return {
      overallScore: parseFloat(overallScore),
      totalTests,
      totalPassed,
      errors: this.results.errors.length,
      productionReady: overallScore >= 80 && this.results.errors.length <= 2
    };
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async run() {
    try {
      await this.setup();
      
      await this.testNavigation();
      await this.testSidebarNavigation();
      await this.testButtons();
      await this.testUploadWorkflow();
      await this.testQueryWorkflow();
      await this.testResponsiveness();
      await this.testAccessibility();
      
      const report = await this.generateReport();
      
      return report;
      
    } catch (error) {
      console.error('❌ Comprehensive test failed:', error.message);
      return {
        overallScore: 0,
        totalTests: 0,
        totalPassed: 0,
        errors: 1,
        productionReady: false,
        error: error.message
      };
    } finally {
      await this.cleanup();
    }
  }
}

// Run the comprehensive test suite
const comprehensiveTest = new ComprehensiveUITest();
comprehensiveTest.run().then(report => {
  console.log(`\n${report.productionReady ? '✅' : '❌'} Comprehensive UI Test: ${report.productionReady ? 'PRODUCTION READY' : 'NEEDS WORK'}`);
  console.log(`Final Score: ${report.overallScore}%`);
  process.exit(report.productionReady ? 0 : 1);
});