/**
 * Upload Page Object Model for IFC JSON Chunking E2E Tests
 * Handles file upload functionality and validation
 */

const BasePage = require('./BasePage');
const path = require('path');

class UploadPage extends BasePage {
  constructor(page) {
    super(page);
    this.path = '/upload';
    
    // Selectors based on actual implementation
    this.selectors = {
      dropzone: 'input[type="file"]',
      fileList: '.MuiList-root',
      fileItems: '.MuiListItem-root',
      uploadProgress: '.MuiLinearProgress-root',
      errorMessage: '.MuiAlert-root[role="alert"]',
      successMessage: 'text*="Erfolgreich"',
      fileSelector: '.MuiListItem-root',
      
      // German specific selectors
      germanUploadText: 'text*="hochladen"',
      germanFileText: 'text*="Datei"',
      germanDropText: 'text*="ziehen"'
    };
  }

  // Navigation
  async navigate() {
    await this.goto(this.path);
    await this.takeScreenshot('upload-page-loaded');
    return this;
  }

  // File upload methods
  async uploadFile(filePath, waitForCompletion = true) {
    console.log(`📁 Uploading file: ${filePath}`);
    
    // Look for file input element
    const fileInput = await this.page.$('input[type="file"]');
    
    if (fileInput) {
      await fileInput.uploadFile(filePath);
      console.log(`✅ File selected: ${path.basename(filePath)}`);
      
      if (waitForCompletion) {
        await this.waitForUploadCompletion();
      }
    } else {
      console.log(`❌ File input not found for upload`);
      throw new Error('File input not found');
    }
    
    await this.takeScreenshot(`upload-${path.basename(filePath)}-completed`);
    return this;
  }

  async uploadTestFile(filename = 'test-holzbau.json') {
    const testFile = await this.createTestFile(filename);
    return await this.uploadFile(testFile);
  }

  async createTestFile(filename) {
    const fs = require('fs');
    const testData = {
      test: 'IFC JSON Chunking Test File',
      building_components: [
        {
          id: 'holzbalken_001',
          type: 'Holzbalken',
          material: 'Fichte',
          dimensions: { length: 400, width: 20, height: 15 },
          location: 'Erdgeschoss'
        },
        {
          id: 'holzbalken_002', 
          type: 'Holzbalken',
          material: 'Kiefer',
          dimensions: { length: 350, width: 18, height: 15 },
          location: 'Obergeschoss'
        }
      ],
      metadata: {
        created: new Date().toISOString(),
        source: 'e2e_test',
        format: 'IFC_JSON_TEST'
      }
    };

    const testFilePath = path.join(__dirname, '..', 'fixtures', filename);
    
    // Ensure fixtures directory exists
    const fixturesDir = path.dirname(testFilePath);
    if (!fs.existsSync(fixturesDir)) {
      fs.mkdirSync(fixturesDir, { recursive: true });
    }
    
    fs.writeFileSync(testFilePath, JSON.stringify(testData, null, 2));
    console.log(`📝 Created test file: ${testFilePath}`);
    
    return testFilePath;
  }

  // Upload validation
  async waitForUploadCompletion(timeout = 30000) {
    console.log('⏳ Waiting for upload completion...');
    
    try {
      // Wait for file list to appear after upload
      await this.page.waitForSelector(this.selectors.fileList, { timeout: 10000 });
      
      // Wait for success status to appear in file list items
      const successFound = await this.page.waitForFunction(() => {
        const fileItems = document.querySelectorAll('.MuiListItem-root');
        return Array.from(fileItems).some(item => 
          item.textContent.includes('Erfolgreich')
        );
      }, { timeout });
      
      if (successFound) {
        console.log(`✅ Upload successful: File appears in list with success status`);
        return true;
      }
      
      return false;
      
    } catch (error) {
      console.log(`⏰ Upload timeout: ${error.message}`);
      // Check for error messages in the file list
      try {
        const hasError = await this.page.evaluate(() => {
          const fileItems = document.querySelectorAll('.MuiListItem-root');
          return Array.from(fileItems).some(item => 
            item.textContent.includes('Fehler') || 
            item.textContent.includes('Error')
          );
        });
        
        if (hasError) {
          console.log(`❌ Upload failed: Error found in file list`);
        }
      } catch (evalError) {
        console.log(`❌ Could not evaluate upload status`);
      }
      
      return false;
    }
  }

  async getUploadedFiles() {
    try {
      await this.page.waitForSelector(this.selectors.fileList, { timeout: 5000 });
    } catch {
      console.log(`📋 No file list found`);
      return [];
    }
    
    const files = await this.page.evaluate(() => {
      const fileItems = Array.from(document.querySelectorAll('.MuiListItem-root'));
      return fileItems.map(item => {
        const primaryText = item.querySelector('.MuiListItemText-primary');
        const secondaryText = item.querySelector('.MuiListItemText-secondary');
        
        const filename = primaryText ? primaryText.textContent.trim() : 'Unknown file';
        const status = secondaryText ? secondaryText.textContent.trim() : 'Unknown status';
        
        return { filename, status };
      }).filter(file => file.filename !== 'Unknown file');
    });
    
    console.log(`📋 Found ${files.length} uploaded files`);
    files.forEach(file => console.log(`   📄 ${file.filename} - ${file.status}`));
    return files;
  }

  // File selector interaction
  async selectFile(filename) {
    console.log(`🎯 Selecting file: ${filename}`);
    
    // Look for file in the list and click it
    const fileElements = await this.page.$$(this.selectors.fileItems);
    
    for (const element of fileElements) {
      const elementText = await element.evaluate(el => el.textContent);
      if (elementText.includes(filename)) {
        await element.click();
        console.log(`✅ File selected: ${filename}`);
        return true;
      }
    }
    
    console.log(`❌ File not found: ${filename}`);
    return false;
  }

  async getSelectedFile() {
    const selectedElement = await this.page.$('[data-testid="selected-file"], .selected');
    if (selectedElement) {
      return await this.getTextContent('[data-testid="selected-file"], .selected');
    }
    return null;
  }

  // German language validation
  async validateGermanContent() {
    console.log('🇩🇪 Validating German content on upload page...');
    
    const germanTexts = await this.findGermanText([
      'hochladen', 'Datei', 'ziehen', 'auswählen', 'JSON', 'Größe'
    ]);
    
    const hasGermanContent = germanTexts.length > 0;
    console.log(`🇩🇪 German content validation: ${hasGermanContent ? 'PASS' : 'FAIL'}`);
    
    return {
      hasGermanContent,
      foundTexts: germanTexts.slice(0, 5) // First 5 texts
    };
  }

  // Error scenarios
  async uploadInvalidFile() {
    const invalidFilePath = await this.createInvalidTestFile();
    return await this.uploadFile(invalidFilePath, false);
  }

  async createInvalidTestFile() {
    const fs = require('fs');
    const invalidContent = 'This is not valid JSON content { invalid';
    const invalidFilePath = path.join(__dirname, '..', 'fixtures', 'invalid-file.json');
    
    fs.writeFileSync(invalidFilePath, invalidContent);
    console.log(`📝 Created invalid test file: ${invalidFilePath}`);
    
    return invalidFilePath;
  }

  // Comprehensive upload workflow test
  async testCompleteUploadWorkflow() {
    console.log('🔄 Testing complete upload workflow...');
    
    // 1. Navigate to upload page
    await this.navigate();
    
    // 2. Validate German content
    const germanValidation = await this.validateGermanContent();
    
    // 3. Create and upload test file
    const testFile = await this.uploadTestFile('workflow-test.json');
    
    // 4. Verify upload completion
    const uploadSuccess = await this.waitForUploadCompletion();
    
    // 5. Check uploaded files list
    const uploadedFiles = await this.getUploadedFiles();
    
    // 6. Test file selection
    const selectedFile = uploadedFiles.length > 0 ? 
      await this.selectFile(uploadedFiles[0].filename) : false;
    
    await this.takeScreenshot('upload-workflow-completed');
    
    return {
      germanValidation,
      uploadSuccess,
      uploadedFiles,
      selectedFile,
      workflowComplete: uploadSuccess && uploadedFiles.length > 0
    };
  }
}

module.exports = UploadPage;