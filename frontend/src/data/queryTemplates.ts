/**
 * Query templates for German building industry IFC analysis.
 * Provides template repository pattern implementation and pre-built templates.
 * Combines both repository pattern and comprehensive template collections.
 */

import type { QueryTemplate, QueryVariable } from '@/types/app';

// Common variables used across templates (from feature branch)
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

// Quantity Analysis Templates
const quantityTemplates: QueryTemplate[] = [
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
    tags: ['zählen', 'anzahl', 'bauteile', 'inventar'],
    popularity: 95,
    expectedResult: 'Liste mit Anzahl und Details der gefundenen Bauteile',
    createdAt: new Date('2024-01-01'),
    usageCount: 0
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
    tags: ['fläche', 'berechnung', 'summe', 'messen'],
    popularity: 85,
    expectedResult: 'Gesamtfläche mit Aufschlüsselung nach einzelnen Elementen',
    createdAt: new Date('2024-01-01'),
    usageCount: 0
  },
  {
    id: 'qty-volume-calculation', 
    name: 'Volumen berechnen',
    category: 'quantity',
    description: 'Berechnet das Volumen von Materialien oder Bauteilen',
    template: 'Wie viel {unit || "m³"} {material} sind verbaut{floor ? ` im ${floor}` : ``}{area ? ` im Bereich ${area}` : ``}?',
    variables: [commonVariables.material, commonVariables.floor, commonVariables.area, commonVariables.unit],
    difficulty: 'intermediate',
    examples: [
      'Wie viel m³ Beton sind verbaut im Erdgeschoss?',
      'Wie viel m³ Holz sind verbaut im Dachgeschoss?',
      'Wie viel m³ Stahl sind verbaut im gesamten Gebäude?'
    ],
    tags: ['volumen', 'material', 'kubikmeter', 'berechnung'],
    popularity: 80,
    expectedResult: 'Volumenberechnung mit Details zu verwendeten Materialien',
    createdAt: new Date('2024-01-01'),
    usageCount: 0
  }
];

// Material Analysis Templates
const materialTemplates: QueryTemplate[] = [
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
    tags: ['material', 'suchen', 'eigenschaften', 'bauteile'],
    popularity: 75,
    expectedResult: 'Liste aller Bauteile des gewählten Materials mit Details',
    createdAt: new Date('2024-01-01'),
    usageCount: 0
  },
  {
    id: 'mat-list-all-materials',
    name: 'Alle Materialien auflisten',
    category: 'material',
    description: 'Listet alle verwendeten Materialien in einem Bereich auf',
    template: 'Liste alle verwendeten Materialien{floor ? ` im ${floor}` : ``}{area ? ` im Bereich ${area}` : ``} auf{includeProperties ? " mit Eigenschaften" : ""}.',
    variables: [commonVariables.floor, commonVariables.area, commonVariables.includeProperties],
    difficulty: 'beginner',
    examples: [
      'Liste alle verwendeten Materialien im Erdgeschoss auf.',
      'Liste alle verwendeten Materialien im gesamten Gebäude mit Eigenschaften auf.',
      'Liste alle verwendeten Materialien im 2. Obergeschoss im Bürobereich auf.'
    ],
    tags: ['material', 'liste', 'inventar', 'übersicht'],
    popularity: 70,
    expectedResult: 'Komplette Liste aller verwendeten Materialien im Bereich',
    createdAt: new Date('2024-01-01'),
    usageCount: 0
  }
];

// Spatial Analysis Templates
const spatialTemplates: QueryTemplate[] = [
  {
    id: 'spa-rooms-by-floor',
    name: 'Räume nach Stockwerk',
    category: 'spatial',
    description: 'Zeigt alle Räume in einem bestimmten Stockwerk',
    template: 'Zeige alle Räume {floor ? `im ${floor}` : "im gesamten Gebäude"}{area ? ` im Bereich ${area}` : ``}.',
    variables: [commonVariables.floor, commonVariables.area],
    difficulty: 'beginner',
    examples: [
      'Zeige alle Räume im Erdgeschoss.',
      'Zeige alle Räume im 2. Obergeschoss im Bürobereich.',
      'Zeige alle Räume im gesamten Gebäude.'
    ],
    tags: ['räume', 'stockwerk', 'spatial', 'übersicht'],
    popularity: 80,
    expectedResult: 'Übersicht aller Räume im gewählten Stockwerk oder Bereich',
    createdAt: new Date('2024-01-01'),
    usageCount: 0
  }
];

// Component Analysis Templates  
const componentTemplates: QueryTemplate[] = [
  {
    id: 'com-analyze-type',
    name: 'Bauteil-Typ analysieren',
    category: 'component',
    description: 'Analysiert alle Bauteile eines bestimmten Typs',
    template: 'Analysiere alle {component}{floor ? ` im ${floor}` : ``}{area ? ` im Bereich ${area}` : ``}{includeProperties ? " mit Eigenschaften" : ""}.',
    variables: [commonVariables.component, commonVariables.floor, commonVariables.area, commonVariables.includeProperties],
    difficulty: 'intermediate',
    examples: [
      'Analysiere alle Fenster im 2. Obergeschoss mit Eigenschaften.',
      'Analysiere alle Träger im gesamten Gebäude.',
      'Analysiere alle Türen im Erdgeschoss im Eingangsbereich.'
    ],
    tags: ['analyse', 'bauteile', 'typ', 'eigenschaften'],
    popularity: 85,
    expectedResult: 'Detaillierte Analyse aller Bauteile des gewählten Typs',
    createdAt: new Date('2024-01-01'),
    usageCount: 0
  }
];

// Cost Estimation Templates
const costTemplates: QueryTemplate[] = [
  {
    id: 'cost-material-estimate',
    name: 'Materialkosten schätzen',
    category: 'cost',
    description: 'Schätzt die Kosten für bestimmte Materialien',
    template: 'Schätze Materialkosten für {material} in {component}{floor ? ` im ${floor}` : ``}{area ? ` im Bereich ${area}` : ``}.',
    variables: [commonVariables.material, commonVariables.component, commonVariables.floor, commonVariables.area],
    difficulty: 'advanced',
    examples: [
      'Schätze Materialkosten für Beton in Wänden im Erdgeschoss.',
      'Schätze Materialkosten für Stahl in Trägern im gesamten Gebäude.',
      'Schätze Materialkosten für Glas in Fenstern im 2. Obergeschoss.'
    ],
    tags: ['kosten', 'material', 'schätzung', 'budget'],
    popularity: 60,
    expectedResult: 'Kostenschätzung für das gewählte Material im Bereich',
    createdAt: new Date('2024-01-01'),
    usageCount: 0
  }
];

// Combined template array with both simple and comprehensive templates
export const queryTemplates: QueryTemplate[] = [
  ...quantityTemplates,
  ...materialTemplates,
  ...spatialTemplates,
  ...componentTemplates,
  ...costTemplates,
];

// Template Repository Pattern implementation (from HEAD)
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
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
      .slice(0, limit);
  }
}

// Repository instance
const templateRepository = new InMemoryTemplateRepository(queryTemplates);

// Helper functions (combining both approaches)
export const getTemplatesByCategory = (category: string): QueryTemplate[] => 
  templateRepository.findByCategory(category);

export const getTemplatesByDifficulty = (difficulty: string): QueryTemplate[] => 
  templateRepository.findByDifficulty(difficulty);

export const getTemplateById = (id: string): QueryTemplate | undefined => {
  return queryTemplates.find(template => template.id === id);
};

export const searchTemplates = (searchTerm: string): QueryTemplate[] => 
  templateRepository.search(searchTerm);

export const getPopularTemplates = (limit: number = 5): QueryTemplate[] => 
  templateRepository.findPopular(limit);

// Template categories for UI (enhanced version)
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

export default queryTemplates;