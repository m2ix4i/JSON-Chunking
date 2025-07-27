/**
 * Test suite for queryPreviewGenerator utility functions.
 * Tests the SOLID-refactored utility functions that replaced the 120+ line method.
 */

import { describe, it, expect } from 'vitest'
import {
  estimateQueryResults,
  createProcessingSteps,
  calculateComplexity,
  generateOptimizations,
  calculateResourceEstimate,
  createResultStructure,
  generateQueryPreview
} from '@utils/queryPreviewGenerator'

describe('queryPreviewGenerator - SOLID Refactored Utilities', () => {
  describe('estimateQueryResults', () => {
    it('should estimate results for quantity queries', () => {
      const result = estimateQueryResults('Wie viele Wände gibt es?')
      
      expect(result.estimatedResults).toBe(1)
      expect(result.dataCategories).toContain('Anzahl')
      expect(result.dataCategories).toContain('Zusammenfassung')
    })

    it('should estimate results for building-wide queries', () => {
      const result = estimateQueryResults('Alle Elemente im Gebäude')
      
      expect(result.estimatedResults).toBe(150)
      expect(result.entityTypes).toContain('IfcWall')
      expect(result.entityTypes).toContain('IfcSpace')
    })

    it('should estimate results for material queries', () => {
      const result = estimateQueryResults('Material eigenschaften anzeigen')
      
      expect(result.estimatedResults).toBe(25)
      expect(result.entityTypes).toContain('IfcMaterial')
      expect(result.entityTypes).toContain('IfcMaterialProperties')
      expect(result.dataCategories).toContain('Materialien')
    })

    it('should estimate results for room/floor queries', () => {
      const result = estimateQueryResults('Alle Räume im Stockwerk')
      
      expect(result.estimatedResults).toBe(8)
      expect(result.entityTypes).toContain('IfcSpace')
      expect(result.entityTypes).toContain('IfcBuildingStorey')
      expect(result.dataCategories).toContain('Räume')
    })

    it('should have default values for generic queries', () => {
      const result = estimateQueryResults('Generic query')
      
      expect(result.estimatedResults).toBe(10)
      expect(result.entityTypes).toEqual(['IfcWall', 'IfcSpace'])
      expect(result.dataCategories).toEqual(['Geometrie', 'Eigenschaften'])
    })
  })

  describe('createProcessingSteps', () => {
    it('should create basic processing steps for any query', () => {
      const steps = createProcessingSteps('Simple query')
      
      expect(steps).toHaveLength(3) // Parsing, Search, Aggregation
      expect(steps[0].name).toBe('Abfrage-Parsing')
      expect(steps[1].name).toBe('IFC-Datensuche')
      expect(steps[2].name).toBe('Ergebnisaggregation')
    })

    it('should add geometry calculation step for geometry queries', () => {
      const steps = createProcessingSteps('Berechne das Volumen')
      
      expect(steps).toHaveLength(4)
      expect(steps.find(s => s.name === 'Geometrieberechnung')).toBeDefined()
      expect(steps.find(s => s.name === 'Geometrieberechnung')?.estimatedDuration).toBe(5)
    })

    it('should add property analysis step for material queries', () => {
      const steps = createProcessingSteps('Material eigenschaften')
      
      expect(steps).toHaveLength(4)
      expect(steps.find(s => s.name === 'Eigenschaftsanalyse')).toBeDefined()
      expect(steps.find(s => s.name === 'Eigenschaftsanalyse')?.estimatedDuration).toBe(2)
    })

    it('should add both steps for complex queries', () => {
      const steps = createProcessingSteps('Berechne Volumen der Materialien')
      
      expect(steps).toHaveLength(5) // Parsing, Search, Geometry, Properties, Aggregation
      expect(steps.find(s => s.name === 'Geometrieberechnung')).toBeDefined()
      expect(steps.find(s => s.name === 'Eigenschaftsanalyse')).toBeDefined()
    })

    it('should have proper dependency chains', () => {
      const steps = createProcessingSteps('Complex query with geometry')
      
      const geometryStep = steps.find(s => s.name === 'Geometrieberechnung')
      const aggregationStep = steps.find(s => s.name === 'Ergebnisaggregation')
      
      expect(geometryStep?.dependencies).toContain('IFC-Datensuche')
      expect(aggregationStep?.dependencies).toContain('Geometrieberechnung')
    })
  })

  describe('calculateComplexity', () => {
    it('should calculate base complexity for simple queries', () => {
      const steps = createProcessingSteps('Simple query')
      const complexity = calculateComplexity('Simple query', 5, steps)
      
      expect(complexity.score).toBe(3) // Base complexity
      expect(complexity.factors).toHaveLength(0)
      expect(complexity.recommendation).toBe('Einfache Abfrage mit schneller Verarbeitung')
    })

    it('should increase complexity for building-wide queries', () => {
      const steps = createProcessingSteps('Alle Elemente im Gebäude')
      const complexity = calculateComplexity('Alle Elemente im Gebäude', 150, steps)
      
      expect(complexity.score).toBeGreaterThan(3)
      expect(complexity.factors.find(f => f.name === 'Gebäude-weite Suche')).toBeDefined()
      expect(complexity.factors.find(f => f.name === 'Große Ergebnismenge')).toBeDefined()
    })

    it('should add complexity for geometry calculations', () => {
      const steps = createProcessingSteps('Berechne Volumen')
      const complexity = calculateComplexity('Berechne Volumen', 10, steps)
      
      expect(complexity.factors.find(f => f.name === 'Geometrieberechnung')).toBeDefined()
      expect(complexity.score).toBeGreaterThan(3)
    })

    it('should add complexity for comparison operations', () => {
      const steps = createProcessingSteps('Vergleiche die Materialien')
      const complexity = calculateComplexity('Vergleiche die Materialien', 10, steps)
      
      expect(complexity.factors.find(f => f.name === 'Vergleichsoperationen')).toBeDefined()
      expect(complexity.score).toBeGreaterThan(3)
    })

    it('should cap complexity score at 10', () => {
      const steps = createProcessingSteps('Complex query')
      const complexity = calculateComplexity('Alle Gebäude vergleichen und berechnen', 200, steps)
      
      expect(complexity.score).toBeLessThanOrEqual(10)
    })
  })

  describe('generateOptimizations', () => {
    it('should suggest area limitation for high complexity', () => {
      const optimizations = generateOptimizations(8, 'Complex query', 50)
      
      expect(optimizations).toContain('Begrenzen Sie die Suche auf spezifische Bereiche oder Stockwerke')
    })

    it('should suggest floor specification when not specified', () => {
      const optimizations = generateOptimizations(5, 'Generic query', 50)
      
      expect(optimizations).toContain('Geben Sie ein spezifisches Stockwerk an für bessere Performance')
    })

    it('should not suggest floor specification when already specified', () => {
      const optimizations = generateOptimizations(5, 'Erdgeschoss query', 50)
      
      expect(optimizations).not.toContain('Geben Sie ein spezifisches Stockwerk an für bessere Performance')
    })

    it('should suggest filters for large result sets', () => {
      const optimizations = generateOptimizations(5, 'Query', 150)
      
      expect(optimizations).toContain('Verwenden Sie Filter um die Ergebnismenge zu reduzieren')
    })

    it('should return empty array for simple queries', () => {
      const optimizations = generateOptimizations(3, 'Erdgeschoss', 10)
      
      expect(optimizations).toHaveLength(0)
    })
  })

  describe('calculateResourceEstimate', () => {
    it('should calculate basic resource estimates', () => {
      const steps = createProcessingSteps('Simple query')
      const estimate = calculateResourceEstimate('Simple query', steps, 10)
      
      expect(estimate.estimatedTokens).toBeGreaterThan(500)
      expect(estimate.estimatedMemory).toBe(5) // 10 * 0.5
      expect(estimate.estimatedDuration).toBeGreaterThan(0)
      expect(estimate.concurrencyImpact).toBeGreaterThan(0)
    })

    it('should increase estimates for longer queries', () => {
      const longQuery = 'This is a very long query with many words that should increase token count'
      const steps = createProcessingSteps(longQuery)
      const estimate = calculateResourceEstimate(longQuery, steps, 10)
      
      expect(estimate.estimatedTokens).toBeGreaterThan(500)
    })

    it('should apply complexity multiplier for complex queries', () => {
      const steps = createProcessingSteps('Complex query with geometry and materials')
      const estimate = calculateResourceEstimate('Query', steps, 10)
      
      expect(estimate.estimatedTokens).toBeGreaterThan(750) // Should have 2x multiplier
    })

    it('should calculate duration from steps', () => {
      const steps = createProcessingSteps('Query with geometry')
      const estimate = calculateResourceEstimate('Query', steps, 10)
      
      const expectedDuration = steps.reduce((sum, step) => sum + step.estimatedDuration, 0)
      expect(estimate.estimatedDuration).toBe(expectedDuration)
    })
  })

  describe('createResultStructure', () => {
    it('should create proper result structure', () => {
      const structure = createResultStructure(
        ['IfcWall', 'IfcSpace'], 
        ['Geometrie', 'Eigenschaften'], 
        10, 
        'Test query'
      )
      
      expect(structure.entityTypes).toEqual(['IfcWall', 'IfcSpace'])
      expect(structure.dataCategories).toEqual(['Geometrie', 'Eigenschaften'])
      expect(structure.expectedFields).toContain('id')
      expect(structure.expectedFields).toContain('properties')
      expect(structure.sampleOutput.entities).toBe(10)
    })

    it('should detect geometry requirement correctly', () => {
      const structureWithGeometry = createResultStructure([], [], 10, 'Show geometry')
      const structureWithoutGeometry = createResultStructure([], [], 1, 'Anzahl only')
      
      expect(structureWithGeometry.sampleOutput.hasGeometry).toBe(true)
      expect(structureWithoutGeometry.sampleOutput.hasGeometry).toBe(false)
    })

    it('should always include properties', () => {
      const structure = createResultStructure([], [], 10, 'Any query')
      
      expect(structure.sampleOutput.hasProperties).toBe(true)
    })
  })

  describe('generateQueryPreview - Integration Test', () => {
    it('should generate complete preview for simple query', () => {
      const preview = generateQueryPreview('Simple test query')
      
      expect(preview.estimatedResults).toBe(10)
      expect(preview.resultStructure).toBeDefined()
      expect(preview.processingSteps).toHaveLength(3)
      expect(preview.resourceEstimate).toBeDefined()
      expect(preview.complexity).toBeDefined()
    })

    it('should generate complex preview for building query', () => {
      const preview = generateQueryPreview('Alle Materialien im Gebäude berechnen')
      
      expect(preview.estimatedResults).toBe(25) // Material query
      expect(preview.processingSteps.length).toBeGreaterThan(3) // Should have extra steps
      expect(preview.complexity.score).toBeGreaterThan(3)
      expect(preview.complexity.optimization.length).toBeGreaterThan(0)
    })

    it('should handle file ID parameter', () => {
      const preview = generateQueryPreview('Test query', 'file123')
      
      // Should not throw and should generate valid preview
      expect(preview).toBeDefined()
      expect(preview.estimatedResults).toBeGreaterThan(0)
    })

    it('should generate consistent results for same input', () => {
      const preview1 = generateQueryPreview('Consistent test query')
      const preview2 = generateQueryPreview('Consistent test query')
      
      expect(preview1.estimatedResults).toBe(preview2.estimatedResults)
      expect(preview1.complexity.score).toBe(preview2.complexity.score)
      expect(preview1.processingSteps).toHaveLength(preview2.processingSteps.length)
    })
  })
})