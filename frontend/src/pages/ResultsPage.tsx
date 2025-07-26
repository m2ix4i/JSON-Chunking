/**
<<<<<<< HEAD
 * Results page with real-time WebSocket integration for live query status updates.
 */

import React, { useEffect, useState } from 'react';
=======
 * Results page - display query results.
 * Shows structured query results with live status updates.
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
>>>>>>> 057e15e5bbcfbdf9cfaaddab3cc19f3c9655126e
import {
  Box,
  Typography,
  Card,
  CardContent,
<<<<<<< HEAD
  Grid,
  Alert,
  CircularProgress,
  Button,
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { Assessment as ResultsIcon, ArrowBack as BackIcon } from '@mui/icons-material';

// Components
import QueryProgressTracker from '@components/progress/QueryProgressTracker';
import QueryResultDisplay from '@components/results/QueryResultDisplay';
import ConnectionErrorHandler from '@components/error/ConnectionErrorHandler';

// Store hooks
import { useQueryMonitoring, useQueryStore } from '@stores/queryStore';
=======
  CircularProgress,
  Alert,
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
import { useQueryStore } from '@stores/queryStore';
import { showErrorNotification, showSuccessNotification } from '@stores/appStore';

// Components
import QueryResultDisplay from '@components/results/QueryResultDisplay';
import QueryProgress from '@components/query/QueryProgress';

// Utils
import { exportQueryResult, shareQueryResult } from '@utils/export';
import type { ExportFormat } from '@utils/export';
>>>>>>> 057e15e5bbcfbdf9cfaaddab3cc19f3c9655126e

const ResultsPage: React.FC = () => {
  const { queryId } = useParams<{ queryId: string }>();
  const navigate = useNavigate();
<<<<<<< HEAD
  const { activeQuery, status, result, isConnected } = useQueryMonitoring();
  const { connectWebSocket, setActiveQuery } = useQueryStore();
  const [isLoading, setIsLoading] = useState(false);

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

  // If no queryId in URL, show general results page
  if (!queryId) {
=======
  
  // Query store state
  const { 
    error, 
    isSubmitting, 
    activeQuery, 
    queryStatus, 
    queryResult, 
    isConnected: isWebSocketConnected 
  } = useQueryStore();
  
  // Local state
  const [isExporting, setIsExporting] = useState(false);

  // Check if we have a result to display
  const hasResult = queryResult !== null;
  const hasActiveQuery = activeQuery !== null;
  const isProcessing = queryStatus && ['started', 'preprocessing', 'processing'].includes(queryStatus.status);
  const isCompleted = queryStatus?.status === 'completed';
  const isFailed = queryStatus?.status === 'failed' || error !== null;

  // Effect to handle URL-based query ID (for future implementation)
  useEffect(() => {
    if (queryId && queryId !== activeQuery?.query_id) {
      // TODO: Implement loading specific query by ID
      // For now, if the URL query ID doesn't match active query, show message
      console.log('Loading query by ID not yet implemented:', queryId);
    }
  }, [queryId, activeQuery?.query_id]);

  // Auto-refresh status when processing
  useEffect(() => {
    if (isProcessing && !isSubmitting) {
      // The queryStore already handles status monitoring
      // This effect could be used for additional refresh logic if needed
    }
  }, [isProcessing, isSubmitting]);

  // Export handler
  const handleExport = async (format: ExportFormat) => {
    if (!queryResult) return;

    setIsExporting(true);
    try {
      await exportQueryResult(queryResult, format);
      showSuccessNotification(`Ergebnis als ${format.toUpperCase()} exportiert`);
    } catch (error: any) {
      showErrorNotification(`Export fehlgeschlagen: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Share handler
  const handleShare = async () => {
    if (!queryResult) return;

    try {
      await shareQueryResult(queryResult);
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

  // Format processing time
  const formatDuration = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds.toFixed(1)}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
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
                label={isWebSocketConnected ? 'Live-Updates' : 'Standard-Polling'} 
                color={isWebSocketConnected ? 'success' : 'info'}
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
            {error || queryStatus?.error_message || 'Ein unbekannter Fehler ist aufgetreten.'}
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
>>>>>>> 057e15e5bbcfbdf9cfaaddab3cc19f3c9655126e
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
<<<<<<< HEAD
              Keine Abfrage ausgewählt
            </Typography>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Erstellen Sie eine neue Abfrage oder wählen Sie eine bestehende aus.
            </Typography>

            <Button 
              variant="contained" 
              onClick={() => navigate('/query')}
              startIcon={<BackIcon />}
            >
              Neue Abfrage erstellen
=======
              Keine Abfrage-Ergebnisse
            </Typography>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Starten Sie eine neue Abfrage, um Ergebnisse anzuzeigen.
            </Typography>

            <Button
              variant="contained"
              onClick={handleBackToQuery}
            >
              Neue Abfrage starten
>>>>>>> 057e15e5bbcfbdf9cfaaddab3cc19f3c9655126e
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

<<<<<<< HEAD
  return (
    <Box>
      {/* Page header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Abfrage-Ergebnisse
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Live-Überwachung und Ergebnisse für Abfrage {queryId.slice(0, 8)}...
        </Typography>
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
              {/* Real-time progress tracking */}
              {activeQuery && status?.status !== 'completed' && (
                <Box sx={{ mb: 3 }}>
                  <QueryProgressTracker 
                    queryId={queryId}
                    compact={false}
                    showAllQueries={false}
                  />
                </Box>
              )}

              {/* Query results display */}
              {result && status?.status === 'completed' ? (
                <QueryResultDisplay 
                  result={result}
                />
              ) : status?.status === 'failed' ? (
                <Alert severity="error" sx={{ mb: 3 }}>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    Abfrage fehlgeschlagen
                  </Typography>
                  <Typography variant="body2">
                    {status.error_message || 'Ein unbekannter Fehler ist aufgetreten.'}
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

        {/* Sidebar */}
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
                onClick={() => navigate('/query')}
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
=======
  // Render results
  return (
    <Box>
      {/* Header */}
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
            {queryResult && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                <Chip 
                  label={isCompleted ? 'Abgeschlossen' : 'Verarbeitung'} 
                  color={isCompleted ? 'success' : 'primary'}
                  size="small"
                />
                {isProcessing && (
                  <Chip 
                    label={isWebSocketConnected ? 'Live-Updates' : 'Polling'} 
                    color={isWebSocketConnected ? 'success' : 'info'}
                    size="small"
                    variant="outlined"
                  />
                )}
                {queryResult.processing_time && (
                  <Typography variant="body2" color="text.secondary">
                    • {formatDuration(queryResult.processing_time)}
                  </Typography>
                )}
              </Box>
            )}
          </Box>
        </Box>
      </Box>

      {/* Processing status banner (if still processing) */}
      {isProcessing && hasResult && (
        <Box sx={{ mb: 3 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              Die Abfrage wird noch verarbeitet. 
              {isWebSocketConnected 
                ? ' Die Ergebnisse werden in Echtzeit aktualisiert.' 
                : ' Die Ergebnisse werden regelmäßig aktualisiert.'}
            </Typography>
          </Alert>
          
          {/* Compact progress indicator */}
          <QueryProgress compact={true} />
        </Box>
      )}

      {/* Results display */}
      {queryResult && (
        <QueryResultDisplay
          result={queryResult}
          onExport={handleExport}
          onShare={handleShare}
        />
      )}

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
>>>>>>> 057e15e5bbcfbdf9cfaaddab3cc19f3c9655126e
    </Box>
  );
};

export default ResultsPage;