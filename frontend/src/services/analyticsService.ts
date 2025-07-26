/**
 * Analytics service for transforming data into chart-ready formats
 */

import type { 
  FileUploadTrend,
  FileSizeDistribution, 
  FileTypeBreakdown,
  FileActivityData,
  QueryVolumeData,
  QueryStatusDistribution,
  ProcessingTimeData,
  ConfidenceScoreData,
  PerformanceMetrics,
  AnalyticsDashboardData,
  TimeRange,
  ChartData,
} from '@/types/analytics';
import { CHART_COLORS } from '@/types/analytics';

// Import store types (assuming they exist)
interface FileData {
  id: string;
  filename: string;
  size: number;
  uploaded_at: string;
  status: 'ready' | 'processing' | 'error';
}

interface QueryData {
  query_id: string;
  query: string;
  file_id: string;
  status: 'completed' | 'failed' | 'processing';
  created_at?: string;
  processing_time?: number;
  confidence_score?: number;
}

/**
 * Analytics Service Class
 */
export class AnalyticsService {
  
  /**
   * Get date range for filtering data
   */
  private getDateRange(timeRange: TimeRange): Date {
    const now = new Date();
    switch (timeRange) {
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '90d':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      case 'all':
        return new Date(0); // Beginning of time
      default:
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
  }

  /**
   * Format date for chart display
   */
  private formatDate(date: Date, timeRange: TimeRange): string {
    if (timeRange === '24h') {
      return date.toLocaleTimeString('de-DE', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else if (timeRange === '7d') {
      return date.toLocaleDateString('de-DE', { 
        weekday: 'short', 
        day: 'numeric' 
      });
    } else {
      return date.toLocaleDateString('de-DE', { 
        day: 'numeric', 
        month: 'short' 
      });
    }
  }

  /**
   * Generate file upload trend data
   */
  generateFileUploadTrend(files: FileData[], timeRange: TimeRange): FileUploadTrend[] {
    const startDate = this.getDateRange(timeRange);
    const filteredFiles = files.filter(file => 
      new Date(file.uploaded_at) >= startDate
    );

    // Group files by date
    const groupedData: { [key: string]: { uploads: number; totalSize: number } } = {};
    
    filteredFiles.forEach(file => {
      const date = new Date(file.uploaded_at);
      const dateKey = timeRange === '24h' 
        ? date.toISOString().slice(0, 13) + ':00:00' // Group by hour
        : date.toISOString().slice(0, 10); // Group by day
      
      if (!groupedData[dateKey]) {
        groupedData[dateKey] = { uploads: 0, totalSize: 0 };
      }
      
      groupedData[dateKey].uploads += 1;
      groupedData[dateKey].totalSize += file.size;
    });

    // Convert to array and sort
    return Object.entries(groupedData)
      .map(([date, data]) => ({
        date: this.formatDate(new Date(date), timeRange),
        uploads: data.uploads,
        totalSize: data.totalSize,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  /**
   * Generate file size distribution data
   */
  generateFileSizeDistribution(files: FileData[]): FileSizeDistribution[] {
    const sizeRanges = [
      { range: '< 1MB', min: 0, max: 1024 * 1024 },
      { range: '1-10MB', min: 1024 * 1024, max: 10 * 1024 * 1024 },
      { range: '10-50MB', min: 10 * 1024 * 1024, max: 50 * 1024 * 1024 },
      { range: '50-100MB', min: 50 * 1024 * 1024, max: 100 * 1024 * 1024 },
      { range: '> 100MB', min: 100 * 1024 * 1024, max: Infinity },
    ];

    const distribution = sizeRanges.map(range => {
      const count = files.filter(file => 
        file.size >= range.min && file.size < range.max
      ).length;
      
      return {
        sizeRange: range.range,
        count,
        percentage: (count / files.length) * 100,
      };
    });

    return distribution;
  }

  /**
   * Generate file type breakdown data
   */
  generateFileTypeBreakdown(files: FileData[]): FileTypeBreakdown[] {
    const typeGroups: { [key: string]: number } = {};
    
    files.forEach(file => {
      const extension = file.filename.split('.').pop()?.toLowerCase() || 'unknown';
      const type = this.categorizeFileType(extension);
      typeGroups[type] = (typeGroups[type] || 0) + 1;
    });

    return Object.entries(typeGroups)
      .map(([type, count], index) => ({
        type,
        count,
        percentage: (count / files.length) * 100,
        color: CHART_COLORS.chart[index % CHART_COLORS.chart.length],
      }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Categorize file types
   */
  private categorizeFileType(extension: string): string {
    const typeMap: { [key: string]: string } = {
      'ifc': 'IFC',
      'json': 'JSON',
      'txt': 'Text',
      'pdf': 'PDF',
      'doc': 'Document',
      'docx': 'Document',
      'xls': 'Spreadsheet',
      'xlsx': 'Spreadsheet',
      'csv': 'CSV',
      'zip': 'Archive',
      'rar': 'Archive',
    };
    
    return typeMap[extension] || 'Other';
  }

  /**
   * Generate file activity heatmap data
   */
  generateFileActivityHeatmap(files: FileData[], queries: QueryData[]): FileActivityData[] {
    const heatmapData: FileActivityData[] = [];
    const days = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
    
    // Initialize 24x7 grid
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        heatmapData.push({
          hour,
          day: days[day],
          activity: 0,
          label: `${days[day]} ${hour}:00`,
        });
      }
    }

    // Count file uploads and queries by hour/day
    [...files, ...queries].forEach(item => {
      const date = new Date(item.uploaded_at || item.created_at || Date.now());
      const hour = date.getHours();
      const dayOfWeek = (date.getDay() + 6) % 7; // Convert Sunday=0 to Monday=0
      
      const index = dayOfWeek * 24 + hour;
      if (heatmapData[index]) {
        heatmapData[index].activity += 1;
      }
    });

    return heatmapData;
  }

  /**
   * Generate query volume trend data
   */
  generateQueryVolumeTrend(queries: QueryData[], timeRange: TimeRange): QueryVolumeData[] {
    const startDate = this.getDateRange(timeRange);
    const filteredQueries = queries.filter(query => 
      new Date(query.created_at || Date.now()) >= startDate
    );

    // Group queries by date and status
    const groupedData: { [key: string]: QueryVolumeData } = {};
    
    filteredQueries.forEach(query => {
      const date = new Date(query.created_at || Date.now());
      const dateKey = timeRange === '24h' 
        ? date.toISOString().slice(0, 13) + ':00:00'
        : date.toISOString().slice(0, 10);
      
      if (!groupedData[dateKey]) {
        groupedData[dateKey] = {
          date: this.formatDate(new Date(dateKey), timeRange),
          total: 0,
          completed: 0,
          failed: 0,
          active: 0,
        };
      }
      
      groupedData[dateKey].total += 1;
      groupedData[dateKey][query.status] += 1;
    });

    return Object.values(groupedData)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  /**
   * Generate query status distribution
   */
  generateQueryStatusDistribution(queries: QueryData[]): QueryStatusDistribution[] {
    const statusCounts = {
      completed: 0,
      failed: 0,
      processing: 0,
    };

    queries.forEach(query => {
      if (query.status === 'processing') {
        statusCounts.processing += 1;
      } else {
        statusCounts[query.status] += 1;
      }
    });

    const total = queries.length;
    
    return [
      {
        status: 'completed',
        count: statusCounts.completed,
        percentage: (statusCounts.completed / total) * 100,
        color: CHART_COLORS.success,
      },
      {
        status: 'failed',
        count: statusCounts.failed,
        percentage: (statusCounts.failed / total) * 100,
        color: CHART_COLORS.error,
      },
      {
        status: 'active',
        count: statusCounts.processing,
        percentage: (statusCounts.processing / total) * 100,
        color: CHART_COLORS.warning,
      },
    ].filter(item => item.count > 0);
  }

  /**
   * Generate processing time trend data
   */
  generateProcessingTimeTrend(queries: QueryData[], timeRange: TimeRange): ProcessingTimeData[] {
    const startDate = this.getDateRange(timeRange);
    const completedQueries = queries.filter(query => 
      query.status === 'completed' && 
      query.processing_time &&
      new Date(query.created_at || Date.now()) >= startDate
    );

    // Group by date
    const groupedData: { [key: string]: number[] } = {};
    
    completedQueries.forEach(query => {
      const date = new Date(query.created_at || Date.now());
      const dateKey = timeRange === '24h' 
        ? date.toISOString().slice(0, 13) + ':00:00'
        : date.toISOString().slice(0, 10);
      
      if (!groupedData[dateKey]) {
        groupedData[dateKey] = [];
      }
      
      groupedData[dateKey].push(query.processing_time!);
    });

    return Object.entries(groupedData)
      .map(([date, times]) => ({
        date: this.formatDate(new Date(date), timeRange),
        averageTime: times.reduce((sum, time) => sum + time, 0) / times.length,
        minTime: Math.min(...times),
        maxTime: Math.max(...times),
        queryCount: times.length,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  /**
   * Generate confidence score distribution
   */
  generateConfidenceScoreDistribution(queries: QueryData[]): ConfidenceScoreData[] {
    const completedQueries = queries.filter(query => 
      query.status === 'completed' && query.confidence_score
    );

    const scoreRanges = [
      { range: '0-20%', min: 0, max: 0.2 },
      { range: '20-40%', min: 0.2, max: 0.4 },
      { range: '40-60%', min: 0.4, max: 0.6 },
      { range: '60-80%', min: 0.6, max: 0.8 },
      { range: '80-100%', min: 0.8, max: 1.0 },
    ];

    return scoreRanges.map(range => {
      const count = completedQueries.filter(query => 
        query.confidence_score! >= range.min && query.confidence_score! <= range.max
      ).length;
      
      return {
        scoreRange: range.range,
        count,
        percentage: (count / completedQueries.length) * 100,
      };
    });
  }

  /**
   * Calculate performance metrics
   */
  calculatePerformanceMetrics(files: FileData[], queries: QueryData[]): PerformanceMetrics {
    const completedQueries = queries.filter(q => q.status === 'completed');
    const failedQueries = queries.filter(q => q.status === 'failed');
    
    const averageProcessingTime = completedQueries
      .filter(q => q.processing_time)
      .reduce((sum, q) => sum + q.processing_time!, 0) / completedQueries.length || 0;

    const successRate = queries.length > 0 
      ? (completedQueries.length / queries.length) * 100 
      : 0;

    const averageConfidenceScore = completedQueries
      .filter(q => q.confidence_score)
      .reduce((sum, q) => sum + q.confidence_score!, 0) / completedQueries.length || 0;

    // Calculate simple growth trends (comparing last 7 days vs previous 7 days)
    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const previous7Days = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const recentFiles = files.filter(f => new Date(f.uploaded_at) >= last7Days).length;
    const previousFiles = files.filter(f => 
      new Date(f.uploaded_at) >= previous7Days && 
      new Date(f.uploaded_at) < last7Days
    ).length;

    const recentQueries = queries.filter(q => 
      new Date(q.created_at || Date.now()) >= last7Days
    ).length;
    const previousQueries = queries.filter(q => 
      new Date(q.created_at || Date.now()) >= previous7Days && 
      new Date(q.created_at || Date.now()) < last7Days
    ).length;

    return {
      averageProcessingTime,
      successRate,
      totalQueries: queries.length,
      totalFiles: files.length,
      averageConfidenceScore,
      trendsGrowth: {
        files: previousFiles > 0 ? ((recentFiles - previousFiles) / previousFiles) * 100 : 0,
        queries: previousQueries > 0 ? ((recentQueries - previousQueries) / previousQueries) * 100 : 0,
        performance: 0, // Placeholder for performance trend
      },
    };
  }

  /**
   * Generate complete analytics dashboard data
   */
  generateAnalyticsDashboardData(
    files: FileData[], 
    queries: QueryData[], 
    timeRange: TimeRange = '7d'
  ): AnalyticsDashboardData {
    return {
      fileAnalytics: {
        uploadTrend: this.generateFileUploadTrend(files, timeRange),
        sizeDistribution: this.generateFileSizeDistribution(files),
        typeBreakdown: this.generateFileTypeBreakdown(files),
        activityHeatmap: this.generateFileActivityHeatmap(files, queries),
      },
      queryAnalytics: {
        volumeTrend: this.generateQueryVolumeTrend(queries, timeRange),
        statusDistribution: this.generateQueryStatusDistribution(queries),
        processingTimes: this.generateProcessingTimeTrend(queries, timeRange),
        confidenceScores: this.generateConfidenceScoreDistribution(queries),
      },
      performanceMetrics: this.calculatePerformanceMetrics(files, queries),
      lastUpdated: new Date(),
    };
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();