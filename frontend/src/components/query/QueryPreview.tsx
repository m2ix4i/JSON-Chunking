/**
 * Query preview component showing expected results and processing information.
 * Refactored to follow Single Responsibility Principle with focused components.
 */

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Alert,
  Skeleton,
} from '@mui/material';

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
  }

  if (error) {
    return (
      <Card>
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
      </CardContent>
    </Card>
  );
};

export default QueryPreview;