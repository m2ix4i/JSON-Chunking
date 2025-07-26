/**
 * Query templates for German building industry IFC analysis.
 * Provides pre-built templates for common query use cases with repository pattern.
 */

import type { QueryTemplate, QueryVariable } from '@/types/app';

// Template categories for organization
export const templateCategories = [
  {
    id: 'quantity',
    name: 'Mengenanalyse',
    description: 'Quantitative Analysen, Volumen, Flächen, Anzahlen',
    icon: 'Calculate',
    color: 'primary' as const,
  },
  {
    id: 'material',
    name: 'Materialien',
    description: 'Materialien, Eigenschaften, Spezifikationen',
    icon: 'Palette',
    color: 'success' as const,
  },
  {
    id: 'spatial',
    name: 'Räumlich',
    description: 'Räume, Stockwerke, räumliche Beziehungen',
    icon: 'Place',
    color: 'warning' as const,
  },
  {
    id: 'component',
    name: 'Bauteile',
    description: 'Gebäudekomponenten, Elemente, Systeme',
    icon: 'Build',
    color: 'secondary' as const,
  },
  {
    id: 'cost',
    name: 'Kosten',
    description: 'Kostenschätzungen, Budget, Wirtschaftlichkeit',
    icon: 'AttachMoney',
    color: 'error' as const,
  },
];

// Common variables used across templates
const commonVariables: Record<string, QueryVariable> = {
  component: {
    name: 'component',
    type: 'select',
    label: 'Bauteil',
    description: 'Typ des Bauteils oder Elements',
    required: true,
    options: [
      'Wände', 'Türen', 'Fenster', 'Decken', 'Dächer', 'Stützen', 'Träger',
      'Treppen', 'Rampen', 'Fundamente', 'Schornsteine', 'Geländer'
    ],
    placeholder: 'Wählen Sie ein Bauteil',
  },
  material: {
    name: 'material',
    type: 'select',
    label: 'Material',
    description: 'Materialtyp oder -eigenschaft',
    required: true,
    options: [
      'Beton', 'Stahl', 'Holz', 'Ziegel', 'Glas', 'Aluminium',
      'Kunststoff', 'Stein', 'Gips', 'Keramik', 'Dämmstoff'
    ],
    placeholder: 'Wählen Sie ein Material',
  },
  floor: {
    name: 'floor',
    type: 'select',
    label: 'Stockwerk',
    description: 'Geschoss oder Ebene',
    required: false,
    options: [
      'Untergeschoss', 'Erdgeschoss', '1. Obergeschoss', '2. Obergeschoss',
      '3. Obergeschoss', 'Dachgeschoss', 'alle Stockwerke'
    ],
    defaultValue: 'alle Stockwerke',
    placeholder: 'Wählen Sie ein Stockwerk',
  },
  area: {
    name: 'area',
    type: 'text',
    label: 'Bereich',
    description: 'Spezifischer Bereich oder Raumname',
    required: false,
    validation: {
      minLength: 2,
      maxLength: 50,
    },
    placeholder: 'z.B. Bürobereich, Küche, Flur',
  },
  minValue: {
    name: 'minValue',
    type: 'number',
    label: 'Mindestwert',
    description: 'Mindestgröße oder -anzahl',
    required: false,
    validation: {
      min: 0,
    },
    placeholder: '0',
  },
  maxValue: {
    name: 'maxValue',
    type: 'number',
    label: 'Höchstwert',
    description: 'Maximalgröße oder -anzahl',
    required: false,
    validation: {
      min: 0,
    },
    placeholder: '1000',
  },
  unit: {
    name: 'unit',
    type: 'select',
    label: 'Einheit',
    description: 'Maßeinheit für die Messung',
    required: false,
    options: ['m', 'm²', 'm³', 'Stück', 'kg', 't', 'mm', 'cm'],
    defaultValue: 'm²',
    placeholder: 'Wählen Sie eine Einheit',
  },
  includeProperties: {
    name: 'includeProperties',
    type: 'boolean',
    label: 'Eigenschaften einbeziehen',
    description: 'Detaillierte Materialeigenschaften in Ergebnisse einbeziehen',
    required: false,
    defaultValue: true,
  },
};

// Sample query templates - combining both approaches
export const queryTemplates: QueryTemplate[] = [
  // Popular/Legacy templates from HEAD branch
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
    popularity: 95,
    createdAt: new Date('2024-01-01'),
    usageCount: 95,
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
    popularity: 80,
    createdAt: new Date('2024-01-01'),
    usageCount: 80,
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
    popularity: 70,
    createdAt: new Date('2024-01-01'),
    usageCount: 70,
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
    popularity: 85,
    createdAt: new Date('2024-01-01'),
    usageCount: 85,
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
    popularity: 60,
    createdAt: new Date('2024-01-01'),
    usageCount: 60,
  },

  // Enhanced templates from 057e15e5 branch
  {
    id: 'qty-count-components',
    name: 'Bauteile zählen',
    category: 'quantity',
    description: 'Zählt die Anzahl bestimmter Bauteile in einem Bereich oder Stockwerk',
    template: 'Wie viele {component} gibt es {floor ? `im ${floor}` : ``}{area ? ` im Bereich ${area}` : ``}?',
    variables: [commonVariables.component, commonVariables.floor, commonVariables.area],
    difficulty: 'beginner',
    examples: [
      'Wie viele Türen gibt es im Erdgeschoss?',
      'Wie viele Fenster gibt es im 2. Obergeschoss im Bürobereich?',
      'Wie viele Stützen gibt es im gesamten Gebäude?'
    ],
    expectedResult: 'Liste mit Anzahl und Details der gefundenen Bauteile',
    tags: ['zählen', 'anzahl', 'bauteile', 'inventar'],
    createdAt: new Date('2024-01-01'),
    usageCount: 45,
  },
  {
    id: 'qty-total-area',
    name: 'Gesamtfläche berechnen',
    category: 'quantity',
    description: 'Berechnet die Gesamtfläche von Bauteilen oder Räumen',
    template: 'Berechne die Gesamtfläche aller {component}{floor ? ` im ${floor}` : ``}{area ? ` im Bereich ${area}` : ``}{unit ? ` in ${unit}` : ``}.',
    variables: [commonVariables.component, commonVariables.floor, commonVariables.area, commonVariables.unit],
    difficulty: 'beginner',
    examples: [
      'Berechne die Gesamtfläche aller Wände im Erdgeschoss in m².',
      'Berechne die Gesamtfläche aller Decken im gesamten Gebäude.',
      'Berechne die Gesamtfläche aller Fenster im 2. Obergeschoss.'
    ],
    expectedResult: 'Gesamtfläche mit Aufschlüsselung nach einzelnen Elementen',
    tags: ['fläche', 'berechnung', 'summe', 'messen'],
    createdAt: new Date('2024-01-01'),
    usageCount: 38,
  },
  {
    id: 'mat-find-by-type',
    name: 'Material suchen',
    category: 'material',
    description: 'Findet alle Bauteile aus einem bestimmten Material',
    template: 'Finde alle {material}elemente{floor ? ` im ${floor}` : ``}{area ? ` im Bereich ${area}` : ``}{includeProperties ? " mit detaillierten Eigenschaften" : ""}.',
    variables: [commonVariables.material, commonVariables.floor, commonVariables.area, commonVariables.includeProperties],
    difficulty: 'beginner',
    examples: [
      'Finde alle Betonelemente im Erdgeschoss mit detaillierten Eigenschaften.',
      'Finde alle Stahlelemente im gesamten Gebäude.',
      'Finde alle Holzelemente im Dachgeschoss im Wohnbereich.'
    ],
    expectedResult: 'Liste aller Bauteile mit dem angegebenen Material und deren Eigenschaften',
    tags: ['material', 'suchen', 'eigenschaften', 'bauteile'],
    createdAt: new Date('2024-01-01'),
    usageCount: 42,
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
      template.tags.some(tag => tag.toLowerCase().includes(searchLower)) ||
      template.examples.some(example => example.toLowerCase().includes(searchLower))
    );
  }

  findPopular(limit: number): QueryTemplate[] {
    return [...this.templates]
      .sort((a, b) => (b.usageCount || b.popularity || 0) - (a.usageCount || a.popularity || 0))
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

export const getTemplateById = (id: string): QueryTemplate | undefined => {
  return queryTemplates.find(template => template.id === id);
};

export const searchTemplates = (term: string): QueryTemplate[] => 
  templateRepository.search(term);

export const getPopularTemplates = (limit: number = 5): QueryTemplate[] => 
  templateRepository.findPopular(limit);

export default queryTemplates;