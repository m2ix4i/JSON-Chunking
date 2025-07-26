/**
 * Analytics types and interfaces for the dashboard
 */

// Time-based data point interface
export interface TimeDataPoint {
  date: string;
  value: number;
  label?: string;
}

// Chart data interfaces
export interface ChartData {
  name: string;
  value: number;
  fill?: string;
  color?: string;
}

// File analytics interfaces
export interface FileUploadTrend {
  date: string;
  uploads: number;
  totalSize: number;
}

export interface FileSizeDistribution {
  sizeRange: string;
  count: number;
  percentage: number;
}

export interface FileTypeBreakdown {
  type: string;
  count: number;
  percentage: number;
  color: string;
}

export interface FileActivityData {
  hour: number;
  day: string;
  activity: number;
  label: string;
}

// Query analytics interfaces
export interface QueryVolumeData {
  date: string;
  total: number;
  completed: number;
  failed: number;
  active: number;
}

export interface QueryStatusDistribution {
  status: 'completed' | 'failed' | 'active';
  count: number;
  percentage: number;
  color: string;
}

export interface ProcessingTimeData {
  date: string;
  averageTime: number;
  minTime: number;
  maxTime: number;
  queryCount: number;
}

export interface ConfidenceScoreData {
  scoreRange: string;
  count: number;
  percentage: number;
}

// Performance metrics
export interface PerformanceMetrics {
  averageProcessingTime: number;
  successRate: number;
  totalQueries: number;
  totalFiles: number;
  averageConfidenceScore: number;
  trendsGrowth: {
    files: number;
    queries: number;
    performance: number;
  };
}

// Time range options
export type TimeRange = '24h' | '7d' | '30d' | '90d' | 'all';

export interface TimeRangeOption {
  value: TimeRange;
  label: string;
  days?: number;
}

// Analytics dashboard data
export interface AnalyticsDashboardData {
  fileAnalytics: {
    uploadTrend: FileUploadTrend[];
    sizeDistribution: FileSizeDistribution[];
    typeBreakdown: FileTypeBreakdown[];
    activityHeatmap: FileActivityData[];
  };
  queryAnalytics: {
    volumeTrend: QueryVolumeData[];
    statusDistribution: QueryStatusDistribution[];
    processingTimes: ProcessingTimeData[];
    confidenceScores: ConfidenceScoreData[];
  };
  performanceMetrics: PerformanceMetrics;
  lastUpdated: Date;
}

// Chart theme colors
export const CHART_COLORS = {
  primary: '#1976d2',
  secondary: '#dc004e',
  success: '#2e7d32',
  warning: '#ed6c02',
  error: '#d32f2f',
  info: '#0288d1',
  grey: '#757575',
  chart: [
    '#1976d2', // Blue
    '#dc004e', // Pink
    '#2e7d32', // Green
    '#ed6c02', // Orange
    '#9c27b0', // Purple
    '#d32f2f', // Red
    '#0288d1', // Light Blue
    '#f57c00', // Amber
    '#5d4037', // Brown
    '#607d8b', // Blue Grey
  ],
} as const;

// Chart configuration options
export interface ChartConfig {
  timeRange: TimeRange;
  refreshInterval: number; // in milliseconds
  animationDuration: number;
  showLegend: boolean;
  showTooltip: boolean;
  responsive: boolean;
}

export const DEFAULT_CHART_CONFIG: ChartConfig = {
  timeRange: '7d',
  refreshInterval: 30000, // 30 seconds
  animationDuration: 300,
  showLegend: true,
  showTooltip: true,
  responsive: true,
};