/**
 * File Upload Trend Chart Component
 * Shows trend of file uploads over time with upload count and total size
 */

import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Card, CardContent, Typography } from '@mui/material';
import { FileUploadTrend, CHART_COLORS } from '@/types/analytics';

interface FileUploadTrendChartProps {
  data: FileUploadTrend[];
  height?: number;
  showLegend?: boolean;
  showTooltip?: boolean;
  title?: string;
}

/**
 * Custom tooltip formatter for file uploads
 */
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    
    return (
      <Card sx={{ p: 1, boxShadow: 3 }}>
        <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {label}
          </Typography>
          <Typography variant="body2" color="primary">
            📁 {data.uploads} {data.uploads === 1 ? 'Datei' : 'Dateien'}
          </Typography>
          <Typography variant="body2" color="secondary">
            📊 {formatFileSize(data.totalSize)}
          </Typography>
        </CardContent>
      </Card>
    );
  }
  return null;
};

/**
 * Format file size for display
 */
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

/**
 * FileUploadTrendChart Component
 */
export const FileUploadTrendChart: React.FC<FileUploadTrendChartProps> = ({
  data,
  height = 300,
  showLegend = true,
  showTooltip = true,
  title = "Datei-Upload-Trend"
}) => {
  return (
    <Card>
      <CardContent>
        {title && (
          <Typography variant="h6" gutterBottom>
            {title}
          </Typography>
        )}
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis 
              yAxisId="uploads"
              orientation="left"
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              yAxisId="size"
              orientation="right"
              tick={{ fontSize: 12 }}
              tickFormatter={formatFileSize}
            />
            {showTooltip && <Tooltip content={<CustomTooltip />} />}
            {showLegend && <Legend />}
            <Line
              yAxisId="uploads"
              type="monotone"
              dataKey="uploads"
              stroke={CHART_COLORS.primary}
              strokeWidth={2}
              dot={{ fill: CHART_COLORS.primary, r: 4 }}
              name="Uploads"
            />
            <Line
              yAxisId="size"
              type="monotone"
              dataKey="totalSize"
              stroke={CHART_COLORS.secondary}
              strokeWidth={2}
              dot={{ fill: CHART_COLORS.secondary, r: 4 }}
              name="Gesamtgröße"
              hide={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default FileUploadTrendChart;