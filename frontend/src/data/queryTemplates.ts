/**
 * Query templates data and utility functions.
 * Provides template repository pattern implementation.
 */

import type { QueryTemplate, QueryVariable } from '@/types/app';

// Template categories for organization
export const templateCategories = [
  { id: 'quantity', name: 'Mengenermittlung' },
  { id: 'material', name: 'Materialanalyse' },
  { id: 'spatial', name: 'Räumliche Abfragen' },
  { id: 'component', name: 'Bauteile' },
  { id: 'cost', name: 'Kostenschätzung' },
];

// Sample query templates following Law of Demeter principles
export const queryTemplates: QueryTemplate[] = [
  {
    id: 'quantity-concrete-volume',
    name: 'Betonvolumen ermitteln',
    description: 'Berechnet das Gesamtvolumen aller Betonbauteile im Gebäude',
    template: 'Zeige mir das Gesamtvolumen aller Betonelemente in {material_type}',
    category: 'quantity',
    difficulty: 'beginner',
    variables: [
      {
        name: 'material_type',
        label: 'Materialtyp',
        type: 'select',
        options: ['Beton', 'Stahlbeton', 'Alle Betonarten'],
        defaultValue: 'Beton',
        required: true,
        description: 'Wählen Sie den spezifischen Betontyp aus'
      }
    ],
    examples: [
      'Zeige mir das Gesamtvolumen aller Betonelemente in Beton',
      'Zeige mir das Gesamtvolumen aller Betonelemente in Stahlbeton'
    ],
    tags: ['volumen', 'beton', 'mengen'],
    popularity: 95
  },
  {
    id: 'spatial-rooms-area',
    name: 'Raumflächen analysieren',
    description: 'Analysiert Raumflächen nach verschiedenen Kriterien',
    template: 'Welche Räume haben eine Fläche größer als {min_area} m²?',
    category: 'spatial',
    difficulty: 'beginner',
    variables: [
      {
        name: 'min_area',
        label: 'Mindestfläche (m²)',
        type: 'number',
        defaultValue: '50',
        required: true,
        description: 'Geben Sie die Mindestfläche in Quadratmetern ein'
      }
    ],
    examples: [
      'Welche Räume haben eine Fläche größer als 50 m²?',
      'Welche Räume haben eine Fläche größer als 100 m²?'
    ],
    tags: ['räume', 'fläche', 'spatial'],
    popularity: 80
  },
  {
    id: 'material-steel-analysis',
    name: 'Stahlbauteile auflisten',
    description: 'Listet alle Stahlbauteile mit ihren Eigenschaften auf',
    template: 'Zeige alle Stahlbauteile mit {property_filter}',
    category: 'material',
    difficulty: 'intermediate',
    variables: [
      {
        name: 'property_filter',
        label: 'Eigenschaftsfilter',
        type: 'select',
        options: ['Abmessungen', 'Gewicht', 'Material-ID', 'Alle Eigenschaften'],
        defaultValue: 'Alle Eigenschaften',
        required: false,
        description: 'Wählen Sie welche Eigenschaften angezeigt werden sollen'
      }
    ],
    examples: [
      'Zeige alle Stahlbauteile mit Abmessungen',
      'Zeige alle Stahlbauteile mit Gewicht'
    ],
    tags: ['stahl', 'material', 'eigenschaften'],
    popularity: 70
  },
  {
    id: 'component-doors-windows',
    name: 'Türen und Fenster zählen',
    description: 'Zählt alle Türen und Fenster im Gebäude',
    template: 'Wie viele {component_type} gibt es im Gebäude?',
    category: 'component',
    difficulty: 'beginner',
    variables: [
      {
        name: 'component_type',
        label: 'Bauteiltyp',
        type: 'select',
        options: ['Türen', 'Fenster', 'Türen und Fenster'],
        defaultValue: 'Türen und Fenster',
        required: true,
        description: 'Wählen Sie den zu zählenden Bauteiltyp'
      }
    ],
    examples: [
      'Wie viele Türen gibt es im Gebäude?',
      'Wie viele Fenster gibt es im Gebäude?'
    ],
    tags: ['türen', 'fenster', 'count'],
    popularity: 85
  },
  {
    id: 'cost-material-estimate',
    name: 'Materialkosten schätzen',
    description: 'Schätzt die Kosten für verschiedene Materialtypen',
    template: 'Schätze die Kosten für {material} basierend auf {cost_basis}',
    category: 'cost',
    difficulty: 'advanced',
    variables: [
      {
        name: 'material',
        label: 'Material',
        type: 'select',
        options: ['Beton', 'Stahl', 'Holz', 'Alle Materialien'],
        defaultValue: 'Alle Materialien',
        required: true,
        description: 'Wählen Sie das Material für die Kostenschätzung'
      },
      {
        name: 'cost_basis',
        label: 'Kostenbasis',
        type: 'select',
        options: ['Volumen', 'Gewicht', 'Stückzahl'],
        defaultValue: 'Volumen',
        required: true,
        description: 'Basis für die Kostenschätzung'
      }
    ],
    examples: [
      'Schätze die Kosten für Beton basierend auf Volumen',
      'Schätze die Kosten für Stahl basierend auf Gewicht'
    ],
    tags: ['kosten', 'schätzung', 'material'],
    popularity: 60
  }
];

// Template Repository Pattern implementation
export interface TemplateRepository {
  findAll(): QueryTemplate[];
  findByCategory(category: string): QueryTemplate[];
  findByDifficulty(difficulty: string): QueryTemplate[];
  search(term: string): QueryTemplate[];
  findPopular(limit: number): QueryTemplate[];
}

class InMemoryTemplateRepository implements TemplateRepository {
  constructor(private templates: QueryTemplate[]) {}

  findAll(): QueryTemplate[] {
    return [...this.templates]; // defensive copy
  }

  findByCategory(category: string): QueryTemplate[] {
    return this.templates.filter(template => template.category === category);
  }

  findByDifficulty(difficulty: string): QueryTemplate[] {
    return this.templates.filter(template => template.difficulty === difficulty);
  }

  search(term: string): QueryTemplate[] {
    const searchLower = term.toLowerCase();
    return this.templates.filter(template => 
      template.name.toLowerCase().includes(searchLower) ||
      template.description.toLowerCase().includes(searchLower) ||
      template.tags.some(tag => tag.toLowerCase().includes(searchLower))
    );
  }

  findPopular(limit: number): QueryTemplate[] {
    return [...this.templates]
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
      .slice(0, limit);
  }
}

// Repository instance
const templateRepository = new InMemoryTemplateRepository(queryTemplates);

// Public API functions following Tell Don't Ask principle
export const getTemplatesByCategory = (category: string): QueryTemplate[] => 
  templateRepository.findByCategory(category);

export const getTemplatesByDifficulty = (difficulty: string): QueryTemplate[] => 
  templateRepository.findByDifficulty(difficulty);

export const searchTemplates = (term: string): QueryTemplate[] => 
  templateRepository.search(term);

export const getPopularTemplates = (limit: number = 5): QueryTemplate[] => 
  templateRepository.findPopular(limit);

export default queryTemplates;