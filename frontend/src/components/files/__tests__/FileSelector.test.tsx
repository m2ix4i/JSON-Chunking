/**
 * FileSelector Component Unit Tests
 * Tests the core functionality of file selection and display
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import FileSelector from '../FileSelector';
import type { UploadedFile } from '@/types/app';

// Mock the file store hook
const mockSelectFile = vi.fn();
const mockUseFileSelection = vi.fn();

vi.mock('@stores/fileStore', () => ({
  useFileSelection: () => mockUseFileSelection()
}));

// Mock react-router-dom navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

// Helper to wrap component with router
const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

// Mock file data
const mockFiles: UploadedFile[] = [
  {
    file_id: 'file-1',
    filename: 'test-file-1.json',
    size: 1024000,
    upload_timestamp: '2024-01-15T10:30:00Z',
    status: 'uploaded',
    validation_result: {
      is_valid: true,
      estimated_chunks: 42
    }
  },
  {
    file_id: 'file-2',
    filename: 'test-file-2.json',
    size: 2048000,
    upload_timestamp: '2024-01-16T14:45:00Z',
    status: 'processing',
    validation_result: null
  },
  {
    file_id: 'file-3',
    filename: 'failed-file.json',
    size: 512000,
    upload_timestamp: '2024-01-17T09:15:00Z',
    status: 'failed',
    validation_result: {
      is_valid: false,
      estimated_chunks: 0
    }
  }
];

describe('FileSelector Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseFileSelection.mockReturnValue({
      files: mockFiles,
      selectedFileId: null,
      selectFile: mockSelectFile
    });
  });

  describe('with files available', () => {
    it('renders the component title and description', () => {
      renderWithRouter(<FileSelector />);
      
      expect(screen.getByText('Datei auswählen')).toBeInTheDocument();
      expect(screen.getByText('Wählen Sie eine Datei für Ihre Abfrage aus:')).toBeInTheDocument();
    });

    it('displays all files with correct information', () => {
      renderWithRouter(<FileSelector />);
      
      // Check that all files are displayed
      expect(screen.getByText('test-file-1.json')).toBeInTheDocument();
      expect(screen.getByText('test-file-2.json')).toBeInTheDocument();
      expect(screen.getByText('failed-file.json')).toBeInTheDocument();
      
      // Check file sizes
      expect(screen.getByText('1.0 MB')).toBeInTheDocument();
      expect(screen.getByText('2.0 MB')).toBeInTheDocument();
      expect(screen.getByText('0.5 MB')).toBeInTheDocument();
    });

    it('displays correct status for each file', () => {
      renderWithRouter(<FileSelector />);
      
      expect(screen.getByText('Bereit')).toBeInTheDocument();
      expect(screen.getByText('Verarbeitung')).toBeInTheDocument();
      expect(screen.getByText('Fehler')).toBeInTheDocument();
    });

    it('shows validation results for valid files', () => {
      renderWithRouter(<FileSelector />);
      
      expect(screen.getByText('42 Chunks geschätzt')).toBeInTheDocument();
      expect(screen.getByText('Validierung fehlgeschlagen')).toBeInTheDocument();
    });

    it('handles file selection', () => {
      renderWithRouter(<FileSelector />);
      
      const fileRadio = screen.getByDisplayValue('file-1');
      fireEvent.click(fileRadio);
      
      expect(mockSelectFile).toHaveBeenCalledWith('file-1');
    });

    it('handles deselection by clicking "no file" option', () => {
      renderWithRouter(<FileSelector />);
      
      const noFileRadio = screen.getByDisplayValue('');
      fireEvent.click(noFileRadio);
      
      expect(mockSelectFile).toHaveBeenCalledWith(null);
    });

    it('calls onFileSelected callback when provided', () => {
      const mockCallback = vi.fn();
      renderWithRouter(<FileSelector onFileSelected={mockCallback} />);
      
      const fileRadio = screen.getByDisplayValue('file-1');
      fireEvent.click(fileRadio);
      
      expect(mockCallback).toHaveBeenCalledWith(mockFiles[0]);
    });

    it('shows selected file summary when file is selected', () => {
      mockUseFileSelection.mockReturnValue({
        files: mockFiles,
        selectedFileId: 'file-1',
        selectFile: mockSelectFile
      });

      renderWithRouter(<FileSelector />);
      
      expect(screen.getByText('Ausgewählt:')).toBeInTheDocument();
      expect(screen.getByText('test-file-1.json')).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    beforeEach(() => {
      mockUseFileSelection.mockReturnValue({
        files: [],
        selectedFileId: null,
        selectFile: mockSelectFile
      });
    });

    it('shows empty state with upload prompt by default', () => {
      renderWithRouter(<FileSelector />);
      
      expect(screen.getByText('Noch keine Dateien hochgeladen. Laden Sie zuerst eine IFC JSON-Datei hoch.')).toBeInTheDocument();
      expect(screen.getByText('Hochladen')).toBeInTheDocument();
    });

    it('shows simple empty message when upload prompt is disabled', () => {
      renderWithRouter(<FileSelector showUploadPrompt={false} />);
      
      expect(screen.getByText('Keine Dateien verfügbar')).toBeInTheDocument();
      expect(screen.queryByText('Hochladen')).not.toBeInTheDocument();
    });

    it('navigates to upload page when upload button is clicked', () => {
      renderWithRouter(<FileSelector />);
      
      const uploadButton = screen.getByText('Hochladen');
      fireEvent.click(uploadButton);
      
      expect(mockNavigate).toHaveBeenCalledWith('/upload');
    });
  });

  describe('component props', () => {
    it('uses custom title when provided', () => {
      renderWithRouter(<FileSelector title="Custom Title" />);
      
      expect(screen.getByText('Custom Title')).toBeInTheDocument();
    });

    it('applies compact styling when compact prop is true', () => {
      renderWithRouter(<FileSelector compact={true} />);
      
      // Compact mode should still render the basic structure
      expect(screen.getByText('Datei auswählen')).toBeInTheDocument();
    });
  });

  describe('utility functions', () => {
    it('formats file sizes correctly', () => {
      renderWithRouter(<FileSelector />);
      
      // Test various file sizes are formatted correctly
      expect(screen.getByText('1.0 MB')).toBeInTheDocument();
      expect(screen.getByText('2.0 MB')).toBeInTheDocument();
      expect(screen.getByText('0.5 MB')).toBeInTheDocument();
    });

    it('formats upload timestamps in German locale', () => {
      renderWithRouter(<FileSelector />);
      
      // Check that timestamps are displayed (exact format may vary by environment)
      const timestampElements = screen.getAllByText(/Hochgeladen:/);
      expect(timestampElements.length).toBeGreaterThan(0);
    });
  });

  describe('accessibility', () => {
    it('has proper radio button group structure', () => {
      renderWithRouter(<FileSelector />);
      
      const radioButtons = screen.getAllByRole('radio');
      expect(radioButtons.length).toBeGreaterThan(0);
      
      // All radio buttons should have the same name attribute
      radioButtons.forEach(radio => {
        expect(radio).toHaveAttribute('name', 'file-selector');
      });
    });

    it('has accessible labels for radio buttons', () => {
      renderWithRouter(<FileSelector />);
      
      const noFileOption = screen.getByLabelText(/Keine Datei ausgewählt/);
      expect(noFileOption).toBeInTheDocument();
    });
  });
});