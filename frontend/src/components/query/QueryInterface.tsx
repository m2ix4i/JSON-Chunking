/**
 * Query interface component - handles the main query form and progress tracking.
 * Focused component following Single Responsibility Principle.
 * Updated to work with enhanced components from main branch.
 */

import React from 'react';
import {
  Box,
  Grid,
  Alert,
} from '@mui/material';

// Components
import QueryForm from './QueryForm';
import QueryProgress from './QueryProgress';
import ConnectionErrorHandler from '@components/error/ConnectionErrorHandler';

interface QueryInterfaceProps {
  activeQuery: { query_id: string } | null;
  isSubmitting: boolean;
  error: string | null;
  onSubmit: () => Promise<void>;
  onRetry: () => void;
}

const QueryInterface: React.FC<QueryInterfaceProps> = ({
  activeQuery,
  isSubmitting,
  error,
  onSubmit,
  onRetry,
}) => {
  return (
    <Grid item xs={12} lg={8}>
      <QueryForm 
        onSubmit={onSubmit}
        isSubmitting={isSubmitting}
        disabled={false}
      />
      
      {/* Connection error handling */}
      {activeQuery && (
        <Box sx={{ mt: 3 }}>
          <ConnectionErrorHandler 
            queryId={activeQuery.query_id}
            showDetails={true}
            onRetry={() => {
              // Refresh the page or restart the query
              window.location.reload();
            }}
          />
        </Box>
      )}
      
      {/* Real-time query progress display */}
      {activeQuery && (
        <Box sx={{ mt: 2 }}>
          <QueryProgress compact={false} />
        </Box>
      )}
      
      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
    </Grid>
  );
};

export default QueryInterface;