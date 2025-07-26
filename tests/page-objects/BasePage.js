/**
 * Base Page Object Model for IFC JSON Chunking E2E Tests
 * Provides common functionality for all page objects
 */

class BasePage {
  constructor(page) {
    this.page = page;
    this.baseUrl = 'http://localhost:3001';
    this.timeout = 30000;
  }

  // Navigation methods
  async goto(path = '') {
    const url = `${this.baseUrl}${path}`;
    console.log(`🌐 Navigating to: ${url}`);
    await this.page.goto(url, { waitUntil: 'networkidle2', timeout: this.timeout });
    await this.waitForReactLoad();
  }

  async waitForReactLoad() {
    // Wait for React app to be fully loaded
    await this.page.waitForSelector('#root > *', { timeout: this.timeout });
    // Small delay to ensure React components are rendered
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Screenshot utilities
  async takeScreenshot(name, options = {}) {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const filename = `./test-screenshots/${timestamp}-${name}.png`;
    
    await this.page.screenshot({
      path: filename,
      fullPage: options.fullPage || false,
      ...options
    });
    
    console.log(`📸 Screenshot saved: ${filename}`);
    return filename;
  }

  // Element interaction utilities
  async waitAndClick(selector, options = {}) {
    await this.page.waitForSelector(selector, { timeout: this.timeout });
    await this.page.click(selector, options);
    console.log(`🖱️ Clicked: ${selector}`);
  }

  async waitAndType(selector, text, options = {}) {
    await this.page.waitForSelector(selector, { timeout: this.timeout });
    await this.page.type(selector, text, options);
    console.log(`⌨️ Typed "${text}" in: ${selector}`);
  }

  async waitAndSelect(selector, value) {
    await this.page.waitForSelector(selector, { timeout: this.timeout });
    await this.page.select(selector, value);
    console.log(`📋 Selected "${value}" in: ${selector}`);
  }

  // Text and content utilities
  async getTextContent(selector) {
    await this.page.waitForSelector(selector, { timeout: this.timeout });
    return await this.page.$eval(selector, el => el.textContent.trim());
  }

  async getAllTextContent(selector) {
    await this.page.waitForSelector(selector, { timeout: this.timeout });
    return await this.page.$$eval(selector, elements => 
      elements.map(el => el.textContent.trim())
    );
  }

  // Validation utilities
  async expectElementVisible(selector, message = '') {
    try {
      await this.page.waitForSelector(selector, { visible: true, timeout: 5000 });
      console.log(`✅ Element visible: ${selector} ${message}`);
      return true;
    } catch (error) {
      console.log(`❌ Element not visible: ${selector} ${message}`);
      return false;
    }
  }

  async expectElementHidden(selector, message = '') {
    try {
      await this.page.waitForSelector(selector, { hidden: true, timeout: 5000 });
      console.log(`✅ Element hidden: ${selector} ${message}`);
      return true;
    } catch (error) {
      console.log(`❌ Element still visible: ${selector} ${message}`);
      return false;
    }
  }

  async expectTextContent(selector, expectedText, message = '') {
    const actualText = await this.getTextContent(selector);
    const matches = actualText.includes(expectedText);
    
    if (matches) {
      console.log(`✅ Text matches: "${expectedText}" in ${selector} ${message}`);
    } else {
      console.log(`❌ Text mismatch: Expected "${expectedText}", got "${actualText}" in ${selector} ${message}`);
    }
    
    return matches;
  }

  // German language specific utilities
  async findGermanText(keywords = []) {
    const germanKeywords = [
      ...keywords,
      'Datei', 'Abfrage', 'Hochladen', 'Erstellen', 'Auswählen',
      'Gebäude', 'Analyse', 'Ergebnis', 'Upload', 'Query'
    ];

    const foundTexts = await this.page.evaluate((keywords) => {
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
        if (keywords.some(keyword => text.includes(keyword)) || 
            text.match(/[äöüÄÖÜß]/)) {
          texts.push(text);
        }
      }
      return texts;
    }, germanKeywords);

    console.log(`🇩🇪 Found ${foundTexts.length} German text elements`);
    return foundTexts;
  }

  // Performance monitoring
  async getPerformanceMetrics() {
    const metrics = await this.page.metrics();
    const performance = {
      jsHeapMB: Math.round(metrics.JSHeapUsedSize / 1024 / 1024),
      domNodes: metrics.Nodes,
      eventListeners: metrics.JSEventListeners,
      jsHeapTotalMB: Math.round(metrics.JSHeapTotalSize / 1024 / 1024)
    };

    console.log(`📊 Performance: ${performance.jsHeapMB}MB heap, ${performance.domNodes} nodes, ${performance.eventListeners} listeners`);
    return performance;
  }

  // Error handling
  async handleErrors() {
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`🚨 Console error: ${msg.text()}`);
      }
    });

    this.page.on('pageerror', error => {
      console.log(`🚨 Page error: ${error.message}`);
    });
  }

  // Cleanup
  async close() {
    // Override in child classes if needed
  }
}

module.exports = BasePage;