/**
 * FileUploadTrendChart Component
 * Displays file upload trends over time with Sandi Metz principle compliance
 */

import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
} from '@mui/material';
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
import type { FileUploadTrend } from '@/types/analytics';
import { CHART_COLORS } from '@/types/analytics';

interface FileUploadTrendChartProps {
  data: FileUploadTrend[];
  title?: string;
  showLegend?: boolean;
  showTooltip?: boolean;
}

// Helper function: Format file size (Single Responsibility)
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

// Helper function: Format Y-axis labels (Single Responsibility)
const formatYAxisLabel = (value: number): string => {
  return Math.round(value).toString();
};

// Custom tooltip data hook (Single Responsibility)
const useTooltipData = (payload: any) => {
  if (!payload || !payload.length) return null;
  return payload[0].payload;
};

// Format upload text helper (Single Responsibility)
const formatUploadText = (uploads: number): string => {
  return `📁 ${uploads} ${uploads === 1 ? 'Datei' : 'Dateien'}`;
};

// Tooltip content component (Single Responsibility)
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

// Custom tooltip component (Law of Demeter compliant)
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active) return null;
  const data = useTooltipData(payload);
  if (!data) return null;
  return <TooltipContent data={data} label={label} />;
};

const FileUploadTrendChart: React.FC<FileUploadTrendChartProps> = ({
  data,
  title = 'Datei-Upload Trend',
  showLegend = true,
  showTooltip = true,
}) => {
  // Handle empty or invalid data
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent sx={{ textAlign: 'center', py: 6 }}>
          <Typography variant="h6" gutterBottom>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Noch keine Upload-Daten verfügbar
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Laden Sie Dateien hoch, um Trends anzuzeigen
          </Typography>
        </CardContent>
      </Card>
    );
  }

  // Calculate summary statistics
  const totalFiles = data.reduce((sum, item) => sum + item.uploads, 0);
  const totalSize = data.reduce((sum, item) => sum + item.totalSize, 0);

  return (
    <Card>
      <CardContent>
        {title && (
          <Typography variant="h6" component="h3" gutterBottom>
            {title}
          </Typography>
        )}
        
        {/* Summary statistics */}
        <Box sx={{ mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Typography variant="body2" color="text.secondary">
            Gesamt: {totalFiles} Dateien
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Größe: {formatFileSize(totalSize)}
          </Typography>
        </Box>

        {/* Chart */}
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis tickFormatter={formatYAxisLabel} />
            {showTooltip && <Tooltip content={<CustomTooltip />} />}
            {showLegend && <Legend />}
            <Line
              type="monotone"
              dataKey="uploads"
              stroke={CHART_COLORS.primary}
              strokeWidth={2}
              dot={{ fill: CHART_COLORS.primary, strokeWidth: 2, r: 4 }}
              name="Uploads"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default FileUploadTrendChart;