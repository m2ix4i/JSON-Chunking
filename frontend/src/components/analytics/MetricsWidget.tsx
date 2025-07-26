/**
 * MetricsWidget - KPI display component for analytics dashboard
 * Shows key performance indicators with trends and visual enhancements
 */

import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Skeleton,
  useTheme,
} from '@mui/material';
import {
  TrendingUp as TrendUpIcon,
  TrendingDown as TrendDownIcon,
  TrendingFlat as TrendFlatIcon,
} from '@mui/icons-material';
import type { MetricsWidgetProps } from '@/types/analytics';

const MetricsWidget: React.FC<MetricsWidgetProps> = ({
  title,
  value,
  subtitle,
  trend,
  icon,
  color = 'primary',
  loading = false,
}) => {
  const theme = useTheme();

  // Format the value for display
  const formatValue = (val: string | number): string => {
    if (typeof val === 'number') {
      if (val >= 1000000) {
        return `${(val / 1000000).toFixed(1)}M`;
      } else if (val >= 1000) {
        return `${(val / 1000).toFixed(1)}K`;
      } else if (val % 1 !== 0) {
        return val.toFixed(2);
      } else {
        return val.toString();
      }
    }
    return val;
  };

  // Get trend icon and color
  const getTrendDisplay = () => {
    if (trend === undefined || trend === null) return null;

    let TrendIcon = TrendFlatIcon;
    let trendColor = theme.palette.text.secondary;
    let trendText = '0%';

    if (trend > 0) {
      TrendIcon = TrendUpIcon;
      trendColor = theme.palette.success.main;
      trendText = `+${trend}%`;
    } else if (trend < 0) {
      TrendIcon = TrendDownIcon;
      trendColor = theme.palette.error.main;
      trendText = `${trend}%`;
    }

    return (
      <Chip
        icon={<TrendIcon sx={{ fontSize: '16px !important' }} />}
        label={trendText}
        size="small"
        sx={{
          color: trendColor,
          backgroundColor: `${trendColor}15`,
          border: `1px solid ${trendColor}30`,
          height: '24px',
          fontSize: '0.75rem',
          '& .MuiChip-icon': {
            color: trendColor,
          },
        }}
      />
    );
  };

  // Get color theme
  const getColorTheme = () => {
    switch (color) {
      case 'primary':
        return theme.palette.primary;
      case 'secondary':
        return theme.palette.secondary;
      case 'success':
        return theme.palette.success;
      case 'warning':
        return theme.palette.warning;
      case 'error':
        return theme.palette.error;
      case 'info':
        return theme.palette.info;
      default:
        return theme.palette.primary;
    }
  };

  const colorTheme = getColorTheme();

  if (loading) {
    return (
      <Card sx={{ height: '100%', minHeight: '140px' }}>
        <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Skeleton variant="circular" width={24} height={24} sx={{ mr: 1 }} />
            <Skeleton variant="text" width="60%" height={20} />
          </Box>
          <Skeleton variant="text" width="40%" height={48} />
          <Box sx={{ mt: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Skeleton variant="text" width="50%" height={16} />
            <Skeleton variant="rectangular" width={60} height={24} sx={{ borderRadius: '12px' }} />
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      sx={{ 
        height: '100%', 
        minHeight: '140px',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          width: '4px',
          height: '100%',
          backgroundColor: colorTheme.main,
        },
      }}
    >
      <CardContent sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        pl: 3, // Account for left border
      }}>
        {/* Header with icon and title */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          {icon && (
            <Box 
              sx={{ 
                mr: 1, 
                color: colorTheme.main,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {icon}
            </Box>
          )}
          <Typography 
            variant="body2" 
            color="text.secondary"
            sx={{ fontWeight: 500 }}
          >
            {title}
          </Typography>
        </Box>

        {/* Main value */}
        <Typography 
          variant="h3" 
          component="div" 
          sx={{ 
            fontWeight: 600,
            color: colorTheme.main,
            lineHeight: 1.2,
            mb: 1,
          }}
        >
          {formatValue(value)}
        </Typography>

        {/* Footer with subtitle and trend */}
        <Box sx={{ 
          mt: 'auto', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          {subtitle && (
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{ fontSize: '0.75rem' }}
            >
              {subtitle}
            </Typography>
          )}
          
          <Box sx={{ ml: 'auto' }}>
            {getTrendDisplay()}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default MetricsWidget;