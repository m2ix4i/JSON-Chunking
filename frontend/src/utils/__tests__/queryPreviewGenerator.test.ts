/**
 * Tests for queryPreviewGenerator utility - SOLID refactored functions.
 * Tests the utilities extracted from the original 120+ line method.
 */

import { describe, it, expect } from 'vitest';
import {
  estimateQueryResults,
  createProcessingSteps,
  calculateComplexity,
  generateQueryPreview
} from '../queryPreviewGenerator';

describe('queryPreviewGenerator - SOLID Refactored Utilities', () => {
  describe('estimateQueryResults', () => {
    it('should estimate results for material queries', () => {
      const result = estimateQueryResults('Alle Materialien im Projekt');
      expect(result.estimatedResults).toBe(25);
      expect(result.entityTypes).toContain('IfcMaterial');
    });

    it('should estimate results for building-wide queries', () => {
      const result = estimateQueryResults('Alle Elemente im Gebäude');
      expect(result.estimatedResults).toBe(150);
    });

    it('should handle count queries', () => {
      const result = estimateQueryResults('Wie viele Wände gibt es?');
      expect(result.estimatedResults).toBe(1);
    });
  });

  describe('createProcessingSteps', () => {
    it('should create basic steps for simple queries', () => {
      const steps = createProcessingSteps('Simple query');
      expect(steps).toHaveLength(3);
      expect(steps[0].name).toBe('Abfrage-Parsing');
      expect(steps[1].name).toBe('IFC-Datensuche');
      expect(steps[2].name).toBe('Ergebnisaggregation');
    });

    it('should add geometry steps for calculation queries', () => {
      const steps = createProcessingSteps('Berechne das Volumen');
      expect(steps.find(s => s.name === 'Geometrieberechnung')).toBeDefined();
    });

    it('should add property analysis for material queries', () => {
      const steps = createProcessingSteps('Materialien und Eigenschaften');
      expect(steps.find(s => s.name === 'Eigenschaftsanalyse')).toBeDefined();
    });
  });

  describe('calculateComplexity', () => {
    it('should calculate base complexity for simple queries', () => {
      const steps = createProcessingSteps('Simple query');
      const complexity = calculateComplexity('Simple query', 10, steps);
      expect(complexity.score).toBe(3);
      expect(complexity.factors).toEqual([]);
      expect(complexity.optimization).toEqual([]);
    });

    it('should increase complexity for building-wide queries', () => {
      const steps = createProcessingSteps('Alle Elemente im Gebäude');
      const complexity = calculateComplexity('Alle Elemente im Gebäude', 150, steps);
      expect(complexity.score).toBeGreaterThan(3);
      expect(complexity.factors.length).toBeGreaterThan(0);
      expect(complexity.optimization).toEqual(expect.any(Array));
    });
  });

  describe('generateQueryPreview - Integration Test', () => {
    it('should generate complete preview object', () => {
      const preview = generateQueryPreview('Test query for complete preview');
      
      expect(preview).toMatchObject({
        estimatedResults: expect.any(Number),
        processingSteps: expect.any(Array),
        complexity: expect.any(Object),
        resourceEstimate: expect.any(Object),
        resultStructure: expect.any(Object)
      });
    });

    it('should generate preview for building query with correct structure', () => {
      const preview = generateQueryPreview('Alle Materialien im Gebäude berechnen');
      
      expect(preview.estimatedResults).toBe(150); // "alle" + "gebäude" takes precedence
      expect(preview.processingSteps.length).toBeGreaterThan(3); // Should have extra steps
      expect(preview.complexity.score).toBeGreaterThan(3);
      expect(preview.resourceEstimate).toBeDefined();
    });
  });
});