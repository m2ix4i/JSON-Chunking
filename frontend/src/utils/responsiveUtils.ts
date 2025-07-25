/**
 * Utility functions for responsive design and mobile optimization.
 */

// Touch and interaction utilities
export const isTouchDevice = (): boolean => {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

export const getViewportSize = () => {
  return {
    width: Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0),
    height: Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0),
  };
};

export const isLandscape = (): boolean => {
  const { width, height } = getViewportSize();
  return width > height;
};

export const isPortrait = (): boolean => {
  return !isLandscape();
};

// Device detection utilities
export const getDeviceType = () => {
  const { width } = getViewportSize();
  
  if (width <= 600) return 'mobile';
  if (width <= 960) return 'tablet';
  return 'desktop';
};

export const isIOS = (): boolean => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
};

export const isAndroid = (): boolean => {
  return /Android/.test(navigator.userAgent);
};

export const isSafari = (): boolean => {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
};

// Responsive breakpoint utilities
export const breakpoints = {
  xs: 0,
  sm: 600,
  md: 900,
  lg: 1200,
  xl: 1536,
} as const;

export type Breakpoint = keyof typeof breakpoints;

export const getBreakpoint = (width: number): Breakpoint => {
  if (width >= breakpoints.xl) return 'xl';
  if (width >= breakpoints.lg) return 'lg';
  if (width >= breakpoints.md) return 'md';
  if (width >= breakpoints.sm) return 'sm';
  return 'xs';
};

export const getCurrentBreakpoint = (): Breakpoint => {
  const { width } = getViewportSize();
  return getBreakpoint(width);
};

// Responsive value utilities
export type ResponsiveValue<T> = T | {
  xs?: T;
  sm?: T;
  md?: T;
  lg?: T;
  xl?: T;
};

export const getResponsiveValue = <T>(
  value: ResponsiveValue<T>,
  currentBreakpoint?: Breakpoint
): T => {
  if (!value || typeof value !== 'object') {
    return value as T;
  }

  const bp = currentBreakpoint || getCurrentBreakpoint();
  const responsive = value as Record<Breakpoint, T>;
  
  // Return exact match if available
  if (responsive[bp] !== undefined) {
    return responsive[bp];
  }
  
  // Find closest lower breakpoint
  const orderedBreakpoints: Breakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl'];
  const currentIndex = orderedBreakpoints.indexOf(bp);
  
  for (let i = currentIndex; i >= 0; i--) {
    const key = orderedBreakpoints[i];
    if (responsive[key] !== undefined) {
      return responsive[key];
    }
  }
  
  // Fallback to first available value
  return Object.values(responsive)[0] as T;
};

// Grid utilities
export interface ResponsiveGridProps {
  xs?: number;
  sm?: number;
  md?: number;
  lg?: number;
  xl?: number;
}

export const getGridColumns = (
  props: ResponsiveGridProps,
  currentBreakpoint?: Breakpoint
): number => {
  return getResponsiveValue(props, currentBreakpoint) || 12;
};

// Spacing utilities
export const getResponsiveSpacing = (
  base: number,
  scale: { mobile?: number; tablet?: number; desktop?: number } = {}
): ResponsiveValue<number> => {
  const { mobile = 0.75, tablet = 0.875, desktop = 1 } = scale;
  
  return {
    xs: Math.round(base * mobile),
    sm: Math.round(base * mobile),
    md: Math.round(base * tablet),
    lg: Math.round(base * desktop),
    xl: Math.round(base * desktop),
  };
};

// Typography utilities
export const getResponsiveFontSize = (
  base: string | number,
  scale: { mobile?: number; tablet?: number; desktop?: number } = {}
): ResponsiveValue<string> => {
  const { mobile = 0.875, tablet = 0.925, desktop = 1 } = scale;
  
  const baseSize = typeof base === 'string' ? parseFloat(base) : base;
  const unit = typeof base === 'string' ? base.replace(/[\d.]/g, '') : 'rem';
  
  return {
    xs: `${(baseSize * mobile).toFixed(3)}${unit}`,
    sm: `${(baseSize * mobile).toFixed(3)}${unit}`,
    md: `${(baseSize * tablet).toFixed(3)}${unit}`,
    lg: `${(baseSize * desktop).toFixed(3)}${unit}`,
    xl: `${(baseSize * desktop).toFixed(3)}${unit}`,
  };
};

// Layout utilities
export const getOptimalColumns = (
  itemCount: number,
  maxColumns: ResponsiveValue<number> = { xs: 1, sm: 2, md: 3, lg: 4 }
): ResponsiveValue<number> => {
  if (typeof maxColumns === 'number') {
    return Math.min(itemCount, maxColumns);
  }
  
  return {
    xs: Math.min(itemCount, maxColumns.xs || 1),
    sm: Math.min(itemCount, maxColumns.sm || 2),
    md: Math.min(itemCount, maxColumns.md || 3),
    lg: Math.min(itemCount, maxColumns.lg || 4),
    xl: Math.min(itemCount, maxColumns.xl || 4),
  };
};

// Touch interaction utilities
export const getTouchFriendlySize = (base: number): number => {
  // Ensure minimum 44px touch target for accessibility
  return Math.max(base, 44);
};

export const getSwipeThreshold = (): number => {
  const { width } = getViewportSize();
  // 15% of screen width or minimum 50px
  return Math.max(width * 0.15, 50);
};

// Performance utilities
export const shouldUseVirtualization = (
  itemCount: number,
  threshold: ResponsiveValue<number> = { xs: 20, sm: 50, md: 100 }
): boolean => {
  const currentThreshold = getResponsiveValue(threshold);
  return itemCount > currentThreshold;
};

export const getOptimalImageSize = (
  containerWidth: number,
  devicePixelRatio: number = window.devicePixelRatio || 1
): number => {
  // Account for high-DPI displays but cap at reasonable limits
  const maxMultiplier = devicePixelRatio > 2 ? 2 : devicePixelRatio;
  return Math.round(containerWidth * maxMultiplier);
};

// Animation utilities
export const getReducedMotionPreference = (): boolean => {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

export const getAnimationDuration = (base: number): number => {
  return getReducedMotionPreference() ? 0 : base;
};

// Accessibility utilities
export const announceToScreenReader = (message: string): void => {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', 'polite');
  announcement.setAttribute('aria-atomic', 'true');
  announcement.style.position = 'absolute';
  announcement.style.left = '-10000px';
  announcement.style.width = '1px';
  announcement.style.height = '1px';
  announcement.style.overflow = 'hidden';
  
  document.body.appendChild(announcement);
  announcement.textContent = message;
  
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
};

// Safe area utilities (for devices with notches)
export const getSafeAreaInsets = () => {
  const style = getComputedStyle(document.documentElement);
  
  return {
    top: parseInt(style.getPropertyValue('env(safe-area-inset-top)') || '0'),
    right: parseInt(style.getPropertyValue('env(safe-area-inset-right)') || '0'),
    bottom: parseInt(style.getPropertyValue('env(safe-area-inset-bottom)') || '0'),
    left: parseInt(style.getPropertyValue('env(safe-area-inset-left)') || '0'),
  };
};

// Focus management for mobile
export const preventZoomOnFocus = (element: HTMLElement): void => {
  if (isIOS() && element.tagName === 'INPUT') {
    const input = element as HTMLInputElement;
    const currentFontSize = window.getComputedStyle(input).fontSize;
    const minSize = 16; // iOS doesn't zoom if font-size >= 16px
    
    if (parseInt(currentFontSize) < minSize) {
      input.style.fontSize = `${minSize}px`;
    }
  }
};

export default {
  // Device detection
  isTouchDevice,
  getViewportSize,
  isLandscape,
  isPortrait,
  getDeviceType,
  isIOS,
  isAndroid,
  isSafari,
  
  // Breakpoints
  breakpoints,
  getBreakpoint,
  getCurrentBreakpoint,
  
  // Responsive values
  getResponsiveValue,
  getGridColumns,
  getResponsiveSpacing,
  getResponsiveFontSize,
  getOptimalColumns,
  
  // Touch and interaction
  getTouchFriendlySize,
  getSwipeThreshold,
  
  // Performance
  shouldUseVirtualization,
  getOptimalImageSize,
  
  // Animation and accessibility
  getReducedMotionPreference,
  getAnimationDuration,
  announceToScreenReader,
  getSafeAreaInsets,
  preventZoomOnFocus,
};