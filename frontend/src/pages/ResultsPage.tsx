/**
 * Results page - comprehensive query results display with real-time tracking.
 */

import React, { useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Alert,
  Button,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Assessment as ResultsIcon,
  Timeline as ProgressIcon,
  Add as NewQueryIcon,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';

// Components
import QueryResultDisplay from '@components/results/QueryResultDisplay';
import QueryProgressTracker from '@components/progress/QueryProgressTracker';

// Store hooks
import { useActiveQueries, useQueryMonitoring } from '@stores/queryStore';
import { showSuccessNotification, showErrorNotification } from '@stores/appStore';

// Types
import type { QueryResultResponse } from '@types/api';

const ResultsPage: React.FC = () => {
  const navigate = useNavigate();
  const { queryId } = useParams<{ queryId?: string }>();
  const activeQueries = useActiveQueries();
  const { getQueryResult } = useQueryMonitoring();
  
  const [activeTab, setActiveTab] = React.useState(0);

  // Get the specific query if queryId is provided
  const selectedQuery = queryId ? activeQueries[queryId] : null;
  
  // Get all queries with results
  const completedQueries = Object.values(activeQueries).filter(
    query => query.result && query.status.status === 'completed'
  );

  const activeQueriesArray = Object.values(activeQueries).filter(
    query => ['started', 'preprocessing', 'processing'].includes(query.status.status)
  );

  useEffect(() => {
    // If a specific query is requested and it's completed, try to get its result
    if (queryId && selectedQuery && selectedQuery.status.status === 'completed' && !selectedQuery.result) {
      getQueryResult(queryId).catch(() => {
        showErrorNotification('Ergebnis konnte nicht geladen werden');
      });
    }
  }, [queryId, selectedQuery, getQueryResult]);

  const handleExportResult = (result: QueryResultResponse, format: 'json' | 'csv' | 'pdf') => {
    try {
      if (format === 'json') {
        const dataStr = JSON.stringify(result, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `query_result_${result.query_id}.json`;
        link.click();
        URL.revokeObjectURL(url);
        showSuccessNotification('Ergebnis als JSON exportiert');
      } else {
        showErrorNotification(`Export-Format ${format} wird noch nicht unterstützt`);
      }
    } catch (error) {
      showErrorNotification('Export fehlgeschlagen');
    }
  };

  const handleShareResult = (result: QueryResultResponse) => {
    if (navigator.share) {
      navigator.share({
        title: 'IFC Abfrage-Ergebnis',
        text: `Abfrage: ${result.original_query}\n\nAntwort: ${result.answer}`,
        url: window.location.href,
      }).catch(() => {
        // Fallback to clipboard
        handleCopyResultLink(result);
      });
    } else {
      handleCopyResultLink(result);
    }
  };

  const handleCopyResultLink = async (result: QueryResultResponse) => {
    try {
      const url = `${window.location.origin}/results/${result.query_id}`;
      await navigator.clipboard.writeText(url);
      showSuccessNotification('Link in Zwischenablage kopiert');
    } catch (error) {
      showErrorNotification('Link kopieren fehlgeschlagen');
    }
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // If a specific query is requested
  if (queryId) {
    if (!selectedQuery) {
      return (
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Abfrage nicht gefunden
          </Typography>
          
          <Alert severity="error" sx={{ mb: 3 }}>
            Die angeforderte Abfrage mit ID "{queryId}" wurde nicht gefunden.
          </Alert>
          
          <Button onClick={() => navigate('/results')}>
            Zurück zu allen Ergebnissen
          </Button>
        </Box>
      );
    }

    return (
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          Abfrage-Ergebnis
        </Typography>
        
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Detaillierte Anzeige für Abfrage {queryId.slice(0, 8)}...
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} lg={8}>
            {selectedQuery.result ? (
              <QueryResultDisplay
                result={selectedQuery.result}
                onExport={(format) => handleExportResult(selectedQuery.result!, format)}
                onShare={() => handleShareResult(selectedQuery.result!)}
              />
            ) : (
              <QueryProgressTracker queryId={queryId} />
            )}
          </Grid>
          
          <Grid item xs={12} lg={4}>
            <QueryProgressTracker queryId={queryId} compact />
          </Grid>
        </Grid>
      </Box>
    );
  }

  // Main results page
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Ergebnisse
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Übersicht über alle Ihre Abfragen und deren Ergebnisse.
          </Typography>
        </Box>
        
        <Button
          variant="contained"
          startIcon={<NewQueryIcon />}
          onClick={() => navigate('/query')}
        >
          Neue Abfrage
        </Button>
      </Box>

      {/* Tabs for different views */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab 
            label={`Abgeschlossen (${completedQueries.length})`} 
            icon={<ResultsIcon />} 
            iconPosition="start" 
          />
          <Tab 
            label={`Aktiv (${activeQueriesArray.length})`} 
            icon={<ProgressIcon />} 
            iconPosition="start" 
          />
        </Tabs>
      </Box>

      {/* Completed queries tab */}
      {activeTab === 0 && (
        <Box>
          {completedQueries.length === 0 ? (
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 6 }}>
                <ResultsIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                
                <Typography variant="h6" gutterBottom>
                  Noch keine abgeschlossenen Abfragen
                </Typography>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Erstellen Sie eine neue Abfrage, um Ergebnisse zu sehen.
                </Typography>
                
                <Button
                  variant="contained"
                  startIcon={<NewQueryIcon />}
                  onClick={() => navigate('/query')}
                >
                  Erste Abfrage erstellen
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Grid container spacing={3}>
              {completedQueries.map((query) => (
                <Grid item xs={12} key={query.queryId}>
                  {query.result && (
                    <QueryResultDisplay
                      result={query.result}
                      onExport={(format) => handleExportResult(query.result!, format)}
                      onShare={() => handleShareResult(query.result!)}
                    />
                  )}
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}

      {/* Active queries tab */}
      {activeTab === 1 && (
        <Box>
          {activeQueriesArray.length === 0 ? (
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 6 }}>
                <ProgressIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                
                <Typography variant="h6" gutterBottom>
                  Keine aktiven Abfragen
                </Typography>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Starten Sie eine neue Abfrage, um den Fortschritt hier zu verfolgen.
                </Typography>
                
                <Button
                  variant="contained"
                  startIcon={<NewQueryIcon />}
                  onClick={() => navigate('/query')}
                >
                  Neue Abfrage starten
                </Button>
              </CardContent>
            </Card>
          ) : (
            <QueryProgressTracker showAllQueries />
          )}
        </Box>
      )}
    </Box>
  );
};

export default ResultsPage;