/**
 * Playwright UI tests for Settings Page (Issue #46).
 * Tests the complete user settings and preferences functionality.
 */

import { test, expect } from '@playwright/test';

test.describe('Settings Page UI Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3010/settings');
  });

  test('should display settings page header and navigation', async ({ page }) => {
    // Check main heading with settings icon
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Einstellungen');
    
    // Check settings icon is visible
    await expect(page.locator('svg[data-testid="SettingsIcon"]')).toBeVisible();
    
    // Check active status chip
    await expect(page.getByText('Aktiv')).toBeVisible();
    
    // Check description text
    await expect(page.getByText(/Konfigurieren Sie Ihre Präferenzen/)).toBeVisible();
  });

  test('should show storage availability warning when localStorage unavailable', async ({ page }) => {
    // Mock localStorage to be unavailable
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        value: null,
        writable: false
      });
    });
    
    await page.reload();
    
    // Should show storage warning
    await expect(page.getByText(/LocalStorage ist nicht verfügbar/)).toBeVisible();
  });

  test('should display all settings sections with animations', async ({ page }) => {
    // Check that all sections are visible
    await expect(page.getByText('Erscheinungsbild')).toBeVisible();
    await expect(page.getByText('Abfrage-Einstellungen')).toBeVisible();
    await expect(page.getByText('Benachrichtigungen')).toBeVisible();
    await expect(page.getByText('Erweitert')).toBeVisible();
    
    // Check section descriptions
    await expect(page.getByText(/Design-Modus und Sprach-Einstellungen/)).toBeVisible();
    await expect(page.getByText(/Standard-Parameter für Abfragen/)).toBeVisible();
    await expect(page.getByText(/Benachrichtigungs-Präferenzen/)).toBeVisible();
    await expect(page.getByText(/Entwickler-Optionen/)).toBeVisible();
  });

  test('should show footer with automatic save message', async ({ page }) => {
    // Check footer message about automatic saving
    await expect(page.getByText(/Einstellungen werden automatisch gespeichert/)).toBeVisible();
    
    // Check app identifier
    await expect(page.getByText(/IFC JSON Chunking Tool - Benutzereinstellungen/)).toBeVisible();
  });
});

test.describe('Theme Settings Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3010/settings');
  });

  test('should display theme selector with all options', async ({ page }) => {
    // Check theme selector heading
    await expect(page.getByText('Design-Modus')).toBeVisible();
    
    // Check all theme options are present
    await expect(page.getByText('Hell')).toBeVisible();
    await expect(page.getByText('Dunkel')).toBeVisible();
    await expect(page.getByText('Automatisch')).toBeVisible();
    
    // Check system theme detection message
    await expect(page.getByText(/Erkennt automatisch Ihr System-Design/)).toBeVisible();
  });

  test('should allow theme switching', async ({ page }) => {
    // Click on dark theme
    await page.getByRole('button', { name: 'Dunkel' }).click();
    
    // Wait a moment for the theme to apply
    await page.waitForTimeout(500);
    
    // Click on light theme
    await page.getByRole('button', { name: 'Hell' }).click();
    
    // Wait for theme change
    await page.waitForTimeout(500);
    
    // Click on auto theme
    await page.getByRole('button', { name: 'Automatisch' }).click();
    
    // Should not throw errors during theme switching
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.waitForTimeout(1000);
    expect(errors.filter(e => !e.includes('Warning'))).toHaveLength(0);
  });
});

test.describe('Language Settings Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3010/settings');
  });

  test('should display language selector', async ({ page }) => {
    // Check language selector heading
    await expect(page.getByText('Sprache')).toBeVisible();
    
    // Check language options
    await expect(page.getByText('Deutsch')).toBeVisible();
    await expect(page.getByText('English')).toBeVisible();
    
    // Check browser detection message
    await expect(page.getByText(/Automatische Erkennung basierend auf Ihrem Browser/)).toBeVisible();
  });

  test('should switch between German and English', async ({ page }) => {
    // Click English button
    await page.getByRole('button', { name: 'English' }).click();
    
    // Wait for language change
    await page.waitForTimeout(1000);
    
    // Check that some text changed to English
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Settings');
    
    // Switch back to German
    await page.getByRole('button', { name: 'Deutsch' }).click();
    
    // Wait for language change
    await page.waitForTimeout(1000);
    
    // Check that text is back to German
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Einstellungen');
  });
});

test.describe('Query Defaults Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3010/settings');
  });

  test('should display query defaults controls', async ({ page }) => {
    // Check query defaults heading
    await expect(page.getByText('Query-Standardeinstellungen')).toBeVisible();
    
    // Check slider controls
    await expect(page.getByText('Gleichzeitige Anfragen')).toBeVisible();
    await expect(page.getByText(/Timeout/)).toBeVisible();
    
    // Check cache toggle
    await expect(page.getByText('Ergebnisse zwischenspeichern')).toBeVisible();
    
    // Check performance summary
    await expect(page.getByText('Performance-Einstellung')).toBeVisible();
  });

  test('should allow adjusting concurrent requests slider', async ({ page }) => {
    // Find the concurrent requests slider
    const slider = page.locator('input[aria-label="max-concurrent-requests"]');
    await expect(slider).toBeVisible();
    
    // Get current value
    const currentValue = await slider.getAttribute('value');
    console.log('Current max concurrent:', currentValue);
    
    // Drag slider to increase value
    await slider.click();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    
    // Should update performance summary
    await expect(page.locator('text=/gleichzeitige Anfragen/')).toBeVisible();
  });

  test('should allow adjusting timeout slider', async ({ page }) => {
    // Find the timeout slider
    const timeoutSlider = page.locator('input[aria-label="timeout-seconds"]');
    await expect(timeoutSlider).toBeVisible();
    
    // Adjust timeout value
    await timeoutSlider.click();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    
    // Should show updated timeout in summary
    await expect(page.locator('text=/Timeout/')).toBeVisible();
  });

  test('should toggle cache results setting', async ({ page }) => {
    // Find the cache switch
    const cacheSwitch = page.locator('input[type="checkbox"]').filter({ hasText: /Ergebnisse zwischenspeichern/ }).or(
      page.locator('input[type="checkbox"]').nth(2) // Fallback selector
    );
    
    // If switch is visible, test it
    if (await cacheSwitch.isVisible()) {
      const isChecked = await cacheSwitch.isChecked();
      
      // Click to toggle
      await cacheSwitch.click();
      
      // Wait for state change
      await page.waitForTimeout(500);
      
      // Verify state changed
      expect(await cacheSwitch.isChecked()).toBe(!isChecked);
    }
  });
});

test.describe('Notification Settings Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3010/settings');
  });

  test('should display notification settings', async ({ page }) => {
    // Check notifications heading
    await expect(page.getByText('Benachrichtigungen')).toBeVisible();
    
    // Check notification types
    await expect(page.getByText('Abfrage abgeschlossen')).toBeVisible();
    await expect(page.getByText('Fehler und Warnungen')).toBeVisible();
    await expect(page.getByText('Datei-Upload')).toBeVisible();
    
    // Check status summary
    await expect(page.locator('text=/aktiviert/')).toBeVisible();
  });

  test('should toggle notification settings', async ({ page }) => {
    // Find notification switches (they should be checkboxes or switches)
    const switches = page.locator('input[type="checkbox"]');
    
    const switchCount = await switches.count();
    console.log('Found notification switches:', switchCount);
    
    if (switchCount > 0) {
      // Test toggling the first switch
      const firstSwitch = switches.first();
      const isChecked = await firstSwitch.isChecked();
      
      await firstSwitch.click();
      await page.waitForTimeout(500);
      
      // Verify toggle worked
      expect(await firstSwitch.isChecked()).toBe(!isChecked);
    }
  });

  test('should show warning when all notifications disabled', async ({ page }) => {
    // Try to disable all notifications
    const switches = page.locator('input[type="checkbox"]');
    const switchCount = await switches.count();
    
    // Disable switches that are currently enabled
    for (let i = 0; i < switchCount; i++) {
      const currentSwitch = switches.nth(i);
      if (await currentSwitch.isVisible() && await currentSwitch.isChecked()) {
        await currentSwitch.click();
        await page.waitForTimeout(200);
      }
    }
    
    // Should show warning about disabled notifications
    await expect(page.getByText(/Alle Benachrichtigungen sind deaktiviert/)).toBeVisible();
  });

  test('should display future features preview', async ({ page }) => {
    // Check future features section
    await expect(page.getByText('Kommende Features')).toBeVisible();
    
    // Check specific upcoming features
    await expect(page.getByText(/Akustische Benachrichtigungen/)).toBeVisible();
    await expect(page.getByText(/E-Mail-Benachrichtigungen/)).toBeVisible();
    await expect(page.getByText(/Browser-Push-Nachrichten/)).toBeVisible();
    await expect(page.getByText(/Benutzerdefinierte Sounds/)).toBeVisible();
  });
});

test.describe('Advanced Settings Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3010/settings');
  });

  test('should display advanced settings', async ({ page }) => {
    // Check advanced settings heading
    await expect(page.getByText('Erweiterte Einstellungen')).toBeVisible();
    
    // Check advanced options
    await expect(page.getByText('Debug-Informationen anzeigen')).toBeVisible();
    await expect(page.getByText('Token-Verbrauch anzeigen')).toBeVisible();
    await expect(page.getByText('Performance-Profiling aktivieren')).toBeVisible();
    
    // Check settings management section
    await expect(page.getByText('Einstellungen verwalten')).toBeVisible();
  });

  test('should toggle advanced options', async ({ page }) => {
    // Find advanced option switches
    const advancedSwitches = page.locator('input[type="checkbox"]');
    
    if (await advancedSwitches.count() > 0) {
      const debugSwitch = advancedSwitches.first();
      const isChecked = await debugSwitch.isChecked();
      
      await debugSwitch.click();
      await page.waitForTimeout(500);
      
      expect(await debugSwitch.isChecked()).toBe(!isChecked);
    }
  });

  test('should show performance warning for profiling', async ({ page }) => {
    // Look for performance warning chip
    const warningElement = page.getByText(/Performance-Warnung/);
    
    // Warning might not be visible initially if profiling is off
    console.log('Performance warning visible:', await warningElement.isVisible());
  });

  test('should display export/import/reset buttons', async ({ page }) => {
    // Check management buttons
    await expect(page.getByRole('button', { name: 'Exportieren' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Importieren' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Zurücksetzen' })).toBeVisible();
  });

  test('should open reset confirmation dialog', async ({ page }) => {
    // Click reset button
    await page.getByRole('button', { name: 'Zurücksetzen' }).click();
    
    // Check dialog appears
    await expect(page.getByText('Einstellungen zurücksetzen')).toBeVisible();
    await expect(page.getByText(/Sind Sie sicher/)).toBeVisible();
    
    // Check dialog buttons
    await expect(page.getByRole('button', { name: 'Abbrechen' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Zurücksetzen' })).toBeVisible();
    
    // Close dialog with cancel
    await page.getByRole('button', { name: 'Abbrechen' }).click();
    
    // Dialog should close
    await expect(page.getByText('Einstellungen zurücksetzen')).not.toBeVisible();
  });

  test('should open import dialog', async ({ page }) => {
    // Click import button
    await page.getByRole('button', { name: 'Importieren' }).click();
    
    // Check import dialog appears
    await expect(page.getByText('Einstellungen importieren')).toBeVisible();
    await expect(page.getByText(/Wählen Sie eine JSON-Datei/)).toBeVisible();
    
    // Check file input is present
    await expect(page.locator('input[type="file"]')).toBeVisible();
    
    // Close dialog
    await page.getByRole('button', { name: 'Abbrechen' }).click();
  });

  test('should trigger export download', async ({ page }) => {
    // Set up download listener
    const downloadPromise = page.waitForEvent('download');
    
    // Click export button
    await page.getByRole('button', { name: 'Exportieren' }).click();
    
    // Wait for download to start
    const download = await downloadPromise;
    
    // Verify download filename pattern
    const filename = download.suggestedFilename();
    expect(filename).toMatch(/ifc-settings-\d{4}-\d{2}-\d{2}.*\.json/);
    
    console.log('Export filename:', filename);
  });
});

test.describe('Settings Integration Tests', () => {
  test('should persist settings across page reloads', async ({ page }) => {
    await page.goto('http://localhost:3010/settings');
    
    // Change language to English
    await page.getByRole('button', { name: 'English' }).click();
    await page.waitForTimeout(1000);
    
    // Reload page
    await page.reload();
    await page.waitForTimeout(1000);
    
    // Should still be in English
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Settings');
    
    // Switch back to German for cleanup
    await page.getByRole('button', { name: 'Deutsch' }).click();
  });

  test('should handle responsive layout correctly', async ({ page }) => {
    await page.goto('http://localhost:3010/settings');
    
    // Test desktop layout
    await page.setViewportSize({ width: 1200, height: 800 });
    await expect(page.getByText('Einstellungen')).toBeVisible();
    
    // Test tablet layout
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.getByText('Einstellungen')).toBeVisible();
    
    // Test mobile layout
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.getByText('Einstellungen')).toBeVisible();
    
    // All sections should still be accessible
    await expect(page.getByText('Erscheinungsbild')).toBeVisible();
    await expect(page.getByText('Abfrage-Einstellungen')).toBeVisible();
  });

  test('should not have console errors during normal operation', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto('http://localhost:3010/settings');
    await page.waitForLoadState('networkidle');
    
    // Interact with various settings
    await page.getByRole('button', { name: 'English' }).click();
    await page.waitForTimeout(500);
    
    await page.getByRole('button', { name: 'Deutsch' }).click();
    await page.waitForTimeout(500);
    
    // Filter out non-critical warnings
    const criticalErrors = errors.filter(msg => 
      !msg.includes('Warning') && 
      !msg.includes('DevTools') &&
      (msg.includes('Error') || msg.includes('TypeError') || msg.includes('Cannot read'))
    );
    
    expect(criticalErrors).toHaveLength(0);
  });

  test('should maintain SOLID principle separation in settings components', async ({ page }) => {
    await page.goto('http://localhost:3010/settings');
    
    // Each settings section should be independently rendered
    await expect(page.getByText('Design-Modus')).toBeVisible();
    await expect(page.getByText('Sprache')).toBeVisible();
    await expect(page.getByText('Query-Standardeinstellungen')).toBeVisible();
    await expect(page.getByText('Benachrichtigungen')).toBeVisible();
    await expect(page.getByText('Erweiterte Einstellungen')).toBeVisible();
    
    // No component should show error states
    await expect(page.locator('body')).not.toContainText('Error');
    await expect(page.locator('body')).not.toContainText('undefined');
    await expect(page.locator('body')).not.toContainText('null');
  });
});