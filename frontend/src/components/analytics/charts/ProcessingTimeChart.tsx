/**
 * Processing Time Chart Component
 * Shows query processing time trends over time
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
  Area,
  ComposedChart,
} from 'recharts';
import { Box, Typography, Card, CardContent } from '@mui/material';
import { Timer as TimerIcon } from '@mui/icons-material';
import type { ProcessingTimeData } from '@/types/analytics';
import { CHART_COLORS } from '@/types/analytics';

interface ProcessingTimeChartProps {
  data: ProcessingTimeData[];
  height?: number;
  showLegend?: boolean;
  showTooltip?: boolean;
  title?: string;
  showMinMax?: boolean;
}

/**
 * Custom tooltip formatter for processing times
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
            ⚡ Durchschnitt: {formatTime(data.averageTime)}
          </Typography>
          {data.minTime !== undefined && (
            <Typography variant="body2" color="success.main">
              ⬇️ Minimum: {formatTime(data.minTime)}
            </Typography>
          )}
          {data.maxTime !== undefined && (
            <Typography variant="body2" color="warning.main">
              ⬆️ Maximum: {formatTime(data.maxTime)}
            </Typography>
          )}
          <Typography variant="body2" color="text.secondary">
            📊 {data.queryCount} {data.queryCount === 1 ? 'Abfrage' : 'Abfragen'}
          </Typography>
        </CardContent>
      </Card>
    );
  }
  return null;
};

/**
 * Format time duration for display
 */
const formatTime = (seconds: number): string => {
  if (seconds < 1) {
    return `${(seconds * 1000).toFixed(0)}ms`;
  } else if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  } else {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
  }
};

/**
 * Format Y-axis labels for time
 */
const formatYAxisLabel = (value: number): string => {
  if (value < 1) {
    return `${(value * 1000).toFixed(0)}ms`;
  } else if (value < 60) {
    return `${value.toFixed(1)}s`;
  } else {
    return `${(value / 60).toFixed(1)}m`;
  }
};

const ProcessingTimeChart: React.FC<ProcessingTimeChartProps> = ({
  data,
  height = 400,
  showLegend = true,
  showTooltip = true,
  title = 'Verarbeitungszeiten',
  showMinMax = true,
}) => {
  const hasData = data && data.length > 0;

  return (
    <Box>
      {title && (
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <TimerIcon sx={{ mr: 1, color: 'primary.main' }} />
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
            <TimerIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="body1" color="text.secondary">
              Noch keine Verarbeitungsdaten verfügbar
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Erstellen Sie Abfragen, um Verarbeitungszeiten anzuzeigen
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart
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
              domain={['dataMin - 0.1', 'dataMax + 0.1']}
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
            
            {/* Min/Max range area */}
            {showMinMax && (
              <>
                <defs>
                  <linearGradient id="minMaxGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.info} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={CHART_COLORS.info} stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="maxTime"
                  stroke="none"
                  fill="url(#minMaxGradient)"
                  name="Min/Max Bereich"
                />
                <Area
                  type="monotone"
                  dataKey="minTime"
                  stroke="none"
                  fill="#fff"
                />
              </>
            )}
            
            {/* Average line */}
            <Line
              type="monotone"
              dataKey="averageTime"
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
              name="Durchschnitt"
            />
            
            {/* Min/Max lines */}
            {showMinMax && (
              <>
                <Line
                  type="monotone"
                  dataKey="maxTime"
                  stroke={CHART_COLORS.warning}
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  dot={false}
                  name="Maximum"
                />
                <Line
                  type="monotone"
                  dataKey="minTime"
                  stroke={CHART_COLORS.success}
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  dot={false}
                  name="Minimum"
                />
              </>
            )}
          </ComposedChart>
        </ResponsiveContainer>
      )}
      
      {hasData && (
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Durchschnitt: {formatTime(
              data.reduce((sum, item) => sum + item.averageTime, 0) / data.length
            )}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Gesamt: {data.reduce((sum, item) => sum + item.queryCount, 0)} Abfragen
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default ProcessingTimeChart;