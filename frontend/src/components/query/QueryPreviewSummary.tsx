/**
<<<<<<< HEAD
 * Query preview summary component - displays high-level preview information.
=======
 * Query preview summary component - displays basic preview information.
>>>>>>> 2487d42c20845effc574409a994d5aaf6a8d412b
 * Focused component following Single Responsibility Principle.
 */

import React from 'react';
import {
  Box,
  Typography,
  Chip,
<<<<<<< HEAD
  Stack,
  LinearProgress,
} from '@mui/material';
=======
  IconButton,
  Tooltip,
  Badge,
} from '@mui/material';
import {
  Preview as PreviewIcon,
  Speed as ComplexityIcon,
  Timer as DurationIcon,
  DataObject as DataIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
>>>>>>> 2487d42c20845effc574409a994d5aaf6a8d412b

import type { QueryPreview } from '@/types/app';

interface QueryPreviewSummaryProps {
<<<<<<< HEAD
  preview: QueryPreview;
  isGenerating?: boolean;
=======
  preview: QueryPreview & { confidence?: number };
  isGenerating: boolean;
  onRefresh: () => void;
  compact?: boolean;
>>>>>>> 2487d42c20845effc574409a994d5aaf6a8d412b
}

const QueryPreviewSummary: React.FC<QueryPreviewSummaryProps> = ({
  preview,
<<<<<<< HEAD
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
=======
  isGenerating,
  onRefresh,
  compact = false,
}) => {
  const getComplexityColor = (score: number) => {
    if (score <= 3) return 'success';
    if (score <= 6) return 'warning';
    return 'error';
  };

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <Box sx={{ p: 2 }}>
      <Box 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          mb: 2 
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PreviewIcon color="primary" />
          <Typography variant={compact ? "subtitle2" : "h6"}>
            Abfrage-Vorschau
          </Typography>
          {preview.confidence && (
            <Badge 
              badgeContent={`${Math.round(preview.confidence * 100)}%`} 
              color="primary"
              variant="standard"
            />
          )}
        </Box>
        
        <Tooltip title="Vorschau aktualisieren">
          <IconButton 
            onClick={onRefresh} 
            disabled={isGenerating}
            size={compact ? "small" : "medium"}
          >
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
        <Chip
          icon={<DataIcon />}
          label={`≈ ${preview.estimatedResults} Ergebnisse`}
          variant="outlined"
          size={compact ? "small" : "medium"}
        />
        
        <Chip
          icon={<ComplexityIcon />}
          label={`Komplexität: ${preview.complexity.score}/10`}
          color={getComplexityColor(preview.complexity.score)}
          variant="outlined"
          size={compact ? "small" : "medium"}
        />
        
        <Chip
          icon={<DurationIcon />}
          label={`≈ ${formatDuration(preview.resourceEstimate.estimatedDuration)}`}
          variant="outlined"
          size={compact ? "small" : "medium"}
        />
      </Box>

      {!compact && (
        <Typography variant="body2" color="text.secondary">
          {preview.complexity.recommendation}
        </Typography>
      )}
>>>>>>> 2487d42c20845effc574409a994d5aaf6a8d412b
    </Box>
  );
};

export default QueryPreviewSummary;