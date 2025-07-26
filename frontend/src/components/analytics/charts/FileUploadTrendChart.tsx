/**
 * File Upload Trend Chart Component
 * Shows file upload volume and total size over time using a line chart
 */

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Box, Typography, Card, CardContent } from '@mui/material';
import { CloudUpload as UploadIcon } from '@mui/icons-material';
import type { FileUploadTrend } from '@/types/analytics';
import { CHART_COLORS } from '@/types/analytics';

interface FileUploadTrendChartProps {
  data: FileUploadTrend[];
  height?: number;
  showLegend?: boolean;
  showTooltip?: boolean;
  title?: string;
}

/**
 * Extract and validate tooltip data - Single Responsibility: Data extraction
 */
const useTooltipData = (payload: any) => {
  if (!payload || !payload.length) return null;
  return payload[0].payload;
};

/**
 * Format upload count text - Single Responsibility: Text formatting
 */
const formatUploadText = (uploads: number): string => {
  return `📁 ${uploads} ${uploads === 1 ? 'Datei' : 'Dateien'}`;
};

/**
 * Tooltip content component - Single Responsibility: UI rendering
 */
const TooltipContent: React.FC<{ data: any; label: string }> = ({ data, label }) => (
  <Card sx={{ p: 1, boxShadow: 3 }}>
    <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
      <Typography variant="body2" sx={{ fontWeight: 500 }}>
        {label}
      </Typography>
      <Typography variant="body2" color="primary">
        {formatUploadText(data.uploads)}
      </Typography>
      <Typography variant="body2" color="secondary">
        📊 {formatFileSize(data.totalSize)}
      </Typography>
    </CardContent>
  </Card>
);

/**
 * Custom tooltip orchestrator - Single Responsibility: Coordination
 */
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active) return null;
  const data = useTooltipData(payload);
  if (!data) return null;
  return <TooltipContent data={data} label={label} />;
};

/**
 * Format file size for display
 */
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

/**
 * Format Y-axis labels for file count
 */
const formatYAxisLabel = (value: number): string => {
  return Math.round(value).toString();
};

const FileUploadTrendChart: React.FC<FileUploadTrendChartProps> = ({
  data,
  height = 400,
  showLegend = true,
  showTooltip = true,
  title = 'Datei-Upload Trend',
}) => {
  const hasData = data && data.length > 0;

  return (
    <Box>
      {title && (
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <UploadIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6" component="h3">
            {title}
          </Typography>
        </Box>
      )}
      
      {!hasData ? (
        <Card sx={{ height }}>
          <CardContent 
            sx={{ 
              height: '100%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              flexDirection: 'column'
            }}
          >
            <UploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="body1" color="text.secondary">
              Noch keine Upload-Daten verfügbar
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Laden Sie Dateien hoch, um Trends anzuzeigen
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <LineChart
            data={data}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 20,
            }}
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="#f0f0f0"
            />
            <XAxis 
              dataKey="date" 
              stroke="#666"
              fontSize={12}
              tick={{ fill: '#666' }}
            />
            <YAxis 
              stroke="#666"
              fontSize={12}
              tick={{ fill: '#666' }}
              tickFormatter={formatYAxisLabel}
              domain={[0, 'dataMax + 1']}
            />
            
            {showTooltip && (
              <Tooltip 
                content={<CustomTooltip />}
                cursor={{ strokeDasharray: '2 2' }}
              />
            )}
            
            {showLegend && (
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="line"
              />
            )}
            
            <Line
              type="monotone"
              dataKey="uploads"
              stroke={CHART_COLORS.primary}
              strokeWidth={3}
              dot={{
                fill: CHART_COLORS.primary,
                strokeWidth: 2,
                r: 4,
              }}
              activeDot={{
                r: 6,
                fill: CHART_COLORS.primary,
                stroke: '#fff',
                strokeWidth: 2,
              }}
              name="Anzahl Uploads"
            />
          </LineChart>
        </ResponsiveContainer>
      )}
      
      {hasData && (
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Gesamt: {data.reduce((sum, item) => sum + item.uploads, 0)} Dateien
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Größe: {formatFileSize(data.reduce((sum, item) => sum + item.totalSize, 0))}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default FileUploadTrendChart;