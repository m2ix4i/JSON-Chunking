/**
 * Preferences service for validation, migration, and utility functions.
 * Handles settings persistence and validation logic.
 */

import type { UserSettings } from '@/types/app';

export interface SettingsValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates user settings object
 */
export const validateSettings = (settings: Partial<UserSettings>): SettingsValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate language
  if (settings.language && !['de', 'en'].includes(settings.language)) {
    errors.push('Invalid language selection. Must be "de" or "en".');
  }

  // Validate theme
  if (settings.theme && !['light', 'dark', 'auto'].includes(settings.theme)) {
    errors.push('Invalid theme selection. Must be "light", "dark", or "auto".');
  }

  // Validate query defaults
  if (settings.defaultQuerySettings) {
    const { maxConcurrent, timeoutSeconds, cacheResults } = settings.defaultQuerySettings;
    
    if (maxConcurrent !== undefined) {
      if (!Number.isInteger(maxConcurrent) || maxConcurrent < 1 || maxConcurrent > 10) {
        errors.push('Max concurrent requests must be an integer between 1 and 10.');
      }
    }

    if (timeoutSeconds !== undefined) {
      if (!Number.isInteger(timeoutSeconds) || timeoutSeconds < 5 || timeoutSeconds > 300) {
        errors.push('Timeout must be an integer between 5 and 300 seconds.');
      } else if (timeoutSeconds < 10) {
        warnings.push('Timeout below 10 seconds may cause queries to fail frequently.');
      }
    }

    if (cacheResults !== undefined && typeof cacheResults !== 'boolean') {
      errors.push('Cache results setting must be a boolean value.');
    }
  }

  // Validate notifications
  if (settings.notifications) {
    const { queryComplete, errors: errorNotifs, fileUpload } = settings.notifications;
    
    [queryComplete, errorNotifs, fileUpload].forEach((value, index) => {
      if (value !== undefined && typeof value !== 'boolean') {
        const fieldNames = ['queryComplete', 'errors', 'fileUpload'];
        errors.push(`Notification setting "${fieldNames[index]}" must be a boolean value.`);
      }
    });
  }

  // Validate advanced settings
  if (settings.advanced) {
    const { showDebugInfo, showTokenUsage, enableProfiling } = settings.advanced;
    
    [showDebugInfo, showTokenUsage, enableProfiling].forEach((value, index) => {
      if (value !== undefined && typeof value !== 'boolean') {
        const fieldNames = ['showDebugInfo', 'showTokenUsage', 'enableProfiling'];
        errors.push(`Advanced setting "${fieldNames[index]}" must be a boolean value.`);
      }
    });

    if (enableProfiling) {
      warnings.push('Profiling may impact application performance. Use only for debugging.');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

/**
 * Sanitizes settings object to ensure valid values
 */
export const sanitizeSettings = (settings: Partial<UserSettings>): Partial<UserSettings> => {
  const sanitized: Partial<UserSettings> = {};

  // Sanitize language
  if (settings.language) {
    sanitized.language = ['de', 'en'].includes(settings.language) ? settings.language : 'de';
  }

  // Sanitize theme
  if (settings.theme) {
    sanitized.theme = ['light', 'dark', 'auto'].includes(settings.theme) ? settings.theme : 'auto';
  }

  // Sanitize query defaults
  if (settings.defaultQuerySettings) {
    const queryDefaults = settings.defaultQuerySettings;
    sanitized.defaultQuerySettings = {
      maxConcurrent: Math.max(1, Math.min(10, Math.floor(queryDefaults.maxConcurrent || 3))),
      timeoutSeconds: Math.max(5, Math.min(300, Math.floor(queryDefaults.timeoutSeconds || 30))),
      cacheResults: Boolean(queryDefaults.cacheResults ?? true),
    };
  }

  // Sanitize notifications
  if (settings.notifications) {
    const notifications = settings.notifications;
    sanitized.notifications = {
      queryComplete: Boolean(notifications.queryComplete ?? true),
      errors: Boolean(notifications.errors ?? true),
      fileUpload: Boolean(notifications.fileUpload ?? true),
    };
  }

  // Sanitize advanced settings
  if (settings.advanced) {
    const advanced = settings.advanced;
    sanitized.advanced = {
      showDebugInfo: Boolean(advanced.showDebugInfo ?? false),
      showTokenUsage: Boolean(advanced.showTokenUsage ?? false),
      enableProfiling: Boolean(advanced.enableProfiling ?? false),
    };
  }

  return sanitized;
};

/**
 * Generates settings export filename with timestamp
 */
export const generateExportFilename = (): string => {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  return `ifc-settings-${timestamp}.json`;
};

/**
 * Downloads settings as JSON file
 */
export const downloadSettings = (settingsJson: string, filename?: string): void => {
  const blob = new Blob([settingsJson], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || generateExportFilename();
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
};

/**
 * Reads settings from uploaded file
 */
export const readSettingsFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === 'string') {
        resolve(result);
      } else {
        reject(new Error('Failed to read file as text'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
};

/**
 * Gets system color scheme preference
 */
export const getSystemTheme = (): 'light' | 'dark' => {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

/**
 * Checks if browser supports system theme detection
 */
export const supportsSystemTheme = (): boolean => {
  return window.matchMedia !== undefined;
};

/**
 * Gets browser language preference for default language setting
 */
export const getBrowserLanguage = (): 'de' | 'en' => {
  const language = navigator.language.toLowerCase();
  
  // Check for German language codes
  if (language.startsWith('de')) {
    return 'de';
  }
  
  // Default to English for all other languages
  return 'en';
};

/**
 * Migrates settings from older versions (if needed in future)
 */
export const migrateSettings = (settings: any, fromVersion: string, toVersion: string): UserSettings => {
  // Currently no migration needed, but structure for future use
  const migrated = { ...settings };
  
  // Example migration logic for future versions:
  // if (fromVersion === '1.0' && toVersion === '1.1') {
  //   // Add new setting with default value
  //   migrated.newSetting = defaultValue;
  // }
  
  return migrated;
};

/**
 * Calculates storage usage for settings
 */
export const getSettingsStorageSize = (): number => {
  try {
    const settingsData = localStorage.getItem('ifc-settings-store');
    return settingsData ? new Blob([settingsData]).size : 0;
  } catch (error) {
    console.warn('Could not calculate settings storage size:', error);
    return 0;
  }
};

/**
 * Checks if localStorage is available
 */
export const isStorageAvailable = (): boolean => {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (error) {
    return false;
  }
};