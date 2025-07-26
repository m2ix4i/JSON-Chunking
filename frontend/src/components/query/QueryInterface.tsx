/**
 * Query interface component - handles the main query form and progress tracking.
 * Focused component following Single Responsibility Principle.
<<<<<<< HEAD
 * Updated to work with enhanced components from main branch.
=======
>>>>>>> 2487d42c20845effc574409a994d5aaf6a8d412b
 */

import React from 'react';
import {
  Box,
  Grid,
  Alert,
} from '@mui/material';

// Components
import QueryForm from './QueryForm';
<<<<<<< HEAD
import QueryProgress from './QueryProgress';
=======
import QueryProgressTracker from '@components/progress/QueryProgressTracker';
>>>>>>> 2487d42c20845effc574409a994d5aaf6a8d412b
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
      
<<<<<<< HEAD
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
=======
      {/* Real-time query progress display */}
      {activeQuery && (
        <Box sx={{ mt: 3 }}>
          <QueryProgressTracker 
            queryId={activeQuery.query_id}
            compact={false}
>>>>>>> 2487d42c20845effc574409a994d5aaf6a8d412b
          />
        </Box>
      )}
      
<<<<<<< HEAD
      {/* Real-time query progress display */}
      {activeQuery && (
        <Box sx={{ mt: 2 }}>
          <QueryProgress compact={false} />
        </Box>
      )}
      
=======
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
>>>>>>> 2487d42c20845effc574409a994d5aaf6a8d412b
      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
    </Grid>
  );
};

export default QueryInterface;