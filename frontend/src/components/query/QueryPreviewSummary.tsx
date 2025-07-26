/**
 * Query preview summary component - displays high-level preview information.
 * Focused component following Single Responsibility Principle.
 */

import React from 'react';
import {
  Box,
  Typography,
  Chip,
  Stack,
  LinearProgress,
} from '@mui/material';

import type { QueryPreview } from '@/types/app';

interface QueryPreviewSummaryProps {
  preview: QueryPreview;
  isGenerating?: boolean;
}

const QueryPreviewSummary: React.FC<QueryPreviewSummaryProps> = ({
  preview,
  isGenerating = false,
}) => {
  const { estimatedResults, complexity, resourceEstimate } = preview;

  const getComplexityColor = (score: number) => {
    if (score <= 4) return 'success';
    if (score <= 7) return 'warning';
    return 'error';
  };

  return (
    <Box sx={{ mb: 3 }}>
      {isGenerating && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Generiere Vorschau...
          </Typography>
          <LinearProgress />
        </Box>
      )}

      <Typography variant="h6" gutterBottom>
        Abfrage-Vorschau
      </Typography>

      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <Chip
          label={`${estimatedResults} Ergebnisse`}
          color="primary"
          variant="outlined"
        />
        <Chip
          label={`Komplexität: ${complexity.score}/10`}
          color={getComplexityColor(complexity.score)}
          variant="outlined"
        />
        <Chip
          label={`~${resourceEstimate.estimatedDuration}s`}
          color="info"
          variant="outlined"
        />
      </Stack>

      <Typography variant="body2" color="text.secondary">
        {complexity.recommendation}
      </Typography>
    </Box>
  );
};

export default QueryPreviewSummary;