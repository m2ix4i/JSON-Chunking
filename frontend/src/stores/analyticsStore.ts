/**
 * Analytics management store using Zustand.
 * Handles analytics data, time range selection, and export functionality.
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { AnalyticsService } from '@/services/analyticsService';
import { useFiles } from './fileStore';
import { useQueryHistory } from './queryStore';
import { showSuccessNotification, showErrorNotification } from './appStore';
import type {
  AnalyticsDashboardData,
  AnalyticsStore,
  TimeRange,
  ExportFormat,
} from '@/types/analytics';

interface AnalyticsStoreState {
  // Data
  dashboardData: AnalyticsDashboardData | null;
  isLoading: boolean;
  error: string | null;
  
  // Configuration
  timeRange: TimeRange;
  refreshInterval: number;
  autoRefresh: boolean;
  
  // UI State
  selectedChart: string | null;
  exportFormat: ExportFormat;
  
  // Actions
  fetchAnalytics: () => Promise<void>;
  refreshData: () => Promise<void>;
  setTimeRange: (range: TimeRange) => void;
  setRefreshInterval: (interval: number) => void;
  toggleAutoRefresh: () => void;
  setSelectedChart: (chartId: string | null) => void;
  setExportFormat: (format: ExportFormat) => void;
  exportChart: (chartId: string, format: ExportFormat) => Promise<void>;
  exportReport: (format: ExportFormat) => Promise<void>;
  clearError: () => void;
  setError: (error: string) => void;
  
  // Private methods
  _generateAnalyticsData: () => AnalyticsDashboardData;
}

const initialState = {
  dashboardData: null,
  isLoading: false,
  error: null,
  timeRange: '7d' as TimeRange,
  refreshInterval: 300000, // 5 minutes
  autoRefresh: false,
  selectedChart: null,
  exportFormat: 'png' as ExportFormat,
};

export const useAnalyticsStore = create<AnalyticsStoreState>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // Generate analytics data using current stores
      _generateAnalyticsData: (): AnalyticsDashboardData => {
        // For now, use mock data. In a real implementation, this would
        // fetch from file and query stores or call an API
        try {
          return AnalyticsService.generateMockAnalyticsData();
        } catch (error) {
          console.error('Error generating analytics data:', error);
          // Return minimal valid data structure
          return {
            fileAnalytics: {
              uploadTrend: [],
              sizeDistribution: [],
              typeBreakdown: [],
              activityHeatmap: [],
            },
            queryAnalytics: {
              volumeTrend: [],
              statusDistribution: [],
              processingTimes: [],
              confidenceScores: [],
            },
            performanceMetrics: {
              averageProcessingTime: 0,
              successRate: 0,
              totalQueries: 0,
              totalFiles: 0,
              averageConfidenceScore: 0,
              trendsGrowth: {
                files: 0,
                queries: 0,
                performance: 0,
              },
            },
            lastUpdated: new Date(),
          };
        }
      },

      // Fetch analytics data
      fetchAnalytics: async () => {
        const state = get();
        if (state.isLoading) return;

        set({ isLoading: true, error: null });

        try {
          // Generate analytics data
          const dashboardData = state._generateAnalyticsData();
          
          set({ 
            dashboardData,
            isLoading: false,
            error: null 
          });

          console.log('Analytics data loaded successfully');
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to load analytics data';
          set({ 
            isLoading: false, 
            error: errorMessage 
          });
          
          showErrorNotification(`Analytics Error: ${errorMessage}`);
          console.error('Error fetching analytics:', error);
        }
      },

      // Refresh analytics data
      refreshData: async () => {
        await get().fetchAnalytics();
        showSuccessNotification('Analytics data refreshed');
      },

      // Set time range and refresh data
      setTimeRange: (range: TimeRange) => {
        set({ timeRange: range });
        
        // Refresh data with new time range
        setTimeout(() => {
          get().fetchAnalytics();
        }, 100);
      },

      // Set refresh interval
      setRefreshInterval: (interval: number) => {
        set({ refreshInterval: interval });
      },

      // Toggle auto refresh
      toggleAutoRefresh: () => {
        const { autoRefresh } = get();
        set({ autoRefresh: !autoRefresh });
        
        if (!autoRefresh) {
          showSuccessNotification('Auto-refresh enabled');
        } else {
          showSuccessNotification('Auto-refresh disabled');
        }
      },

      // Set selected chart for detailed view
      setSelectedChart: (chartId: string | null) => {
        set({ selectedChart: chartId });
      },

      // Set export format
      setExportFormat: (format: ExportFormat) => {
        set({ exportFormat: format });
      },

      // Export specific chart
      exportChart: async (chartId: string, format: ExportFormat) => {
        try {
          set({ isLoading: true });
          
          // For now, show success message. In real implementation,
          // this would generate and download the chart export
          console.log(`Exporting chart ${chartId} as ${format}`);
          
          // Simulate export delay
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          showSuccessNotification(`Chart exported as ${format.toUpperCase()}`);
          
          set({ isLoading: false });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Export failed';
          set({ isLoading: false });
          showErrorNotification(`Export Error: ${errorMessage}`);
        }
      },

      // Export full analytics report
      exportReport: async (format: ExportFormat) => {
        try {
          set({ isLoading: true });
          
          const { dashboardData } = get();
          if (!dashboardData) {
            throw new Error('No analytics data available for export');
          }
          
          // For now, show success message. In real implementation,
          // this would generate and download the full report
          console.log(`Exporting analytics report as ${format}`);
          
          // Simulate export delay
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          showSuccessNotification(`Analytics report exported as ${format.toUpperCase()}`);
          
          set({ isLoading: false });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Report export failed';
          set({ isLoading: false });
          showErrorNotification(`Export Error: ${errorMessage}`);
        }
      },

      // Clear error state
      clearError: () => {
        set({ error: null });
      },

      // Set error state
      setError: (error: string) => {
        set({ error });
      },
    }),
    {
      name: 'analytics-store',
      partialize: (state) => ({
        timeRange: state.timeRange,
        refreshInterval: state.refreshInterval,
        autoRefresh: state.autoRefresh,
        exportFormat: state.exportFormat,
      }),
    }
  )
);

// Selectors for easy access to store data
export const useAnalyticsData = () => useAnalyticsStore((state) => state.dashboardData);
export const useAnalyticsLoading = () => useAnalyticsStore((state) => state.isLoading);
export const useAnalyticsError = () => useAnalyticsStore((state) => state.error);
export const useAnalyticsTimeRange = () => useAnalyticsStore((state) => state.timeRange);
export const useAnalyticsActions = () => useAnalyticsStore((state) => ({
  fetchAnalytics: state.fetchAnalytics,
  refreshData: state.refreshData,
  setTimeRange: state.setTimeRange,
  clearError: state.clearError,
}));

// Export hooks for specific analytics sections
export const useFileAnalytics = () => useAnalyticsStore((state) => 
  state.dashboardData?.fileAnalytics || null
);

export const useQueryAnalytics = () => useAnalyticsStore((state) => 
  state.dashboardData?.queryAnalytics || null
);

export const usePerformanceMetrics = () => useAnalyticsStore((state) => 
  state.dashboardData?.performanceMetrics || null
);

// Auto-refresh effect helper
export const useAnalyticsAutoRefresh = () => {
  const { autoRefresh, refreshInterval, fetchAnalytics } = useAnalyticsStore();
  
  React.useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      fetchAnalytics();
    }, refreshInterval);
    
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchAnalytics]);
};

// Import React for the useEffect in the auto-refresh hook
import React from 'react';