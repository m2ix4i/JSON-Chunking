/**
 * Utility functions for error handling and user-friendly error messages.
 */

import type { AxiosError } from 'axios';

export interface AppError {
  type: 'network' | 'validation' | 'server' | 'auth' | 'timeout' | 'unknown';
  message: string;
  details?: string;
  code?: string;
  status?: number;
  field?: string;
  timestamp: number;
}

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
  severity?: 'error' | 'warning' | 'info';
  details?: string;
}

/**
 * Converts various error types to a standardized AppError format
 */
export const normalizeError = (error: unknown): AppError => {
  const timestamp = Date.now();

  // Handle Axios errors
  if (isAxiosError(error)) {
    const axiosError = error as AxiosError;
    
    if (!axiosError.response) {
      // Network error
      return {
        type: 'network',
        message: 'Verbindung zum Server fehlgeschlagen. Überprüfen Sie Ihre Internetverbindung.',
        details: axiosError.message,
        timestamp,
      };
    }

    const status = axiosError.response.status;
    const data = axiosError.response.data as any;

    switch (status) {
      case 400:
        return {
          type: 'validation',
          message: data?.message || 'Ungültige Anfrage. Überprüfen Sie Ihre Eingaben.',
          details: data?.details || axiosError.message,
          code: data?.code,
          status,
          timestamp,
        };

      case 401:
        return {
          type: 'auth',
          message: 'Authentifizierung fehlgeschlagen. Melden Sie sich erneut an.',
          details: data?.details || axiosError.message,
          status,
          timestamp,
        };

      case 403:
        return {
          type: 'auth',
          message: 'Zugriff verweigert. Sie haben nicht die erforderlichen Berechtigungen.',
          details: data?.details || axiosError.message,
          status,
          timestamp,
        };

      case 404:
        return {
          type: 'server',
          message: 'Die angeforderte Ressource wurde nicht gefunden.',
          details: data?.details || axiosError.message,
          status,
          timestamp,
        };

      case 408:
        return {
          type: 'timeout',
          message: 'Die Anfrage hat zu lange gedauert. Versuchen Sie es erneut.',
          details: data?.details || axiosError.message,
          status,
          timestamp,
        };

      case 422:
        return {
          type: 'validation',
          message: data?.message || 'Validierungsfehler in den übermittelten Daten.',
          details: data?.details || axiosError.message,
          code: data?.code,
          status,
          timestamp,
        };

      case 429:
        return {
          type: 'server',
          message: 'Zu viele Anfragen. Warten Sie einen Moment und versuchen Sie es erneut.',
          details: data?.details || axiosError.message,
          status,
          timestamp,
        };

      case 500:
        return {
          type: 'server',
          message: 'Interner Serverfehler. Versuchen Sie es später erneut.',
          details: data?.details || axiosError.message,
          status,
          timestamp,
        };

      case 502:
      case 503:
      case 504:
        return {
          type: 'server',
          message: 'Der Server ist vorübergehend nicht verfügbar. Versuchen Sie es später erneut.',
          details: data?.details || axiosError.message,
          status,
          timestamp,
        };

      default:
        return {
          type: 'server',
          message: `Serverfehler (${status}). Kontaktieren Sie den Support, falls das Problem anhält.`,
          details: data?.details || axiosError.message,
          status,
          timestamp,
        };
    }
  }

  // Handle standard Error objects
  if (error instanceof Error) {
    const errorMessage = error.message.toLowerCase();
    
    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      return {
        type: 'network',
        message: 'Netzwerkfehler. Überprüfen Sie Ihre Internetverbindung.',
        details: error.message,
        timestamp,
      };
    }

    if (errorMessage.includes('timeout')) {
      return {
        type: 'timeout',
        message: 'Zeitüberschreitung. Die Anfrage hat zu lange gedauert.',
        details: error.message,
        timestamp,
      };
    }

    return {
      type: 'unknown',
      message: 'Ein unerwarteter Fehler ist aufgetreten.',
      details: error.message,
      timestamp,
    };
  }

  // Handle string errors
  if (typeof error === 'string') {
    return {
      type: 'unknown',
      message: error || 'Ein unbekannter Fehler ist aufgetreten.',
      timestamp,
    };
  }

  // Fallback for any other error types
  return {
    type: 'unknown',
    message: 'Ein unbekannter Fehler ist aufgetreten.',
    details: String(error),
    timestamp,
  };
};

/**
 * Type guard to check if an error is an Axios error
 */
function isAxiosError(error: unknown): error is AxiosError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'isAxiosError' in error &&
    (error as any).isAxiosError === true
  );
}

/**
 * Extracts validation errors from server response
 */
export const extractValidationErrors = (error: AppError): ValidationError[] => {
  if (error.type !== 'validation') {
    return [];
  }

  // Try to parse details as JSON for structured validation errors
  if (error.details) {
    try {
      const parsed = JSON.parse(error.details);
      
      // Handle FastAPI validation error format
      if (Array.isArray(parsed.detail)) {
        return parsed.detail.map((item: any) => ({
          field: item.loc?.join('.') || 'unknown',
          message: item.msg || 'Validierungsfehler',
          code: item.type,
          severity: 'error' as const,
        }));
      }

      // Handle custom validation error format
      if (parsed.errors && Array.isArray(parsed.errors)) {
        return parsed.errors.map((item: any) => ({
          field: item.field || 'unknown',
          message: item.message || 'Validierungsfehler',
          code: item.code,
          severity: item.severity || 'error',
          details: item.details,
        }));
      }
    } catch {
      // If parsing fails, return a generic validation error
    }
  }

  // Fallback to a single validation error
  return [{
    field: error.field || 'general',
    message: error.message,
    code: error.code,
    severity: 'error' as const,
    details: error.details,
  }];
};

/**
 * Generates user-friendly error messages for common file upload scenarios
 */
export const getFileUploadErrorMessage = (error: AppError, fileName?: string): string => {
  const fileRef = fileName ? ` (${fileName})` : '';

  switch (error.code) {
    case 'FILE_TOO_LARGE':
      return `Datei${fileRef} ist zu groß. Maximale Größe: 100 MB`;
    
    case 'FILE_TYPE_NOT_SUPPORTED':
      return `Dateityp${fileRef} wird nicht unterstützt. Nur JSON-Dateien sind erlaubt.`;
    
    case 'FILE_CORRUPTED':
      return `Datei${fileRef} ist beschädigt oder kann nicht gelesen werden.`;
    
    case 'FILE_EMPTY':
      return `Datei${fileRef} ist leer.`;
    
    case 'JSON_PARSE_ERROR':
      return `Datei${fileRef} enthält ungültiges JSON. Überprüfen Sie die Formatierung.`;
    
    case 'INVALID_IFC_FORMAT':
      return `Datei${fileRef} entspricht nicht dem erwarteten IFC-JSON Format.`;
    
    default:
      return error.message;
  }
};

/**
 * Generates user-friendly error messages for query processing
 */
export const getQueryErrorMessage = (error: AppError): string => {
  switch (error.code) {
    case 'QUERY_EMPTY':
      return 'Bitte geben Sie eine Abfrage ein.';
    
    case 'QUERY_TOO_LONG':
      return 'Abfrage ist zu lang. Maximale Länge: 1000 Zeichen.';
    
    case 'NO_FILE_SELECTED':
      return 'Bitte wählen Sie eine Datei aus, bevor Sie eine Abfrage starten.';
    
    case 'FILE_NOT_PROCESSED':
      return 'Die ausgewählte Datei wurde noch nicht verarbeitet. Warten Sie bis die Verarbeitung abgeschlossen ist.';
    
    case 'QUERY_LIMIT_EXCEEDED':
      return 'Sie haben das Limit für gleichzeitige Abfragen erreicht. Warten Sie bis eine Abfrage abgeschlossen ist.';
    
    case 'INVALID_INTENT':
      return 'Ungültiger Abfragetyp angegeben.';
    
    case 'MODEL_UNAVAILABLE':
      return 'Das angeforderte KI-Modell ist derzeit nicht verfügbar. Versuchen Sie es später erneut.';
    
    default:
      return error.message;
  }
};

/**
 * Determines if an error should be retried automatically
 */
export const isRetryableError = (error: AppError): boolean => {
  if (error.type === 'network' || error.type === 'timeout') {
    return true;
  }

  if (error.type === 'server' && error.status) {
    // Retry on 5xx errors and 429 (rate limit)
    return error.status >= 500 || error.status === 429;
  }

  return false;
};

/**
 * Calculates retry delay with exponential backoff
 */
export const getRetryDelay = (attempt: number, baseDelay: number = 1000): number => {
  const maxDelay = 30000; // 30 seconds max
  const delay = baseDelay * Math.pow(2, attempt - 1);
  const jitter = Math.random() * 0.1 * delay; // Add 10% jitter
  
  return Math.min(delay + jitter, maxDelay);
};

/**
 * Creates a debounced error handler to prevent error spam
 */
export const createDebouncedErrorHandler = (
  handler: (error: AppError) => void,
  delay: number = 500
) => {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastError: AppError | null = null;

  return (error: AppError) => {
    // If it's the same error type and message, debounce it
    if (
      lastError &&
      lastError.type === error.type &&
      lastError.message === error.message
    ) {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      timeoutId = setTimeout(() => {
        handler(error);
        lastError = null;
        timeoutId = null;
      }, delay);
    } else {
      // Different error, handle immediately
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      
      handler(error);
      lastError = error;
    }
  };
};