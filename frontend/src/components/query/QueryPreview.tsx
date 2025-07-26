/**
 * Main QueryPreview component - orchestrates focused preview components.
 * Refactored from 615-line component to follow Single Responsibility Principle.
 * Uses composition over large monolithic component.
 */

import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Alert,
  Skeleton,
} from '@mui/material';

// Hooks
import { useQueryPreview } from '@hooks/useQueryPreview';

// Components
import QueryPreviewSummary from './QueryPreviewSummary';
import QueryPreviewSections from './QueryPreviewSections';

interface QueryPreviewProps {
  queryText: string;
  fileId?: string;
  onPreviewChange?: (hasPreview: boolean) => void;
}

const QueryPreview: React.FC<QueryPreviewProps> = ({
  queryText,
  fileId,
  onPreviewChange,
}) => {
  const { preview, isGenerating, error } = useQueryPreview(queryText, fileId);

  // Notify parent of preview state changes
  React.useEffect(() => {
    onPreviewChange?.(!!preview);
  }, [preview, onPreviewChange]);

  if (!queryText.trim()) {
    return null;
  }

  if (error) {
    return (
      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Alert severity="error">
            <Typography variant="body2">
              {error}
            </Typography>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (isGenerating) {
    return (
      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Box sx={{ mb: 2 }}>
            <Skeleton variant="text" width="40%" height={32} />
            <Skeleton variant="text" width="60%" height={24} />
          </Box>
          <Box sx={{ mb: 2 }}>
            <Skeleton variant="rectangular" height={120} />
          </Box>
          <Box>
            <Skeleton variant="rectangular" height={200} />
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (!preview) {
    return null;
  }

  return (
    <Card sx={{ mt: 2 }}>
      <CardContent>
        <QueryPreviewSummary 
          preview={preview} 
          isGenerating={isGenerating} 
        />
        <QueryPreviewSections preview={preview} />
      </CardContent>
    </Card>
  );
};

export default QueryPreview;