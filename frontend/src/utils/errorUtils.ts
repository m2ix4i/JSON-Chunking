/**
 * Error handling utilities.
 */

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
  severity?: 'error' | 'warning' | 'info';
}

export class APIErrorHandler {
  static handleError(error: any): ValidationError[] {
    if (error.response?.data?.error?.errors) {
      return error.response.data.error.errors;
    }
    
    if (error.response?.data?.detail) {
      return [{
        field: 'general',
        message: error.response.data.detail,
        severity: 'error'
      }];
    }
    
    return [{
      field: 'general',
      message: error.message || 'Ein unbekannter Fehler ist aufgetreten',
      severity: 'error'
    }];
  }
  
  static getFieldError(errors: ValidationError[], fieldName: string): string | undefined {
    return errors.find(error => error.field === fieldName)?.message;
  }
  
  static hasFieldError(errors: ValidationError[], fieldName: string): boolean {
    return errors.some(error => error.field === fieldName);
  }
}