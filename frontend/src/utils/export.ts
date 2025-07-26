/**
 * Export utilities for query results.
 * Handles different export formats (JSON, CSV, PDF) with data transformation.
 */

import type { QueryResultResponse } from '@/types/api';

/**
 * Export formats supported by the application
 */
export type ExportFormat = 'json' | 'csv' | 'pdf';

/**
 * Export a query result in the specified format
 */
export const exportQueryResult = async (
  result: QueryResultResponse,
  format: ExportFormat
): Promise<void> => {
  try {
    switch (format) {
      case 'json':
        await exportAsJSON(result);
        break;
      case 'csv':
        await exportAsCSV(result);
        break;
      case 'pdf':
        await exportAsPDF(result);
        break;
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  } catch (error) {
    console.error('Export failed:', error);
    throw new Error(`Failed to export as ${format.toUpperCase()}`);
  }
};

/**
 * Export query result as JSON file
 */
const exportAsJSON = async (result: QueryResultResponse): Promise<void> => {
  const jsonData = JSON.stringify(result, null, 2);
  const blob = new Blob([jsonData], { type: 'application/json' });
  const filename = `query-result-${result.query_id.slice(0, 8)}.json`;
  
  downloadBlob(blob, filename);
};

/**
 * Export query result as CSV file
 */
const exportAsCSV = async (result: QueryResultResponse): Promise<void> => {
  const csvData = convertToCSV(result);
  const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
  const filename = `query-result-${result.query_id.slice(0, 8)}.csv`;
  
  downloadBlob(blob, filename);
};

/**
 * Export query result as PDF file (placeholder implementation)
 */
const exportAsPDF = async (result: QueryResultResponse): Promise<void> => {
  // TODO: Implement PDF export using jsPDF or similar library
  // For now, export as formatted text
  const pdfContent = convertToPDFText(result);
  const blob = new Blob([pdfContent], { type: 'text/plain;charset=utf-8;' });
  const filename = `query-result-${result.query_id.slice(0, 8)}.txt`;
  
  downloadBlob(blob, filename);
};

/**
 * Convert query result to CSV format
 */
const convertToCSV = (result: QueryResultResponse): string => {
  const lines: string[] = [];
  
  // Header information
  lines.push('Abfrage-Information');
  lines.push('Feld,Wert');
  lines.push(`Abfrage-ID,${result.query_id}`);
  lines.push(`Ursprüngliche Abfrage,"${result.original_query}"`);
  lines.push(`Absicht,${result.intent}`);
  lines.push(`Antwort,"${result.answer.replace(/"/g, '""')}"`);
  lines.push(`Vertrauen,${result.confidence_score}`);
  lines.push(`Vollständigkeit,${result.completeness_score}`);
  lines.push(`Relevanz,${result.relevance_score}`);
  lines.push(`Verarbeitungszeit,${result.processing_time}`);
  lines.push(`Erfolgreiche Chunks,${result.successful_chunks}`);
  lines.push(`Gesamt Chunks,${result.total_chunks}`);
  lines.push(`Gesamt Tokens,${result.total_tokens}`);
  lines.push(`Gesamtkosten,${result.total_cost}`);
  lines.push(`Verwendetes Modell,${result.model_used}`);
  lines.push('');
  
  // Structured data
  if (result.structured_data) {
    // Quantities
    if (result.structured_data.quantities && Object.keys(result.structured_data.quantities).length > 0) {
      lines.push('Mengenangaben');
      lines.push('Messgröße,Wert');
      Object.entries(result.structured_data.quantities).forEach(([key, value]) => {
        lines.push(`${key},${value}`);
      });
      lines.push('');
    }
    
    // Materials
    if (result.structured_data.materials && result.structured_data.materials.length > 0) {
      lines.push('Materialien');
      lines.push('Material');
      result.structured_data.materials.forEach(material => {
        lines.push(`"${material}"`);
      });
      lines.push('');
    }
    
    // Entities
    if (result.structured_data.entities && result.structured_data.entities.length > 0) {
      lines.push('Entitäten');
      lines.push('Typ,Name,Eigenschaften');
      result.structured_data.entities.forEach(entity => {
        const propertiesCount = Object.keys(entity.properties).length;
        lines.push(`${entity.type},"${entity.name}",${propertiesCount} Eigenschaften`);
      });
    }
  }
  
  return lines.join('\n');
};

/**
 * Convert query result to formatted text for PDF export
 */
const convertToPDFText = (result: QueryResultResponse): string => {
  const lines: string[] = [];
  
  lines.push('ABFRAGE-ERGEBNIS');
  lines.push('='.repeat(50));
  lines.push('');
  
  lines.push(`Abfrage-ID: ${result.query_id}`);
  lines.push(`Ursprüngliche Abfrage: ${result.original_query}`);
  lines.push(`Absicht: ${result.intent}`);
  lines.push('');
  
  lines.push('ANTWORT:');
  lines.push('-'.repeat(20));
  lines.push(result.answer);
  lines.push('');
  
  lines.push('METRIKEN:');
  lines.push('-'.repeat(20));
  lines.push(`Vertrauen: ${Math.round(result.confidence_score * 100)}%`);
  lines.push(`Vollständigkeit: ${Math.round(result.completeness_score * 100)}%`);
  lines.push(`Relevanz: ${Math.round(result.relevance_score * 100)}%`);
  lines.push(`Verarbeitungszeit: ${result.processing_time}s`);
  lines.push(`Erfolgreiche Chunks: ${result.successful_chunks}/${result.total_chunks}`);
  lines.push(`Gesamt Tokens: ${result.total_tokens.toLocaleString('de-DE')}`);
  lines.push(`Gesamtkosten: $${result.total_cost.toFixed(4)}`);
  lines.push(`Verwendetes Modell: ${result.model_used}`);
  lines.push('');
  
  // Structured data
  if (result.structured_data) {
    lines.push('STRUKTURIERTE DATEN:');
    lines.push('-'.repeat(20));
    
    if (result.structured_data.quantities && Object.keys(result.structured_data.quantities).length > 0) {
      lines.push('');
      lines.push('Mengenangaben:');
      Object.entries(result.structured_data.quantities).forEach(([key, value]) => {
        lines.push(`  ${key}: ${typeof value === 'number' ? value.toLocaleString('de-DE') : value}`);
      });
    }
    
    if (result.structured_data.materials && result.structured_data.materials.length > 0) {
      lines.push('');
      lines.push('Materialien:');
      result.structured_data.materials.forEach(material => {
        lines.push(`  - ${material}`);
      });
    }
    
    if (result.structured_data.entities && result.structured_data.entities.length > 0) {
      lines.push('');
      lines.push('Entitäten:');
      result.structured_data.entities.forEach(entity => {
        lines.push(`  ${entity.type}: ${entity.name} (${Object.keys(entity.properties).length} Eigenschaften)`);
      });
    }
  }
  
  return lines.join('\n');
};

/**
 * Download a blob as a file
 */
const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up the URL object
  URL.revokeObjectURL(url);
};

/**
 * Copy query result to clipboard as formatted text
 */
export const copyResultToClipboard = async (result: QueryResultResponse): Promise<void> => {
  const textContent = convertToPDFText(result);
  
  try {
    await navigator.clipboard.writeText(textContent);
  } catch (error) {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = textContent;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
  }
};

/**
 * Share query result (placeholder for future implementation)
 */
export const shareQueryResult = async (result: QueryResultResponse): Promise<void> => {
  // TODO: Implement sharing functionality
  // This could include:
  // - Generating shareable URLs
  // - Social media sharing
  // - Email sharing
  // - API endpoint generation
  
  console.log('Sharing functionality not yet implemented:', result.query_id);
  
  // For now, copy a shareable summary to clipboard
  const shareText = `Abfrage-Ergebnis: ${result.original_query}\n\nAntwort: ${result.answer}\n\nVertrauen: ${Math.round(result.confidence_score * 100)}%`;
  await copyResultToClipboard(result);
};