/**
 * Results page with real-time WebSocket integration and enhanced functionality.
 * Combines live query status updates with export/share capabilities.
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Alert,
  CircularProgress,
  Button,
  LinearProgress,
  Chip,
  Divider,
} from '@mui/material';
import {
  Assessment as ResultsIcon,
  ArrowBack as BackIcon,
  Refresh as RefreshIcon,
  Timer as TimerIcon,
} from '@mui/icons-material';

// Store hooks
import { useQueryMonitoring, useQueryStore } from '@stores/queryStore';
import { showErrorNotification, showSuccessNotification } from '@stores/appStore';

// Components
import QueryProgressTracker from '@components/progress/QueryProgressTracker';
import QueryResultDisplay from '@components/results/QueryResultDisplay';
import QueryProgress from '@components/query/QueryProgress';
import ConnectionErrorHandler from '@components/error/ConnectionErrorHandler';

// Utils
import { exportQueryResult, shareQueryResult } from '@utils/export';
import { formatDuration } from '@utils/time';
import type { ExportFormat } from '@utils/export';

const ResultsPage: React.FC = () => {
  const { queryId } = useParams<{ queryId: string }>();
  const navigate = useNavigate();
  
  // Combined state from both hooks
  const { activeQuery, status, result, isConnected } = useQueryMonitoring();
  const { connectWebSocket, setActiveQuery, error, isSubmitting, queryResult } = useQueryStore();
  
  // Local state
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Check if we have data to display
  const hasResult = result !== null || queryResult !== null;
  const hasActiveQuery = activeQuery !== null;
  const displayResult = result || queryResult;
  const displayStatus = status;
  const isProcessing = displayStatus && ['started', 'preprocessing', 'processing'].includes(displayStatus.status);
  const isCompleted = displayStatus?.status === 'completed';
  const isFailed = displayStatus?.status === 'failed' || error !== null;

  // Connect WebSocket for live updates when accessing a specific query
  useEffect(() => {
    if (queryId && (!activeQuery || activeQuery.query_id !== queryId)) {
      setIsLoading(true);
      
      // Try to connect WebSocket for this query
      connectWebSocket(queryId)
        .then(() => {
          // Set a mock active query if none exists (for direct URL access)
          if (!activeQuery) {
            setActiveQuery({
              query_id: queryId,
              status: 'processing',
              message: 'Loading...',
            });
          }
        })
        .catch((error) => {
          console.error('Failed to connect WebSocket for query:', queryId, error);
          // Fallback to API polling could be implemented here
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [queryId, activeQuery, connectWebSocket, setActiveQuery]);

  // Auto-refresh status when processing
  useEffect(() => {
    if (isProcessing && !isSubmitting) {
      // The queryStore already handles status monitoring
      // This effect could be used for additional refresh logic if needed
    }
  }, [isProcessing, isSubmitting]);

  // Export handler
  const handleExport = async (format: ExportFormat) => {
    if (!displayResult) return;

    setIsExporting(true);
    try {
      await exportQueryResult(displayResult, format);
      showSuccessNotification(`Ergebnis als ${format.toUpperCase()} exportiert`);
    } catch (error: any) {
      showErrorNotification(`Export fehlgeschlagen: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Share handler
  const handleShare = async () => {
    if (!displayResult) return;

    try {
      await shareQueryResult(displayResult);
      showSuccessNotification('Ergebnis in Zwischenablage kopiert');
    } catch (error: any) {
      showErrorNotification(`Teilen fehlgeschlagen: ${error.message}`);
    }
  };

  // Navigation helpers
  const handleBackToQuery = () => {
    navigate('/query');
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  // Render loading state
  if (isProcessing && !hasResult) {
    return (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
          <Button
            startIcon={<BackIcon />}
            onClick={handleBackToQuery}
            sx={{ mr: 2 }}
          >
            Zurück zur Abfrage
          </Button>
          <Box>
            <Typography variant="h4" component="h1">
              Verarbeitung läuft...
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
              <Chip 
                label={isConnected ? 'Live-Updates' : 'Standard-Polling'} 
                color={isConnected ? 'success' : 'info'}
                size="small"
                variant="outlined"
              />
            </Box>
          </Box>
        </Box>

        {/* Real-time query progress display */}
        <Box sx={{ maxWidth: 800, mx: 'auto' }}>
          <QueryProgress compact={false} />
        </Box>
      </Box>
    );
  }

  // Render error state
  if (isFailed && !hasResult) {
    return (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
          <Button
            startIcon={<BackIcon />}
            onClick={handleBackToQuery}
            sx={{ mr: 2 }}
          >
            Zurück zur Abfrage
          </Button>
          <Typography variant="h4" component="h1">
            Verarbeitung fehlgeschlagen
          </Typography>
        </Box>

        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Fehler bei der Abfrageverarbeitung
          </Typography>
          <Typography variant="body2">
            {error || displayStatus?.error_message || 'Ein unbekannter Fehler ist aufgetreten.'}
          </Typography>
        </Alert>

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={handleBackToQuery}
          >
            Neue Abfrage starten
          </Button>
          <Button
            variant="outlined"
            onClick={handleBackToDashboard}
          >
            Zum Dashboard
          </Button>
        </Box>
      </Box>
    );
  }

  // Render empty state
  if (!hasResult && !hasActiveQuery) {
    return (
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          Ergebnisse
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Hier werden die Ergebnisse Ihrer Abfragen strukturiert angezeigt.
        </Typography>

        <Card sx={{ maxWidth: 600, mx: 'auto' }}>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <ResultsIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
            
            <Typography variant="h6" gutterBottom>
              Keine Abfrage-Ergebnisse
            </Typography>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Starten Sie eine neue Abfrage, um Ergebnisse anzuzeigen.
            </Typography>

            <Button
              variant="contained"
              onClick={handleBackToQuery}
              startIcon={<BackIcon />}
            >
              Neue Abfrage starten
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  // Render results - hybrid approach combining both implementations
  return (
    <Box>
      {/* Enhanced header with status information */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Button
            startIcon={<BackIcon />}
            onClick={handleBackToQuery}
            sx={{ mr: 2 }}
          >
            Zurück zur Abfrage
          </Button>
          <Box>
            <Typography variant="h4" component="h1">
              Abfrage-Ergebnisse
            </Typography>
            {queryId && (
              <Typography variant="body1" color="text.secondary">
                Live-Überwachung für Abfrage {queryId.slice(0, 8)}...
              </Typography>
            )}
            {displayResult && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                <Chip 
                  label={isCompleted ? 'Abgeschlossen' : 'Verarbeitung'} 
                  color={isCompleted ? 'success' : 'primary'}
                  size="small"
                />
                {isProcessing && (
                  <Chip 
                    label={isConnected ? 'Live-Updates' : 'Polling'} 
                    color={isConnected ? 'success' : 'info'}
                    size="small"
                    variant="outlined"
                  />
                )}
                {displayResult.processing_time && (
                  <Typography variant="body2" color="text.secondary">
                    • {formatDuration(displayResult.processing_time)}
                  </Typography>
                )}
              </Box>
            )}
          </Box>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Main content area */}
        <Grid item xs={12} lg={8}>
          {isLoading ? (
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 4 }}>
                <CircularProgress sx={{ mb: 2 }} />
                <Typography variant="body1">
                  Verbindung zu Abfrage wird hergestellt...
                </Typography>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Processing status banner (if still processing) */}
              {isProcessing && hasResult && (
                <Box sx={{ mb: 3 }}>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      Die Abfrage wird noch verarbeitet. 
                      {isConnected 
                        ? ' Die Ergebnisse werden in Echtzeit aktualisiert.' 
                        : ' Die Ergebnisse werden regelmäßig aktualisiert.'}
                    </Typography>
                  </Alert>
                </Box>
              )}

              {/* Real-time progress tracking */}
              {activeQuery && displayStatus?.status !== 'completed' && (
                <Box sx={{ mb: 3 }}>
                  <QueryProgressTracker 
                    queryId={queryId}
                    compact={false}
                    showAllQueries={false}
                  />
                </Box>
              )}

              {/* Query results display with enhanced functionality */}
              {displayResult && displayStatus?.status === 'completed' ? (
                <QueryResultDisplay 
                  result={displayResult}
                  onExport={handleExport}
                  onShare={handleShare}
                />
              ) : displayStatus?.status === 'failed' ? (
                <Alert severity="error" sx={{ mb: 3 }}>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    Abfrage fehlgeschlagen
                  </Typography>
                  <Typography variant="body2">
                    {displayStatus.error_message || error || 'Ein unbekannter Fehler ist aufgetreten.'}
                  </Typography>
                </Alert>
              ) : (
                <Card>
                  <CardContent sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="h6" gutterBottom>
                      Abfrage wird verarbeitet...
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Die Ergebnisse werden angezeigt, sobald die Verarbeitung abgeschlossen ist.
                    </Typography>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </Grid>

        {/* Sidebar with connection status and controls */}
        <Grid item xs={12} lg={4}>
          {/* Connection status and controls */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Verbindungsstatus
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {isConnected ? 'Live-WebSocket aktiv' : 'Standard-Polling aktiv'}
              </Typography>
              
              <Button 
                variant="outlined" 
                onClick={handleBackToQuery}
                startIcon={<BackIcon />}
                fullWidth
              >
                Neue Abfrage erstellen
              </Button>
            </CardContent>
          </Card>

          {/* Connection error handling */}
          {activeQuery && (
            <ConnectionErrorHandler 
              queryId={activeQuery.query_id}
              showDetails={true}
              onRetry={() => {
                // Retry WebSocket connection
                connectWebSocket(activeQuery.query_id);
              }}
            />
          )}
        </Grid>
      </Grid>

      {/* Loading indicator for exports */}
      {isExporting && (
        <Box sx={{ position: 'fixed', bottom: 24, right: 24 }}>
          <Card sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <CircularProgress size={20} />
              <Typography variant="body2">
                Exportiere...
              </Typography>
            </Box>
          </Card>
        </Box>
      )}
    </Box>
  );
};

export default ResultsPage;