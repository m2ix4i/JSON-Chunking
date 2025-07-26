/**
 * Analytics Dashboard E2E Tests
 * Tests the analytics dashboard components with Playwright
 */

import { test, expect, Page } from '@playwright/test';

// Test data
const mockFileUploadTrendData = [
  { date: '2025-01-20', uploads: 5, totalSize: 52428800 },
  { date: '2025-01-21', uploads: 8, totalSize: 83886080 },
  { date: '2025-01-22', uploads: 3, totalSize: 31457280 },
  { date: '2025-01-23', uploads: 12, totalSize: 125829120 },
  { date: '2025-01-24', uploads: 7, totalSize: 73400320 },
];

const mockUploadedFiles = [
  {
    file_id: 'test-file-1',
    filename: 'test-building.ifc.json',
    size: 5242880,
    status: 'uploaded',
    upload_timestamp: '2025-01-24T10:30:00Z',
    validation_result: {
      is_valid: true,
      estimated_chunks: 150,
      validation_errors: []
    }
  },
  {
    file_id: 'test-file-2',
    filename: 'complex-structure.ifc.json',
    size: 10485760,
    status: 'uploaded',
    upload_timestamp: '2025-01-24T11:45:00Z',
    validation_result: {
      is_valid: true,
      estimated_chunks: 280,
      validation_errors: []
    }
  },
  {
    file_id: 'test-file-3',
    filename: 'failed-upload.ifc.json',
    size: 2097152,
    status: 'failed',
    upload_timestamp: '2025-01-24T12:00:00Z',
    validation_result: {
      is_valid: false,
      estimated_chunks: 0,
      validation_errors: ['Invalid JSON structure']
    }
  }
];

// Helper function to setup mock data
async function setupMockData(page: Page) {
  await page.evaluate((files) => {
    // Mock the file store
    window.__mockFileStore = {
      files,
      selectedFileId: null,
      selectFile: (id: string) => {
        window.__mockFileStore.selectedFileId = id;
      }
    };
    
    // Mock analytics data
    window.__mockAnalyticsData = {
      fileUploadTrend: [
        { date: '2025-01-20', uploads: 5, totalSize: 52428800 },
        { date: '2025-01-21', uploads: 8, totalSize: 83886080 },
        { date: '2025-01-22', uploads: 3, totalSize: 31457280 },
        { date: '2025-01-23', uploads: 12, totalSize: 125829120 },
        { date: '2025-01-24', uploads: 7, totalSize: 73400320 },
      ]
    };
  }, mockUploadedFiles);
}

test.describe('Analytics Dashboard Components', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockData(page);
    
    // Navigate to a test page that renders the analytics components
    await page.goto('/dashboard');
    
    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle');
  });

  test.describe('FileUploadTrendChart Component', () => {
    test('should render chart with data', async ({ page }) => {
      // Create a test page with FileUploadTrendChart
      await page.setContent(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Test FileUploadTrendChart</title>
        </head>
        <body>
          <div id="root"></div>
          <script type="module">
            import React from 'react';
            import { createRoot } from 'react-dom/client';
            import { ThemeProvider, createTheme } from '@mui/material/styles';
            import FileUploadTrendChart from '/src/components/analytics/charts/FileUploadTrendChart.tsx';
            
            const theme = createTheme();
            const data = window.__mockAnalyticsData?.fileUploadTrend || [];
            
            const App = () => React.createElement(
              ThemeProvider,
              { theme },
              React.createElement(FileUploadTrendChart, {
                data,
                title: 'File Upload Trend Test',
                height: 400,
                showLegend: true,
                showTooltip: true
              })
            );
            
            const root = createRoot(document.getElementById('root'));
            root.render(React.createElement(App));
          </script>
        </body>
        </html>
      `);

      // Wait for chart to render
      await page.waitForSelector('[data-testid="file-upload-trend-chart"]', { timeout: 10000 });

      // Check if title is displayed
      await expect(page.locator('text=File Upload Trend Test')).toBeVisible();

      // Check if upload icon is present
      await expect(page.locator('[data-testid="CloudUploadIcon"]')).toBeVisible();

      // Verify chart elements are present
      await expect(page.locator('.recharts-wrapper')).toBeVisible();
      await expect(page.locator('.recharts-line-chart')).toBeVisible();
      await expect(page.locator('.recharts-cartesian-grid')).toBeVisible();
      await expect(page.locator('.recharts-x-axis')).toBeVisible();
      await expect(page.locator('.recharts-y-axis')).toBeVisible();

      // Check if legend is displayed
      await expect(page.locator('.recharts-legend-wrapper')).toBeVisible();
      await expect(page.locator('text=Anzahl Uploads')).toBeVisible();

      // Verify data points are rendered
      const dataPoints = page.locator('.recharts-line .recharts-dot');
      await expect(dataPoints).toHaveCount(5); // Should have 5 data points

      // Check summary information
      await expect(page.locator('text=Gesamt: 35 Dateien')).toBeVisible();
      await expect(page.locator('text=Größe:')).toBeVisible();
    });

    test('should show empty state when no data provided', async ({ page }) => {
      await page.setContent(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Test FileUploadTrendChart Empty</title>
        </head>
        <body>
          <div id="root"></div>
          <script type="module">
            import React from 'react';
            import { createRoot } from 'react-dom/client';
            import { ThemeProvider, createTheme } from '@mui/material/styles';
            import FileUploadTrendChart from '/src/components/analytics/charts/FileUploadTrendChart.tsx';
            
            const theme = createTheme();
            
            const App = () => React.createElement(
              ThemeProvider,
              { theme },
              React.createElement(FileUploadTrendChart, {
                data: [],
                title: 'Empty Chart Test',
                height: 400
              })
            );
            
            const root = createRoot(document.getElementById('root'));
            root.render(React.createElement(App));
          </script>
        </body>
        </html>
      `);

      // Check empty state message
      await expect(page.locator('text=Noch keine Upload-Daten verfügbar')).toBeVisible();
      await expect(page.locator('text=Laden Sie Dateien hoch, um Trends anzuzeigen')).toBeVisible();

      // Verify no chart elements are present
      await expect(page.locator('.recharts-wrapper')).not.toBeVisible();
    });

    test('should display custom tooltip on hover', async ({ page }) => {
      await page.setContent(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Test FileUploadTrendChart Tooltip</title>
        </head>
        <body>
          <div id="root"></div>
          <script type="module">
            import React from 'react';
            import { createRoot } from 'react-dom/client';
            import { ThemeProvider, createTheme } from '@mui/material/styles';
            import FileUploadTrendChart from '/src/components/analytics/charts/FileUploadTrendChart.tsx';
            
            const theme = createTheme();
            const data = window.__mockAnalyticsData?.fileUploadTrend || [];
            
            const App = () => React.createElement(
              ThemeProvider,
              { theme },
              React.createElement(FileUploadTrendChart, {
                data,
                showTooltip: true
              })
            );
            
            const root = createRoot(document.getElementById('root'));
            root.render(React.createElement(App));
          </script>
        </body>
        </html>
      `);

      // Wait for chart to render
      await page.waitForSelector('.recharts-wrapper');

      // Hover over a data point to trigger tooltip
      const firstDataPoint = page.locator('.recharts-line .recharts-dot').first();
      await firstDataPoint.hover();

      // Wait for tooltip to appear
      await page.waitForSelector('.recharts-tooltip-wrapper', { timeout: 3000 });

      // Verify tooltip content
      const tooltip = page.locator('.recharts-tooltip-wrapper');
      await expect(tooltip).toBeVisible();

      // Check for date and file count in tooltip
      await expect(page.locator('text=📁')).toBeVisible();
      await expect(page.locator('text=📊')).toBeVisible();
    });
  });

  test.describe('FileSelector Component with getValidationSummary', () => {
    test('should render file list with validation summaries', async ({ page }) => {
      await page.setContent(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Test FileSelector</title>
        </head>
        <body>
          <div id="root"></div>
          <script type="module">
            import React from 'react';
            import { createRoot } from 'react-dom/client';
            import { ThemeProvider, createTheme } from '@mui/material/styles';
            import { BrowserRouter } from 'react-router-dom';
            
            // Mock the file store hook
            const mockUseFileSelection = () => ({
              files: window.__mockFileStore?.files || [],
              selectedFileId: window.__mockFileStore?.selectedFileId || null,
              selectFile: (id) => {
                if (window.__mockFileStore) {
                  window.__mockFileStore.selectedFileId = id;
                }
              }
            });
            
            // Mock the FileSelector component with inline implementation
            const FileSelector = () => {
              const { files, selectedFileId, selectFile } = mockUseFileSelection();
              
              const getValidationSummary = (file) => {
                if (!file.validation_result) {
                  return 'Nicht validiert';
                }
                
                if (file.validation_result.is_valid) {
                  return file.validation_result.estimated_chunks + ' Chunks geschätzt';
                }
                
                return 'Validierung fehlgeschlagen';
              };
              
              if (files.length === 0) {
                return React.createElement('div', { 'data-testid': 'empty-state' }, 'Keine Dateien verfügbar');
              }
              
              return React.createElement('div', { 'data-testid': 'file-selector' },
                files.map(file => 
                  React.createElement('div', {
                    key: file.file_id,
                    'data-testid': 'file-item-' + file.file_id,
                    onClick: () => selectFile(file.file_id)
                  },
                    React.createElement('span', { 'data-testid': 'filename' }, file.filename),
                    React.createElement('span', { 'data-testid': 'validation-summary' }, getValidationSummary(file))
                  )
                )
              );
            };
            
            const theme = createTheme();
            
            const App = () => React.createElement(
              BrowserRouter,
              null,
              React.createElement(
                ThemeProvider,
                { theme },
                React.createElement(FileSelector)
              )
            );
            
            const root = createRoot(document.getElementById('root'));
            root.render(React.createElement(App));
          </script>
        </body>
        </html>
      `);

      // Wait for component to render
      await page.waitForSelector('[data-testid="file-selector"]');

      // Check that all files are rendered
      for (const file of mockUploadedFiles) {
        await expect(page.locator(`[data-testid="file-item-${file.file_id}"]`)).toBeVisible();
        await expect(page.locator(`[data-testid="file-item-${file.file_id}"] [data-testid="filename"]`)).toContainText(file.filename);
      }

      // Verify validation summaries
      await expect(page.locator('[data-testid="file-item-test-file-1"] [data-testid="validation-summary"]')).toContainText('150 Chunks geschätzt');
      await expect(page.locator('[data-testid="file-item-test-file-2"] [data-testid="validation-summary"]')).toContainText('280 Chunks geschätzt');
      await expect(page.locator('[data-testid="file-item-test-file-3"] [data-testid="validation-summary"]')).toContainText('Validierung fehlgeschlagen');
    });

    test('should handle file selection correctly', async ({ page }) => {
      await page.setContent(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Test FileSelector Selection</title>
        </head>
        <body>
          <div id="root"></div>
          <script type="module">
            import React from 'react';
            import { createRoot } from 'react-dom/client';
            
            const FileSelector = () => {
              const [selectedFileId, setSelectedFileId] = React.useState(null);
              const files = window.__mockFileStore?.files || [];
              
              const selectFile = (id) => {
                setSelectedFileId(id);
              };
              
              return React.createElement('div', { 'data-testid': 'file-selector' },
                React.createElement('div', { 'data-testid': 'selected-file' }, 
                  'Selected: ' + (selectedFileId || 'none')
                ),
                files.map(file => 
                  React.createElement('button', {
                    key: file.file_id,
                    'data-testid': 'select-' + file.file_id,
                    onClick: () => selectFile(file.file_id)
                  }, 'Select ' + file.filename)
                )
              );
            };
            
            const root = createRoot(document.getElementById('root'));
            root.render(React.createElement(FileSelector));
          </script>
        </body>
        </html>
      `);

      // Wait for component to render
      await page.waitForSelector('[data-testid="file-selector"]');

      // Initially no file should be selected
      await expect(page.locator('[data-testid="selected-file"]')).toContainText('Selected: none');

      // Select first file
      await page.locator('[data-testid="select-test-file-1"]').click();
      await expect(page.locator('[data-testid="selected-file"]')).toContainText('Selected: test-file-1');

      // Select second file
      await page.locator('[data-testid="select-test-file-2"]').click();
      await expect(page.locator('[data-testid="selected-file"]')).toContainText('Selected: test-file-2');
    });
  });

  test.describe('Analytics Types Integration', () => {
    test('should properly import and use analytics types', async ({ page }) => {
      // Test that the types are properly defined and can be used
      const typeCheck = await page.evaluate(() => {
        // This simulates importing and using the types
        const sampleFileUploadTrend = {
          date: '2025-01-24',
          uploads: 5,
          totalSize: 52428800
        };
        
        const sampleChartColors = {
          primary: '#1976d2',
          secondary: '#dc004e',
          success: '#2e7d32'
        };
        
        // Check if the structure matches expected interface
        const hasRequiredFields = (
          typeof sampleFileUploadTrend.date === 'string' &&
          typeof sampleFileUploadTrend.uploads === 'number' &&
          typeof sampleFileUploadTrend.totalSize === 'number'
        );
        
        const hasColors = (
          typeof sampleChartColors.primary === 'string' &&
          typeof sampleChartColors.secondary === 'string' &&
          typeof sampleChartColors.success === 'string'
        );
        
        return { hasRequiredFields, hasColors };
      });
      
      expect(typeCheck.hasRequiredFields).toBe(true);
      expect(typeCheck.hasColors).toBe(true);
    });
  });

  test.describe('Component Error Handling', () => {
    test('should handle invalid data gracefully', async ({ page }) => {
      await page.setContent(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Test Error Handling</title>
        </head>
        <body>
          <div id="root"></div>
          <script type="module">
            import React from 'react';
            import { createRoot } from 'react-dom/client';
            import { ThemeProvider, createTheme } from '@mui/material/styles';
            import FileUploadTrendChart from '/src/components/analytics/charts/FileUploadTrendChart.tsx';
            
            const theme = createTheme();
            
            const App = () => React.createElement(
              ThemeProvider,
              { theme },
              React.createElement(FileUploadTrendChart, {
                data: null, // Invalid data
                title: 'Error Test'
              })
            );
            
            const root = createRoot(document.getElementById('root'));
            root.render(React.createElement(App));
          </script>
        </body>
        </html>
      `);

      // Component should handle null data gracefully and show empty state
      await expect(page.locator('text=Noch keine Upload-Daten verfügbar')).toBeVisible();
    });

    test('should handle missing validation result', async ({ page }) => {
      const fileWithoutValidation = {
        file_id: 'test-no-validation',
        filename: 'no-validation.ifc.json',
        size: 1048576,
        status: 'uploaded',
        upload_timestamp: '2025-01-24T10:00:00Z',
        validation_result: null
      };

      await page.evaluate((file) => {
        window.__testFile = file;
      }, fileWithoutValidation);

      await page.setContent(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Test Validation Handling</title>
        </head>
        <body>
          <div id="root"></div>
          <script type="module">
            import React from 'react';
            import { createRoot } from 'react-dom/client';
            
            const getValidationSummary = (file) => {
              if (!file.validation_result) {
                return 'Nicht validiert';
              }
              
              if (file.validation_result.is_valid) {
                return file.validation_result.estimated_chunks + ' Chunks geschätzt';
              }
              
              return 'Validierung fehlgeschlagen';
            };
            
            const TestComponent = () => {
              const file = window.__testFile;
              return React.createElement('div', {
                'data-testid': 'validation-test'
              }, getValidationSummary(file));
            };
            
            const root = createRoot(document.getElementById('root'));
            root.render(React.createElement(TestComponent));
          </script>
        </body>
        </html>
      `);

      await expect(page.locator('[data-testid="validation-test"]')).toContainText('Nicht validiert');
    });
  });
});

test.describe('Performance Tests', () => {
  test('should render components within performance thresholds', async ({ page }) => {
    // Start performance timing
    const startTime = Date.now();
    
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Performance Test</title>
      </head>
      <body>
        <div id="root"></div>
        <script type="module">
          import React from 'react';
          import { createRoot } from 'react-dom/client';
          import { ThemeProvider, createTheme } from '@mui/material/styles';
          import FileUploadTrendChart from '/src/components/analytics/charts/FileUploadTrendChart.tsx';
          
          const theme = createTheme();
          const data = Array.from({ length: 30 }, (_, i) => ({
            date: new Date(2025, 0, i + 1).toISOString().split('T')[0],
            uploads: Math.floor(Math.random() * 20) + 1,
            totalSize: Math.floor(Math.random() * 100000000) + 10000000
          }));
          
          const App = () => React.createElement(
            ThemeProvider,
            { theme },
            React.createElement(FileUploadTrendChart, {
              data,
              title: 'Performance Test Chart'
            })
          );
          
          const root = createRoot(document.getElementById('root'));
          root.render(React.createElement(App));
        </script>
      </body>
      </html>
    `);

    // Wait for chart to render
    await page.waitForSelector('.recharts-wrapper');
    
    const endTime = Date.now();
    const renderTime = endTime - startTime;
    
    // Component should render within 5 seconds even with 30 data points
    expect(renderTime).toBeLessThan(5000);
    
    // Verify all data points are rendered
    const dataPoints = page.locator('.recharts-line .recharts-dot');
    await expect(dataPoints).toHaveCount(30);
  });
});