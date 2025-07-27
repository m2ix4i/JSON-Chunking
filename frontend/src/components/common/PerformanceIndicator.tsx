/**
 * PerformanceIndicator Component
 * Development-only component that displays real-time performance metrics
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  LinearProgress,
  IconButton,
  Collapse,
  Divider,
  Grid,
  Tooltip,
} from '@mui/material';
import {
  Speed as PerformanceIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { 
  subscribeToPerformance, 
  getPerformanceScore,
  type PerformanceMetrics 
} from '@utils/performance';

interface PerformanceIndicatorProps {
  /** Show detailed metrics breakdown */
  showDetailedMetrics?: boolean;
  /** Position of the indicator */
  position?: 'top-right' | 'bottom-right' | 'bottom-left' | 'top-left';
  /** Compact mode */
  compact?: boolean;
}

const PerformanceIndicator: React.FC<PerformanceIndicatorProps> = ({
  showDetailedMetrics = false,
  position = 'bottom-right',
  compact = false,
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [expanded, setExpanded] = useState(showDetailedMetrics);
  const [score, setScore] = useState<number>(0);

  useEffect(() => {
    // Only show in development mode
    if (import.meta.env.PROD) {
      return;
    }

    const unsubscribe = subscribeToPerformance((newMetrics) => {
      setMetrics(newMetrics);
      setScore(getPerformanceScore());
    });

    return unsubscribe;
  }, []);

  // Don't render in production
  if (import.meta.env.PROD || !metrics) {
    return null;
  }

  const getScoreColor = (score: number): 'success' | 'warning' | 'error' => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'error';
  };

  const getMetricColor = (value: number | undefined, thresholds: { good: number; needs_improvement: number }): 'success' | 'warning' | 'error' => {
    if (value === undefined) return 'error';
    if (value <= thresholds.good) return 'success';
    if (value <= thresholds.needs_improvement) return 'warning';
    return 'error';
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const positionStyles = {
    'top-right': { top: 16, right: 16 },
    'bottom-right': { bottom: 16, right: 16 },
    'bottom-left': { bottom: 16, left: 16 },
    'top-left': { top: 16, left: 16 },
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        ...positionStyles[position],
        zIndex: 9999,
        maxWidth: expanded ? 400 : 200,
        minWidth: compact ? 150 : 200,
      }}
    >
      <Card 
        sx={{ 
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: 3,
        }}
      >
        <CardContent sx={{ p: compact ? 1 : 2, '&:last-child': { pb: compact ? 1 : 2 } }}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PerformanceIcon fontSize="small" />
              <Typography variant={compact ? 'caption' : 'body2'} fontWeight={600}>
                Performance
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Chip
                label={`${score}/100`}
                size="small"
                color={getScoreColor(score)}
                variant="filled"
              />
              {!compact && (
                <IconButton
                  size="small"
                  onClick={() => setExpanded(!expanded)}
                  sx={{ ml: 0.5 }}
                >
                  {expanded ? <CollapseIcon fontSize="small" /> : <ExpandIcon fontSize="small" />}
                </IconButton>
              )}
            </Box>
          </Box>

          {/* Progress Bar */}
          <Box sx={{ mt: 1, mb: expanded ? 2 : 0 }}>
            <LinearProgress
              variant="determinate"
              value={score}
              color={getScoreColor(score)}
              sx={{ height: 6, borderRadius: 3 }}
            />
          </Box>

          {/* Detailed Metrics */}
          <Collapse in={expanded}>
            <Divider sx={{ mb: 2 }} />
            
            <Grid container spacing={1}>
              {/* Core Web Vitals */}
              <Grid item xs={12}>
                <Typography variant="caption" fontWeight={600} color="text.secondary">
                  Core Web Vitals
                </Typography>
              </Grid>
              
              <Grid item xs={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="caption">LCP</Typography>
                  <Tooltip title="Largest Contentful Paint">
                    <Chip
                      label={metrics.LCP ? `${metrics.LCP.toFixed(0)}ms` : '-'}
                      size="small"
                      color={getMetricColor(metrics.LCP, { good: 2500, needs_improvement: 4000 })}
                      variant="outlined"
                    />
                  </Tooltip>
                </Box>
              </Grid>
              
              <Grid item xs={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="caption">FCP</Typography>
                  <Tooltip title="First Contentful Paint">
                    <Chip
                      label={metrics.FCP ? `${metrics.FCP.toFixed(0)}ms` : '-'}
                      size="small"
                      color={getMetricColor(metrics.FCP, { good: 1800, needs_improvement: 3000 })}
                      variant="outlined"
                    />
                  </Tooltip>
                </Box>
              </Grid>
              
              <Grid item xs={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="caption">CLS</Typography>
                  <Tooltip title="Cumulative Layout Shift">
                    <Chip
                      label={metrics.CLS !== undefined ? metrics.CLS.toFixed(3) : '-'}
                      size="small"
                      color={getMetricColor(metrics.CLS, { good: 0.1, needs_improvement: 0.25 })}
                      variant="outlined"
                    />
                  </Tooltip>
                </Box>
              </Grid>
              
              <Grid item xs={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="caption">FID</Typography>
                  <Tooltip title="First Input Delay">
                    <Chip
                      label={metrics.FID ? `${metrics.FID.toFixed(0)}ms` : '-'}
                      size="small"
                      color={getMetricColor(metrics.FID, { good: 100, needs_improvement: 300 })}
                      variant="outlined"
                    />
                  </Tooltip>
                </Box>
              </Grid>

              {/* Bundle & Memory Info */}
              {(metrics.bundleLoadTime || metrics.memoryUsage) && (
                <>
                  <Grid item xs={12} sx={{ mt: 1 }}>
                    <Typography variant="caption" fontWeight={600} color="text.secondary">
                      Bundle & Memory
                    </Typography>
                  </Grid>
                  
                  {metrics.bundleLoadTime && (
                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="caption">Bundle Load</Typography>
                        <Chip
                          label={`${metrics.bundleLoadTime.toFixed(0)}ms`}
                          size="small"
                          color={metrics.bundleLoadTime < 1000 ? 'success' : 'warning'}
                          variant="outlined"
                        />
                      </Box>
                    </Grid>
                  )}
                  
                  {metrics.memoryUsage && (
                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="caption">Memory</Typography>
                        <Chip
                          label={formatBytes(metrics.memoryUsage)}
                          size="small"
                          color={metrics.memoryUsage < 50 * 1024 * 1024 ? 'success' : 'warning'}
                          variant="outlined"
                        />
                      </Box>
                    </Grid>
                  )}
                </>
              )}
              
              {/* Connection Info */}
              {metrics.connectionType && (
                <Grid item xs={12} sx={{ mt: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="caption">Connection</Typography>
                    <Chip
                      label={metrics.connectionType}
                      size="small"
                      variant="outlined"
                      color={metrics.connectionType === '4g' ? 'success' : 'warning'}
                    />
                  </Box>
                </Grid>
              )}
            </Grid>

            {/* Footer */}
            <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <InfoIcon fontSize="small" color="action" />
              <Typography variant="caption" color="text.secondary">
                Dev mode only • Updates real-time
              </Typography>
            </Box>
          </Collapse>
        </CardContent>
      </Card>
    </Box>
  );
};

export default PerformanceIndicator;