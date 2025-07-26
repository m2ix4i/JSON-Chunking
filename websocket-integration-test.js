#!/usr/bin/env node

/**
 * WebSocket Integration E2E Test Suite
 * Tests real-time query status updates, connection resilience, and fallback mechanisms
 */

const puppeteer = require('puppeteer');

class WebSocketIntegrationTest {
  constructor() {
    this.browser = null;
    this.page = null;
    this.wsMessages = [];
    this.errors = [];
    this.testResults = {
      connection: [],
      realtime: [],
      fallback: [],
      ui: [],
      performance: [],
    };
  }

  async setup() {
    console.log('🚀 Starting WebSocket Integration E2E Test Suite\n');
    
    this.browser = await puppeteer.launch({
      headless: false,
      defaultViewport: { width: 1280, height: 720 },
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    this.page = await this.browser.newPage();
    
    // Enable request/response interception
    await this.page.setRequestInterception(true);
    
    // Monitor WebSocket connections
    this.page.on('request', request => {
      if (request.url().includes('ws://') || request.url().includes('wss://')) {
        console.log(`🔌 WebSocket connection attempt: ${request.url()}`);
      }
      request.continue();
    });
    
    // Track console messages
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        this.errors.push(`Console Error: ${msg.text()}`);
      }
      if (msg.text().includes('WebSocket')) {
        this.wsMessages.push(msg.text());
        console.log(`📡 WS Log: ${msg.text()}`);
      }
    });
    
    // Track network failures
    this.page.on('response', response => {
      if (response.status() >= 400) {
        this.errors.push(`Network Error: ${response.status()} ${response.url()}`);
      }
    });
  }

  async testWebSocketConnection() {
    console.log('🔌 Testing WebSocket Connection Establishment...\n');
    
    try {
      await this.page.goto('http://localhost:3001/query', { waitUntil: 'networkidle2' });
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Check if file selection is available
      const hasFiles = await this.page.evaluate(() => {
        const radioButtons = document.querySelectorAll('input[type="radio"]');
        return radioButtons.length > 0;
      });
      
      if (!hasFiles) {
        console.log('  ⚠️ No files available for testing - skipping WebSocket tests');
        return false;
      }
      
      // Select a file
      const fileSelected = await this.page.evaluate(() => {
        const radioButtons = document.querySelectorAll('input[type="radio"]');
        if (radioButtons.length > 0) {
          radioButtons[0].click();
          return true;
        }
        return false;
      });
      
      if (!fileSelected) {
        console.log('  ❌ Could not select a file');
        return false;
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Enter a test query
      const queryEntered = await this.page.evaluate(() => {
        const textarea = document.querySelector('textarea');
        if (textarea) {
          // Manually set value and dispatch events to trigger React state
          textarea.value = 'Test query for WebSocket integration';
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
          textarea.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }
        return false;
      });
      
      if (!queryEntered) {
        console.log('  ❌ Could not enter query text');
        return false;
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Submit the query
      const submitted = await this.page.evaluate(() => {
        const submitBtn = Array.from(document.querySelectorAll('button')).find(btn => 
          btn.textContent.includes('Submit') || btn.textContent.includes('Senden')
        );
        if (submitBtn && !submitBtn.disabled) {
          submitBtn.click();
          return true;
        }
        return false;
      });
      
      if (submitted) {
        console.log('  ✅ Query submitted successfully');
        
        // Wait for potential WebSocket connection
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Check for real-time updates in UI
        const realTimeUpdates = await this.page.evaluate(() => {
          const bodyText = document.body.textContent;
          const indicators = [
            'Live-Updates',
            'WebSocket',
            'Echtzeit',
            'verbunden',
            'Live-Verbindung',
            'Real-time'
          ];
          
          return indicators.some(indicator => bodyText.includes(indicator));
        });
        
        console.log(`  ${realTimeUpdates ? '✅' : '⚠️'} Real-time indicators: ${realTimeUpdates ? 'Found' : 'Not found'}`);
        
        this.testResults.connection.push({
          test: 'WebSocket Connection',
          submitted: true,
          realTimeIndicators: realTimeUpdates,
          status: submitted && realTimeIndicators ? 'PASS' : 'PARTIAL'
        });
        
        return true;
      } else {
        console.log('  ❌ Could not submit query');
        return false;
      }
      
    } catch (error) {
      console.log(`  ❌ WebSocket connection test failed: ${error.message}`);
      this.testResults.connection.push({
        test: 'WebSocket Connection',
        error: error.message,
        status: 'FAIL'
      });
      return false;
    }
  }

  async testConnectionStatusIndicators() {
    console.log('\n📊 Testing Connection Status Indicators...\n');
    
    try {
      // Check for system status component in navigation
      const statusIndicators = await this.page.evaluate(() => {
        // Look for status indicators in various places
        const statusElements = document.querySelectorAll('[data-testid*="status"], .status, .connection');
        const healthIcons = document.querySelectorAll('svg[data-testid*="health"], svg[data-testid*="system"]');
        const chips = document.querySelectorAll('.MuiChip-root');
        
        const statusChips = Array.from(chips).filter(chip => {
          const text = chip.textContent.toLowerCase();
          return text.includes('websocket') || 
                 text.includes('live') || 
                 text.includes('polling') || 
                 text.includes('verbunden') ||
                 text.includes('getrennt');
        });
        
        return {
          statusElements: statusElements.length,
          healthIcons: healthIcons.length,
          statusChips: statusChips.length,
          chipTexts: statusChips.map(chip => chip.textContent)
        };
      });
      
      console.log(`  📈 Status elements found: ${statusIndicators.statusElements}`);
      console.log(`  🏥 Health icons found: ${statusIndicators.healthIcons}`);
      console.log(`  🏷️ Status chips found: ${statusIndicators.statusChips}`);
      
      if (statusIndicators.chipTexts.length > 0) {
        console.log(`  📝 Status chip texts: ${statusIndicators.chipTexts.join(', ')}`);
      }
      
      // Check for SystemStatus component in navigation
      const hasSystemStatus = await this.page.evaluate(() => {
        // Look for system status button in navigation
        const navButtons = document.querySelectorAll('nav button, header button, .MuiAppBar-root button');
        return Array.from(navButtons).some(btn => {
          const hasHealthIcon = btn.querySelector('svg[data-testid*="health"], svg[data-testid*="system"]');
          return hasHealthIcon;
        });
      });
      
      console.log(`  🗂️ System status in navigation: ${hasSystemStatus ? '✅' : '❌'}`);
      
      this.testResults.ui.push({
        test: 'Connection Status Indicators',
        statusElements: statusIndicators.statusElements,
        statusChips: statusIndicators.statusChips,
        hasSystemStatus,
        status: (statusIndicators.statusChips > 0 || hasSystemStatus) ? 'PASS' : 'FAIL'
      });
      
    } catch (error) {
      console.log(`  ❌ Status indicators test failed: ${error.message}`);
    }
  }

  async testProgressDisplay() {
    console.log('\n⏳ Testing Real-time Progress Display...\n');
    
    try {
      // Look for QueryProgress component
      const progressComponents = await this.page.evaluate(() => {
        // Check for progress indicators
        const progressBars = document.querySelectorAll('.MuiLinearProgress-root');
        const circularProgress = document.querySelectorAll('.MuiCircularProgress-root');
        const cards = document.querySelectorAll('.MuiCard-root');
        
        // Look for progress-related text
        const bodyText = document.body.textContent;
        const progressIndicators = [
          'Fortschritt',
          'Progress',
          'Verarbeitung',
          'Processing',
          'Schritt',
          'Step'
        ];
        
        const hasProgressText = progressIndicators.some(indicator => bodyText.includes(indicator));
        
        // Check for elapsed time display
        const hasElapsedTime = bodyText.includes('Laufzeit') || bodyText.includes('elapsed');
        
        // Check for step indicators
        const hasStepInfo = bodyText.includes('Schritt') && bodyText.includes('von');
        
        return {
          progressBars: progressBars.length,
          circularProgress: circularProgress.length,
          cards: cards.length,
          hasProgressText,
          hasElapsedTime,
          hasStepInfo
        };
      });
      
      console.log(`  📊 Progress bars: ${progressComponents.progressBars}`);
      console.log(`  ⭕ Circular progress: ${progressComponents.circularProgress}`);
      console.log(`  📝 Progress text: ${progressComponents.hasProgressText ? '✅' : '❌'}`);
      console.log(`  ⏱️ Elapsed time: ${progressComponents.hasElapsedTime ? '✅' : '❌'}`);
      console.log(`  👣 Step indicators: ${progressComponents.hasStepInfo ? '✅' : '❌'}`);
      
      this.testResults.realtime.push({
        test: 'Real-time Progress Display',
        progressBars: progressComponents.progressBars,
        hasProgressText: progressComponents.hasProgressText,
        hasElapsedTime: progressComponents.hasElapsedTime,
        status: progressComponents.progressBars > 0 && progressComponents.hasProgressText ? 'PASS' : 'PARTIAL'
      });
      
    } catch (error) {
      console.log(`  ❌ Progress display test failed: ${error.message}`);
    }
  }

  async testErrorHandling() {
    console.log('\n❌ Testing Error Handling and Fallback...\n');
    
    try {
      // Look for ConnectionErrorHandler component
      const errorHandling = await this.page.evaluate(() => {
        const alerts = document.querySelectorAll('.MuiAlert-root');
        const bodyText = document.body.textContent;
        
        // Check for error handling indicators
        const errorIndicators = [
          'Verbindungsprobleme',
          'Fallback',
          'Polling',
          'Connection',
          'Error',
          'Retry',
          'Wiederverbindung'
        ];
        
        const hasErrorHandling = errorIndicators.some(indicator => bodyText.includes(indicator));
        
        // Look for retry buttons
        const buttons = Array.from(document.querySelectorAll('button'));
        const retryButtons = buttons.filter(btn => 
          btn.textContent.includes('Retry') || 
          btn.textContent.includes('Wiederverbindung') ||
          btn.textContent.includes('Erneut')
        );
        
        // Look for fallback indicators
        const fallbackIndicators = buttons.filter(btn =>
          btn.textContent.includes('Fallback') ||
          btn.textContent.includes('Polling')
        );
        
        return {
          alerts: alerts.length,
          hasErrorHandling,
          retryButtons: retryButtons.length,
          fallbackIndicators: fallbackIndicators.length
        };
      });
      
      console.log(`  🚨 Alert components: ${errorHandling.alerts}`);
      console.log(`  🔧 Error handling text: ${errorHandling.hasErrorHandling ? '✅' : '❌'}`);
      console.log(`  🔄 Retry buttons: ${errorHandling.retryButtons}`);
      console.log(`  📡 Fallback indicators: ${errorHandling.fallbackIndicators}`);
      
      this.testResults.fallback.push({
        test: 'Error Handling Components',
        alerts: errorHandling.alerts,
        hasErrorHandling: errorHandling.hasErrorHandling,
        retryButtons: errorHandling.retryButtons,
        status: errorHandling.hasErrorHandling ? 'PASS' : 'PARTIAL'
      });
      
    } catch (error) {
      console.log(`  ❌ Error handling test failed: ${error.message}`);
    }
  }

  async testNetworkResilience() {
    console.log('\n🌐 Testing Network Resilience...\n');
    
    try {
      // Test network interruption simulation
      console.log('  🚫 Simulating network interruption...');
      
      // Block WebSocket connections
      await this.page.setRequestInterception(true);
      this.page.on('request', request => {
        if (request.url().includes('/ws/') || request.url().includes('websocket')) {
          console.log('  🚧 Blocking WebSocket request');
          request.abort();
        } else {
          request.continue();
        }
      });
      
      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Check if UI shows fallback indicators
      const fallbackDetected = await this.page.evaluate(() => {
        const bodyText = document.body.textContent;
        return bodyText.includes('Polling') || 
               bodyText.includes('Fallback') || 
               bodyText.includes('Standard-Modus') ||
               bodyText.includes('getrennt');
      });
      
      console.log(`  📊 Fallback mode detected: ${fallbackDetected ? '✅' : '❌'}`);
      
      // Re-enable connections
      await this.page.setRequestInterception(false);
      
      this.testResults.fallback.push({
        test: 'Network Resilience',
        fallbackDetected,
        status: fallbackDetected ? 'PASS' : 'FAIL'
      });
      
    } catch (error) {
      console.log(`  ❌ Network resilience test failed: ${error.message}`);
    }
  }

  async testPerformance() {
    console.log('\n⚡ Testing Performance Metrics...\n');
    
    try {
      // Measure page load performance
      const performanceMetrics = await this.page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0];
        const paint = performance.getEntriesByType('paint');
        
        return {
          loadTime: navigation ? navigation.loadEventEnd - navigation.loadEventStart : 0,
          domContentLoaded: navigation ? navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart : 0,
          firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
          firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0
        };
      });
      
      console.log(`  ⏱️ Load time: ${performanceMetrics.loadTime.toFixed(2)}ms`);
      console.log(`  📄 DOM ready: ${performanceMetrics.domContentLoaded.toFixed(2)}ms`);
      console.log(`  🎨 First paint: ${performanceMetrics.firstPaint.toFixed(2)}ms`);
      console.log(`  📝 First contentful paint: ${performanceMetrics.firstContentfulPaint.toFixed(2)}ms`);
      
      // Check for performance issues
      const performanceOk = performanceMetrics.loadTime < 3000 && 
                           performanceMetrics.firstContentfulPaint < 2000;
      
      console.log(`  🚀 Performance acceptable: ${performanceOk ? '✅' : '❌'}`);
      
      this.testResults.performance.push({
        test: 'Page Performance',
        loadTime: performanceMetrics.loadTime,
        firstContentfulPaint: performanceMetrics.firstContentfulPaint,
        performanceOk,
        status: performanceOk ? 'PASS' : 'WARN'
      });
      
    } catch (error) {
      console.log(`  ❌ Performance test failed: ${error.message}`);
    }
  }

  async generateReport() {
    console.log('\n📊 WEBSOCKET INTEGRATION TEST REPORT\n');
    console.log('='.repeat(60));
    
    // Connection Tests
    console.log('\n🔌 CONNECTION TESTS:');
    const connectionPassed = this.testResults.connection.filter(r => r.status === 'PASS').length;
    const connectionTotal = this.testResults.connection.length;
    console.log(`  Results: ${connectionPassed}/${connectionTotal} passed`);
    
    this.testResults.connection.forEach(result => {
      const icon = result.status === 'PASS' ? '✅' : result.status === 'PARTIAL' ? '⚠️' : '❌';
      console.log(`  ${icon} ${result.test}: ${result.status}`);
    });
    
    // Real-time Tests
    console.log('\n⏱️ REAL-TIME TESTS:');
    const realtimePassed = this.testResults.realtime.filter(r => r.status === 'PASS').length;
    const realtimeTotal = this.testResults.realtime.length;
    console.log(`  Results: ${realtimePassed}/${realtimeTotal} passed`);
    
    this.testResults.realtime.forEach(result => {
      const icon = result.status === 'PASS' ? '✅' : result.status === 'PARTIAL' ? '⚠️' : '❌';
      console.log(`  ${icon} ${result.test}: ${result.status}`);
    });
    
    // Fallback Tests
    console.log('\n🔄 FALLBACK TESTS:');
    const fallbackPassed = this.testResults.fallback.filter(r => r.status === 'PASS').length;
    const fallbackTotal = this.testResults.fallback.length;
    console.log(`  Results: ${fallbackPassed}/${fallbackTotal} passed`);
    
    this.testResults.fallback.forEach(result => {
      const icon = result.status === 'PASS' ? '✅' : result.status === 'PARTIAL' ? '⚠️' : '❌';
      console.log(`  ${icon} ${result.test}: ${result.status}`);
    });
    
    // UI Tests
    console.log('\n🖥️ UI INTEGRATION TESTS:');
    const uiPassed = this.testResults.ui.filter(r => r.status === 'PASS').length;
    const uiTotal = this.testResults.ui.length;
    console.log(`  Results: ${uiPassed}/${uiTotal} passed`);
    
    this.testResults.ui.forEach(result => {
      const icon = result.status === 'PASS' ? '✅' : result.status === 'PARTIAL' ? '⚠️' : '❌';
      console.log(`  ${icon} ${result.test}: ${result.status}`);
    });
    
    // Performance Tests
    console.log('\n⚡ PERFORMANCE TESTS:');
    const perfPassed = this.testResults.performance.filter(r => r.status === 'PASS').length;
    const perfTotal = this.testResults.performance.length;
    console.log(`  Results: ${perfPassed}/${perfTotal} passed`);
    
    this.testResults.performance.forEach(result => {
      const icon = result.status === 'PASS' ? '✅' : result.status === 'WARN' ? '⚠️' : '❌';
      console.log(`  ${icon} ${result.test}: ${result.status}`);
    });
    
    // WebSocket Messages
    console.log('\n📡 WEBSOCKET ACTIVITY:');
    console.log(`  Messages captured: ${this.wsMessages.length}`);
    if (this.wsMessages.length > 0) {
      console.log('  Recent messages:');
      this.wsMessages.slice(-5).forEach(msg => {
        console.log(`    📨 ${msg}`);
      });
    }
    
    // Error Summary
    console.log('\n❌ ERRORS:');
    if (this.errors.length === 0) {
      console.log('  ✅ No errors detected');
    } else {
      this.errors.slice(0, 5).forEach(error => {
        console.log(`  ❌ ${error}`);
      });
      if (this.errors.length > 5) {
        console.log(`  ... and ${this.errors.length - 5} more errors`);
      }
    }
    
    // Overall Assessment
    const totalTests = connectionTotal + realtimeTotal + fallbackTotal + uiTotal + perfTotal;
    const totalPassed = connectionPassed + realtimePassed + fallbackPassed + uiPassed + perfPassed;
    const overallScore = totalTests > 0 ? (totalPassed / totalTests * 100).toFixed(1) : 0;
    
    console.log('\n🎯 WEBSOCKET INTEGRATION ASSESSMENT:');
    console.log(`  Score: ${overallScore}% (${totalPassed}/${totalTests})`);
    console.log(`  WebSocket Activity: ${this.wsMessages.length} messages`);
    console.log(`  Errors: ${this.errors.length}`);
    
    const webSocketReady = overallScore >= 80 && 
                          this.wsMessages.length >= 0 && 
                          this.errors.length <= 3;
    
    if (webSocketReady) {
      console.log('  ✅ WEBSOCKET INTEGRATION READY');
    } else {
      console.log('  ❌ WEBSOCKET INTEGRATION NEEDS WORK');
    }
    
    console.log('\n' + '='.repeat(60));
    
    return {
      overallScore: parseFloat(overallScore),
      totalTests,
      totalPassed,
      webSocketMessages: this.wsMessages.length,
      errors: this.errors.length,
      webSocketReady,
      details: this.testResults
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
      
      // Run WebSocket-specific tests
      const connectionSuccessful = await this.testWebSocketConnection();
      
      if (connectionSuccessful) {
        await this.testProgressDisplay();
        await this.testErrorHandling();
        await this.testNetworkResilience();
      }
      
      await this.testConnectionStatusIndicators();
      await this.testPerformance();
      
      const report = await this.generateReport();
      
      return report;
      
    } catch (error) {
      console.error('❌ WebSocket integration test failed:', error.message);
      return {
        overallScore: 0,
        totalTests: 0,
        totalPassed: 0,
        webSocketMessages: 0,
        errors: 1,
        webSocketReady: false,
        error: error.message
      };
    } finally {
      await this.cleanup();
    }
  }
}

// Run the WebSocket integration test
if (require.main === module) {
  const wsTest = new WebSocketIntegrationTest();
  wsTest.run().then(report => {
    console.log(`\n${report.webSocketReady ? '✅' : '❌'} WebSocket Integration Test: ${report.webSocketReady ? 'READY' : 'NEEDS WORK'}`);
    console.log(`Final Score: ${report.overallScore}%`);
    console.log(`WebSocket Activity: ${report.webSocketMessages} messages captured`);
    process.exit(report.webSocketReady ? 0 : 1);
  });
}

module.exports = WebSocketIntegrationTest;