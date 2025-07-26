/**
 * Virtual list component for efficient rendering of large lists.
 * Only renders visible items plus overscan for smooth scrolling.
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Box } from '@mui/material';

export interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  className?: string;
  onScroll?: (scrollTop: number, scrollLeft: number) => void;
  getItemKey?: (item: T, index: number) => string | number;
}

export const VirtualList = <T,>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 5,
  className,
  onScroll,
  getItemKey = (_, index) => index,
}: VirtualListProps<T>) => {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate visible range with overscan
  const visibleRange = useMemo(() => {
    const visibleItemCount = Math.ceil(containerHeight / itemHeight);
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      items.length - 1,
      startIndex + visibleItemCount - 1
    );

    return {
      start: Math.max(0, startIndex - overscan),
      end: Math.min(items.length - 1, endIndex + overscan),
    };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

  // Calculate total height and offset
  const totalHeight = items.length * itemHeight;
  const offsetY = visibleRange.start * itemHeight;

  // Handle scroll events
  const handleScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      const scrollElement = event.currentTarget;
      const newScrollTop = scrollElement.scrollTop;
      
      setScrollTop(newScrollTop);
      onScroll?.(newScrollTop, scrollElement.scrollLeft);
    },
    [onScroll]
  );

  // Render visible items
  const visibleItems = [];
  for (let i = visibleRange.start; i <= visibleRange.end; i++) {
    const item = items[i];
    if (item) {
      visibleItems.push(
        <Box
          key={getItemKey(item, i)}
          sx={{
            position: 'absolute',
            top: i * itemHeight,
            left: 0,
            right: 0,
            height: itemHeight,
          }}
        >
          {renderItem(item, i)}
        </Box>
      );
    }
  }

  // Performance optimization: Use passive scroll listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handlePassiveScroll = (event: Event) => {
      const target = event.target as HTMLDivElement;
      setScrollTop(target.scrollTop);
      onScroll?.(target.scrollTop, target.scrollLeft);
    };

    container.addEventListener('scroll', handlePassiveScroll, { passive: true });
    
    return () => {
      container.removeEventListener('scroll', handlePassiveScroll);
    };
  }, [onScroll]);

  return (
    <Box
      ref={containerRef}
      className={className}
      sx={{
        height: containerHeight,
        overflow: 'auto',
        position: 'relative',
      }}
      onScroll={handleScroll}
    >
      {/* Total height spacer */}
      <Box
        sx={{
          height: totalHeight,
          position: 'relative',
        }}
      >
        {/* Visible items container */}
        <Box
          sx={{
            position: 'absolute',
            top: offsetY,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems}
        </Box>
      </Box>
    </Box>
  );
};

export default VirtualList;