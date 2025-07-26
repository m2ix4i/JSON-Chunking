#!/usr/bin/env node

/**
 * Final Production Readiness Test
 * Complete validation for professional testing handoff
 */

const puppeteer = require('puppeteer');

class FinalProductionTest {
  constructor() {
    this.browser = null;
    this.page = null;
    this.results = {
      navigation: [],
      forms: [],
      interactions: [],
      performance: [],
      accessibility: [],
      errors: []
    };
    this.testScore = 0;
    this.maxScore = 0;
  }

  async setup() {
    console.log('🎯 FINAL PRODUCTION READINESS TEST');
    console.log('=====================================');
    console.log('Testing all critical functionality for professional handoff\n');
    
    this.browser = await puppeteer.launch({
      headless: false,
      defaultViewport: { width: 1280, height: 720 },
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    this.page = await this.browser.newPage();
    
    // Monitor errors
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        this.results.errors.push(`Console: ${msg.text()}`);
      }
    });
    
    this.page.on('response', response => {
      if (response.status() >= 400) {
        this.results.errors.push(`Network: ${response.status()} ${response.url()}`);
      }
    });
  }

  addTest(category, name, passed, details = '') {
    this.maxScore++;
    if (passed) {
      this.testScore++;
      console.log(`✅ ${name}${details ? ' - ' + details : ''}`);
    } else {
      console.log(`❌ ${name}${details ? ' - ' + details : ''}`);
    }
    
    this.results[category].push({
      name,
      passed,
      details
    });
  }

  async testCoreNavigation() {
    console.log('🧭 CORE NAVIGATION TESTING\n');
    
    const routes = [
      { path: '/', name: 'Dashboard', expectedText: 'Dashboard' },
      { path: '/upload', name: 'Upload Page', expectedText: 'Datei hochladen' },
      { path: '/query', name: 'Query Page', expectedText: 'Abfrage erstellen' },
      { path: '/results', name: 'Results Page', expectedText: 'Ergebnisse' },
      { path: '/settings', name: 'Settings Page', expectedText: 'Einstellungen' }
    ];

    for (const route of routes) {
      try {
        await this.page.goto(`http://localhost:3001${route.path}`, { 
          waitUntil: 'networkidle2',
          timeout: 10000 
        });
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const pageContent = await this.page.evaluate(() => document.body.textContent);
        const hasExpectedContent = pageContent.includes(route.expectedText);
        
        this.addTest('navigation', `${route.name} loads`, hasExpectedContent, route.path);
        
      } catch (error) {
        this.addTest('navigation', `${route.name} loads`, false, `Error: ${error.message}`);
      }
    }

    // Test sidebar navigation functionality
    console.log('\n🗂️ Sidebar Navigation Interaction\n');
    
    await this.page.goto('http://localhost:3001/', { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const sidebarItems = [
      { text: 'Datei hochladen', expectedUrl: '/upload' },
      { text: 'Abfrage erstellen', expectedUrl: '/query' },
      { text: 'Ergebnisse', expectedUrl: '/results' },
      { text: 'Einstellungen', expectedUrl: '/settings' }
    ];

    for (const item of sidebarItems) {
      try {
        const clicked = await this.page.evaluate((text) => {
          const items = Array.from(document.querySelectorAll('li, div'));
          const targetItem = items.find(el => el.textContent.trim() === text);
          
          if (targetItem) {
            targetItem.click();
            return true;
          }
          return false;
        }, item.text);
        
        if (clicked) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          const currentUrl = this.page.url();
          const correctNavigation = currentUrl.includes(item.expectedUrl);
          
          this.addTest('navigation', `Sidebar "${item.text}" navigation`, correctNavigation, currentUrl);
        } else {
          this.addTest('navigation', `Sidebar "${item.text}" clickable`, false, 'Element not found');
        }
        
      } catch (error) {
        this.addTest('navigation', `Sidebar "${item.text}" navigation`, false, error.message);
      }
    }
  }

  async testUploadWorkflow() {
    console.log('\n📤 UPLOAD WORKFLOW TESTING\n');
    
    await this.page.goto('http://localhost:3001/upload', { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test file input presence and functionality
    const fileInput = await this.page.$('input[type="file"]');
    this.addTest('forms', 'File input present', !!fileInput);
    
    if (fileInput) {
      const fileInputDetails = await this.page.evaluate(() => {
        const input = document.querySelector('input[type="file"]');
        return input ? {
          visible: input.offsetParent !== null,
          multiple: input.multiple,
          accept: input.accept
        } : null;
      });
      
      this.addTest('forms', 'File input visible', fileInputDetails.visible);
      this.addTest('forms', 'Multiple file support', fileInputDetails.multiple);
      this.addTest('forms', 'JSON file restriction', fileInputDetails.accept.includes('json'));
    }
    
    // Test drag & drop area
    const dropZoneTest = await this.page.evaluate(() => {
      const bodyText = document.body.textContent;
      return bodyText.includes('hierher ziehen') || bodyText.includes('drag');
    });
    
    this.addTest('forms', 'Drag & drop instructions', dropZoneTest);
    
    // Test upload constraints display
    const constraintsTest = await this.page.evaluate(() => {
      const bodyText = document.body.textContent;
      return bodyText.includes('100 MB') && bodyText.includes('JSON');
    });
    
    this.addTest('forms', 'Upload constraints displayed', constraintsTest);
  }

  async testQueryWorkflow() {
    console.log('\n❓ QUERY WORKFLOW TESTING\n');
    
    await this.page.goto('http://localhost:3001/query', { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Test file selection availability
    const fileSelection = await this.page.evaluate(() => {
      const listItems = document.querySelectorAll('.MuiListItem-root');
      const jsonFiles = Array.from(listItems).filter(item => 
        item.textContent.includes('.json')
      );
      return {
        totalItems: listItems.length,
        jsonFiles: jsonFiles.length,
        hasFiles: jsonFiles.length > 0
      };
    });
    
    this.addTest('forms', 'File selection available', fileSelection.hasFiles, 
      `${fileSelection.jsonFiles} JSON files found`);
    
    // Select a file and test query form
    if (fileSelection.hasFiles) {
      const fileSelected = await this.page.evaluate(() => {
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
      
      this.addTest('interactions', 'File selection', fileSelected);
      
      if (fileSelected) {
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Test query form appearance
        const queryForm = await this.page.evaluate(() => {
          const textarea = document.querySelector('textarea');
          const submitBtn = Array.from(document.querySelectorAll('button')).find(btn => 
            btn.textContent.includes('Submit')
          );
          
          return {
            hasTextarea: !!textarea,
            textareaVisible: textarea ? textarea.offsetParent !== null : false,
            hasSubmitButton: !!submitBtn,
            submitButtonVisible: submitBtn ? submitBtn.offsetParent !== null : false
          };
        });
        
        this.addTest('forms', 'Query textarea appears', queryForm.hasTextarea && queryForm.textareaVisible);
        this.addTest('forms', 'Submit button appears', queryForm.hasSubmitButton && queryForm.submitButtonVisible);
        
        // Test query input and validation
        if (queryForm.hasTextarea) {
          const textarea = await this.page.$('textarea');
          await textarea.click();
          await textarea.focus();
          
          // Clear and type test query
          await this.page.keyboard.down('Control');
          await this.page.keyboard.press('KeyA');
          await this.page.keyboard.up('Control');
          await this.page.keyboard.press('Delete');
          await this.page.keyboard.type('Zeige mir alle Holzbalken aus Fichte im Erdgeschoss', { delay: 30 });
          
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const inputValidation = await this.page.evaluate(() => {
            const textarea = document.querySelector('textarea');
            const submitBtn = Array.from(document.querySelectorAll('button')).find(btn => 
              btn.textContent.includes('Submit')
            );
            
            return {
              textareaValue: textarea ? textarea.value : '',
              textareaLength: textarea ? textarea.value.length : 0,
              submitEnabled: submitBtn ? !submitBtn.disabled : false
            };
          });
          
          this.addTest('interactions', 'Query input accepts text', inputValidation.textareaLength > 0);
          this.addTest('interactions', 'Submit button enables with text', inputValidation.submitEnabled);
          
          // Test query submission
          if (inputValidation.submitEnabled) {
            const submitted = await this.page.evaluate(() => {
              const submitBtn = Array.from(document.querySelectorAll('button')).find(btn => 
                btn.textContent.includes('Submit')
              );
              if (submitBtn && !submitBtn.disabled) {
                submitBtn.click();
                return true;
              }
              return false;
            });
            
            this.addTest('interactions', 'Query submission', submitted);
            
            if (submitted) {
              // Wait for processing indication
              await new Promise(resolve => setTimeout(resolve, 3000));
              
              const processingCheck = await this.page.evaluate(() => {
                const bodyText = document.body.textContent;
                return {
                  hasProcessing: bodyText.includes('Processing') || bodyText.includes('Verarbeitung'),
                  hasSpinner: document.querySelectorAll('.MuiCircularProgress-root').length > 0,
                  hasResponse: bodyText.includes('Holzbalken') || bodyText.includes('Antwort')
                };
              });
              
              const queryProcessing = processingCheck.hasProcessing || processingCheck.hasSpinner || processingCheck.hasResponse;
              this.addTest('interactions', 'Query processing initiated', queryProcessing);
            }
          }
        }
      }
    }
  }

  async testResponsiveness() {
    console.log('\n📱 RESPONSIVENESS TESTING\n');
    
    const viewports = [
      { width: 1920, height: 1080, name: 'Desktop XL' },
      { width: 1280, height: 720, name: 'Desktop' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 375, height: 667, name: 'Mobile' }
    ];

    for (const viewport of viewports) {
      await this.page.setViewport(viewport);
      await this.page.goto('http://localhost:3001/', { waitUntil: 'networkidle2' });
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const layoutTest = await this.page.evaluate(() => {
        const body = document.body;
        const nav = document.querySelector('nav');
        const main = document.querySelector('main, [role="main"], .main-content');
        
        return {
          hasHorizontalScroll: body.scrollWidth > window.innerWidth,
          hasVerticalScroll: body.scrollHeight > window.innerHeight,
          navVisible: nav ? nav.offsetParent !== null : false,
          mainVisible: main ? main.offsetParent !== null : false,
          responsive: body.scrollWidth <= window.innerWidth
        };
      });
      
      this.addTest('performance', `${viewport.name} responsive layout`, layoutTest.responsive);
    }
    
    // Reset viewport
    await this.page.setViewport({ width: 1280, height: 720 });
  }

  async testAccessibility() {
    console.log('\n♿ ACCESSIBILITY TESTING\n');
    
    await this.page.goto('http://localhost:3001/', { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const a11yTest = await this.page.evaluate(() => {
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      const buttons = document.querySelectorAll('button');
      const inputs = document.querySelectorAll('input, textarea, select');
      const images = document.querySelectorAll('img');
      const imagesWithAlt = Array.from(images).filter(img => img.alt && img.alt.trim());
      const ariaElements = document.querySelectorAll('[aria-label], [aria-labelledby], [role]');
      
      // Test keyboard navigation
      const focusableElements = document.querySelectorAll('a, button, input, textarea, select, [tabindex]');
      const tabbableElements = Array.from(focusableElements).filter(el => {
        const tabIndex = el.tabIndex;
        return tabIndex >= 0 && el.offsetParent !== null;
      });
      
      return {
        headings: headings.length,
        buttons: buttons.length,
        inputs: inputs.length,
        images: images.length,
        imagesWithAlt: imagesWithAlt.length,
        ariaElements: ariaElements.length,
        tabbableElements: tabbableElements.length
      };
    });
    
    this.addTest('accessibility', 'Semantic headings present', a11yTest.headings > 0);
    this.addTest('accessibility', 'Interactive elements present', a11yTest.buttons > 0);
    this.addTest('accessibility', 'ARIA attributes used', a11yTest.ariaElements > 0);
    this.addTest('accessibility', 'Keyboard navigation possible', a11yTest.tabbableElements > 0);
    
    if (a11yTest.images > 0) {
      const altTextCoverage = (a11yTest.imagesWithAlt / a11yTest.images) * 100;
      this.addTest('accessibility', 'Image alt text coverage', altTextCoverage >= 80, `${altTextCoverage.toFixed(1)}%`);
    }
  }

  async testPerformance() {
    console.log('\n⚡ PERFORMANCE TESTING\n');
    
    const pages = [
      { url: '/', name: 'Dashboard' },
      { url: '/upload', name: 'Upload' },
      { url: '/query', name: 'Query' }
    ];

    for (const pageInfo of pages) {
      const startTime = Date.now();
      
      try {
        await this.page.goto(`http://localhost:3001${pageInfo.url}`, { 
          waitUntil: 'networkidle2',
          timeout: 10000 
        });
        
        const loadTime = Date.now() - startTime;
        const performanceMetrics = await this.page.evaluate(() => {
          const perfData = performance.getEntriesByType('navigation')[0];
          return perfData ? {
            loadComplete: perfData.loadEventEnd - perfData.navigationStart,
            domReady: perfData.domContentLoadedEventEnd - perfData.navigationStart,
            firstPaint: perfData.responseStart - perfData.navigationStart
          } : null;
        });
        
        this.addTest('performance', `${pageInfo.name} loads under 5s`, loadTime < 5000, `${loadTime}ms`);
        
        if (performanceMetrics) {
          this.addTest('performance', `${pageInfo.name} DOM ready under 3s`, 
            performanceMetrics.domReady < 3000, `${performanceMetrics.domReady.toFixed(0)}ms`);
        }
        
      } catch (error) {
        this.addTest('performance', `${pageInfo.name} loads`, false, error.message);
      }
    }
  }

  generateFinalReport() {
    console.log('\n🎯 FINAL PRODUCTION READINESS REPORT');
    console.log('=====================================\n');
    
    const scorePercentage = ((this.testScore / this.maxScore) * 100).toFixed(1);
    
    // Category summaries
    const categories = ['navigation', 'forms', 'interactions', 'performance', 'accessibility'];
    categories.forEach(category => {
      const tests = this.results[category];
      const passed = tests.filter(t => t.passed).length;
      const total = tests.length;
      const categoryScore = total > 0 ? ((passed / total) * 100).toFixed(1) : 'N/A';
      
      console.log(`${category.toUpperCase()}: ${passed}/${total} (${categoryScore}%)`);
      tests.forEach(test => {
        const icon = test.passed ? '✅' : '❌';
        console.log(`  ${icon} ${test.name}${test.details ? ' - ' + test.details : ''}`);
      });
      console.log('');
    });
    
    // Error summary
    console.log('ERRORS DETECTED:');
    if (this.results.errors.length === 0) {
      console.log('  ✅ No critical errors detected');
    } else {
      this.results.errors.forEach(error => {
        console.log(`  ❌ ${error}`);
      });
    }
    console.log('');
    
    // Overall assessment
    console.log('OVERALL ASSESSMENT:');
    console.log(`  Score: ${scorePercentage}% (${this.testScore}/${this.maxScore})`);
    console.log(`  Errors: ${this.results.errors.length}`);
    
    let readinessLevel;
    if (scorePercentage >= 95 && this.results.errors.length === 0) {
      readinessLevel = '🏆 EXCELLENT - Professional testing ready';
    } else if (scorePercentage >= 85 && this.results.errors.length <= 2) {
      readinessLevel = '✅ GOOD - Ready for professional testing';
    } else if (scorePercentage >= 75) {
      readinessLevel = '⚠️ ACCEPTABLE - Minor issues, proceed with caution';
    } else {
      readinessLevel = '❌ NOT READY - Major issues need resolution';
    }
    
    console.log(`  Status: ${readinessLevel}`);
    console.log('');
    
    // Professional testing recommendations
    console.log('PROFESSIONAL TESTING RECOMMENDATIONS:');
    
    if (scorePercentage >= 85) {
      console.log('  ✅ Core functionality verified');
      console.log('  ✅ User workflows tested');
      console.log('  ✅ Cross-device compatibility confirmed');
      console.log('  📋 Focus professional testing on:');
      console.log('     - Edge case scenarios');
      console.log('     - Heavy load testing');
      console.log('     - Advanced user interactions');
      console.log('     - Security penetration testing');
    } else {
      console.log('  🔧 Address identified issues before professional testing');
      console.log('  📋 Priority fixes needed:');
      
      categories.forEach(category => {
        const failed = this.results[category].filter(t => !t.passed);
        if (failed.length > 0) {
          console.log(`     - ${category}: ${failed.length} issues`);
        }
      });
    }
    
    console.log('\n=====================================');
    
    return {
      score: parseFloat(scorePercentage),
      passed: this.testScore,
      total: this.maxScore,
      errors: this.results.errors.length,
      ready: scorePercentage >= 85 && this.results.errors.length <= 2
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
      
      await this.testCoreNavigation();
      await this.testUploadWorkflow();
      await this.testQueryWorkflow();
      await this.testResponsiveness();
      await this.testAccessibility();
      await this.testPerformance();
      
      return this.generateFinalReport();
      
    } catch (error) {
      console.error('❌ Final test failed:', error.message);
      return {
        score: 0,
        passed: 0,
        total: 0,
        errors: 1,
        ready: false,
        error: error.message
      };
    } finally {
      await this.cleanup();
    }
  }
}

// Run the final production test
const finalTest = new FinalProductionTest();
finalTest.run().then(report => {
  console.log(`\n🎯 FINAL RESULT: ${report.ready ? 'PRODUCTION READY' : 'NEEDS WORK'}`);
  console.log(`📊 Final Score: ${report.score}% (${report.passed}/${report.total})`);
  process.exit(report.ready ? 0 : 1);
});