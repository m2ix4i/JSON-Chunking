/**
 * Query preview summary component - displays basic preview information.
 * Focused component following Single Responsibility Principle.
 */

import React from 'react';
import {
  Box,
  Typography,
  Chip,
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

import type { QueryPreview } from '@/types/app';

interface QueryPreviewSummaryProps {
  preview: QueryPreview & { confidence?: number };
  isGenerating: boolean;
  onRefresh: () => void;
  compact?: boolean;
}

const QueryPreviewSummary: React.FC<QueryPreviewSummaryProps> = ({
  preview,
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
    </Box>
  );
};

export default QueryPreviewSummary;