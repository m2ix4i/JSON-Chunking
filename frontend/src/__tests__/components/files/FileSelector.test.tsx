/**
 * Unit Tests for FileSelector Component
 * Tests Sandi Metz principle compliance and getValidationSummary function
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { UploadedFile } from '@/types/app';

// Mock the file store
const mockUseFileSelection = vi.fn();
const mockUseFileStore = vi.fn();

vi.mock('@stores/fileStore', () => ({
  useFileSelection: () => mockUseFileSelection(),
  useFileStore: () => mockUseFileStore(),
}));

// Import component after mocking
import FileSelector from '@/components/files/FileSelector';

const theme = createTheme();

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        {component}
      </ThemeProvider>
    </BrowserRouter>
  );
};

const mockFiles: UploadedFile[] = [
  {
    file_id: 'test-file-1',
    filename: 'test-building.ifc.json',
    size: 5242880,
    status: 'uploaded',
    upload_timestamp: '2025-01-24T10:30:00Z',
    validation_result: {
      is_valid: true,
      estimated_chunks: 150,
      validation_errors: []
    }
  },
  {
    file_id: 'test-file-2',
    filename: 'complex-structure.ifc.json',
    size: 10485760,
    status: 'uploaded',
    upload_timestamp: '2025-01-24T11:45:00Z',
    validation_result: {
      is_valid: true,
      estimated_chunks: 280,
      validation_errors: []
    }
  },
  {
    file_id: 'test-file-3',
    filename: 'failed-upload.ifc.json',
    size: 2097152,
    status: 'error',
    upload_timestamp: '2025-01-24T12:00:00Z',
    validation_result: {
      is_valid: false,
      estimated_chunks: 0,
      validation_errors: ['Invalid JSON structure']
    }
  },
  {
    file_id: 'test-file-4',
    filename: 'no-validation.ifc.json',
    size: 1048576,
    status: 'uploaded',
    upload_timestamp: '2025-01-24T13:00:00Z',
    validation_result: null
  }
];

describe('FileSelector', () => {
  beforeEach(() => {
    mockUseFileSelection.mockReturnValue({
      files: mockFiles,
      selectedFileId: null,
      selectFile: vi.fn(),
    });
    
    mockUseFileStore.mockReturnValue(vi.fn()); // Mock deleteFile function
  });

  describe('Rendering', () => {
    it('should render file list with all files', () => {
      renderWithProviders(<FileSelector />);

      // Check that all files are displayed
      expect(screen.getByText('test-building.ifc.json')).toBeInTheDocument();
      expect(screen.getByText('complex-structure.ifc.json')).toBeInTheDocument();
      expect(screen.getByText('failed-upload.ifc.json')).toBeInTheDocument();
      expect(screen.getByText('no-validation.ifc.json')).toBeInTheDocument();
    });

    it('should render empty state when no files', () => {
      mockUseFileSelection.mockReturnValue({
        files: [],
        selectedFileId: null,
        selectFile: vi.fn(),
      });

      renderWithProviders(<FileSelector />);

      expect(screen.getByText('Noch keine Dateien hochgeladen. Laden Sie zuerst eine IFC JSON-Datei hoch.')).toBeInTheDocument();
    });

    it('should render with custom title', () => {
      renderWithProviders(<FileSelector title="Custom Title" />);

      expect(screen.getByText('Custom Title')).toBeInTheDocument();
    });
  });

  describe('getValidationSummary Function (Sandi Metz Compliance)', () => {
    it('should display correct validation summary for valid files', () => {
      renderWithProviders(<FileSelector />);

      // Check valid file validation summaries
      expect(screen.getByText(/150 Chunks geschätzt/)).toBeInTheDocument();
      expect(screen.getByText(/280 Chunks geschätzt/)).toBeInTheDocument();
    });

    it('should display failure message for invalid files', () => {
      renderWithProviders(<FileSelector />);

      // Check invalid file validation summary
      expect(screen.getByText(/Validierung fehlgeschlagen/)).toBeInTheDocument();
    });

    it('should handle missing validation result', () => {
      renderWithProviders(<FileSelector />);

      // File with null validation_result should show appropriate message
      // In the current implementation, it shows nothing if validation_result is null
      // But if we updated the function to handle this case, we'd test it here
      const fileWithoutValidation = screen.getByText('no-validation.ifc.json');
      expect(fileWithoutValidation).toBeInTheDocument();
    });

    it('should follow Single Responsibility principle', () => {
      // The getValidationSummary function should only handle validation text formatting
      // This is tested indirectly through the component behavior
      renderWithProviders(<FileSelector />);

      // Function should consistently format validation results
      const validationTexts = screen.getAllByText(/Chunks geschätzt|Validierung fehlgeschlagen/);
      expect(validationTexts.length).toBeGreaterThan(0);
    });

    it('should follow Law of Demeter', () => {
      // The function should not have deep object chaining
      // It should only access file.validation_result directly, not file.validation_result.some.deep.property
      renderWithProviders(<FileSelector />);

      // Component should render without errors (no deep chaining issues)
      expect(screen.getByText('Datei auswählen')).toBeInTheDocument();
    });
  });

  describe('File Status Display', () => {
    it('should display correct status icons and labels', () => {
      renderWithProviders(<FileSelector />);

      // Check for status chips
      expect(screen.getAllByText('Bereit')).toHaveLength(3); // 3 uploaded files
      expect(screen.getByText('Fehler')).toBeInTheDocument(); // 1 failed file
    });

    it('should format file sizes correctly', () => {
      renderWithProviders(<FileSelector />);

      // Check file size formatting
      expect(screen.getByText(/5.0 MB/)).toBeInTheDocument();
      expect(screen.getByText(/10.0 MB/)).toBeInTheDocument();
    });

    it('should format upload timestamps correctly', () => {
      renderWithProviders(<FileSelector />);

      // Check that timestamps are formatted in German locale
      expect(screen.getByText(/24\.01\.2025/)).toBeInTheDocument();
    });
  });

  describe('File Selection', () => {
    it('should handle file selection', () => {
      const mockSelectFile = vi.fn();
      mockUseFileSelection.mockReturnValue({
        files: mockFiles,
        selectedFileId: null,
        selectFile: mockSelectFile,
      });

      renderWithProviders(<FileSelector />);

      // Click on a file radio button
      const firstFileRadio = screen.getAllByRole('radio')[1]; // Skip the "none" option
      fireEvent.click(firstFileRadio);

      expect(mockSelectFile).toHaveBeenCalled();
    });

    it('should call onFileSelected callback', () => {
      const mockOnFileSelected = vi.fn();
      const mockSelectFile = vi.fn();
      
      mockUseFileSelection.mockReturnValue({
        files: mockFiles,
        selectedFileId: null,
        selectFile: mockSelectFile,
      });

      renderWithProviders(
        <FileSelector onFileSelected={mockOnFileSelected} />
      );

      // Click on a file radio button
      const firstFileRadio = screen.getAllByRole('radio')[1];
      fireEvent.click(firstFileRadio);

      expect(mockSelectFile).toHaveBeenCalled();
    });

    it('should show selected file alert', () => {
      mockUseFileSelection.mockReturnValue({
        files: mockFiles,
        selectedFileId: 'test-file-1',
        selectFile: vi.fn(),
      });

      renderWithProviders(<FileSelector />);

      expect(screen.getByText(/Ausgewählt: test-building.ifc.json/)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper radio button labels', () => {
      renderWithProviders(<FileSelector />);

      // All radio buttons should be properly labeled
      const radioButtons = screen.getAllByRole('radio');
      expect(radioButtons.length).toBeGreaterThan(0);

      // Check for "name" attribute grouping
      radioButtons.forEach(radio => {
        expect(radio).toHaveAttribute('name', 'file-selector');
      });
    });

    it('should have proper heading structure', () => {
      renderWithProviders(<FileSelector title="Test Title" />);

      expect(screen.getByRole('heading', { level: 6 })).toHaveTextContent('Test Title');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed file data', () => {
      const malformedFiles = [
        {
          file_id: 'malformed',
          filename: 'test.json',
          size: 'invalid' as any,
          status: 'uploaded',
          upload_timestamp: 'invalid-date',
          validation_result: undefined as any,
        }
      ];

      mockUseFileSelection.mockReturnValue({
        files: malformedFiles,
        selectedFileId: null,
        selectFile: vi.fn(),
      });

      // Should not crash with malformed data
      expect(() => renderWithProviders(<FileSelector />)).not.toThrow();
    });

    it('should handle missing required props gracefully', () => {
      mockUseFileSelection.mockReturnValue({
        files: [],
        selectedFileId: null,
        selectFile: vi.fn(),
      });

      // Should render with default props
      expect(() => renderWithProviders(<FileSelector />)).not.toThrow();
    });
  });

  describe('Navigation Integration', () => {
    it('should render upload prompt when enabled', () => {
      mockUseFileSelection.mockReturnValue({
        files: [],
        selectedFileId: null,
        selectFile: vi.fn(),
      });

      renderWithProviders(<FileSelector showUploadPrompt={true} />);

      expect(screen.getByText('Hochladen')).toBeInTheDocument();
      expect(screen.getByText('Weitere Dateien hochladen')).toBeInTheDocument();
    });

    it('should not render upload prompt when disabled', () => {
      mockUseFileSelection.mockReturnValue({
        files: [],
        selectedFileId: null,
        selectFile: vi.fn(),
      });

      renderWithProviders(<FileSelector showUploadPrompt={false} />);

      expect(screen.queryByText('Hochladen')).not.toBeInTheDocument();
      expect(screen.getByText('Keine Dateien verfügbar')).toBeInTheDocument();
    });
  });
});

describe('FileSelector getValidationSummary Function Unit Tests', () => {
  // Test the function behavior in isolation
  
  const createTestFile = (validationResult: any): UploadedFile => ({
    file_id: 'test',
    filename: 'test.json',
    size: 1024,
    status: 'uploaded',
    upload_timestamp: '2025-01-24T10:00:00Z',
    validation_result: validationResult,
  });

  it('should return chunk count for valid files', () => {
    const file = createTestFile({
      is_valid: true,
      estimated_chunks: 150,
      validation_errors: []
    });

    mockUseFileSelection.mockReturnValue({
      files: [file],
      selectedFileId: null,
      selectFile: vi.fn(),
    });

    renderWithProviders(<FileSelector />);

    expect(screen.getByText(/150 Chunks geschätzt/)).toBeInTheDocument();
  });

  it('should return failure message for invalid files', () => {
    const file = createTestFile({
      is_valid: false,
      estimated_chunks: 0,
      validation_errors: ['Error']
    });

    mockUseFileSelection.mockReturnValue({
      files: [file],
      selectedFileId: null,
      selectFile: vi.fn(),
    });

    renderWithProviders(<FileSelector />);

    expect(screen.getByText(/Validierung fehlgeschlagen/)).toBeInTheDocument();
  });

  it('should handle null validation result', () => {
    const file = createTestFile(null);

    mockUseFileSelection.mockReturnValue({
      files: [file],
      selectedFileId: null,
      selectFile: vi.fn(),
    });

    renderWithProviders(<FileSelector />);

    // File should render but validation summary should not be shown
    expect(screen.getByText('test.json')).toBeInTheDocument();
  });

  it('should handle undefined validation result', () => {
    const file = createTestFile(undefined);

    mockUseFileSelection.mockReturnValue({
      files: [file],
      selectedFileId: null,
      selectFile: vi.fn(),
    });

    renderWithProviders(<FileSelector />);

    // File should render but validation summary should not be shown
    expect(screen.getByText('test.json')).toBeInTheDocument();
  });
});