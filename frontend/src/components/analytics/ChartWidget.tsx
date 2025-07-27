/**
 * ChartWidget - Reusable chart wrapper component for analytics dashboard
 * Supports multiple chart types with consistent styling and functionality
 */

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Chip,
  Skeleton,
  Alert,
  useTheme,
} from '@mui/material';
import {
  MoreVert as MoreIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Fullscreen as FullscreenIcon,
  DateRange as DateRangeIcon,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { ChartWidgetProps, TimeRange } from '@/types/analytics';
import { CHART_COLORS } from '@/types/analytics';

const ChartWidget: React.FC<ChartWidgetProps> = ({
  title,
  data,
  type,
  height = 300,
  showExport = true,
  loading = false,
  error = null,
  timeRange,
  onTimeRangeChange,
}) => {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [timeRangeAnchor, setTimeRangeAnchor] = useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleTimeRangeOpen = (event: React.MouseEvent<HTMLElement>) => {
    setTimeRangeAnchor(event.currentTarget);
  };

  const handleTimeRangeClose = () => {
    setTimeRangeAnchor(null);
  };

  const handleTimeRangeSelect = (range: TimeRange) => {
    onTimeRangeChange?.(range);
    handleTimeRangeClose();
  };

  const handleExport = (format: 'png' | 'svg') => {
    // TODO: Implement actual export functionality
    console.log(`Exporting ${title} as ${format}`);
    handleMenuClose();
  };

  const handleRefresh = () => {
    // TODO: Implement refresh functionality
    console.log(`Refreshing ${title}`);
    handleMenuClose();
  };

  // Time range options
  const timeRangeOptions: { value: TimeRange; label: string }[] = [
    { value: '24h', label: '24 Hours' },
    { value: '7d', label: '7 Days' },
    { value: '30d', label: '30 Days' },
    { value: '90d', label: '90 Days' },
    { value: 'all', label: 'All Time' },
  ];

  // Common chart styling configuration
  const getChartConfig = () => ({
    colors: CHART_COLORS.chart,
    tooltipStyle: {
      backgroundColor: theme.palette.background.paper,
      border: `1px solid ${theme.palette.divider}`,
      borderRadius: theme.shape.borderRadius,
    },
    axisStyle: {
      fontSize: 12,
      stroke: theme.palette.text.secondary,
    },
    gridStyle: {
      strokeDasharray: "3 3",
      stroke: theme.palette.divider,
    },
  });

  // Render empty state
  const renderEmptyState = () => (
    <Box 
      sx={{ 
        height: height, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}
    >
      <Typography color="text.secondary">No data available</Typography>
    </Box>
  );

  // Render unsupported chart type
  const renderUnsupportedType = () => (
    <Box 
      sx={{ 
        height: height, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}
    >
      <Typography color="text.secondary">
        Unsupported chart type: {type}
      </Typography>
    </Box>
  );

  // Render line chart
  const renderLineChart = () => {
    const { colors, tooltipStyle, axisStyle, gridStyle } = getChartConfig();
    
    return (
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data}>
          <CartesianGrid {...gridStyle} />
          <XAxis dataKey="date" tick={axisStyle} />
          <YAxis tick={axisStyle} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend />
          {Object.keys(data[0] || {})
            .filter(key => key !== 'date')
            .map((key, index) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={colors[index % colors.length]}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            ))}
        </LineChart>
      </ResponsiveContainer>
    );
  };

  // Render area chart
  const renderAreaChart = () => {
    const { colors, tooltipStyle, axisStyle, gridStyle } = getChartConfig();
    
    return (
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data}>
          <CartesianGrid {...gridStyle} />
          <XAxis dataKey="date" tick={axisStyle} />
          <YAxis tick={axisStyle} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend />
          {Object.keys(data[0] || {})
            .filter(key => key !== 'date')
            .map((key, index) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stackId="1"
                stroke={colors[index % colors.length]}
                fill={colors[index % colors.length]}
                fillOpacity={0.6}
              />
            ))}
        </AreaChart>
      </ResponsiveContainer>
    );
  };

  // Render bar chart
  const renderBarChart = () => {
    const { colors, tooltipStyle, axisStyle, gridStyle } = getChartConfig();
    
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data}>
          <CartesianGrid {...gridStyle} />
          <XAxis dataKey="name" tick={axisStyle} />
          <YAxis tick={axisStyle} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend />
          {Object.keys(data[0] || {})
            .filter(key => key !== 'name')
            .map((key, index) => (
              <Bar
                key={key}
                dataKey={key}
                fill={colors[index % colors.length]}
                radius={[2, 2, 0, 0]}
              />
            ))}
        </BarChart>
      </ResponsiveContainer>
    );
  };

  // Render pie chart
  const renderPieChart = () => {
    const { colors, tooltipStyle } = getChartConfig();
    
    return (
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={80}
            dataKey="value"
            label={({ name, percentage }) => `${name} ${percentage}%`}
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.color || colors[index % colors.length]} 
              />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
        </PieChart>
      </ResponsiveContainer>
    );
  };

  // Main chart renderer - simplified delegation
  const renderChart = () => {
    if (!data || data.length === 0) return renderEmptyState();
    
    switch (type) {
      case 'line': return renderLineChart();
      case 'area': return renderAreaChart();
      case 'bar': return renderBarChart();
      case 'pie': return renderPieChart();
      default: return renderUnsupportedType();
    }
  };

  if (loading) {
    return (
      <Card sx={{ height: '100%' }}>
        <CardHeader
          title={<Skeleton variant="text" width="40%" />}
          action={<Skeleton variant="circular" width={24} height={24} />}
        />
        <CardContent>
          <Skeleton variant="rectangular" width="100%" height={height} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ height: '100%' }}>
      <CardHeader
        title={
          <Typography variant="h6" component="div">
            {title}
          </Typography>
        }
        action={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {timeRange && onTimeRangeChange && (
              <>
                <Chip
                  icon={<DateRangeIcon />}
                  label={timeRangeOptions.find(opt => opt.value === timeRange)?.label || timeRange}
                  onClick={handleTimeRangeOpen}
                  size="small"
                  variant="outlined"
                  clickable
                />
                <Menu
                  anchorEl={timeRangeAnchor}
                  open={Boolean(timeRangeAnchor)}
                  onClose={handleTimeRangeClose}
                >
                  {timeRangeOptions.map((option) => (
                    <MenuItem
                      key={option.value}
                      onClick={() => handleTimeRangeSelect(option.value)}
                      selected={option.value === timeRange}
                    >
                      {option.label}
                    </MenuItem>
                  ))}
                </Menu>
              </>
            )}
            
            {showExport && (
              <>
                <IconButton onClick={handleMenuOpen} size="small">
                  <MoreIcon />
                </IconButton>
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleMenuClose}
                >
                  <MenuItem onClick={() => handleExport('png')}>
                    <DownloadIcon sx={{ mr: 1 }} />
                    Export as PNG
                  </MenuItem>
                  <MenuItem onClick={() => handleExport('svg')}>
                    <DownloadIcon sx={{ mr: 1 }} />
                    Export as SVG
                  </MenuItem>
                  <MenuItem onClick={handleRefresh}>
                    <RefreshIcon sx={{ mr: 1 }} />
                    Refresh
                  </MenuItem>
                </Menu>
              </>
            )}
          </Box>
        }
      />
      <CardContent sx={{ pt: 0 }}>
        {error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : null}
        
        {renderChart()}
      </CardContent>
    </Card>
  );
};

export default ChartWidget;