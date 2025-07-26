/**
<<<<<<< HEAD
 * Main QueryPreview component - orchestrates focused preview components.
 * Refactored from 615-line component to follow Single Responsibility Principle.
 * Uses composition over large monolithic component.
 */

import React from 'react';
=======
 * Query preview component showing expected results and processing information.
 * Refactored to follow Single Responsibility Principle with focused components.
 */

import React, { useState } from 'react';
>>>>>>> 2487d42c20845effc574409a994d5aaf6a8d412b
import {
  Box,
  Card,
  CardContent,
  Typography,
  Alert,
  Skeleton,
} from '@mui/material';

<<<<<<< HEAD
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
=======
import { useQueryPreview } from '@/hooks/useQueryPreview';
import QueryPreviewSummary from './QueryPreviewSummary';
import QueryPreviewSections from './QueryPreviewSections';
import type { QueryPreview as QueryPreviewType } from '@/types/app';

interface QueryPreviewProps {
  query: string;
  fileId?: string;
  compact?: boolean;
  autoRefresh?: boolean;
  debounceMs?: number;
  onPreviewChange?: (preview: QueryPreviewType | null) => void;
}

const QueryPreview: React.FC<QueryPreviewProps> = ({
  query,
  fileId,
  compact = false,
  autoRefresh = true,
  debounceMs = 500,
  onPreviewChange,
}) => {
  const { preview, isGenerating, error, refreshPreview } = useQueryPreview(
    query,
    fileId,
    { autoRefresh, debounceMs, onPreviewChange }
  );
  
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(compact ? [] : ['structure', 'complexity'])
  );

  // Toggle section expansion
  const handleToggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  // Render skeleton loading
  const renderSkeleton = () => (
    <Box sx={{ p: 2 }}>
      <Skeleton variant="text" width="60%" height={32} />
      <Skeleton variant="rectangular" width="100%" height={100} sx={{ mt: 2 }} />
      <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
        <Skeleton variant="rectangular" width={80} height={32} />
        <Skeleton variant="rectangular" width={120} height={32} />
        <Skeleton variant="rectangular" width={100} height={32} />
      </Box>
    </Box>
  );

  if (!query.trim() || query.length < 5) {
    return (
      <Card>
        <CardContent>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            Geben Sie eine Abfrage ein (min. 5 Zeichen), um eine Vorschau zu sehen.
          </Typography>
        </CardContent>
      </Card>
    );
>>>>>>> 2487d42c20845effc574409a994d5aaf6a8d412b
  }

  if (error) {
    return (
<<<<<<< HEAD
      <Card sx={{ mt: 2 }}>
=======
      <Card>
>>>>>>> 2487d42c20845effc574409a994d5aaf6a8d412b
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

<<<<<<< HEAD
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
=======
  return (
    <Card>
      <CardContent>
        {isGenerating && renderSkeleton()}
        
        {preview && (
          <>
            <QueryPreviewSummary
              preview={preview}
              isGenerating={isGenerating}
              onRefresh={refreshPreview}
              compact={compact}
            />

            {!compact && (
              <QueryPreviewSections
                preview={preview}
                expandedSections={expandedSections}
                onToggleSection={handleToggleSection}
                compact={compact}
              />
            )}
          </>
        )}
>>>>>>> 2487d42c20845effc574409a994d5aaf6a8d412b
      </CardContent>
    </Card>
  );
};

export default QueryPreview;