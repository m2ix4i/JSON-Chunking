/**
 * Results page with real-time WebSocket integration for live query status updates.
 */

import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
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

const ResultsPage: React.FC = () => {
  const { queryId } = useParams<{ queryId: string }>();
  const navigate = useNavigate();
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
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

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
    </Box>
  );
};

export default ResultsPage;