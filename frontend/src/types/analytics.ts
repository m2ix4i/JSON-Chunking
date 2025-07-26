/**
 * Analytics type definitions for dashboard components
 * Created to support Sandi Metz compliant chart components
 */

export interface FileUploadTrend {
  date: string;
  uploads: number;
  totalSize: number;
}

export interface ProcessingTime {
  queryId: string;
  startTime: string;
  endTime: string;
  duration: number;
  steps: ProcessingStep[];
}

export interface ProcessingStep {
  name: string;
  duration: number;
}

export interface QueryMetrics {
  totalQueries: number;
  successfulQueries: number;
  failedQueries: number;
  averageProcessingTime: number;
  peakProcessingTime: number;
  averageConfidence: number;
  topQueryTypes: QueryTypeCount[];
}

export interface QueryTypeCount {
  type: string;
  count: number;
}

export const CHART_COLORS = {
  primary: '#1976d2',
  secondary: '#dc004e',
  success: '#2e7d32',
  warning: '#ed6c02',
  error: '#d32f2f',
  info: '#0288d1',
  chart: ['#1976d2', '#dc004e', '#2e7d32', '#ed6c02', '#d32f2f', '#0288d1']
} as const;

export const DEFAULT_CHART_CONFIG = {
  timeRange: '7d',
  showLegend: true,
  showTooltip: true,
  responsive: true,
  maintainAspectRatio: false,
} as const;