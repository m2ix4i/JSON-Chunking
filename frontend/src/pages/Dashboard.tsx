/**
 * Dashboard page - main overview of the application.
 * Enhanced with interactive analytics and comprehensive data visualization.
 */

import React, { useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  LinearProgress,
  Tabs,
  Tab,
  Alert,
  Skeleton,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Search as QueryIcon,
  Assessment as StatsIcon,
  Description as FileIcon,
  PlayArrow as StartIcon,
  CheckCircle as CompletedIcon,
  Error as ErrorIcon,
  Schedule as PendingIcon,
  Analytics as AnalyticsIcon,
  Timeline as TimelineIcon,
  Speed as PerformanceIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

// Store hooks
import { useFiles, useSelectedFile } from '@stores/fileStore';
import { useActiveQueries, useQueryHistory } from '@stores/queryStore';
import { 
  useAnalyticsStore,
  useAnalyticsData,
  useAnalyticsLoading,
  useAnalyticsError,
  useAnalyticsActions,
  useFileAnalytics,
  useQueryAnalytics,
  usePerformanceMetrics,
} from '@stores/analyticsStore';

// Components
import FileSelector from '@components/files/FileSelector';
import {
  MetricsWidget,
  ChartWidget,
  ProcessingTimeChart,
  TrendAnalysis,
} from '@components/analytics';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  
  // Store data
  const files = useFiles();
  const selectedFile = useSelectedFile();
  const activeQueries = useActiveQueries();
  const queryHistory = useQueryHistory();

  // Analytics store data
  const analyticsData = useAnalyticsData();
  const analyticsLoading = useAnalyticsLoading();
  const analyticsError = useAnalyticsError();
  const { fetchAnalytics, setTimeRange, clearError } = useAnalyticsActions();
  const fileAnalytics = useFileAnalytics();
  const queryAnalytics = useQueryAnalytics();
  const performanceMetrics = usePerformanceMetrics();

  // Tab state for analytics section
  const [analyticsTab, setAnalyticsTab] = React.useState(0);

  // Initialize analytics data on component mount
  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Calculate statistics
  const stats = {
    totalFiles: files.length,
    activeQueries: Object.keys(activeQueries).length,
    completedQueries: queryHistory.filter(q => q.status === 'completed').length,
    failedQueries: queryHistory.filter(q => q.status === 'failed').length,
  };

  // Get recent queries for display
  const recentQueries = queryHistory.slice(0, 5);

  // Handle analytics tab changes
  const handleAnalyticsTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setAnalyticsTab(newValue);
  };

  return (
    <Box>
      {/* Page header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Willkommen bei IFC JSON Chunking - Ihrer Lösung für intelligente Gebäudedatenanalyse
        </Typography>
      </Box>

      {/* Enhanced Statistics Cards with Analytics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricsWidget
            title="Hochgeladene Dateien"
            value={stats.totalFiles}
            subtitle="Gesamt verfügbar"
            trend={performanceMetrics?.trendsGrowth.files}
            icon={<FileIcon />}
            color="primary"
            loading={analyticsLoading}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <MetricsWidget
            title="Aktive Abfragen"
            value={stats.activeQueries}
            subtitle="Aktuell in Bearbeitung"
            icon={<PendingIcon />}
            color="warning"
            loading={analyticsLoading}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <MetricsWidget
            title="Erfolgsrate"
            value={performanceMetrics ? `${performanceMetrics.successRate.toFixed(1)}%` : `${stats.completedQueries}`}
            subtitle={performanceMetrics ? "Durchschnittliche Erfolgsrate" : "Abgeschlossene Abfragen"}
            icon={<CompletedIcon />}
            color="success"
            loading={analyticsLoading}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <MetricsWidget
            title="Verarbeitungszeit"
            value={performanceMetrics ? `${performanceMetrics.averageProcessingTime.toFixed(2)}s` : `${stats.failedQueries}`}
            subtitle={performanceMetrics ? "Durchschnittliche Zeit" : "Fehlgeschlagene Abfragen"}
            trend={performanceMetrics?.trendsGrowth.performance}
            icon={performanceMetrics ? <PerformanceIcon /> : <ErrorIcon />}
            color={performanceMetrics ? "info" : "error"}
            loading={analyticsLoading}
          />
        </Grid>
      </Grid>

      {/* Analytics Section */}
      {analyticsError && (
        <Alert 
          severity="error" 
          sx={{ mb: 3 }}
          onClose={clearError}
        >
          Analytics Error: {analyticsError}
        </Alert>
      )}

      <Card sx={{ mb: 4 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={analyticsTab} onChange={handleAnalyticsTabChange}>
            <Tab 
              label="Übersicht" 
              icon={<AnalyticsIcon />}
              iconPosition="start"
            />
            <Tab 
              label="Leistung" 
              icon={<PerformanceIcon />}
              iconPosition="start"
            />
            <Tab 
              label="Trends" 
              icon={<TimelineIcon />}
              iconPosition="start"
            />
          </Tabs>
        </Box>

        <CardContent>
          {/* Analytics Overview Tab */}
          {analyticsTab === 0 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <ChartWidget
                  title="Datei-Upload Trends"
                  data={fileAnalytics?.uploadTrend || []}
                  type="area"
                  loading={analyticsLoading}
                  timeRange={useAnalyticsStore.getState().timeRange}
                  onTimeRangeChange={setTimeRange}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <ChartWidget
                  title="Abfrage-Volumen"
                  data={queryAnalytics?.volumeTrend || []}
                  type="line"
                  loading={analyticsLoading}
                  timeRange={useAnalyticsStore.getState().timeRange}
                  onTimeRangeChange={setTimeRange}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <ChartWidget
                  title="Dateityp-Verteilung"
                  data={fileAnalytics?.typeBreakdown || []}
                  type="pie"
                  loading={analyticsLoading}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <ChartWidget
                  title="Abfrage-Status"
                  data={queryAnalytics?.statusDistribution || []}
                  type="pie"
                  loading={analyticsLoading}
                />
              </Grid>
            </Grid>
          )}

          {/* Performance Analysis Tab */}
          {analyticsTab === 1 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <ProcessingTimeChart
                  data={queryAnalytics?.processingTimes || []}
                  loading={analyticsLoading}
                  timeRange={useAnalyticsStore.getState().timeRange}
                  onTimeRangeChange={setTimeRange}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <ChartWidget
                  title="Vertrauens-Score Verteilung"
                  data={queryAnalytics?.confidenceScores || []}
                  type="bar"
                  loading={analyticsLoading}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <ChartWidget
                  title="Dateigrößen-Verteilung"
                  data={fileAnalytics?.sizeDistribution || []}
                  type="bar"
                  loading={analyticsLoading}
                />
              </Grid>
            </Grid>
          )}

          {/* Trend Analysis Tab */}
          {analyticsTab === 2 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TrendAnalysis
                  data={analyticsData}
                  loading={analyticsLoading}
                  timeRange={useAnalyticsStore.getState().timeRange}
                  onTimeRangeChange={setTimeRange}
                />
              </Grid>
            </Grid>
          )}
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* Quick Actions */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Schnellaktionen
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Button
                  variant="contained"
                  startIcon={<UploadIcon />}
                  onClick={() => navigate('/upload')}
                  size="large"
                  fullWidth
                >
                  Neue Datei hochladen
                </Button>
                
                <Button
                  variant="outlined"
                  startIcon={<QueryIcon />}
                  onClick={() => navigate('/query')}
                  size="large"
                  fullWidth
                  disabled={!selectedFile}
                >
                  {selectedFile ? 'Neue Abfrage erstellen' : 'Erst Datei auswählen'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* File Selection */}
        {files.length > 0 && (
          <Grid item xs={12} md={6}>
            <FileSelector 
              title="Datei für Abfragen auswählen"
              showUploadPrompt={false}
              compact={true}
            />
          </Grid>
        )}

        {/* Active Queries */}
        <Grid item xs={12} md={files.length > 0 ? 6 : 6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Schnellübersicht
              </Typography>
              
              {selectedFile && (
                <Paper sx={{ p: 2, bgcolor: 'action.hover', mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Ausgewählte Datei:
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {selectedFile.filename}
                  </Typography>
                </Paper>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Active Queries */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Aktive Abfragen
              </Typography>
              
              {Object.keys(activeQueries).length === 0 ? (
                <Typography color="text.secondary">
                  Keine aktiven Abfragen
                </Typography>
              ) : (
                <List dense>
                  {Object.values(activeQueries).map((query) => (
                    <ListItem key={query.query_id} divider>
                      <ListItemIcon>
                        <QueryIcon />
                      </ListItemIcon>
                      <ListItemText
                        primary={`Abfrage ${query.query_id?.slice(0, 8) || 'Unbekannt'}...`}
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              {query.message || 'Wird verarbeitet...'}
                            </Typography>
                            <LinearProgress 
                              variant="indeterminate"
                              sx={{ mt: 1 }}
                            />
                          </Box>
                        }
                      />
                      <Chip
                        label={query.status || 'processing'}
                        size="small"
                        color={
                          query.status === 'completed' ? 'success' :
                          query.status === 'failed' ? 'error' :
                          'primary'
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Queries */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Letzte Abfragen
              </Typography>
              
              {recentQueries.length === 0 ? (
                <Typography color="text.secondary">
                  Noch keine Abfragen erstellt
                </Typography>
              ) : (
                <List>
                  {recentQueries.map((query, index) => (
                    <ListItem 
                      key={query.query_id || index} 
                      divider={index < recentQueries.length - 1}
                    >
                      <ListItemIcon>
                        {query.status === 'completed' ? (
                          <CompletedIcon color="success" />
                        ) : (
                          <ErrorIcon color="error" />
                        )}
                      </ListItemIcon>
                      <ListItemText
                        primary={query.query || 'Keine Abfrage verfügbar'}
                        secondary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                              {query.file_id || 'Unbekannte Datei'} • {new Date().toLocaleString('de-DE')}
                            </Typography>
                            {query.confidence_score && (
                              <Chip
                                label={`${Math.round(query.confidence_score * 100)}% Vertrauen`}
                                size="small"
                                variant="outlined"
                              />
                            )}
                          </Box>
                        }
                      />
                      <Button
                        size="small"
                        onClick={() => navigate(`/results/${query.query_id}`)}
                      >
                        Anzeigen
                      </Button>
                    </ListItem>
                  ))}
                </List>
              )}
              
              {queryHistory.length > 5 && (
                <Box sx={{ textAlign: 'center', mt: 2 }}>
                  <Button onClick={() => navigate('/history')}>
                    Alle Abfragen anzeigen
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;