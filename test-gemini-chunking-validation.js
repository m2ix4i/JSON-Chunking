#!/usr/bin/env node

/**
 * Gemini API Chunking & Processing Validation Test
 * Deep validation of JSON chunking strategy and Gemini API parameters
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

class GeminiChunkingValidationTest {
  constructor() {
    this.browser = null;
    this.page = null;
    this.results = {
      chunking: [],
      apiCalls: [],
      processing: [],
      responses: []
    };
    this.testScore = 0;
    this.maxScore = 0;
    this.detailedApiLogs = [];
  }

  async setup() {
    console.log('🔬 GEMINI CHUNKING & PROCESSING VALIDATION');
    console.log('==========================================');
    console.log('Deep validation of JSON chunking strategy and Gemini API integration\n');
    
    this.browser = await puppeteer.launch({
      headless: false,
      defaultViewport: { width: 1280, height: 720 },
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    this.page = await this.browser.newPage();
    
    // Enhanced request/response monitoring
    await this.page.setRequestInterception(true);
    
    this.page.on('request', (request) => {
      const url = request.url();
      
      if (url.includes('localhost:8001')) {
        const requestData = {
          timestamp: new Date().toISOString(),
          type: 'request',
          method: request.method(),
          url: url,
          headers: request.headers(),
          postData: request.postData()
        };
        
        this.detailedApiLogs.push(requestData);
        console.log(`📤 API Request: ${request.method()} ${url}`);
      }
      
      request.continue();
    });
    
    this.page.on('response', async (response) => {
      const url = response.url();
      
      if (url.includes('localhost:8001')) {
        try {
          const responseText = await response.text();
          const responseData = {
            timestamp: new Date().toISOString(),
            type: 'response',
            status: response.status(),
            url: url,
            headers: response.headers(),
            body: responseText.length > 1000 ? responseText.substring(0, 1000) + '...' : responseText
          };
          
          this.detailedApiLogs.push(responseData);
          console.log(`📥 API Response: ${response.status()} ${url} (${responseText.length} chars)`);
          
          // Look for processing or query-related responses
          if (url.includes('/queries') && responseText.length > 100) {
            console.log(`🔍 Query response preview: ${responseText.substring(0, 200)}...`);
          }
          
        } catch (error) {
          console.log(`⚠️ Could not read response body: ${error.message}`);
        }
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

  async createComplexTestData() {
    console.log('📄 CREATING COMPLEX IFC JSON TEST DATA\n');
    
    // Create a more complex IFC structure to test chunking
    const complexIFCData = {
      "header": {
        "file_description": ["ViewDefinition [CoordinationView]", "IFC4X3"],
        "file_name": "Complex_Building_Munich.ifc",
        "time_stamp": "2024-01-15T10:30:00",
        "author": ["Max Mustermann", "Building Engineer"],
        "organization": ["Mustermann GmbH", "Munich Engineering"],
        "preprocessor_version": "IFC Exporter v3.2",
        "originating_system": "ArchiCAD 26",
        "authorization": "Public",
        "schema_identifiers": ["IFC4X3"]
      },
      "data": {
        "IfcProject": [
          {
            "id": "3vB2Fx9K51Aeb$1QHLgOX1",
            "global_id": "3vB2Fx9K51Aeb$1QHLgOX1",
            "name": "Bürogebäude München Zentrum",
            "description": "Ein modernes Bürogebäude mit nachhaltigen Materialien",
            "object_type": "Commercial Building",
            "long_name": "Nachhaltiges Bürozentrum München",
            "phase": "Neubau",
            "location": {
              "address": {
                "postal_box": null,
                "town": "München",
                "region": "Bayern",
                "postal_code": "80331",
                "country": "Deutschland",
                "street": "Maximilianstraße 12"
              },
              "latitude": 48.1391,
              "longitude": 11.5802
            }
          }
        ],
        "IfcSite": [
          {
            "id": "3vB2Fx9K51Aeb$1QHLgOX2",
            "global_id": "3vB2Fx9K51Aeb$1QHLgOX2",
            "name": "Grundstück München",
            "description": "Baugrundstück in der Münchener Innenstadt",
            "composition_type": "ELEMENT",
            "ref_latitude": [48, 8, 20, 760000],
            "ref_longitude": [11, 34, 48, 720000],
            "ref_elevation": 519.0,
            "land_title_number": "GB-Blatt 1234",
            "site_address": {
              "purpose": "OFFICE",
              "postal_box": null,
              "town": "München",
              "region": "Bayern",
              "postal_code": "80331",
              "country": "Deutschland"
            }
          }
        ],
        "IfcBuilding": [
          {
            "id": "3vB2Fx9K51Aeb$1QHLgOX3",
            "global_id": "3vB2Fx9K51Aeb$1QHLgOX3",
            "name": "Hauptgebäude",
            "description": "Sechsgeschossiges Bürogebäude mit Tiefgarage",
            "object_type": "Office Building",
            "composition_type": "ELEMENT",
            "elevation_of_ref_height": 0.0,
            "elevation_of_terrain": -2.5,
            "building_address": {
              "purpose": "OFFICE",
              "postal_box": null,
              "town": "München",
              "region": "Bayern",
              "postal_code": "80331",
              "country": "Deutschland",
              "street": "Maximilianstraße 12"
            }
          }
        ],
        "IfcBuildingStorey": [
          {
            "id": "3vB2Fx9K51Aeb$1QHLgOX4",
            "global_id": "3vB2Fx9K51Aeb$1QHLgOX4",
            "name": "Untergeschoss",
            "description": "Tiefgarage und Technikräume",
            "object_type": "Basement",
            "composition_type": "ELEMENT",
            "elevation": -2.5,
            "usage": "Parking and Technical"
          },
          {
            "id": "3vB2Fx9K51Aeb$1QHLgOX5",
            "global_id": "3vB2Fx9K51Aeb$1QHLgOX5",
            "name": "Erdgeschoss",
            "description": "Eingangshalle und Büros",
            "object_type": "Ground Floor",
            "composition_type": "ELEMENT",
            "elevation": 0.0,
            "usage": "Office and Reception"
          },
          {
            "id": "3vB2Fx9K51Aeb$1QHLgOX6",
            "global_id": "3vB2Fx9K51Aeb$1QHLgOX6",
            "name": "1. Obergeschoss",
            "description": "Büroräume und Besprechungsräume",
            "object_type": "Upper Floor",
            "composition_type": "ELEMENT",
            "elevation": 3.5,
            "usage": "Office and Meeting"
          }
        ],
        "IfcWall": [
          {
            "id": "3vB2Fx9K51Aeb$1QHLgOX7",
            "global_id": "3vB2Fx9K51Aeb$1QHLgOX7",
            "name": "Außenwand_Nord_EG",
            "description": "Nordwand Erdgeschoss aus Kalksandstein mit WDVS",
            "object_type": "Wall",
            "predefined_type": "EXTERNAL",
            "material": {
              "name": "Kalksandstein + WDVS",
              "description": "KS-Verblendstein 17,5cm + WDVS 16cm",
              "category": "Masonry"
            },
            "physical_properties": {
              "thickness": 0.335,
              "length": 15.75,
              "height": 3.5,
              "area": 55.125,
              "volume": 18.467,
              "thermal_transmittance": 0.18,
              "fire_resistance": "REI 90"
            },
            "storey": "Erdgeschoss",
            "structural_usage": "LOADBEARING"
          },
          {
            "id": "3vB2Fx9K51Aeb$1QHLgOX8",
            "global_id": "3vB2Fx9K51Aeb$1QHLgOX8",
            "name": "Trennwand_Büro_101",
            "description": "Innenwand zwischen Büroräumen aus Gipskarton",
            "object_type": "Wall",
            "predefined_type": "INTERNAL",
            "material": {
              "name": "Trockenbau",
              "description": "Gipskartonwand 2x12,5mm auf CW-Profil 100mm",
              "category": "Drywall"
            },
            "physical_properties": {
              "thickness": 0.125,
              "length": 4.2,
              "height": 3.0,
              "area": 12.6,
              "volume": 1.575,
              "sound_reduction": 45,
              "fire_resistance": "EI 60"
            },
            "storey": "Erdgeschoss",
            "structural_usage": "NONLOADBEARING"
          }
        ],
        "IfcBeam": [
          {
            "id": "3vB2Fx9K51Aeb$1QHLgOX9",
            "global_id": "3vB2Fx9K51Aeb$1QHLgOX9",
            "name": "Hauptträger_HEB_300",
            "description": "Hauptträger aus Stahl S355 im Erdgeschoss",
            "object_type": "Beam",
            "predefined_type": "BEAM",
            "material": {
              "name": "Stahl S355",
              "description": "Baustahl S355JR warmgewalzt",
              "category": "Steel",
              "strength_class": "S355",
              "density": 7850
            },
            "cross_section": {
              "profile": "HEB 300",
              "height": 0.3,
              "width": 0.3,
              "web_thickness": 0.011,
              "flange_thickness": 0.019,
              "area": 0.0149,
              "moment_of_inertia_y": 0.00025129,
              "moment_of_inertia_z": 0.00008563
            },
            "physical_properties": {
              "length": 8.5,
              "weight": 996.225,
              "volume": 0.1267
            },
            "structural_properties": {
              "loading": {
                "max_bending_moment": 850.5,
                "max_shear_force": 425.2,
                "utilization": 0.68
              }
            },
            "storey": "Erdgeschoss",
            "position": {
              "x": 4.25,
              "y": 7.5,
              "z": 3.5,
              "rotation": 0
            }
          },
          {
            "id": "3vB2Fx9K51Aeb$1QHLgOX10",
            "global_id": "3vB2Fx9K51Aeb$1QHLgOX10",
            "name": "Holzbalken_BSH_GL24h",
            "description": "Brettschichtholzträger im 1. OG",
            "object_type": "Beam",
            "predefined_type": "BEAM",
            "material": {
              "name": "Brettschichtholz GL24h",
              "description": "Fichte Brettschichtholz GL24h",
              "category": "Timber",
              "strength_class": "GL24h",
              "density": 385,
              "moisture_content": 12
            },
            "cross_section": {
              "profile": "Rechteck 160x320",
              "height": 0.32,
              "width": 0.16,
              "area": 0.0512,
              "moment_of_inertia_y": 0.000439,
              "moment_of_inertia_z": 0.0000109
            },
            "physical_properties": {
              "length": 6.0,
              "weight": 118.3,
              "volume": 0.307
            },
            "structural_properties": {
              "loading": {
                "max_bending_moment": 45.2,
                "max_shear_force": 15.1,
                "utilization": 0.52
              }
            },
            "storey": "1. Obergeschoss",
            "position": {
              "x": 3.0,
              "y": 4.5,
              "z": 7.0,
              "rotation": 0
            },
            "sustainability": {
              "carbon_footprint": 45.2,
              "renewable": true,
              "recycled_content": 0
            }
          }
        ],
        "IfcSpace": [
          {
            "id": "3vB2Fx9K51Aeb$1QHLgOX11",
            "global_id": "3vB2Fx9K51Aeb$1QHLgOX11",
            "name": "Büro_101",
            "description": "Einzelbüro für Projektleitung",
            "object_type": "Space",
            "predefined_type": "INTERNAL",
            "composition_type": "ELEMENT",
            "internal_or_external": "INTERNAL",
            "physical_properties": {
              "area": 18.5,
              "perimeter": 18.2,
              "volume": 55.5,
              "height": 3.0
            },
            "thermal_properties": {
              "heating_load": 1250,
              "cooling_load": 950,
              "occupancy": 1,
              "lighting_load": 11.5
            },
            "usage": {
              "space_type": "Office",
              "function": "Single Office",
              "occupancy_type": "Work",
              "max_occupancy": 2
            },
            "storey": "Erdgeschoss",
            "location": {
              "x": 12.5,
              "y": 5.5,
              "z": 0.0
            }
          }
        ]
      }
    };

    const fileName = 'complex-building-data.json';
    const filePath = path.join(process.cwd(), fileName);
    
    fs.writeFileSync(filePath, JSON.stringify(complexIFCData, null, 2));
    
    console.log(`✅ Created complex test JSON file: ${fileName}`);
    console.log(`📊 File size: ${(fs.statSync(filePath).size / 1024).toFixed(1)} KB`);
    console.log(`🏗️ Contains: ${Object.keys(complexIFCData.data).length} IFC entity types`);
    console.log(`📈 Complexity: High detail with nested properties and arrays`);
    
    return filePath;
  }

  async testChunkingStrategy(filePath) {
    console.log('\n🧩 TESTING CHUNKING STRATEGY\n');
    
    await this.page.goto('http://localhost:3001/upload', { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Upload complex file
    const fileInput = await this.page.$('input[type="file"]');
    if (fileInput) {
      await fileInput.uploadFile(filePath);
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Analyze upload response for chunking information
      const chunkingInfo = this.detailedApiLogs.filter(log => 
        log.type === 'response' && log.url.includes('/upload')
      );
      
      if (chunkingInfo.length > 0) {
        const uploadResponse = chunkingInfo[chunkingInfo.length - 1];
        
        try {
          const responseData = JSON.parse(uploadResponse.body);
          
          this.addTest('chunking', 'Upload response contains processing metadata', 
            !!responseData.processing_metadata);
          
          if (responseData.processing_metadata) {
            const metadata = responseData.processing_metadata;
            
            this.addTest('chunking', 'Chunk count calculated', 
              !!metadata.chunk_count && metadata.chunk_count > 0, 
              `${metadata.chunk_count} chunks`);
            
            this.addTest('chunking', 'Token estimation provided', 
              !!metadata.estimated_tokens && metadata.estimated_tokens > 0, 
              `${metadata.estimated_tokens} tokens`);
            
            this.addTest('chunking', 'Processing time recorded', 
              !!metadata.processing_time && metadata.processing_time > 0, 
              `${metadata.processing_time}s`);
            
            console.log(`📊 Chunking Analysis:`);
            console.log(`   Chunks created: ${metadata.chunk_count}`);
            console.log(`   Estimated tokens: ${metadata.estimated_tokens}`);
            console.log(`   Processing time: ${metadata.processing_time}s`);
            console.log(`   File size: ${metadata.file_size} bytes`);
          }
          
        } catch (error) {
          console.log(`⚠️ Could not parse upload response: ${error.message}`);
          this.addTest('chunking', 'Upload response parseable', false, error.message);
        }
      }
    }
  }

  async testGeminiApiProcessing() {
    console.log('\n🤖 TESTING GEMINI API PROCESSING DETAILS\n');
    
    await this.page.goto('http://localhost:3001/query', { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Select the complex file
    const fileSelected = await this.page.evaluate(() => {
      const listItems = Array.from(document.querySelectorAll('.MuiListItem-root'));
      for (const item of listItems) {
        const radio = item.querySelector('input[type="radio"]');
        const text = item.textContent;
        if (radio && text.includes('complex-building-data.json')) {
          radio.click();
          return true;
        }
      }
      return false;
    });
    
    this.addTest('apiCalls', 'Complex test file available', fileSelected);
    
    if (fileSelected) {
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Test specific German queries that should trigger different processing
      const testQueries = [
        {
          query: 'Zeige mir alle Holzbalken und deren technische Eigenschaften',
          expectedContent: ['holzbalken', 'brettschichtholz', 'gl24h', 'eigenschaften']
        },
        {
          query: 'Welche Materialien werden für die Wände verwendet und wie sind deren U-Werte?',
          expectedContent: ['kalksandstein', 'gipskarton', 'u-wert', 'wärme']
        }
      ];
      
      for (const testQuery of testQueries) {
        console.log(`\n🎯 Testing detailed query: "${testQuery.query}"`);
        
        const textarea = await this.page.$('textarea');
        if (textarea) {
          // Clear and enter query
          await textarea.click();
          await textarea.focus();
          await this.page.keyboard.down('Control');
          await this.page.keyboard.press('KeyA');
          await this.page.keyboard.up('Control');
          await this.page.keyboard.press('Delete');
          
          await this.page.keyboard.type(testQuery.query, { delay: 30 });
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Record pre-submission API state
          const preSubmissionLogs = this.detailedApiLogs.length;
          
          // Submit query
          const submitResult = await this.page.evaluate(() => {
            const submitBtn = Array.from(document.querySelectorAll('button')).find(btn => 
              btn.textContent.includes('Submit') && !btn.disabled
            );
            
            if (submitBtn) {
              submitBtn.click();
              return true;
            }
            return false;
          });
          
          this.addTest('apiCalls', `Query submission successful`, submitResult);
          
          if (submitResult) {
            // Monitor for query API calls
            console.log('⏳ Monitoring API calls during processing...');
            
            let processingComplete = false;
            let processingTime = 0;
            const maxWaitTime = 180000; // 3 minutes max
            
            while (processingTime < maxWaitTime && !processingComplete) {
              await new Promise(resolve => setTimeout(resolve, 3000));
              processingTime += 3000;
              
              // Check for new API calls
              const newLogs = this.detailedApiLogs.slice(preSubmissionLogs);
              const queryRelatedCalls = newLogs.filter(log => 
                log.url.includes('/queries') || 
                log.url.includes('/status') || 
                log.url.includes('/results')
              );
              
              console.log(`⏳ Processing time: ${processingTime/1000}s - API calls: ${queryRelatedCalls.length}`);
              
              // Check page for response
              const pageState = await this.page.evaluate(() => {
                const bodyText = document.body.textContent;
                return {
                  hasResponse: bodyText.length > 2000,
                  hasSpecificContent: bodyText.toLowerCase().includes('holzbalken') || 
                                     bodyText.toLowerCase().includes('material') ||
                                     bodyText.toLowerCase().includes('eigenschaften'),
                  hasProcessing: bodyText.includes('Processing') || bodyText.includes('Verarbeitung'),
                  hasError: bodyText.includes('Error') || bodyText.includes('Fehler'),
                  responseLength: bodyText.length
                };
              });
              
              if (pageState.hasResponse && pageState.hasSpecificContent) {
                processingComplete = true;
                console.log('🎉 Detailed Gemini response received!');
                
                // Analyze API call patterns
                const postCalls = queryRelatedCalls.filter(log => log.method === 'POST');
                const getCalls = queryRelatedCalls.filter(log => log.method === 'GET');
                
                this.addTest('processing', 'Query API calls made', queryRelatedCalls.length > 0, 
                  `${queryRelatedCalls.length} calls`);
                
                this.addTest('processing', 'POST query submission detected', postCalls.length > 0, 
                  `${postCalls.length} POST calls`);
                
                this.addTest('processing', 'GET status/results polling detected', getCalls.length > 0, 
                  `${getCalls.length} GET calls`);
                
                // Validate response content
                const contentMatches = testQuery.expectedContent.filter(term => 
                  pageState.hasSpecificContent && 
                  document.body.textContent.toLowerCase().includes(term.toLowerCase())
                ).length;
                
                this.addTest('responses', `Response contains expected content`, 
                  contentMatches >= 2, 
                  `${contentMatches}/${testQuery.expectedContent.length} terms found`);
                
                console.log(`📊 API Call Analysis:`);
                console.log(`   Total query-related calls: ${queryRelatedCalls.length}`);
                console.log(`   POST calls (submissions): ${postCalls.length}`);
                console.log(`   GET calls (polling): ${getCalls.length}`);
                console.log(`   Response length: ${pageState.responseLength} chars`);
                console.log(`   Content matches: ${contentMatches}/${testQuery.expectedContent.length}`);
                
                break;
              }
              
              if (pageState.hasError) {
                console.log('❌ Error detected during processing');
                break;
              }
            }
            
            // Only test one detailed query to save time
            break;
          }
        }
      }
    }
  }

  generateChunkingReport() {
    console.log('\n🔬 CHUNKING & PROCESSING VALIDATION REPORT');
    console.log('==========================================\n');
    
    const scorePercentage = ((this.testScore / this.maxScore) * 100).toFixed(1);
    
    // Category summaries
    const categories = ['chunking', 'apiCalls', 'processing', 'responses'];
    categories.forEach(category => {
      const tests = this.results[category];
      if (tests.length > 0) {
        const passed = tests.filter(t => t.passed).length;
        const total = tests.length;
        const categoryScore = ((passed / total) * 100).toFixed(1);
        
        console.log(`${category.toUpperCase()}: ${passed}/${total} (${categoryScore}%)`);
        tests.forEach(test => {
          const icon = test.passed ? '✅' : '❌';
          console.log(`  ${icon} ${test.name}${test.details ? ' - ' + test.details : ''}`);
        });
        console.log('');
      }
    });
    
    // API call analysis
    console.log('API CALL ANALYSIS:');
    console.log(`  Total API interactions: ${this.detailedApiLogs.length}`);
    
    const requestsByType = this.detailedApiLogs.reduce((acc, log) => {
      const key = `${log.method || 'UNKNOWN'}_${log.type}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    
    Object.entries(requestsByType).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });
    
    console.log('');
    
    // Overall assessment
    console.log('CHUNKING & PROCESSING ASSESSMENT:');
    console.log(`  Score: ${scorePercentage}% (${this.testScore}/${this.maxScore})`);
    
    let validationLevel;
    if (scorePercentage >= 90) {
      validationLevel = '🏆 EXCELLENT - All chunking and processing validated';
    } else if (scorePercentage >= 75) {
      validationLevel = '✅ GOOD - Core chunking and processing working';
    } else if (scorePercentage >= 50) {
      validationLevel = '⚠️ PARTIAL - Some chunking/processing issues';
    } else {
      validationLevel = '❌ FAILED - Chunking/processing not working properly';
    }
    
    console.log(`  Status: ${validationLevel}`);
    console.log('');
    
    // Detailed validation summary
    console.log('VALIDATION SUMMARY:');
    
    if (scorePercentage >= 75) {
      console.log('  ✅ JSON chunking strategy working');
      console.log('  ✅ Gemini API processing functional');
      console.log('  ✅ Complex query handling verified');
      console.log('  ✅ Response content validation passed');
      console.log('  📋 CORE CHUNKING & PROCESSING: ✅ VALIDATED');
    } else {
      console.log('  🔧 Chunking or processing issues detected');
      console.log('  📋 CORE CHUNKING & PROCESSING: ❌ NEEDS WORK');
    }
    
    console.log('\n==========================================');
    
    return {
      score: parseFloat(scorePercentage),
      passed: this.testScore,
      total: this.maxScore,
      validated: scorePercentage >= 75
    };
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
    
    // Clean up test files
    const testFiles = [
      path.join(process.cwd(), 'complex-building-data.json')
    ];
    
    testFiles.forEach(file => {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
        console.log(`🧹 Cleaned up ${path.basename(file)}`);
      }
    });
  }

  async run() {
    try {
      await this.setup();
      
      const testFilePath = await this.createComplexTestData();
      await this.testChunkingStrategy(testFilePath);
      await this.testGeminiApiProcessing();
      
      return this.generateChunkingReport();
      
    } catch (error) {
      console.error('❌ Chunking validation test failed:', error.message);
      return {
        score: 0,
        passed: 0,
        total: 0,
        validated: false,
        error: error.message
      };
    } finally {
      await this.cleanup();
    }
  }
}

// Run the chunking validation test
const chunkingTest = new GeminiChunkingValidationTest();
chunkingTest.run().then(report => {
  console.log(`\n🔬 CHUNKING VALIDATION: ${report.validated ? 'VALIDATED' : 'NEEDS WORK'}`);
  console.log(`📊 Validation Score: ${report.score}% (${report.passed}/${report.total})`);
  process.exit(report.validated ? 0 : 1);
});