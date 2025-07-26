/**
 * Results page - display query results.
 * Shows structured query results with live status updates.
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
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

const ResultsPage: React.FC = () => {
  const { queryId } = useParams<{ queryId: string }>();
  const navigate = useNavigate();
  
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
            >
              Neue Abfrage starten
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

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
    </Box>
  );
};

export default ResultsPage;