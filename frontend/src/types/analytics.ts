/**
 * Analytics Types - Comprehensive type definitions for dashboard analytics
 * Supports file analytics, query analytics, performance metrics, and visualization
 */

// Time range options for analytics
export type TimeRange = '24h' | '7d' | '30d' | '90d' | 'all';

// Export format options
export type ExportFormat = 'png' | 'svg' | 'pdf' | 'csv' | 'json';

// Chart color scheme
export const CHART_COLORS = {
  primary: '#1976d2',
  secondary: '#dc004e', 
  success: '#2e7d32',
  warning: '#ed6c02',
  error: '#d32f2f',
  info: '#0288d1',
  chart: [
    '#1976d2', '#dc004e', '#2e7d32', '#ed6c02', 
    '#0288d1', '#7b1fa2', '#388e3c', '#f57c00',
    '#5d4037', '#616161', '#455a64', '#e91e63'
  ],
} as const;

// File Analytics Types
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

export interface FileAnalytics {
  uploadTrend: FileUploadTrend[];
  sizeDistribution: FileSizeDistribution[];
  typeBreakdown: FileTypeBreakdown[];
  activityHeatmap: FileActivityData[];
}

// Query Analytics Types
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

export interface QueryAnalytics {
  volumeTrend: QueryVolumeData[];
  statusDistribution: QueryStatusDistribution[];
  processingTimes: ProcessingTimeData[];
  confidenceScores: ConfidenceScoreData[];
}

// Performance Metrics Types
export interface TrendsGrowth {
  files: number;
  queries: number;
  performance: number;
}

export interface PerformanceMetrics {
  averageProcessingTime: number;
  successRate: number;
  totalQueries: number;
  totalFiles: number;
  averageConfidenceScore: number;
  trendsGrowth: TrendsGrowth;
}

// Main Dashboard Data Interface
export interface AnalyticsDashboardData {
  fileAnalytics: FileAnalytics;
  queryAnalytics: QueryAnalytics;
  performanceMetrics: PerformanceMetrics;
  lastUpdated: Date;
}

// Chart Component Props
export interface ChartWidgetProps {
  title: string;
  data: any[];
  type: 'line' | 'bar' | 'pie' | 'area' | 'scatter';
  height?: number;
  showExport?: boolean;
  loading?: boolean;
  error?: string | null;
  timeRange?: TimeRange;
  onTimeRangeChange?: (range: TimeRange) => void;
}

export interface MetricsWidgetProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: number;
  icon?: React.ReactNode;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  loading?: boolean;
}

// Analytics Store Types
export interface AnalyticsState {
  // Data
  dashboardData: AnalyticsDashboardData | null;
  isLoading: boolean;
  error: string | null;
  
  // Configuration
  timeRange: TimeRange;
  refreshInterval: number;
  autoRefresh: boolean;
  
  // UI State
  selectedChart: string | null;
  exportFormat: ExportFormat;
}

export interface AnalyticsActions {
  // Data fetching
  fetchAnalytics: () => Promise<void>;
  refreshData: () => Promise<void>;
  
  // Configuration
  setTimeRange: (range: TimeRange) => void;
  setRefreshInterval: (interval: number) => void;
  toggleAutoRefresh: () => void;
  
  // UI actions
  setSelectedChart: (chartId: string | null) => void;
  setExportFormat: (format: ExportFormat) => void;
  
  // Export functionality
  exportChart: (chartId: string, format: ExportFormat) => Promise<void>;
  exportReport: (format: ExportFormat) => Promise<void>;
  
  // Error handling
  clearError: () => void;
  setError: (error: string) => void;
}

// Combined store interface
export interface AnalyticsStore extends AnalyticsState, AnalyticsActions {}

// Chart-specific data interfaces
export interface LineChartData {
  x: string | number;
  y: number;
  [key: string]: any;
}

export interface BarChartData {
  name: string;
  value: number;
  [key: string]: any;
}

export interface PieChartData {
  name: string;
  value: number;
  color?: string;
}

export interface AreaChartData {
  x: string | number;
  y: number;
  [key: string]: any;
}

// Utility types for chart components
export type ChartDataType = LineChartData[] | BarChartData[] | PieChartData[] | AreaChartData[];

export interface ChartTheme {
  colors: string[];
  background: string;
  textColor: string;
  gridColor: string;
  strokeWidth: number;
}

// Analytics API response types
export interface AnalyticsApiResponse {
  success: boolean;
  data: AnalyticsDashboardData;
  message?: string;
  timestamp: string;
}

export interface AnalyticsApiError {
  success: false;
  error: string;
  code: number;
  timestamp: string;
}

// Real-time update types
export interface AnalyticsUpdate {
  type: 'file_upload' | 'query_complete' | 'query_start' | 'system_update';
  data: any;
  timestamp: Date;
}

// Filter and comparison types
export interface AnalyticsFilter {
  dateRange: {
    start: Date;
    end: Date;
  };
  fileTypes?: string[];
  queryTypes?: string[];
  minConfidence?: number;
  maxProcessingTime?: number;
}

export interface ComparisonMetrics {
  current: PerformanceMetrics;
  previous: PerformanceMetrics;
  comparison: {
    files: number;
    queries: number;
    successRate: number;
    avgProcessingTime: number;
    avgConfidence: number;
  };
}