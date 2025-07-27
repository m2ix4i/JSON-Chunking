/**
 * Hook for responsive layout detection and utilities.
 */

import { useState, useEffect } from 'react';
import { useTheme, useMediaQuery } from '@mui/material';

export interface ResponsiveBreakpoints {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isSmall: boolean;
  isMedium: boolean;
  isLarge: boolean;
  isXLarge: boolean;
}

export interface ResponsiveLayout extends ResponsiveBreakpoints {
  breakpoint: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  orientation: 'portrait' | 'landscape';
  columns: number;
  maxWidth: string;
}

export const useResponsiveLayout = (): ResponsiveLayout => {
  const theme = useTheme();
  
  // Media query hooks
  const isXs = useMediaQuery(theme.breakpoints.only('xs'));
  const isSm = useMediaQuery(theme.breakpoints.only('sm'));
  const isMd = useMediaQuery(theme.breakpoints.only('md'));
  const isLg = useMediaQuery(theme.breakpoints.only('lg'));
  const isXl = useMediaQuery(theme.breakpoints.only('xl'));
  
  const isLarge = useMediaQuery(theme.breakpoints.up('lg'));
  
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.between('md', 'lg'));
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));
  
  // Orientation detection
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape');
  
  useEffect(() => {
    const handleOrientationChange = () => {
      setOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape');
    };
    
    handleOrientationChange();
    window.addEventListener('resize', handleOrientationChange);
    
    return () => window.removeEventListener('resize', handleOrientationChange);
  }, []);
  
  // Determine current breakpoint
  let breakpoint: 'xs' | 'sm' | 'md' | 'lg' | 'xl' = 'md';
  if (isXs) breakpoint = 'xs';
  else if (isSm) breakpoint = 'sm';
  else if (isMd) breakpoint = 'md';
  else if (isLg) breakpoint = 'lg';
  else if (isXl) breakpoint = 'xl';
  
  // Calculate responsive columns
  const getColumns = (): number => {
    if (isMobile) return 1;
    if (isTablet) return 2;
    if (isLarge) return 3;
    return 2;
  };
  
  // Get max width for current breakpoint
  const getMaxWidth = (): string => {
    switch (breakpoint) {
      case 'xs': return '100%';
      case 'sm': return '600px';
      case 'md': return '900px';
      case 'lg': return '1200px';
      case 'xl': return '1536px';
      default: return '900px';
    }
  };
  
  return {
    // Individual breakpoint checks
    isXLarge: isXl,
    isLarge: isLg,
    isMedium: isMd,
    isSmall: isSm,
    
    // Grouped breakpoint checks
    isMobile,
    isTablet,
    isDesktop,
    
    // Current breakpoint
    breakpoint,
    orientation,
    columns: getColumns(),
    maxWidth: getMaxWidth(),
  };
};

export default useResponsiveLayout;