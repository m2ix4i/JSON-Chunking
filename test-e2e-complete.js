#!/usr/bin/env node

/**
 * Complete E2E Workflow Test for IFC JSON Chunking
 * Phase 2: Upload → Select → Query Integration Testing
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Import Page Objects
const UploadPage = require('./tests/page-objects/UploadPage');
const QueryPage = require('./tests/page-objects/QueryPage');

async function runCompleteE2ETest() {
  console.log('🚀 Starting Complete E2E Workflow Test');
  console.log('🎯 Testing: Upload → Auto-Select → Query Integration\n');
  
  let browser, page;
  
  try {
    // Setup browser
    console.log('🌐 Launching browser...');
    browser = await puppeteer.launch({
      headless: false,
      defaultViewport: { width: 1280, height: 720 },
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    page = await browser.newPage();
    
    // Enable error handling
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`🚨 Console error: ${msg.text()}`);
      }
    });
    
    // Create screenshots directory
    const screenshotDir = './test-screenshots';
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir);
    }
    
    // Initialize page objects
    const uploadPage = new UploadPage(page);
    const queryPage = new QueryPage(page);
    
    console.log('📋 Test Plan:');
    console.log('   1. Test Upload Page functionality');
    console.log('   2. Upload test file and verify auto-selection');
    console.log('   3. Navigate to Query Page');
    console.log('   4. Verify file appears in file selector');
    console.log('   5. Test file selection and query form');
    console.log('   6. Test German query functionality');
    console.log('   7. Validate complete workflow integration\n');
    
    // === PHASE 1: Upload Page Testing ===
    console.log('📁 === PHASE 1: UPLOAD PAGE TESTING ===');
    
    const uploadResults = await uploadPage.testCompleteUploadWorkflow();
    
    console.log('\n📊 Upload Phase Results:');
    console.log(`   🇩🇪 German content: ${uploadResults.germanValidation.hasGermanContent ? 'PASS' : 'FAIL'}`);
    console.log(`   📤 Upload success: ${uploadResults.uploadSuccess ? 'PASS' : 'FAIL'}`);
    console.log(`   📋 Files uploaded: ${uploadResults.uploadedFiles.length}`);
    console.log(`   🎯 File selection: ${uploadResults.selectedFile ? 'PASS' : 'FAIL'}`);
    
    if (!uploadResults.workflowComplete) {
      console.log('❌ Upload workflow incomplete - stopping test');
      return false;
    }
    
    // Wait a moment for any auto-selection to complete
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // === PHASE 2: Query Page Testing ===
    console.log('\n❓ === PHASE 2: QUERY PAGE TESTING ===');
    
    const queryResults = await queryPage.testCompleteQueryWorkflow();
    
    console.log('\n📊 Query Phase Results:');
    console.log(`   🇩🇪 German content: ${queryResults.germanValidation.hasGermanContent ? 'PASS' : 'FAIL'}`);
    console.log(`   📁 File selector: ${queryResults.fileSelectorExists ? 'PASS' : 'FAIL'}`);
    console.log(`   📋 Available files: ${queryResults.availableFiles}`);
    console.log(`   🎯 File selected: ${queryResults.fileSelected ? 'PASS' : 'FAIL'}`);
    console.log(`   📝 Query form: ${queryResults.queryFormExists ? 'PASS' : 'FAIL'}`);
    console.log(`   🇩🇪 Query tests: ${queryResults.queryTests} performed`);
    console.log(`   ⚠️ Required file msg: ${queryResults.requiredFileMessage ? 'SHOWN' : 'NOT SHOWN'}`);
    
    // === PHASE 3: Integration Testing ===
    console.log('\n🔄 === PHASE 3: INTEGRATION TESTING ===');
    
    // Test 1: Upload to Query Navigation
    console.log('\n🧭 Test 1: Upload → Query Navigation');
    await uploadPage.navigate();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await queryPage.navigate();
    
    const availableFiles = await queryPage.getAvailableFiles();
    console.log(`   📋 Files available in query page: ${availableFiles.length}`);
    
    // Test 2: File Auto-Selection Verification
    console.log('\n🎯 Test 2: File Auto-Selection Verification');
    const selectedFile = await queryPage.getSelectedFile();
    const hasAutoSelection = selectedFile !== null;
    console.log(`   🤖 Auto-selection working: ${hasAutoSelection ? 'YES' : 'NO'}`);
    
    if (selectedFile) {
      console.log(`   📁 Auto-selected file: ${selectedFile.label.slice(0, 50)}...`);
    }
    
    // Test 3: Query Form Accessibility After Selection
    console.log('\n📝 Test 3: Query Form After File Selection');
    
    let queryFormAccessible = false;
    if (availableFiles.length > 0 && !hasAutoSelection) {
      // Select first available file
      const firstFile = availableFiles[0].label.split(' ')[0]; // Get filename part
      await queryPage.selectFile(firstFile);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    queryFormAccessible = await queryPage.waitForQueryForm();
    console.log(`   📝 Query form accessible: ${queryFormAccessible ? 'YES' : 'NO'}`);
    
    // Test 4: German Query Testing
    console.log('\n🇩🇪 Test 4: German Query Processing');
    if (queryFormAccessible) {
      const germanQueryTest = await queryPage.enterQuery('Zeige mir alle Holzbalken aus Fichte');
      console.log(`   🇩🇪 German query entry: ${germanQueryTest ? 'SUCCESS' : 'FAILED'}`);
    } else {
      console.log('   ⚠️ Cannot test queries - form not accessible');
    }
    
    // Test 5: Complete Workflow Validation
    console.log('\n✅ Test 5: Complete Workflow Validation');
    
    const workflowSteps = {
      uploadPageWorks: uploadResults.workflowComplete,
      queryPageWorks: queryResults.workflowComplete,
      fileIntegration: availableFiles.length > 0,
      autoSelection: hasAutoSelection,
      germanSupport: uploadResults.germanValidation.hasGermanContent && 
                     queryResults.germanValidation.hasGermanContent
    };
    
    const passedSteps = Object.values(workflowSteps).filter(Boolean).length;
    const totalSteps = Object.keys(workflowSteps).length;
    
    console.log(`\n📊 Workflow Validation Results:`);
    console.log(`   📤 Upload page: ${workflowSteps.uploadPageWorks ? 'PASS' : 'FAIL'}`);
    console.log(`   ❓ Query page: ${workflowSteps.queryPageWorks ? 'PASS' : 'FAIL'}`);
    console.log(`   🔗 File integration: ${workflowSteps.fileIntegration ? 'PASS' : 'FAIL'}`);
    console.log(`   🤖 Auto-selection: ${workflowSteps.autoSelection ? 'PASS' : 'FAIL'}`);
    console.log(`   🇩🇪 German support: ${workflowSteps.germanSupport ? 'PASS' : 'FAIL'}`);
    
    // Final comprehensive screenshot
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle2' });
    await page.screenshot({ 
      path: `${screenshotDir}/final-complete-workflow.png`, 
      fullPage: true 
    });
    
    // Performance metrics
    const performance = await page.metrics();
    console.log(`\n⚡ Performance Metrics:`);
    console.log(`   💾 JS Heap: ${Math.round(performance.JSHeapUsedSize / 1024 / 1024)}MB`);
    console.log(`   🏗️ DOM Nodes: ${performance.Nodes}`);
    console.log(`   📡 Event Listeners: ${performance.JSEventListeners}`);
    
    // === FINAL RESULTS ===
    console.log('\n🎉 === COMPLETE E2E TEST RESULTS ===');
    console.log(`📊 Overall Score: ${passedSteps}/${totalSteps} (${Math.round(passedSteps/totalSteps*100)}%)`);
    
    if (passedSteps === totalSteps) {
      console.log('🏆 EXCELLENT: Complete workflow is fully functional!');
    } else if (passedSteps >= totalSteps * 0.8) {
      console.log('✅ GOOD: Most functionality working, minor issues detected');
    } else if (passedSteps >= totalSteps * 0.6) {
      console.log('⚠️ FAIR: Core functionality working, needs improvements');
    } else {
      console.log('❌ NEEDS WORK: Major functionality issues detected');
    }
    
    console.log('\n🔍 Key Findings:');
    if (!workflowSteps.autoSelection) {
      console.log('   🔧 Fix needed: Auto-selection after file upload');
    }
    if (!workflowSteps.fileIntegration) {
      console.log('   🔧 Fix needed: File integration between pages');
    }
    if (!queryFormAccessible) {
      console.log('   🔧 Fix needed: Query form accessibility after file selection');
    }
    
    console.log('\n🚀 Next Recommended Actions:');
    console.log('   1. Implement missing FileSelector on Query page');
    console.log('   2. Fix auto-selection functionality');
    console.log('   3. Connect Query form to file selection state');
    console.log('   4. Add German query processing backend');
    console.log('   5. Implement query results display');
    
    return passedSteps >= totalSteps * 0.6; // 60% pass rate minimum
    
  } catch (error) {
    console.error('❌ E2E test failed:', error.message);
    console.error(error.stack);
    return false;
  } finally {
    if (browser) {
      await browser.close();
      console.log('\n🔄 Browser closed');
    }
  }
}

// Run the complete E2E test
runCompleteE2ETest().then(success => {
  if (success) {
    console.log('\n✅ E2E Test Suite: PASSED');
    console.log('🎯 Ready for Phase 3: Workflow Integration Fixes');
  } else {
    console.log('\n❌ E2E Test Suite: FAILED');
    console.log('🔧 Critical issues need to be addressed');
  }
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ E2E execution failed:', error);
  process.exit(1);
});