/**
 * Analytics types for dashboard components
 */

export interface FileUploadTrend {
  date: string;
  uploads: number;
  totalSize: number;
}

export interface ProcessingTime {
  date: string;
  averageTime: number;
  minTime: number;
  maxTime: number;
}

export interface QueryMetrics {
  date: string;
  queryCount: number;
  successRate: number;
  avgProcessingTime: number;
}

export const CHART_COLORS = {
  primary: '#1976d2',
  secondary: '#dc004e',
  success: '#2e7d32',
  warning: '#ed6c02',
  error: '#d32f2f',
  info: '#0288d1',
} as const;