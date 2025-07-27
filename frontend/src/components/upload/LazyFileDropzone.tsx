/**
 * Lazy-loaded file dropzone component with loading fallback
 * Provides performance optimization for file upload UI
 */

import React, { lazy, Suspense } from 'react';
import { 
  Box, 
  Skeleton, 
  Card, 
  CardContent, 
  Typography,
  Stack
} from '@mui/material';
import { CloudUpload as UploadIcon } from '@mui/icons-material';

// File dropzone loading fallback
const FileDropzoneLoadingFallback: React.FC = () => (
  <Card 
    sx={{ 
      border: '2px dashed',
      borderColor: 'divider',
      bgcolor: 'action.hover',
      textAlign: 'center',
      py: 6,
      px: 4
    }}
  >
    <CardContent>
      <Stack spacing={2} alignItems="center">
        <UploadIcon sx={{ fontSize: 48, color: 'action.disabled' }} />
        <Typography variant="h6" color="text.secondary">
          Loading file upload...
        </Typography>
        <Box sx={{ width: '100%', maxWidth: 400 }}>
          <Skeleton variant="rectangular" height={40} sx={{ mb: 1 }} />
          <Skeleton variant="text" width="60%" sx={{ mx: 'auto' }} />
        </Box>
      </Stack>
    </CardContent>
  </Card>
);

// Lazy load the actual FileDropzone component
const FileDropzone = lazy(() => import('./FileDropzone'));

// Lazy wrapper component
export const LazyFileDropzone: React.FC<{
  onFileUpload?: (file: File) => void;
  accept?: string;
  maxSize?: number;
  disabled?: boolean;
}> = (props) => (
  <Suspense fallback={<FileDropzoneLoadingFallback />}>
    <FileDropzone {...props} />
  </Suspense>
);

export default LazyFileDropzone;