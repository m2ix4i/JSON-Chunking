/**
 * Lazy wrapper component with intelligent loading states.
 * Provides consistent Suspense boundaries and skeleton loading.
 */

import React, { Suspense, ReactNode } from 'react';
import { Box, Skeleton, Card, CardContent, Typography } from '@mui/material';

interface LazyWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
  type?: 'page' | 'component' | 'dialog';
}

const PageSkeleton: React.FC = () => (
  <Box sx={{ p: 3 }}>
    {/* Header skeleton */}
    <Skeleton variant="text" width="40%" height={48} sx={{ mb: 2 }} />
    <Skeleton variant="text" width="60%" height={24} sx={{ mb: 4 }} />
    
    {/* Content skeleton */}
    <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}>
          <CardContent>
            <Skeleton variant="rectangular" height={200} sx={{ mb: 2 }} />
            <Skeleton variant="text" width="80%" height={24} sx={{ mb: 1 }} />
            <Skeleton variant="text" width="60%" height={20} />
          </CardContent>
        </Card>
      ))}
    </Box>
  </Box>
);

const ComponentSkeleton: React.FC = () => (
  <Card>
    <CardContent>
      <Skeleton variant="text" width="30%" height={32} sx={{ mb: 2 }} />
      <Skeleton variant="rectangular" height={120} sx={{ mb: 2 }} />
      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
        <Skeleton variant="rectangular" width={80} height={36} />
        <Skeleton variant="rectangular" width={100} height={36} />
      </Box>
    </CardContent>
  </Card>
);

const DialogSkeleton: React.FC = () => (
  <Box sx={{ p: 3, minWidth: 400 }}>
    <Skeleton variant="text" width="50%" height={32} sx={{ mb: 3 }} />
    <Skeleton variant="rectangular" height={200} sx={{ mb: 3 }} />
    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
      <Skeleton variant="rectangular" width={80} height={36} />
      <Skeleton variant="rectangular" width={100} height={36} />
    </Box>
  </Box>
);

export const LazyWrapper: React.FC<LazyWrapperProps> = ({ 
  children, 
  fallback,
  type = 'page' 
}) => {
  const defaultFallback = React.useMemo(() => {
    if (fallback) return fallback;
    
    switch (type) {
      case 'page':
        return <PageSkeleton />;
      case 'component':
        return <ComponentSkeleton />;
      case 'dialog':
        return <DialogSkeleton />;
      default:
        return <PageSkeleton />;
    }
  }, [fallback, type]);

  return (
    <Suspense fallback={defaultFallback}>
      {children}
    </Suspense>
  );
};

export default LazyWrapper;