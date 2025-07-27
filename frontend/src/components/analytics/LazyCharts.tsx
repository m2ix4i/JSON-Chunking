/**
 * Lazy-loaded analytics chart components with loading fallbacks
 * Provides performance optimization for heavy chart components
 */

import React, { lazy, Suspense } from 'react';
import { Box, Skeleton, Card, CardContent, Typography } from '@mui/material';
import type { 
  ChartWidgetProps, 
  ProcessingTimeData, 
  TimeRange 
} from '@/types/analytics';

// Chart loading fallback component
const ChartLoadingFallback: React.FC<{ title?: string; height?: number }> = ({ 
  title = "Loading Chart...", 
  height = 300 
}) => (
  <Card>
    <CardContent>
      {title && (
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
      )}
      <Box sx={{ width: '100%', height }}>
        <Skeleton variant="rectangular" width="100%" height={60} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" width="100%" height={height - 80} />
      </Box>
    </CardContent>
  </Card>
);

// Lazy load chart components
const FileUploadTrendChart = lazy(() => 
  import('./charts/FileUploadTrendChart').then(module => ({ 
    default: module.FileUploadTrendChart 
  }))
);

const ProcessingTimeChart = lazy(() => 
  import('./ProcessingTimeChart')
);

const ChartWidget = lazy(() => 
  import('./ChartWidget')
);

// Lazy wrapper components with proper fallbacks
export const LazyFileUploadTrendChart: React.FC<{
  data: any[];
  loading?: boolean;
  timeRange?: TimeRange;
  onTimeRangeChange?: (range: TimeRange) => void;
}> = (props) => (
  <Suspense fallback={<ChartLoadingFallback title="Upload Trends" height={250} />}>
    <FileUploadTrendChart {...props} />
  </Suspense>
);

export const LazyProcessingTimeChart: React.FC<{
  data: ProcessingTimeData[];
  loading?: boolean;
  timeRange?: TimeRange;
  onTimeRangeChange?: (range: TimeRange) => void;
}> = (props) => (
  <Suspense fallback={<ChartLoadingFallback title="Processing Times" height={350} />}>
    <ProcessingTimeChart {...props} />
  </Suspense>
);

export const LazyChartWidget: React.FC<ChartWidgetProps> = (props) => (
  <Suspense fallback={<ChartLoadingFallback title={props.title} height={props.height || 300} />}>
    <ChartWidget {...props} />
  </Suspense>
);

// Comprehensive lazy analytics section
export const LazyAnalyticsSection: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Suspense fallback={
    <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
      {[1, 2, 3, 4].map((i) => (
        <ChartLoadingFallback key={i} title={`Analytics ${i}`} />
      ))}
    </Box>
  }>
    {children}
  </Suspense>
);

export default {
  LazyFileUploadTrendChart,
  LazyProcessingTimeChart,
  LazyChartWidget,
  LazyAnalyticsSection,
};