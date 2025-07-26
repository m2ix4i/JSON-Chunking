/**
 * QueryHistoryList - Container component for displaying query history
 * Manages history loading, pagination, and action handling
 */

import React, { useEffect } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Stack,
  Pagination,
  Paper,
} from '@mui/material';
import { History as HistoryIcon } from '@mui/icons-material';
import { useQueryHistory, useQueryHistoryActions } from '@/stores/queryStore';
import QueryHistoryItem from './QueryHistoryItem';
import { useNavigate } from 'react-router-dom';

interface QueryHistoryListProps {
  searchTerm?: string;
  statusFilter?: string | null;
}

const QueryHistoryList: React.FC<QueryHistoryListProps> = ({
  searchTerm = '',
  statusFilter = null,
}) => {
  const navigate = useNavigate();
  const history = useQueryHistory();
  const { 
    loadQueryHistory, 
    updateHistoryPagination, 
    deleteQuery, 
    rerunQuery 
  } = useQueryHistoryActions();

  // Load initial history and when filters change
  useEffect(() => {
    loadQueryHistory({
      page: 1,
      status: statusFilter || undefined,
      search: searchTerm || undefined,
    });
  }, [searchTerm, statusFilter, loadQueryHistory]);

  // Handle page change
  const handlePageChange = (event: React.ChangeEvent<unknown>, page: number) => {
    updateHistoryPagination({ page });
    loadQueryHistory({
      page,
      status: statusFilter || undefined,
      search: searchTerm || undefined,
    });
  };

  // Handle query rerun - navigate to query page with prefilled text
  const handleRerun = (queryId: string) => {
    rerunQuery(queryId);
    // Navigate to query page
    navigate('/query');
  };

  // Handle viewing results - navigate to results page
  const handleViewResults = (queryId: string) => {
    navigate(`/results?query_id=${queryId}`);
  };

  // Handle query deletion
  const handleDelete = async (queryId: string) => {
    try {
      await deleteQuery(queryId);
      // Reload current page to reflect changes
      loadQueryHistory({
        page: history.pagination.page,
        status: statusFilter || undefined,
        search: searchTerm || undefined,
      });
    } catch (error) {
      console.error('Error deleting query:', error);
    }
  };

  // Show loading state
  if (history.loading && history.queries.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" py={8}>
        <Stack spacing={2} alignItems="center">
          <CircularProgress size={48} />
          <Typography variant="body1" color="text.secondary">
            Verlauf wird geladen...
          </Typography>
        </Stack>
      </Box>
    );
  }

  // Show error state
  if (history.error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        <Typography variant="body2">
          <strong>Fehler beim Laden des Verlaufs:</strong> {history.error}
        </Typography>
      </Alert>
    );
  }

  // Show empty state
  if (history.queries.length === 0) {
    return (
      <Paper sx={{ p: 6, textAlign: 'center', backgroundColor: 'grey.50' }}>
        <HistoryIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" gutterBottom color="text.secondary">
          Noch keine Abfragen vorhanden
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {searchTerm || statusFilter 
            ? 'Keine Abfragen entsprechen den aktuellen Filtern.'
            : 'Ihre bisherigen Abfragen werden hier angezeigt.'
          }
        </Typography>
      </Paper>
    );
  }

  const totalPages = Math.ceil(history.pagination.total / history.pagination.limit);

  return (
    <Box>
      {/* History items */}
      <Stack spacing={2} sx={{ mb: 4 }}>
        {history.queries.map((query) => (
          <QueryHistoryItem
            key={query.query_id}
            query={query}
            onRerun={handleRerun}
            onViewResults={handleViewResults}
            onDelete={handleDelete}
            disabled={history.loading}
          />
        ))}
      </Stack>

      {/* Loading overlay for pagination */}
      {history.loading && history.queries.length > 0 && (
        <Box 
          position="relative" 
          display="flex" 
          justifyContent="center" 
          alignItems="center" 
          py={2}
        >
          <CircularProgress size={24} />
          <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
            Wird geladen...
          </Typography>
        </Box>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Box display="flex" justifyContent="center" mt={4}>
          <Stack spacing={2} alignItems="center">
            <Pagination
              count={totalPages}
              page={history.pagination.page}
              onChange={handlePageChange}
              disabled={history.loading}
              size="large"
              showFirstButton
              showLastButton
              sx={{
                '& .MuiPaginationItem-root': {
                  fontSize: '0.875rem',
                },
              }}
            />
            
            {/* Results summary */}
            <Typography variant="body2" color="text.secondary">
              Seite {history.pagination.page} von {totalPages} 
              {' '}({history.pagination.total} Abfragen gesamt)
            </Typography>
          </Stack>
        </Box>
      )}
    </Box>
  );
};

export default QueryHistoryList;