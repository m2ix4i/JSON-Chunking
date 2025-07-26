/**
 * Utility functions for generating query preview data.
 * Separated into focused functions following Single Responsibility Principle.
 */

import type { 
  QueryPreview,
  ProcessingStep,
  ComplexityFactor,
  ResourceEstimate,
  ComplexityEstimate,
  ResultStructurePreview 
} from '@/types/app';

/**
 * Estimates the number of results and entity types based on query text.
 */
export const estimateQueryResults = (queryText: string) => {
  const lowerQuery = queryText.toLowerCase();
  
  let estimatedResults = 10;
  let entityTypes: string[] = ['IfcWall', 'IfcSpace'];
  let dataCategories: string[] = ['Geometrie', 'Eigenschaften'];
  
  if (lowerQuery.includes('wie viele') || lowerQuery.includes('anzahl')) {
    estimatedResults = 1;
    dataCategories = ['Anzahl', 'Zusammenfassung'];
  } else if (lowerQuery.includes('alle') && lowerQuery.includes('gebäude')) {
    estimatedResults = 150;
  } else if (lowerQuery.includes('material')) {
    entityTypes = ['IfcMaterial', 'IfcMaterialProperties'];
    dataCategories = ['Materialien', 'Eigenschaften', 'Mengen'];
    estimatedResults = 25;
  } else if (lowerQuery.includes('raum') || lowerQuery.includes('stockwerk')) {
    entityTypes = ['IfcSpace', 'IfcBuildingStorey'];
    dataCategories = ['Räume', 'Flächen', 'Volumen'];
    estimatedResults = 8;
  }

  return { estimatedResults, entityTypes, dataCategories };
};

/**
 * Creates processing steps based on query complexity and type.
 */
export const createProcessingSteps = (queryText: string): ProcessingStep[] => {
  const lowerQuery = queryText.toLowerCase();
  
  const steps: ProcessingStep[] = [
    {
      name: 'Abfrage-Parsing',
      description: 'Analyse der natürlichen Sprache und Intent-Erkennung',
      estimatedDuration: 1,
      dependencies: [],
    },
    {
      name: 'IFC-Datensuche',
      description: 'Durchsuchen der IFC-Struktur nach relevanten Elementen',
      estimatedDuration: 3,
      dependencies: ['Abfrage-Parsing'],
    },
  ];

  if (lowerQuery.includes('berechne') || lowerQuery.includes('volumen') || lowerQuery.includes('fläche')) {
    steps.push({
      name: 'Geometrieberechnung',
      description: 'Berechnung von Flächen, Volumen und anderen geometrischen Eigenschaften',
      estimatedDuration: 5,
      dependencies: ['IFC-Datensuche'],
    });
  }

  if (lowerQuery.includes('material') || lowerQuery.includes('eigenschaften')) {
    steps.push({
      name: 'Eigenschaftsanalyse',
      description: 'Extraktion und Analyse von Materialeigenschaften',
      estimatedDuration: 2,
      dependencies: ['IFC-Datensuche'],
    });
  }

  steps.push({
    name: 'Ergebnisaggregation',
    description: 'Zusammenstellung und Formatierung der Ergebnisse',
    estimatedDuration: 1,
    dependencies: steps.slice(1).map(s => s.name),
  });

  return steps;
};

/**
 * Calculates query complexity score and factors.
 */
export const calculateComplexity = (
  queryText: string, 
  estimatedResults: number, 
  steps: ProcessingStep[]
): ComplexityEstimate => {
  const lowerQuery = queryText.toLowerCase();
  const complexityFactors: ComplexityFactor[] = [];
  let complexityScore = 3; // Base complexity

  if (lowerQuery.includes('alle') && lowerQuery.includes('gebäude')) {
    complexityFactors.push({
      name: 'Gebäude-weite Suche',
      impact: 3,
      description: 'Durchsuchen aller Gebäudeelemente erhöht die Komplexität',
    });
    complexityScore += 3;
  }

  if (lowerQuery.includes('berechne') || lowerQuery.includes('volumen')) {
    complexityFactors.push({
      name: 'Geometrieberechnung',
      impact: 2,
      description: 'Komplexe mathematische Berechnungen erforderlich',
    });
    complexityScore += 2;
  }

  if (lowerQuery.includes('vergleiche') || lowerQuery.includes('analysiere')) {
    complexityFactors.push({
      name: 'Vergleichsoperationen',
      impact: 2,
      description: 'Mehrfache Datenvergleiche und Analysen',
    });
    complexityScore += 2;
  }

  if (estimatedResults > 50) {
    complexityFactors.push({
      name: 'Große Ergebnismenge',
      impact: 1,
      description: 'Verarbeitung vieler Ergebnisse',
    });
    complexityScore += 1;
  }

  const recommendation = complexityScore <= 4 
    ? 'Einfache Abfrage mit schneller Verarbeitung'
    : complexityScore <= 7
    ? 'Mittlere Komplexität, angemessene Verarbeitungszeit'
    : 'Komplexe Abfrage, längere Verarbeitungszeit zu erwarten';

  return {
    score: Math.min(10, complexityScore),
    factors: complexityFactors,
    recommendation,
    optimization: generateOptimizations(complexityScore, queryText, estimatedResults),
  };
};

/**
 * Generates optimization suggestions based on complexity and query characteristics.
 */
export const generateOptimizations = (
  complexityScore: number, 
  queryText: string, 
  estimatedResults: number
): string[] => {
  const lowerQuery = queryText.toLowerCase();
  const optimizations: string[] = [];
  
  if (complexityScore > 6) {
    optimizations.push('Begrenzen Sie die Suche auf spezifische Bereiche oder Stockwerke');
  }
  if (!lowerQuery.includes('erdgeschoss') && !lowerQuery.includes('obergeschoss')) {
    optimizations.push('Geben Sie ein spezifisches Stockwerk an für bessere Performance');
  }
  if (estimatedResults > 100) {
    optimizations.push('Verwenden Sie Filter um die Ergebnismenge zu reduzieren');
  }

  return optimizations;
};

/**
 * Calculates resource estimates based on query characteristics.
 */
export const calculateResourceEstimate = (
  queryText: string, 
  steps: ProcessingStep[], 
  estimatedResults: number
): ResourceEstimate => {
  const baseTokens = Math.max(500, queryText.length * 10);
  const complexityMultiplier = steps.length > 3 ? 2 : 1.5;
  const estimatedTokens = Math.round(baseTokens * complexityMultiplier);
  const estimatedDuration = steps.reduce((sum, step) => sum + step.estimatedDuration, 0);

  return {
    estimatedTokens,
    estimatedMemory: Math.round(estimatedResults * 0.5), // MB
    estimatedDuration,
    concurrencyImpact: Math.max(1, Math.round(estimatedDuration * 0.3)),
  };
};

/**
 * Creates result structure preview based on query analysis.
 */
export const createResultStructure = (
  entityTypes: string[], 
  dataCategories: string[], 
  estimatedResults: number, 
  queryText: string
): ResultStructurePreview => {
  const lowerQuery = queryText.toLowerCase();
  
  return {
    entityTypes,
    dataCategories,
    expectedFields: [
      'id', 'name', 'type', 'properties', 'geometry', 'relationships'
    ],
    sampleOutput: {
      entities: estimatedResults,
      categories: dataCategories,
      hasGeometry: !lowerQuery.includes('anzahl'),
      hasProperties: true,
    },
  };
};

/**
 * Main function to generate complete query preview.
 */
export const generateQueryPreview = (queryText: string, fileId?: string): QueryPreview => {
  const { estimatedResults, entityTypes, dataCategories } = estimateQueryResults(queryText);
  const steps = createProcessingSteps(queryText);
  const complexity = calculateComplexity(queryText, estimatedResults, steps);
  const resourceEstimate = calculateResourceEstimate(queryText, steps, estimatedResults);
  const resultStructure = createResultStructure(entityTypes, dataCategories, estimatedResults, queryText);

  return {
    estimatedResults,
    resultStructure,
    processingSteps: steps,
    resourceEstimate,
    complexity,
  };
};