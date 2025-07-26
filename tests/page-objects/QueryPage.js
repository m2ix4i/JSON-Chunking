/**
 * Query Page Object Model for IFC JSON Chunking E2E Tests
 * Handles query creation and file selection functionality
 */

const BasePage = require('./BasePage');

class QueryPage extends BasePage {
  constructor(page) {
    super(page);
    this.path = '/query';
    
    // Selectors based on the current implementation
    this.selectors = {
      // File selection
      fileSelector: '[data-testid="file-selector"]',
      fileSelectorCard: '.MuiCard-root', // FileSelector card
      fileRadioButtons: 'input[type="radio"]',
      selectedFileAlert: '.MuiAlert-root',
      
      // Query form
      queryForm: '[data-testid="query-form"], form',
      queryInput: '[data-testid="query-input"], textarea, input[name="query"]',
      intentSelect: '[data-testid="intent-select"], select',
      submitButton: '[data-testid="submit-query"], button[type="submit"]',
      
      // Query suggestions
      suggestionsList: '[data-testid="suggestions"], .suggestions',
      suggestionItem: '[data-testid="suggestion-item"], .suggestion-item',
      
      // Status and results
      queryStatus: '[data-testid="query-status"], .status',
      loadingIndicator: '[data-testid="loading"], .loading',
      errorMessage: '[data-testid="error"], .error',
      resultsContainer: '[data-testid="results"], .results',
      
      // German specific
      stepOneTitle: 'text*="Schritt 1"',
      fileRequiredText: 'text*="Dateiauswahl erforderlich"',
      germanQueryPlaceholder: 'text*="Abfrage"'
    };
  }

  // Navigation
  async navigate() {
    await this.goto(this.path);
    await this.takeScreenshot('query-page-loaded');
    return this;
  }

  // File selection methods
  async waitForFileSelector() {
    console.log('🔍 Waiting for file selector...');
    
    // Wait for file selector card to be visible
    await this.page.waitForSelector('.MuiCard-root', { timeout: this.timeout });
    
    // Check if it contains file selection content
    const fileSelectorExists = await this.page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.MuiCard-root'));
      return cards.some(card => 
        card.textContent.includes('Datei') || 
        card.textContent.includes('auswählen') ||
        card.textContent.includes('Schritt 1')
      );
    });
    
    console.log(`📁 File selector ${fileSelectorExists ? 'found' : 'not found'}`);
    return fileSelectorExists;
  }

  async getAvailableFiles() {
    await this.waitForFileSelector();
    
    const files = await this.page.evaluate(() => {
      const listItems = Array.from(document.querySelectorAll('.MuiListItem-root'));
      return listItems.map(item => {
        const radio = item.querySelector('input[type="radio"]');
        const primaryText = item.querySelector('.MuiListItemText-primary');
        const secondaryText = item.querySelector('.MuiListItemText-secondary');
        
        if (radio && primaryText) {
          // Extract filename from primary text (remove any chips/badges)
          let filename = primaryText.textContent.trim();
          if (filename.includes('.json')) {
            filename = filename.split('.json')[0] + '.json';
          }
          
          return {
            value: radio.value,
            checked: radio.checked,
            label: filename,
            fullText: primaryText.textContent.trim(),
            details: secondaryText ? secondaryText.textContent.trim() : ''
          };
        }
        return null;
      }).filter(file => file && file.value && file.value !== '' && file.label.includes('.json'));
    });
    
    console.log(`📋 Available files: ${files.length}`);
    files.forEach(file => 
      console.log(`   ${file.checked ? '●' : '○'} ${file.label} (${file.value})`)
    );
    
    return files;
  }

  async selectFile(filename) {
    console.log(`🎯 Selecting file: ${filename}`);
    
    const fileSelected = await this.page.evaluate((filename) => {
      const listItems = Array.from(document.querySelectorAll('.MuiListItem-root'));
      
      for (const item of listItems) {
        const radio = item.querySelector('input[type="radio"]');
        const primaryText = item.querySelector('.MuiListItemText-primary');
        
        if (radio && primaryText) {
          const itemText = primaryText.textContent.trim();
          // Match by filename, file ID, or containing text
          if (itemText.includes(filename) || radio.value.includes(filename) || filename.includes(radio.value)) {
            radio.click();
            return true;
          }
        }
      }
      return false;
    }, filename);
    
    if (fileSelected) {
      console.log(`✅ File selected: ${filename}`);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for UI update
      await this.takeScreenshot(`file-selected-${filename.replace(/[^a-zA-Z0-9]/g, '_')}`);
    } else {
      console.log(`❌ File not found: ${filename}`);
    }
    
    return fileSelected;
  }

  async getSelectedFile() {
    const selectedFile = await this.page.evaluate(() => {
      const checkedRadio = document.querySelector('input[type="radio"]:checked');
      if (checkedRadio) {
        return {
          value: checkedRadio.value,
          label: checkedRadio.parentElement?.textContent?.trim() || 'Unknown'
        };
      }
      return null;
    });
    
    if (selectedFile) {
      console.log(`🎯 Currently selected: ${selectedFile.label.slice(0, 50)}`);
    } else {
      console.log(`📭 No file selected`);
    }
    
    return selectedFile;
  }

  // Query form methods
  async waitForQueryForm() {
    console.log('🔍 Waiting for query form...');
    
    // Wait for query form to appear (it should appear after file selection)
    try {
      await this.page.waitForFunction(() => {
        // Look for query form indicators
        const textareas = document.querySelectorAll('textarea');
        const submitButtons = document.querySelectorAll('button[type="submit"]');
        const forms = document.querySelectorAll('form');
        
        // Check if we have query-related elements
        return textareas.length > 0 && (
          submitButtons.length > 0 || 
          forms.length > 0 ||
          Array.from(document.querySelectorAll('button')).some(btn => 
            btn.textContent.includes('Submit') || 
            btn.textContent.includes('Senden') ||
            btn.textContent.includes('Query')
          )
        );
      }, { timeout: 10000 });
      
      console.log(`📝 Query form found`);
      return true;
    } catch (error) {
      console.log(`📝 Query form not found: ${error.message}`);
      return false;
    }
  }

  async enterQuery(queryText) {
    console.log(`📝 Entering query: "${queryText}"`);
    
    try {
      // Wait for textarea to be available and interactable
      await this.page.waitForSelector('textarea', { visible: true, timeout: 5000 });
      
      // Clear any existing text and type new query
      const success = await this.page.evaluate((text) => {
        const textareas = document.querySelectorAll('textarea');
        if (textareas.length > 0) {
          const textarea = textareas[0]; // Use first textarea (query input)
          textarea.value = '';
          textarea.focus();
          textarea.value = text;
          
          // Trigger input event to notify React
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
          textarea.dispatchEvent(new Event('change', { bubbles: true }));
          
          return true;
        }
        return false;
      }, queryText);
      
      if (success) {
        console.log(`✅ Query entered successfully: "${queryText}"`);
        return true;
      } else {
        console.log(`❌ No textarea found for query input`);
        return false;
      }
    } catch (error) {
      console.log(`❌ Query entry failed: ${error.message}`);
      return false;
    }
  }

  async selectIntent(intent) {
    console.log(`🎯 Selecting intent: ${intent}`);
    
    const selectElements = await this.page.$$('select');
    if (selectElements.length > 0) {
      await selectElements[0].select(intent);
      console.log(`✅ Intent selected: ${intent}`);
      return true;
    } else {
      console.log(`❌ Intent selector not found`);
      return false;
    }
  }

  async submitQuery() {
    console.log('🚀 Submitting query...');
    
    try {
      // Wait for submit button to be available and enabled
      const submitButton = await this.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const submitBtn = buttons.find(btn => 
          btn.type === 'submit' ||
          btn.textContent.includes('Submit Query') ||
          btn.textContent.includes('Submit') ||
          btn.textContent.includes('Senden') ||
          btn.textContent.includes('Abfrage')
        );
        
        if (submitBtn && !submitBtn.disabled) {
          console.log('Found submit button:', submitBtn.textContent.trim());
          submitBtn.click();
          return true;
        }
        return false;
      });
      
      if (submitButton) {
        console.log(`✅ Query submitted`);
        await this.takeScreenshot('query-submitted');
        
        // Wait a moment for the submission to process
        await new Promise(resolve => setTimeout(resolve, 1000));
        return true;
      } else {
        console.log(`❌ Submit button not found or disabled`);
        
        // Debug: List all available buttons
        const availableButtons = await this.page.evaluate(() => {
          return Array.from(document.querySelectorAll('button')).map(btn => ({
            text: btn.textContent.trim(),
            type: btn.type,
            disabled: btn.disabled
          }));
        });
        console.log(`🔍 Available buttons: ${JSON.stringify(availableButtons)}`);
        
        return false;
      }
    } catch (error) {
      console.log(`❌ Submit failed: ${error.message}`);
      return false;
    }
  }
  
  // Response monitoring methods
  async waitForQueryResponse(timeout = 60000) {
    console.log('⏳ Waiting for query response...');
    
    try {
      // Wait for response with multiple possible indicators
      const response = await this.page.waitForFunction(() => {
        // Check for results container
        const resultsContainer = document.querySelector('[data-testid="results"], .results, .query-result, .response');
        if (resultsContainer && resultsContainer.textContent.trim().length > 20) {
          return resultsContainer.textContent.trim();
        }
        
        // Check for loading indicators disappearing
        const loadingElements = document.querySelectorAll('.loading, [data-testid="loading"]');
        const isLoading = Array.from(loadingElements).some(el => 
          el.style.display !== 'none' && !el.hidden
        );
        
        // Check for error messages
        const errorElements = document.querySelectorAll('.error, [data-testid="error"]');
        const hasError = Array.from(errorElements).some(el => 
          el.textContent.trim().length > 0
        );
        
        if (hasError) {
          return 'ERROR: ' + Array.from(errorElements).map(el => el.textContent.trim()).join(' ');
        }
        
        // Look for any substantial text that might be a response
        const textContent = document.body.textContent;
        if (!isLoading && (
          textContent.includes('Gemini') ||
          textContent.includes('Antwort') ||
          textContent.includes('Ergebnis') ||
          textContent.includes('Analyse')
        )) {
          // Extract relevant response text
          const paragraphs = Array.from(document.querySelectorAll('p, div')).map(el => el.textContent.trim());
          const responseParagraphs = paragraphs.filter(text => 
            text.length > 50 && (
              text.includes('Holz') ||
              text.includes('Bauteil') ||
              text.includes('Material') ||
              text.includes('Struktur')
            )
          );
          
          if (responseParagraphs.length > 0) {
            return responseParagraphs[0];
          }
        }
        
        return null;
      }, { timeout });
      
      if (response) {
        console.log(`✅ Response received: ${response.length > 100 ? response.slice(0, 100) + '...' : response}`);
        return response.toString();
      }
      
      return null;
    } catch (error) {
      console.log(`⏰ Response timeout: ${error.message}`);
      return null;
    }
  }
  
  async checkQueryStatus() {
    console.log('🔍 Checking query processing status...');
    
    const status = await this.page.evaluate(() => {
      // Check for loading indicators
      const loadingElements = document.querySelectorAll('.loading, [data-testid="loading"], .MuiCircularProgress-root');
      const isLoading = Array.from(loadingElements).some(el => 
        el.style.display !== 'none' && !el.hidden
      );
      
      // Check for error messages
      const errorElements = document.querySelectorAll('.error, [data-testid="error"], .MuiAlert-root');
      const errors = Array.from(errorElements)
        .map(el => el.textContent.trim())
        .filter(text => text.length > 0);
      
      // Check for success indicators
      const successElements = document.querySelectorAll('.success, [data-testid="success"], .results');
      const hasResults = Array.from(successElements).some(el => 
        el.textContent.trim().length > 20
      );
      
      return {
        isLoading,
        hasErrors: errors.length > 0,
        errors,
        hasResults,
        timestamp: new Date().toISOString()
      };
    });
    
    console.log(`📊 Status: Loading=${status.isLoading}, Errors=${status.hasErrors}, Results=${status.hasResults}`);
    
    if (status.hasErrors) {
      console.log(`❌ Errors detected: ${status.errors.join(', ')}`);
    }
    
    return status;
  }

  // German query testing
  async testGermanQueries() {
    const germanQueries = [
      'Zeige mir alle Holzbalken aus Fichte',
      'Wie viele Bauteile sind im Erdgeschoss?',
      'Was ist die Gesamtlänge aller Träger?',
      'Welche Materialien werden verwendet?',
      'Finde alle Komponenten mit Breite größer als 20cm'
    ];

    console.log('🇩🇪 Testing German queries...');
    const results = [];

    for (const query of germanQueries) {
      console.log(`\n📝 Testing query: "${query}"`);
      
      const entered = await this.enterQuery(query);
      if (entered) {
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Clear the input for next query
        await this.page.evaluate(() => {
          const inputs = document.querySelectorAll('textarea, input[type="text"]');
          inputs.forEach(input => input.value = '');
        });
      }
      
      results.push({ query, entered });
    }

    return results;
  }

  // Query suggestions
  async getSuggestions() {
    const suggestions = await this.page.evaluate(() => {
      const suggestionElements = document.querySelectorAll('.suggestions li, .suggestion-item');
      return Array.from(suggestionElements).map(el => el.textContent.trim());
    });

    console.log(`💡 Found ${suggestions.length} query suggestions`);
    return suggestions;
  }

  async clickSuggestion(suggestionText) {
    console.log(`💡 Clicking suggestion: "${suggestionText}"`);
    
    const clicked = await this.page.evaluate((text) => {
      const suggestions = Array.from(document.querySelectorAll('.suggestions li, .suggestion-item'));
      const suggestion = suggestions.find(el => el.textContent.includes(text));
      
      if (suggestion) {
        suggestion.click();
        return true;
      }
      return false;
    }, suggestionText);
    
    if (clicked) {
      console.log(`✅ Suggestion clicked: ${suggestionText}`);
    } else {
      console.log(`❌ Suggestion not found: ${suggestionText}`);
    }
    
    return clicked;
  }

  // Validation methods
  async validateRequiredFileMessage() {
    console.log('🔍 Checking for required file message...');
    
    const messageExists = await this.page.evaluate(() => {
      const text = document.body.textContent;
      return text.includes('Dateiauswahl erforderlich') || 
             text.includes('Erst Datei auswählen') ||
             text.includes('Keine Datei ausgewählt');
    });
    
    console.log(`📋 Required file message: ${messageExists ? 'FOUND' : 'NOT FOUND'}`);
    return messageExists;
  }

  async validateGermanContent() {
    console.log('🇩🇪 Validating German content on query page...');
    
    const germanTexts = await this.findGermanText([
      'Abfrage', 'erstellen', 'Datei', 'auswählen', 'Schritt',
      'erforderlich', 'Upload-Seite', 'Eingabe'
    ]);
    
    const hasGermanContent = germanTexts.length > 0;
    console.log(`🇩🇪 German content validation: ${hasGermanContent ? 'PASS' : 'FAIL'}`);
    
    return {
      hasGermanContent,
      foundTexts: germanTexts.slice(0, 8) // First 8 texts
    };
  }

  // Complete workflow test
  async testCompleteQueryWorkflow(filename = null) {
    console.log('🔄 Testing complete query workflow...');
    
    // 1. Navigate to query page
    await this.navigate();
    
    // 2. Validate German content
    const germanValidation = await this.validateGermanContent();
    
    // 3. Wait for file selector
    const fileSelectorExists = await this.waitForFileSelector();
    
    // 4. Get available files
    const availableFiles = fileSelectorExists ? await this.getAvailableFiles() : [];
    
    // 5. Select a file if available
    let fileSelected = false;
    if (availableFiles.length > 0) {
      const targetFile = filename || availableFiles[0].label;
      fileSelected = await this.selectFile(targetFile);
    }
    
    // 6. Check if query form appears after file selection
    const queryFormExists = fileSelected ? await this.waitForQueryForm() : false;
    
    // 7. Test German queries if form is available
    let queryTests = [];
    if (queryFormExists) {
      queryTests = await this.testGermanQueries();
    }
    
    // 8. Check for required file message if no file selected
    const requiredFileMessage = !fileSelected ? await this.validateRequiredFileMessage() : false;
    
    await this.takeScreenshot('query-workflow-completed');
    
    return {
      germanValidation,
      fileSelectorExists,
      availableFiles: availableFiles.length,
      fileSelected,
      queryFormExists,
      queryTests: queryTests.length,
      requiredFileMessage,
      workflowComplete: fileSelectorExists && (fileSelected || requiredFileMessage)
    };
  }
}

module.exports = QueryPage;