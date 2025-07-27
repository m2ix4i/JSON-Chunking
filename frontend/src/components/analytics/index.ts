/**
 * Analytics Components - Centralized exports for analytics dashboard components
 */

export { default as MetricsWidget } from './MetricsWidget';
export { default as ChartWidget } from './ChartWidget';
export { default as ProcessingTimeChart } from './ProcessingTimeChart';
export { default as TrendAnalysis } from './TrendAnalysis';

// Re-export types for convenience
export type {
  MetricsWidgetProps,
  ChartWidgetProps,
} from '@/types/analytics';