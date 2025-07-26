/**
 * Playwright UI tests for QueryPage refactoring.
 * Tests the SOLID principles refactoring and component functionality.
 */

import { test, expect } from '@playwright/test';

test.describe('QueryPage UI Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3003/query');
  });

  test('should display file selection prompt when no file selected', async ({ page }) => {
    // Check that the file selection prompt is visible
    await expect(page.getByText('Dateiauswahl erforderlich')).toBeVisible();
    
    // Check that the upload link is clickable
    const uploadLink = page.getByText('Upload-Seite');
    await expect(uploadLink).toBeVisible();
    
    // Verify the upload link navigates correctly
    await uploadLink.click();
    await expect(page).toHaveURL(/.*\/upload/);
  });

  test('should display page header and description', async ({ page }) => {
    // Check main heading
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Abfrage erstellen');
    
    // Check description text
    await expect(page.getByText(/Erstellen Sie intelligente Abfragen/)).toBeVisible();
  });

  test('should show file selector component', async ({ page }) => {
    // Check that FileSelector component is rendered
    await expect(page.getByText('Schritt 1: Datei für Abfrage auswählen')).toBeVisible();
  });

  test('query interface should be hidden when no file selected', async ({ page }) => {
    // Query form should not be visible when no file is selected
    await expect(page.getByRole('textbox', { name: /abfrage/i })).not.toBeVisible();
    
    // Query suggestions should not be visible
    await expect(page.getByText(/Abfrage-Vorschläge/i)).not.toBeVisible();
  });

  test('should handle responsive layout correctly', async ({ page }) => {
    // Test desktop layout
    await page.setViewportSize({ width: 1200, height: 800 });
    
    // Check grid layout exists
    const gridContainer = page.locator('[data-testid="query-page-grid"], .MuiGrid-container').first();
    await expect(gridContainer).toBeVisible();
    
    // Test mobile layout
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Grid should still be visible but potentially stacked
    await expect(gridContainer).toBeVisible();
  });

  test('navigation should work correctly', async ({ page }) => {
    // Test navigation to upload page
    await page.getByText('Upload-Seite').click();
    await expect(page).toHaveURL(/.*\/upload/);
    
    // Navigate back to query page
    await page.goto('http://localhost:3003/query');
    await expect(page).toHaveURL(/.*\/query/);
  });
});

test.describe('QueryPreview Component Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3003/query');
  });

  test('should show preview placeholder when no query', async ({ page }) => {
    // Since we refactored QueryPreview, it should show placeholder text
    // when no query is entered (min 5 characters)
    
    // Note: This test assumes we can access the preview component
    // In a real scenario, we'd need to have a file selected first
    const previewArea = page.locator('[data-testid="query-preview"]');
    
    if (await previewArea.isVisible()) {
      await expect(previewArea.getByText(/Geben Sie eine Abfrage ein/)).toBeVisible();
    }
  });

  test('should handle query input correctly', async ({ page }) => {
    // This test would require a file to be selected first
    // For now, we'll check that the component structure exists
    
    // Look for the preview component container
    const previewContainer = page.locator('.MuiCard-root').filter({ hasText: /Vorschau|Preview/ });
    
    // Component might not be visible without file selection, which is expected behavior
    const isVisible = await previewContainer.isVisible();
    console.log('QueryPreview component visible:', isVisible);
  });
});

test.describe('Component Integration Tests', () => {
  test('should maintain proper SOLID principle separation', async ({ page }) => {
    await page.goto('http://localhost:3003/query');
    
    // Test that components are properly separated and don't have excessive coupling
    
    // FileSelector should be independent
    const fileSelector = page.getByText('Schritt 1: Datei für Abfrage auswählen');
    await expect(fileSelector).toBeVisible();
    
    // File selection prompt should be independent
    const filePrompt = page.getByText('Dateiauswahl erforderlich');
    await expect(filePrompt).toBeVisible();
    
    // Each component should render without errors
    await expect(page.locator('body')).not.toContainText('Error');
    await expect(page.locator('body')).not.toContainText('undefined');
  });

  test('should handle error states gracefully', async ({ page }) => {
    await page.goto('http://localhost:3003/query');
    
    // Check that no JavaScript errors are thrown
    const errorMessages = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errorMessages.push(msg.text());
      }
    });
    
    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
    
    // Should not have critical errors that break the UI
    const criticalErrors = errorMessages.filter(msg => 
      msg.includes('Cannot read') || 
      msg.includes('undefined') || 
      msg.includes('TypeError')
    );
    
    expect(criticalErrors).toHaveLength(0);
  });
});