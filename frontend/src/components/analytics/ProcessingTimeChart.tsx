/**
 * ProcessingTimeChart - Specialized chart for query processing time analysis
 * Shows min, max, and average processing times with performance trends
 */

import React from 'react';
import {
  Box,
  Typography,
  useTheme,
} from '@mui/material';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import ChartWidget from './ChartWidget';
import type { ProcessingTimeData, TimeRange } from '@/types/analytics';
import { CHART_COLORS } from '@/types/analytics';

interface ProcessingTimeChartProps {
  data: ProcessingTimeData[];
  timeRange?: TimeRange;
  onTimeRangeChange?: (range: TimeRange) => void;
  loading?: boolean;
  error?: string | null;
}

const ProcessingTimeChart: React.FC<ProcessingTimeChartProps> = ({
  data,
  timeRange,
  onTimeRangeChange,
  loading = false,
  error = null,
}) => {
  const theme = useTheme();

  // Custom tooltip for processing time data
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      
      return (
        <Box
          sx={{
            backgroundColor: theme.palette.background.paper,
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: theme.shape.borderRadius,
            p: 2,
            boxShadow: theme.shadows[3],
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
            {label}
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  backgroundColor: CHART_COLORS.primary,
                  borderRadius: '50%',
                }}
              />
              <Typography variant="body2">
                Average: <strong>{data.averageTime?.toFixed(2)}s</strong>
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  backgroundColor: CHART_COLORS.success,
                  borderRadius: '50%',
                }}
              />
              <Typography variant="body2">
                Min: <strong>{data.minTime?.toFixed(2)}s</strong>
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  backgroundColor: CHART_COLORS.error,
                  borderRadius: '50%',
                }}
              />
              <Typography variant="body2">
                Max: <strong>{data.maxTime?.toFixed(2)}s</strong>
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
              <Box
                sx={{
                  width: 12,
                  height: 3,
                  backgroundColor: CHART_COLORS.info,
                  borderRadius: '2px',
                }}
              />
              <Typography variant="body2">
                Queries: <strong>{data.queryCount}</strong>
              </Typography>
            </Box>
          </Box>
        </Box>
      );
    }

    return null;
  };

  // Custom chart content using ComposedChart for bars + line
  const chartContent = (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
        
        <XAxis 
          dataKey="date" 
          tick={{ fontSize: 12 }}
          stroke={theme.palette.text.secondary}
        />
        
        {/* Left Y-axis for processing times */}
        <YAxis 
          yAxisId="time"
          tick={{ fontSize: 12 }}
          stroke={theme.palette.text.secondary}
          label={{ 
            value: 'Processing Time (s)', 
            angle: -90, 
            position: 'insideLeft',
            style: { textAnchor: 'middle' }
          }}
        />
        
        {/* Right Y-axis for query count */}
        <YAxis 
          yAxisId="count"
          orientation="right"
          tick={{ fontSize: 12 }}
          stroke={theme.palette.text.secondary}
          label={{ 
            value: 'Query Count', 
            angle: 90, 
            position: 'insideRight',
            style: { textAnchor: 'middle' }
          }}
        />
        
        <Tooltip content={<CustomTooltip />} />
        
        <Legend />
        
        {/* Processing time range bars */}
        <Bar
          yAxisId="time"
          dataKey="maxTime"
          fill={CHART_COLORS.error}
          fillOpacity={0.3}
          name="Max Time"
          radius={[2, 2, 0, 0]}
        />
        
        <Bar
          yAxisId="time"
          dataKey="minTime"
          fill={CHART_COLORS.success}
          fillOpacity={0.3}
          name="Min Time"
          radius={[2, 2, 0, 0]}
        />
        
        {/* Average processing time line */}
        <Line
          yAxisId="time"
          type="monotone"
          dataKey="averageTime"
          stroke={CHART_COLORS.primary}
          strokeWidth={3}
          dot={{ r: 4, fill: CHART_COLORS.primary }}
          activeDot={{ r: 6, fill: CHART_COLORS.primary }}
          name="Average Time"
        />
        
        {/* Query count bar */}
        <Bar
          yAxisId="count"
          dataKey="queryCount"
          fill={CHART_COLORS.info}
          fillOpacity={0.7}
          name="Query Count"
          radius={[2, 2, 0, 0]}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );

  // Calculate summary statistics
  const summaryStats = React.useMemo(() => {
    if (!data || data.length === 0) return null;

    const totalQueries = data.reduce((sum, item) => sum + item.queryCount, 0);
    const avgProcessingTime = data.reduce((sum, item) => sum + item.averageTime, 0) / data.length;
    const maxProcessingTime = Math.max(...data.map(item => item.maxTime));
    const minProcessingTime = Math.min(...data.map(item => item.minTime));

    return {
      totalQueries,
      avgProcessingTime,
      maxProcessingTime,
      minProcessingTime,
    };
  }, [data]);

  return (
    <Box>
      <ChartWidget
        title="Processing Time Analysis"
        data={data}
        type="line" // Will be overridden by custom content
        loading={loading}
        error={error}
        timeRange={timeRange}
        onTimeRangeChange={onTimeRangeChange}
        showExport={true}
      />
      
      {/* Override the chart content */}
      <Box sx={{ mt: -37.5, position: 'relative', zIndex: 1 }}>
        {loading ? null : chartContent}
      </Box>
      
      {/* Summary statistics */}
      {summaryStats && !loading && (
        <Box sx={{ 
          mt: 2, 
          p: 2, 
          backgroundColor: theme.palette.action.hover,
          borderRadius: theme.shape.borderRadius,
          display: 'flex',
          justifyContent: 'space-around',
          flexWrap: 'wrap',
          gap: 2,
        }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" color="primary">
              {summaryStats.totalQueries}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Queries
            </Typography>
          </Box>
          
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" color="primary">
              {summaryStats.avgProcessingTime.toFixed(2)}s
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Avg Processing Time
            </Typography>
          </Box>
          
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" color="success.main">
              {summaryStats.minProcessingTime.toFixed(2)}s
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Fastest Query
            </Typography>
          </Box>
          
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" color="error.main">
              {summaryStats.maxProcessingTime.toFixed(2)}s
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Slowest Query
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default ProcessingTimeChart;