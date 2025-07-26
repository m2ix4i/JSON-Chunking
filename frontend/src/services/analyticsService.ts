/**
 * Analytics Service - Data transformation and aggregation for dashboard analytics
 * Provides comprehensive analytics data processing and mock data generation
 */

import { format, subDays, addDays, startOfDay } from 'date-fns';
import type {
  AnalyticsDashboardData,
  FileUploadTrend,
  FileSizeDistribution,
  FileTypeBreakdown,
  FileActivityData,
  QueryVolumeData,
  QueryStatusDistribution,
  ProcessingTimeData,
  ConfidenceScoreData,
  PerformanceMetrics,
  TimeRange,
  CHART_COLORS,
} from '@/types/analytics';
import type { UploadedFile, QueryHistory } from '@/types/app';

export class AnalyticsService {
  /**
   * Transform file data into upload trend analytics
   */
  static transformFileUploadTrend(files: UploadedFile[], timeRange: TimeRange = '7d'): FileUploadTrend[] {
    const days = this.getTimeRangeDays(timeRange);
    const now = new Date();
    const startDate = subDays(now, days);

    // Create date range array
    const dateRange: Date[] = [];
    for (let i = 0; i <= days; i++) {
      dateRange.push(addDays(startDate, i));
    }

    // Group files by date
    const dailyData = dateRange.map(date => {
      const dayStart = startOfDay(date);
      const dayEnd = addDays(dayStart, 1);

      const dayFiles = files.filter(file => {
        const uploadDate = new Date(file.upload_timestamp);
        return uploadDate >= dayStart && uploadDate < dayEnd;
      });

      return {
        date: format(date, 'MMM dd'),
        uploads: dayFiles.length,
        totalSize: dayFiles.reduce((sum, file) => sum + file.size, 0),
      };
    });

    return dailyData;
  }

  /**
   * Calculate file size distribution
   */
  static calculateFileSizeDistribution(files: UploadedFile[]): FileSizeDistribution[] {
    const ranges = [
      { min: 0, max: 1024 * 1024, label: '< 1 MB' },
      { min: 1024 * 1024, max: 5 * 1024 * 1024, label: '1-5 MB' },
      { min: 5 * 1024 * 1024, max: 10 * 1024 * 1024, label: '5-10 MB' },
      { min: 10 * 1024 * 1024, max: 50 * 1024 * 1024, label: '10-50 MB' },
      { min: 50 * 1024 * 1024, max: Infinity, label: '> 50 MB' },
    ];

    const total = files.length;
    
    return ranges.map(range => {
      const count = files.filter(file => 
        file.size >= range.min && file.size < range.max
      ).length;

      return {
        sizeRange: range.label,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      };
    }).filter(item => item.count > 0);
  }

  /**
   * Calculate file type breakdown
   */
  static calculateFileTypeBreakdown(files: UploadedFile[]): FileTypeBreakdown[] {
    const typeMap = new Map<string, number>();
    
    files.forEach(file => {
      const extension = file.filename.split('.').pop()?.toLowerCase() || 'unknown';
      typeMap.set(extension, (typeMap.get(extension) || 0) + 1);
    });

    const total = files.length;
    const colors = CHART_COLORS.chart;

    return Array.from(typeMap.entries()).map(([type, count], index) => ({
      type: type.toUpperCase(),
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      color: colors[index % colors.length],
    }));
  }

  /**
   * Transform query data into volume analytics
   */
  static transformQueryVolumeData(queries: QueryHistory[], timeRange: TimeRange = '7d'): QueryVolumeData[] {
    const days = this.getTimeRangeDays(timeRange);
    const now = new Date();
    const startDate = subDays(now, days);

    // Create date range array
    const dateRange: Date[] = [];
    for (let i = 0; i <= days; i++) {
      dateRange.push(addDays(startDate, i));
    }

    return dateRange.map(date => {
      const dayStart = startOfDay(date);
      const dayEnd = addDays(dayStart, 1);

      const dayQueries = queries.filter(query => {
        if (!query.query_timestamp) return false;
        const queryDate = new Date(query.query_timestamp);
        return queryDate >= dayStart && queryDate < dayEnd;
      });

      const completed = dayQueries.filter(q => q.confidence_score > 0.5).length;
      const failed = dayQueries.filter(q => q.confidence_score <= 0.5).length;
      const active = 0; // Historical data doesn't have active queries

      return {
        date: format(date, 'MMM dd'),
        total: dayQueries.length,
        completed,
        failed,
        active,
      };
    });
  }

  /**
   * Calculate query status distribution
   */
  static calculateQueryStatusDistribution(queries: QueryHistory[]): QueryStatusDistribution[] {
    const total = queries.length;
    if (total === 0) return [];

    const completed = queries.filter(q => q.confidence_score > 0.5).length;
    const failed = queries.filter(q => q.confidence_score <= 0.5).length;

    return [
      {
        status: 'completed',
        count: completed,
        percentage: Math.round((completed / total) * 100),
        color: CHART_COLORS.success,
      },
      {
        status: 'failed',
        count: failed,
        percentage: Math.round((failed / total) * 100),
        color: CHART_COLORS.error,
      },
    ].filter(item => item.count > 0);
  }

  /**
   * Transform processing time data
   */
  static transformProcessingTimeData(queries: QueryHistory[], timeRange: TimeRange = '7d'): ProcessingTimeData[] {
    const days = this.getTimeRangeDays(timeRange);
    const now = new Date();
    const startDate = subDays(now, days);

    // Create date range array
    const dateRange: Date[] = [];
    for (let i = 0; i <= days; i++) {
      dateRange.push(addDays(startDate, i));
    }

    return dateRange.map(date => {
      const dayStart = startOfDay(date);
      const dayEnd = addDays(dayStart, 1);

      const dayQueries = queries.filter(query => {
        if (!query.query_timestamp || !query.processing_time) return false;
        const queryDate = new Date(query.query_timestamp);
        return queryDate >= dayStart && queryDate < dayEnd;
      });

      const processingTimes = dayQueries.map(q => q.processing_time!);
      
      return {
        date: format(date, 'MMM dd'),
        averageTime: processingTimes.length > 0 
          ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length 
          : 0,
        minTime: processingTimes.length > 0 ? Math.min(...processingTimes) : 0,
        maxTime: processingTimes.length > 0 ? Math.max(...processingTimes) : 0,
        queryCount: processingTimes.length,
      };
    });
  }

  /**
   * Calculate confidence score distribution
   */
  static calculateConfidenceScoreDistribution(queries: QueryHistory[]): ConfidenceScoreData[] {
    const ranges = [
      { min: 0, max: 0.2, label: '0-20%' },
      { min: 0.2, max: 0.4, label: '20-40%' },
      { min: 0.4, max: 0.6, label: '40-60%' },
      { min: 0.6, max: 0.8, label: '60-80%' },
      { min: 0.8, max: 1.0, label: '80-100%' },
    ];

    const total = queries.filter(q => q.confidence_score != null).length;
    
    return ranges.map(range => {
      const count = queries.filter(query => 
        query.confidence_score != null &&
        query.confidence_score >= range.min && 
        query.confidence_score < range.max
      ).length;

      return {
        scoreRange: range.label,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      };
    }).filter(item => item.count > 0);
  }

  /**
   * Calculate performance metrics
   */
  static calculatePerformanceMetrics(
    files: UploadedFile[], 
    queries: QueryHistory[]
  ): PerformanceMetrics {
    const validQueries = queries.filter(q => q.processing_time != null);
    const averageProcessingTime = validQueries.length > 0
      ? validQueries.reduce((sum, q) => sum + q.processing_time!, 0) / validQueries.length
      : 0;

    const successfulQueries = queries.filter(q => q.confidence_score > 0.5);
    const successRate = queries.length > 0 
      ? (successfulQueries.length / queries.length) * 100 
      : 0;

    const confidenceScores = queries
      .filter(q => q.confidence_score != null)
      .map(q => q.confidence_score!);
    const averageConfidenceScore = confidenceScores.length > 0
      ? confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length
      : 0;

    return {
      averageProcessingTime,
      successRate,
      totalQueries: queries.length,
      totalFiles: files.length,
      averageConfidenceScore,
      trendsGrowth: {
        files: this.calculateGrowthTrend(files.map(f => f.upload_timestamp)),
        queries: this.calculateGrowthTrend(queries.map(q => q.query_timestamp).filter(Boolean)),
        performance: averageProcessingTime > 0 ? -5 : 0, // Mock performance improvement
      },
    };
  }

  /**
   * Generate comprehensive analytics data
   */
  static generateAnalyticsData(
    files: UploadedFile[],
    queries: QueryHistory[],
    timeRange: TimeRange = '7d'
  ): AnalyticsDashboardData {
    return {
      fileAnalytics: {
        uploadTrend: this.transformFileUploadTrend(files, timeRange),
        sizeDistribution: this.calculateFileSizeDistribution(files),
        typeBreakdown: this.calculateFileTypeBreakdown(files),
        activityHeatmap: this.generateMockActivityHeatmap(), // Mock for now
      },
      queryAnalytics: {
        volumeTrend: this.transformQueryVolumeData(queries, timeRange),
        statusDistribution: this.calculateQueryStatusDistribution(queries),
        processingTimes: this.transformProcessingTimeData(queries, timeRange),
        confidenceScores: this.calculateConfidenceScoreDistribution(queries),
      },
      performanceMetrics: this.calculatePerformanceMetrics(files, queries),
      lastUpdated: new Date(),
    };
  }

  /**
   * Generate mock analytics data for development
   */
  static generateMockAnalyticsData(): AnalyticsDashboardData {
    const mockFiles = this.generateMockFiles();
    const mockQueries = this.generateMockQueries();
    
    return this.generateAnalyticsData(mockFiles, mockQueries);
  }

  // Helper methods
  private static getTimeRangeDays(timeRange: TimeRange): number {
    switch (timeRange) {
      case '24h': return 1;
      case '7d': return 7;
      case '30d': return 30;
      case '90d': return 90;
      case 'all': return 365; // Limit to 1 year for performance
      default: return 7;
    }
  }

  private static calculateGrowthTrend(timestamps: string[]): number {
    if (timestamps.length < 2) return 0;
    
    const now = Date.now();
    const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = now - (14 * 24 * 60 * 60 * 1000);
    
    const thisWeek = timestamps.filter(ts => 
      new Date(ts).getTime() > oneWeekAgo
    ).length;
    
    const lastWeek = timestamps.filter(ts => {
      const time = new Date(ts).getTime();
      return time > twoWeeksAgo && time <= oneWeekAgo;
    }).length;
    
    if (lastWeek === 0) return thisWeek > 0 ? 100 : 0;
    return Math.round(((thisWeek - lastWeek) / lastWeek) * 100);
  }

  private static generateMockActivityHeatmap(): FileActivityData[] {
    const data: FileActivityData[] = [];
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        data.push({
          hour,
          day: days[day],
          activity: Math.floor(Math.random() * 10),
          label: `${days[day]} ${hour}:00`,
        });
      }
    }
    return data;
  }

  private static generateMockFiles(): UploadedFile[] {
    const files: UploadedFile[] = [];
    const now = new Date();
    
    for (let i = 0; i < 20; i++) {
      const daysAgo = Math.floor(Math.random() * 30);
      const size = Math.floor(Math.random() * 50 * 1024 * 1024); // Up to 50MB
      
      files.push({
        file_id: `mock-file-${i}`,
        filename: `building-${i + 1}.ifc.json`,
        size,
        upload_timestamp: format(subDays(now, daysAgo), "yyyy-MM-dd'T'HH:mm:ss"),
        status: Math.random() > 0.1 ? 'uploaded' : 'error',
        validation_result: {
          is_valid: Math.random() > 0.1,
          estimated_chunks: Math.floor(Math.random() * 1000) + 100,
          validation_errors: [],
        },
      });
    }
    
    return files;
  }

  private static generateMockQueries(): QueryHistory[] {
    const queries: QueryHistory[] = [];
    const now = new Date();
    
    for (let i = 0; i < 50; i++) {
      const daysAgo = Math.floor(Math.random() * 30);
      const processingTime = Math.random() * 10 + 0.5; // 0.5 to 10.5 seconds
      const confidenceScore = Math.random();
      
      queries.push({
        query_id: `mock-query-${i}`,
        original_query: `Mock query ${i + 1}`,
        confidence_score: confidenceScore,
        processing_time: processingTime,
        query_timestamp: format(subDays(now, daysAgo), "yyyy-MM-dd'T'HH:mm:ss"),
        file_id: `mock-file-${Math.floor(Math.random() * 20)}`,
        result_chunks: Math.floor(Math.random() * 100),
      });
    }
    
    return queries;
  }
}

export default AnalyticsService;