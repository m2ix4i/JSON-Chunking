/**
 * Unit tests for analytics types
 * Tests TypeScript interfaces and constants
 */

import { describe, it, expect } from 'vitest';
import type { 
  FileUploadTrend, 
  ProcessingTime, 
  QueryMetrics 
} from '@/types/analytics';
import { CHART_COLORS } from '@/types/analytics';

describe('Analytics Types', () => {
  describe('FileUploadTrend Interface', () => {
    it('accepts valid FileUploadTrend objects', () => {
      const validTrend: FileUploadTrend = {
        date: '2024-01-01',
        uploads: 5,
        totalSize: 1048576,
      };

      expect(validTrend.date).toBe('2024-01-01');
      expect(validTrend.uploads).toBe(5);
      expect(validTrend.totalSize).toBe(1048576);
    });

    it('enforces correct property types', () => {
      const trend: FileUploadTrend = {
        date: '2024-01-01', // string
        uploads: 10,        // number
        totalSize: 2097152, // number
      };

      expect(typeof trend.date).toBe('string');
      expect(typeof trend.uploads).toBe('number');
      expect(typeof trend.totalSize).toBe('number');
    });
  });

  describe('CHART_COLORS Constant', () => {
    it('contains all required color properties', () => {
      expect(CHART_COLORS).toHaveProperty('primary');
      expect(CHART_COLORS).toHaveProperty('secondary');
      expect(CHART_COLORS).toHaveProperty('success');
      expect(CHART_COLORS).toHaveProperty('warning');
      expect(CHART_COLORS).toHaveProperty('error');
      expect(CHART_COLORS).toHaveProperty('info');
    });

    it('has valid hex color values', () => {
      const hexColorRegex = /^#[0-9a-fA-F]{6}$/;
      
      expect(CHART_COLORS.primary).toMatch(hexColorRegex);
      expect(CHART_COLORS.secondary).toMatch(hexColorRegex);
      expect(CHART_COLORS.success).toMatch(hexColorRegex);
      expect(CHART_COLORS.warning).toMatch(hexColorRegex);
      expect(CHART_COLORS.error).toMatch(hexColorRegex);
      expect(CHART_COLORS.info).toMatch(hexColorRegex);
    });

    it('contains expected color values', () => {
      expect(CHART_COLORS.primary).toBe('#1976d2');
      expect(CHART_COLORS.secondary).toBe('#dc004e');
      expect(CHART_COLORS.success).toBe('#2e7d32');
      expect(CHART_COLORS.warning).toBe('#ed6c02');
      expect(CHART_COLORS.error).toBe('#d32f2f');
      expect(CHART_COLORS.info).toBe('#0288d1');
    });
  });
});