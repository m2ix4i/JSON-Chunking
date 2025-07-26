/**
 * TrendAnalysis - Comprehensive trend visualization component
 * Shows multiple metrics with correlation analysis and insights
 */

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Tabs,
  Tab,
  Grid,
  Chip,
  Alert,
  useTheme,
  Divider,
} from '@mui/material';
import {
  TrendingUp as TrendUpIcon,
  TrendingDown as TrendDownIcon,
  Analytics as AnalyticsIcon,
  Timeline as TimelineIcon,
  Insights as InsightsIcon,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import type { 
  AnalyticsDashboardData, 
  TimeRange,
  FileUploadTrend,
  QueryVolumeData,
  ProcessingTimeData
} from '@/types/analytics';
import { CHART_COLORS } from '@/types/analytics';

interface TrendAnalysisProps {
  data: AnalyticsDashboardData | null;
  timeRange?: TimeRange;
  onTimeRangeChange?: (range: TimeRange) => void;
  loading?: boolean;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`trend-tabpanel-${index}`}
      aria-labelledby={`trend-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const TrendAnalysis: React.FC<TrendAnalysisProps> = ({
  data,
  timeRange,
  onTimeRangeChange,
  loading = false,
}) => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // Generate insights based on the data
  const generateInsights = React.useMemo(() => {
    if (!data) return [];

    const insights = [];

    // File upload trends
    const fileUploadTrend = data.fileAnalytics.uploadTrend;
    if (fileUploadTrend.length > 1) {
      const recent = fileUploadTrend.slice(-3);
      const older = fileUploadTrend.slice(-6, -3);
      
      const recentAvg = recent.reduce((sum, item) => sum + item.uploads, 0) / recent.length;
      const olderAvg = older.reduce((sum, item) => sum + item.uploads, 0) / older.length;
      
      if (recentAvg > olderAvg * 1.2) {
        insights.push({
          type: 'positive',
          title: 'Upload Activity Increasing',
          description: `File uploads have increased by ${Math.round(((recentAvg - olderAvg) / olderAvg) * 100)}% recently.`,
          icon: <TrendUpIcon color="success" />,
        });
      } else if (recentAvg < olderAvg * 0.8) {
        insights.push({
          type: 'negative',
          title: 'Upload Activity Declining',
          description: `File uploads have decreased by ${Math.round(((olderAvg - recentAvg) / olderAvg) * 100)}% recently.`,
          icon: <TrendDownIcon color="error" />,
        });
      }
    }

    // Query performance trends
    const processingTimes = data.queryAnalytics.processingTimes;
    if (processingTimes.length > 1) {
      const recent = processingTimes.slice(-3);
      const older = processingTimes.slice(-6, -3);
      
      const recentAvg = recent.reduce((sum, item) => sum + item.averageTime, 0) / recent.length;
      const olderAvg = older.reduce((sum, item) => sum + item.averageTime, 0) / older.length;
      
      if (recentAvg < olderAvg * 0.9) {
        insights.push({
          type: 'positive',
          title: 'Performance Improving',
          description: `Query processing time has improved by ${Math.round(((olderAvg - recentAvg) / olderAvg) * 100)}%.`,
          icon: <TrendUpIcon color="success" />,
        });
      } else if (recentAvg > olderAvg * 1.1) {
        insights.push({
          type: 'warning',
          title: 'Performance Degrading',
          description: `Query processing time has increased by ${Math.round(((recentAvg - olderAvg) / olderAvg) * 100)}%.`,
          icon: <TrendDownIcon color="warning" />,
        });
      }
    }

    // Success rate analysis
    const metrics = data.performanceMetrics;
    if (metrics.successRate < 85) {
      insights.push({
        type: 'negative',
        title: 'Low Success Rate',
        description: `Current success rate of ${metrics.successRate.toFixed(1)}% is below optimal threshold.`,
        icon: <AnalyticsIcon color="error" />,
      });
    } else if (metrics.successRate > 95) {
      insights.push({
        type: 'positive',
        title: 'Excellent Success Rate',
        description: `Outstanding success rate of ${metrics.successRate.toFixed(1)}% indicates reliable performance.`,
        icon: <AnalyticsIcon color="success" />,
      });
    }

    return insights;
  }, [data]);

  // Combined trend data for correlation analysis
  const combinedTrendData = React.useMemo(() => {
    if (!data) return [];

    const fileUploads = data.fileAnalytics.uploadTrend;
    const queryVolume = data.queryAnalytics.volumeTrend;
    const processingTimes = data.queryAnalytics.processingTimes;

    // Combine data by date
    const combinedMap = new Map();

    fileUploads.forEach(item => {
      combinedMap.set(item.date, { 
        date: item.date, 
        uploads: item.uploads,
        totalSize: item.totalSize 
      });
    });

    queryVolume.forEach(item => {
      const existing = combinedMap.get(item.date) || { date: item.date };
      combinedMap.set(item.date, {
        ...existing,
        queries: item.total,
        completed: item.completed,
        failed: item.failed,
      });
    });

    processingTimes.forEach(item => {
      const existing = combinedMap.get(item.date) || { date: item.date };
      combinedMap.set(item.date, {
        ...existing,
        avgProcessingTime: item.averageTime,
        queryCount: item.queryCount,
      });
    });

    return Array.from(combinedMap.values()).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [data]);

  if (loading) {
    return (
      <Card>
        <CardHeader title="Trend Analysis" />
        <CardContent>
          <Typography>Loading trend analysis...</Typography>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader title="Trend Analysis" />
        <CardContent>
          <Alert severity="info">No data available for trend analysis</Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TimelineIcon />
            <Typography variant="h6">Trend Analysis</Typography>
          </Box>
        }
        subheader="Comprehensive analysis of system trends and correlations"
      />
      
      <CardContent>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={handleTabChange}>
            <Tab 
              label="Overview" 
              icon={<AnalyticsIcon />}
              iconPosition="start"
            />
            <Tab 
              label="Correlations" 
              icon={<TimelineIcon />}
              iconPosition="start"
            />
            <Tab 
              label="Insights" 
              icon={<InsightsIcon />}
              iconPosition="start"
            />
          </Tabs>
        </Box>

        <TabPanel value={activeTab} index={0}>
          {/* Overview Tab */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>File Upload Trends</Typography>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={data.fileAnalytics.uploadTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="uploads"
                    stroke={CHART_COLORS.primary}
                    fill={CHART_COLORS.primary}
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>Query Volume Trends</Typography>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={data.queryAnalytics.volumeTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke={CHART_COLORS.secondary}
                    fill={CHART_COLORS.secondary}
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          {/* Correlations Tab */}
          <Typography variant="h6" gutterBottom>
            Multi-Metric Correlation Analysis
          </Typography>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={combinedTrendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
              <Tooltip 
                contentStyle={{
                  backgroundColor: theme.palette.background.paper,
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: theme.shape.borderRadius,
                }}
              />
              <Legend />
              
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="uploads"
                stroke={CHART_COLORS.primary}
                strokeWidth={2}
                name="File Uploads"
                dot={{ r: 4 }}
              />
              
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="queries"
                stroke={CHART_COLORS.secondary}
                strokeWidth={2}
                name="Total Queries"
                dot={{ r: 4 }}
              />
              
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="avgProcessingTime"
                stroke={CHART_COLORS.warning}
                strokeWidth={2}
                name="Avg Processing Time (s)"
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          {/* Insights Tab */}
          <Typography variant="h6" gutterBottom>
            Automated Insights
          </Typography>
          
          {generateInsights.length === 0 ? (
            <Alert severity="info">
              No significant trends detected in the current time period.
            </Alert>
          ) : (
            <Grid container spacing={2}>
              {generateInsights.map((insight, index) => (
                <Grid item xs={12} key={index}>
                  <Alert 
                    severity={insight.type === 'positive' ? 'success' : insight.type === 'negative' ? 'error' : 'warning'}
                    icon={insight.icon}
                  >
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {insight.title}
                    </Typography>
                    <Typography variant="body2">
                      {insight.description}
                    </Typography>
                  </Alert>
                </Grid>
              ))}
            </Grid>
          )}

          <Divider sx={{ my: 3 }} />

          {/* Key Metrics Summary */}
          <Typography variant="h6" gutterBottom>
            Key Performance Indicators
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={6} md={3}>
              <Box sx={{ textAlign: 'center', p: 2 }}>
                <Typography variant="h4" color="primary">
                  {data.performanceMetrics.totalFiles}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Files
                </Typography>
                <Chip
                  size="small"
                  label={`${data.performanceMetrics.trendsGrowth.files > 0 ? '+' : ''}${data.performanceMetrics.trendsGrowth.files}%`}
                  color={data.performanceMetrics.trendsGrowth.files > 0 ? 'success' : 'default'}
                />
              </Box>
            </Grid>

            <Grid item xs={6} md={3}>
              <Box sx={{ textAlign: 'center', p: 2 }}>
                <Typography variant="h4" color="secondary">
                  {data.performanceMetrics.totalQueries}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Queries
                </Typography>
                <Chip
                  size="small"
                  label={`${data.performanceMetrics.trendsGrowth.queries > 0 ? '+' : ''}${data.performanceMetrics.trendsGrowth.queries}%`}
                  color={data.performanceMetrics.trendsGrowth.queries > 0 ? 'success' : 'default'}
                />
              </Box>
            </Grid>

            <Grid item xs={6} md={3}>
              <Box sx={{ textAlign: 'center', p: 2 }}>
                <Typography variant="h4" color="success.main">
                  {data.performanceMetrics.successRate.toFixed(1)}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Success Rate
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={6} md={3}>
              <Box sx={{ textAlign: 'center', p: 2 }}>
                <Typography variant="h4" color="info.main">
                  {data.performanceMetrics.averageProcessingTime.toFixed(2)}s
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Avg Processing Time
                </Typography>
                <Chip
                  size="small"
                  label={`${data.performanceMetrics.trendsGrowth.performance > 0 ? '+' : ''}${data.performanceMetrics.trendsGrowth.performance}%`}
                  color={data.performanceMetrics.trendsGrowth.performance < 0 ? 'success' : 'default'}
                />
              </Box>
            </Grid>
          </Grid>
        </TabPanel>
      </CardContent>
    </Card>
  );
};

export default TrendAnalysis;