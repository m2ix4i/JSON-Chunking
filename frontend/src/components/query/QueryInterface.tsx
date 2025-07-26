/**
 * Query interface component - handles the main query form and progress tracking.
 * Focused component following Single Responsibility Principle.
 */

import React from 'react';
import {
  Box,
  Grid,
  Alert,
} from '@mui/material';

// Components
import QueryForm from './QueryForm';
import QueryProgressTracker from '@components/progress/QueryProgressTracker';
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
      
      {/* Real-time query progress display */}
      {activeQuery && (
        <Box sx={{ mt: 3 }}>
          <QueryProgressTracker 
            queryId={activeQuery.query_id}
            compact={false}
          />
        </Box>
      )}
      
      {/* Connection error handling */}
      {activeQuery && (
        <Box sx={{ mt: 2 }}>
          <ConnectionErrorHandler 
            queryId={activeQuery.query_id}
            showDetails={true}
            onRetry={onRetry}
          />
        </Box>
      )}
      
      {/* General error display */}
      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
    </Grid>
  );
};

export default QueryInterface;