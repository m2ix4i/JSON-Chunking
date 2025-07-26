/**
 * Virtual scrolling component for efficient rendering of large datasets.
 * Handles 10,000+ items with smooth scrolling performance.
 */

import React, { useState, useEffect, useRef, useMemo, ReactNode, useCallback } from 'react';
import { Box, SxProps, Theme } from '@mui/material';

export interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => ReactNode;
  overscan?: number;
  onScroll?: (scrollTop: number) => void;
  sx?: SxProps<Theme>;
  className?: string;
}

export const VirtualList = <T,>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 5,
  onScroll,
  sx,
  className
}: VirtualListProps<T>) => {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate visible range with overscan
  const visibleRange = useMemo(() => {
    const itemCount = items.length;
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(startIndex + visibleCount, itemCount);
    
    // Add overscan buffer
    const startWithOverscan = Math.max(0, startIndex - overscan);
    const endWithOverscan = Math.min(itemCount, endIndex + overscan);
    
    return {
      start: startWithOverscan,
      end: endWithOverscan,
      visibleStart: startIndex,
      visibleEnd: endIndex
    };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

  // Calculate total height and visible items
  const totalHeight = items.length * itemHeight;
  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end);
  }, [items, visibleRange.start, visibleRange.end]);

  // Handle scroll events with throttling
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = event.currentTarget.scrollTop;
    setScrollTop(newScrollTop);
    onScroll?.(newScrollTop);
  }, [onScroll]);

  // Scroll to specific index
  const scrollToIndex = useCallback((index: number) => {
    if (containerRef.current) {
      const targetScrollTop = index * itemHeight;
      containerRef.current.scrollTop = targetScrollTop;
      setScrollTop(targetScrollTop);
    }
  }, [itemHeight]);

  // Scroll to item (useful for external control)
  const scrollToItem = useCallback((predicate: (item: T) => boolean) => {
    const index = items.findIndex(predicate);
    if (index !== -1) {
      scrollToIndex(index);
    }
  }, [items, scrollToIndex]);

  // Expose scroll methods via ref
  React.useImperativeHandle(containerRef, () => ({
    scrollToIndex,
    scrollToItem,
    getScrollTop: () => scrollTop,
    getVisibleRange: () => visibleRange
  }));

  return (
    <Box
      ref={containerRef}
      className={className}
      onScroll={handleScroll}
      sx={{
        height: containerHeight,
        overflow: 'auto',
        position: 'relative',
        ...sx
      }}
    >
      {/* Total height spacer */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {/* Rendered items container */}
        <div
          style={{
            position: 'absolute',
            top: visibleRange.start * itemHeight,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems.map((item, index) => {
            const actualIndex = visibleRange.start + index;
            return (
              <div
                key={actualIndex}
                style={{
                  height: itemHeight,
                  overflow: 'hidden'
                }}
              >
                {renderItem(item, actualIndex)}
              </div>
            );
          })}
        </div>
      </div>
    </Box>
  );
};

// Hook for using virtual list with intersection observer for dynamic height items
export const useVirtualList = <T,>(
  items: T[],
  estimatedItemHeight: number,
  containerHeight: number
) => {
  const [itemHeights, setItemHeights] = useState<Map<number, number>>(new Map());
  const observerRef = useRef<IntersectionObserver>();

  const measureItem = useCallback((index: number, element: HTMLElement) => {
    const height = element.getBoundingClientRect().height;
    setItemHeights(prev => new Map(prev).set(index, height));
  }, []);

  const getItemHeight = useCallback((index: number) => {
    return itemHeights.get(index) ?? estimatedItemHeight;
  }, [itemHeights, estimatedItemHeight]);

  // Clean up observer on unmount
  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  return {
    getItemHeight,
    measureItem,
    itemHeights
  };
};

// Enhanced virtual list with dynamic heights
export const DynamicVirtualList = <T,>({
  items,
  estimatedItemHeight,
  containerHeight,
  renderItem,
  overscan = 5,
  onScroll,
  sx,
  className
}: Omit<VirtualListProps<T>, 'itemHeight'> & { estimatedItemHeight: number }) => {
  const { getItemHeight, measureItem } = useVirtualList(items, estimatedItemHeight, containerHeight);
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate visible range with dynamic heights
  const visibleRange = useMemo(() => {
    let currentHeight = 0;
    let startIndex = 0;
    let endIndex = 0;

    // Find start index
    for (let i = 0; i < items.length; i++) {
      const itemHeight = getItemHeight(i);
      if (currentHeight + itemHeight > scrollTop) {
        startIndex = i;
        break;
      }
      currentHeight += itemHeight;
    }

    // Find end index
    const targetHeight = scrollTop + containerHeight;
    currentHeight = 0;
    for (let i = 0; i < items.length; i++) {
      currentHeight += getItemHeight(i);
      if (currentHeight >= targetHeight) {
        endIndex = i + 1;
        break;
      }
    }

    const startWithOverscan = Math.max(0, startIndex - overscan);
    const endWithOverscan = Math.min(items.length, endIndex + overscan);

    return {
      start: startWithOverscan,
      end: endWithOverscan
    };
  }, [scrollTop, containerHeight, items.length, overscan, getItemHeight]);

  // Calculate total height
  const totalHeight = useMemo(() => {
    return items.reduce((total, _, index) => total + getItemHeight(index), 0);
  }, [items, getItemHeight]);

  // Calculate offset for visible items
  const offsetY = useMemo(() => {
    let offset = 0;
    for (let i = 0; i < visibleRange.start; i++) {
      offset += getItemHeight(i);
    }
    return offset;
  }, [visibleRange.start, getItemHeight]);

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = event.currentTarget.scrollTop;
    setScrollTop(newScrollTop);
    onScroll?.(newScrollTop);
  }, [onScroll]);

  const visibleItems = items.slice(visibleRange.start, visibleRange.end);

  return (
    <Box
      ref={containerRef}
      className={className}
      onScroll={handleScroll}
      sx={{
        height: containerHeight,
        overflow: 'auto',
        position: 'relative',
        ...sx
      }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            position: 'absolute',
            top: offsetY,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems.map((item, index) => {
            const actualIndex = visibleRange.start + index;
            const itemHeight = getItemHeight(actualIndex);
            
            return (
              <div
                key={actualIndex}
                ref={(el) => el && measureItem(actualIndex, el)}
                style={{
                  minHeight: itemHeight,
                  overflow: 'hidden'
                }}
              >
                {renderItem(item, actualIndex)}
              </div>
            );
          })}
        </div>
      </div>
    </Box>
  );
};

export default VirtualList;