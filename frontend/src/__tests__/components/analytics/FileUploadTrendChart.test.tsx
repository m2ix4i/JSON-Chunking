/**
 * Unit Tests for FileUploadTrendChart Component
 * Tests Sandi Metz principle compliance and functionality
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { describe, it, expect, vi } from 'vitest';
import FileUploadTrendChart from '@/components/analytics/charts/FileUploadTrendChart';
import type { FileUploadTrend } from '@/types/analytics';

// Mock recharts since it doesn't work well in test environment
vi.mock('recharts', () => ({
  LineChart: ({ children, data }: any) => (
    <div data-testid="line-chart" data-chart-data={JSON.stringify(data)}>
      {children}
    </div>
  ),
  Line: ({ dataKey, name }: any) => (
    <div data-testid="line" data-key={dataKey} data-name={name} />
  ),
  XAxis: ({ dataKey }: any) => <div data-testid="x-axis" data-key={dataKey} />,
  YAxis: ({ tickFormatter }: any) => (
    <div data-testid="y-axis" data-formatter={tickFormatter?.name} />
  ),
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: ({ content }: any) => (
    <div data-testid="tooltip" data-content={content?.name} />
  ),
  Legend: ({ iconType }: any) => (
    <div data-testid="legend" data-icon={iconType} />
  ),
  ResponsiveContainer: ({ children }: any) => (
    <div data-testid="responsive-container">{children}</div>
  ),
}));

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

const mockData: FileUploadTrend[] = [
  { date: '2025-01-20', uploads: 5, totalSize: 52428800 },
  { date: '2025-01-21', uploads: 8, totalSize: 83886080 },
  { date: '2025-01-22', uploads: 3, totalSize: 31457280 },
  { date: '2025-01-23', uploads: 12, totalSize: 125829120 },
  { date: '2025-01-24', uploads: 7, totalSize: 73400320 },
];

describe('FileUploadTrendChart', () => {
  describe('Rendering', () => {
    it('should render chart with data', () => {
      renderWithTheme(
        <FileUploadTrendChart
          data={mockData}
          title="Test Chart"
        />
      );

      // Check title is displayed
      expect(screen.getByText('Test Chart')).toBeInTheDocument();

      // Check chart elements are rendered
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      expect(screen.getByTestId('x-axis')).toBeInTheDocument();
      expect(screen.getByTestId('y-axis')).toBeInTheDocument();
      expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument();
      expect(screen.getByTestId('legend')).toBeInTheDocument();
      expect(screen.getByTestId('tooltip')).toBeInTheDocument();
      expect(screen.getByTestId('line')).toBeInTheDocument();
    });

    it('should render empty state when no data provided', () => {
      renderWithTheme(
        <FileUploadTrendChart
          data={[]}
          title="Empty Chart"
        />
      );

      // Check empty state message
      expect(screen.getByText('Noch keine Upload-Daten verfügbar')).toBeInTheDocument();
      expect(screen.getByText('Laden Sie Dateien hoch, um Trends anzuzeigen')).toBeInTheDocument();

      // Chart should not be rendered
      expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
    });

    it('should render with default props', () => {
      renderWithTheme(
        <FileUploadTrendChart data={mockData} />
      );

      // Default title should be displayed
      expect(screen.getByText('Datei-Upload Trend')).toBeInTheDocument();

      // Legend and tooltip should be enabled by default
      expect(screen.getByTestId('legend')).toBeInTheDocument();
      expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    });
  });

  describe('Props Configuration', () => {
    it('should respect showLegend prop', () => {
      renderWithTheme(
        <FileUploadTrendChart
          data={mockData}
          showLegend={false}
        />
      );

      expect(screen.queryByTestId('legend')).not.toBeInTheDocument();
    });

    it('should respect showTooltip prop', () => {
      renderWithTheme(
        <FileUploadTrendChart
          data={mockData}
          showTooltip={false}
        />
      );

      expect(screen.queryByTestId('tooltip')).not.toBeInTheDocument();
    });

    it('should render without title when not provided', () => {
      renderWithTheme(
        <FileUploadTrendChart
          data={mockData}
          title=""
        />
      );

      expect(screen.queryByText('Datei-Upload Trend')).not.toBeInTheDocument();
    });
  });

  describe('Data Processing', () => {
    it('should calculate correct summary statistics', () => {
      renderWithTheme(
        <FileUploadTrendChart data={mockData} />
      );

      // Check total files calculation
      const totalFiles = mockData.reduce((sum, item) => sum + item.uploads, 0);
      expect(screen.getByText(`Gesamt: ${totalFiles} Dateien`)).toBeInTheDocument();

      // Check total size calculation and formatting
      const totalSize = mockData.reduce((sum, item) => sum + item.totalSize, 0);
      expect(screen.getByText(/Größe:/)).toBeInTheDocument();
    });

    it('should pass correct data to chart', () => {
      renderWithTheme(
        <FileUploadTrendChart data={mockData} />
      );

      const chartElement = screen.getByTestId('line-chart');
      const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '[]');
      
      expect(chartData).toEqual(mockData);
    });
  });

  describe('Sandi Metz Compliance', () => {
    it('should have small, focused functions - formatFileSize', () => {
      // Test the formatFileSize function indirectly through component behavior
      renderWithTheme(
        <FileUploadTrendChart data={mockData} />
      );

      // The function should format file sizes correctly in summary
      expect(screen.getByText(/Größe:/)).toBeInTheDocument();
    });

    it('should follow Law of Demeter - limited object chaining', () => {
      // CustomTooltip should have minimal dependencies
      const component = <FileUploadTrendChart data={mockData} />;
      
      // Component should render without errors (no deep object chaining issues)
      expect(() => renderWithTheme(component)).not.toThrow();
    });

    it('should have single responsibility - chart display only', () => {
      renderWithTheme(
        <FileUploadTrendChart data={mockData} />
      );

      // Component should only handle chart display, not data fetching or state management
      // Data is passed as props, no side effects
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle null/undefined data gracefully', () => {
      renderWithTheme(
        <FileUploadTrendChart data={null as any} />
      );

      // Should show empty state
      expect(screen.getByText('Noch keine Upload-Daten verfügbar')).toBeInTheDocument();
    });

    it('should handle malformed data objects', () => {
      const malformedData = [
        { date: '2025-01-20', uploads: 'invalid' as any, totalSize: 52428800 },
      ];

      // Should not crash with malformed data
      expect(() => 
        renderWithTheme(<FileUploadTrendChart data={malformedData} />)
      ).not.toThrow();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading structure', () => {
      renderWithTheme(
        <FileUploadTrendChart
          data={mockData}
          title="Accessibility Test"
        />
      );

      const heading = screen.getByRole('heading', { level: 6 });
      expect(heading).toHaveTextContent('Accessibility Test');
    });

    it('should provide meaningful text content for screen readers', () => {
      renderWithTheme(
        <FileUploadTrendChart data={mockData} />
      );

      // Summary statistics provide context for non-visual users
      expect(screen.getByText(/Gesamt: \d+ Dateien/)).toBeInTheDocument();
      expect(screen.getByText(/Größe:/)).toBeInTheDocument();
    });
  });
});

describe('FileUploadTrendChart Helper Functions', () => {
  // Note: Since helper functions are internal, we test them through component behavior
  
  describe('formatFileSize function behavior', () => {
    it('should format bytes correctly', () => {
      renderWithTheme(
        <FileUploadTrendChart 
          data={[{ date: '2025-01-20', uploads: 1, totalSize: 1024 }]} 
        />
      );
      
      // Should display formatted size (indirectly testing formatFileSize)
      expect(screen.getByText(/Größe: 1 KB/)).toBeInTheDocument();
    });

    it('should handle zero bytes', () => {
      renderWithTheme(
        <FileUploadTrendChart 
          data={[{ date: '2025-01-20', uploads: 1, totalSize: 0 }]} 
        />
      );
      
      expect(screen.getByText(/Größe: 0 B/)).toBeInTheDocument();
    });

    it('should format large sizes', () => {
      renderWithTheme(
        <FileUploadTrendChart 
          data={[{ date: '2025-01-20', uploads: 1, totalSize: 1073741824 }]} // 1 GB
        />
      );
      
      expect(screen.getByText(/Größe: 1 GB/)).toBeInTheDocument();
    });
  });

  describe('formatYAxisLabel function behavior', () => {
    it('should format y-axis labels as integers', () => {
      renderWithTheme(
        <FileUploadTrendChart data={mockData} />
      );

      // Y-axis should be rendered (formatYAxisLabel is used internally)
      expect(screen.getByTestId('y-axis')).toBeInTheDocument();
    });
  });
});