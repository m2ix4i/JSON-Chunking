/**
 * Lazy-loaded file selector component with loading fallback
 * Provides performance optimization for file selection UI
 */

import React, { lazy, Suspense } from 'react';
import { 
  Box, 
  Skeleton, 
  Card, 
  CardContent, 
  Typography, 
  List,
  ListItem 
} from '@mui/material';

// File selector loading fallback
const FileSelectorLoadingFallback: React.FC<{ 
  title?: string;
  compact?: boolean;
}> = ({ 
  title = "Select File",
  compact = false
}) => (
  <Card>
    <CardContent sx={{ p: compact ? 2 : 3 }}>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      <Box sx={{ mt: 2 }}>
        <Skeleton variant="text" width="60%" height={32} sx={{ mb: 1 }} />
        <List>
          {[1, 2, 3].map((i) => (
            <ListItem key={i} sx={{ p: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 2 }}>
                <Skeleton variant="rectangular" width={40} height={40} />
                <Box sx={{ flex: 1 }}>
                  <Skeleton variant="text" width="70%" />
                  <Skeleton variant="text" width="40%" />
                </Box>
                <Skeleton variant="rectangular" width={60} height={24} />
              </Box>
            </ListItem>
          ))}
        </List>
      </Box>
    </CardContent>
  </Card>
);

// Lazy load the actual FileSelector component
const FileSelector = lazy(() => import('./FileSelector'));

// Lazy wrapper component
export const LazyFileSelector: React.FC<{
  title?: string;
  showUploadPrompt?: boolean;
  compact?: boolean;
  onFileSelected?: (file: any) => void;
}> = (props) => (
  <Suspense fallback={
    <FileSelectorLoadingFallback 
      title={props.title} 
      compact={props.compact} 
    />
  }>
    <FileSelector {...props} />
  </Suspense>
);

export default LazyFileSelector;