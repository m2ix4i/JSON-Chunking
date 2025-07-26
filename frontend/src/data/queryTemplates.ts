/**
<<<<<<< HEAD
 * Query templates data and utility functions.
 * Provides template repository pattern implementation.
=======
 * Query templates for German building industry IFC analysis.
 * Provides pre-built templates for common query use cases.
>>>>>>> 057e15e5bbcfbdf9cfaaddab3cc19f3c9655126e
 */

import type { QueryTemplate, QueryVariable } from '@/types/app';

<<<<<<< HEAD
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
=======
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
    expectedResult: 'Liste mit Anzahl und Details der gefundenen Bauteile',
    tags: ['zählen', 'anzahl', 'bauteile', 'inventar'],
    createdAt: new Date('2024-01-01'),
    usageCount: 0,
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
    usageCount: 0,
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
    expectedResult: 'Volumenberechnung mit Details zu verwendeten Materialien',
    tags: ['volumen', 'material', 'kubikmeter', 'berechnung'],
    createdAt: new Date('2024-01-01'),
    usageCount: 0,
  },
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
    expectedResult: 'Liste aller Bauteile mit dem angegebenen Material und deren Eigenschaften',
    tags: ['material', 'suchen', 'eigenschaften', 'bauteile'],
    createdAt: new Date('2024-01-01'),
    usageCount: 0,
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
    expectedResult: 'Vollständige Materialliste mit Mengenangaben und optionalen Eigenschaften',
    tags: ['material', 'liste', 'inventar', 'übersicht'],
    createdAt: new Date('2024-01-01'),
    usageCount: 0,
  },
  {
    id: 'mat-properties-analysis',
    name: 'Materialeigenschaften analysieren',
    category: 'material',
    description: 'Analysiert spezifische Eigenschaften von Materialien',
    template: 'Analysiere die Eigenschaften von {material} in {component}{floor ? ` im ${floor}` : ``}.',
    variables: [commonVariables.material, commonVariables.component, commonVariables.floor],
    difficulty: 'intermediate',
    examples: [
      'Analysiere die Eigenschaften von Beton in Wänden im Erdgeschoss.',
      'Analysiere die Eigenschaften von Stahl in Trägern im gesamten Gebäude.',
      'Analysiere die Eigenschaften von Glas in Fenstern im 2. Obergeschoss.'
    ],
    expectedResult: 'Detailierte Analyse der Materialeigenschaften mit technischen Daten',
    tags: ['analyse', 'eigenschaften', 'material', 'technisch'],
    createdAt: new Date('2024-01-01'),
    usageCount: 0,
  },
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
    expectedResult: 'Liste aller Räume mit Grundinformationen und Flächenangaben',
    tags: ['räume', 'stockwerk', 'spatial', 'übersicht'],
    createdAt: new Date('2024-01-01'),
    usageCount: 0,
  },
  {
    id: 'spa-adjacent-rooms',
    name: 'Benachbarte Räume finden',
    category: 'spatial',
    description: 'Findet Räume, die an einen bestimmten Raum angrenzen',
    template: 'Finde benachbarte Räume zu {area}.',
    variables: [commonVariables.area],
    difficulty: 'intermediate',
    examples: [
      'Finde benachbarte Räume zu Büro 101.',
      'Finde benachbarte Räume zu der Küche.',
      'Finde benachbarte Räume zu dem Konferenzraum.'
    ],
    expectedResult: 'Liste der angrenzenden Räume mit räumlichen Beziehungen',
    tags: ['nachbarschaft', 'räume', 'spatial', 'beziehungen'],
    createdAt: new Date('2024-01-01'),
    usageCount: 0,
  },
  {
    id: 'spa-room-dimensions',
    name: 'Raumabmessungen',
    category: 'spatial',
    description: 'Misst Abmessungen und Fläche von Räumen',
    template: 'Messe die Abmessungen{area ? ` von ${area}` : " aller Räume"}{floor ? ` im ${floor}` : ``}.',
    variables: [commonVariables.area, commonVariables.floor],
    difficulty: 'beginner',
    examples: [
      'Messe die Abmessungen von Büro 101.',
      'Messe die Abmessungen aller Räume im Erdgeschoss.',
      'Messe die Abmessungen des Konferenzraums im 2. Obergeschoss.'
    ],
    expectedResult: 'Detaillierte Abmessungen mit Länge, Breite, Höhe und Fläche',
    tags: ['abmessungen', 'fläche', 'räume', 'messen'],
    createdAt: new Date('2024-01-01'),
    usageCount: 0,
  },
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
    expectedResult: 'Detaillierte Analyse aller Bauteile des angegebenen Typs',
    tags: ['analyse', 'bauteile', 'typ', 'eigenschaften'],
    createdAt: new Date('2024-01-01'),
    usageCount: 0,
  },
  {
    id: 'com-structural-elements',
    name: 'Tragende Elemente finden',
    category: 'component',
    description: 'Findet alle tragenden Bauteile in einem Bereich',
    template: 'Finde tragende {component}{floor ? ` im ${floor}` : ``}{area ? ` im Bereich ${area}` : ``}.',
    variables: [commonVariables.component, commonVariables.floor, commonVariables.area],
    difficulty: 'advanced',
    examples: [
      'Finde tragende Wände im Erdgeschoss.',
      'Finde tragende Stützen im gesamten Gebäude.',
      'Finde tragende Träger im 1. Obergeschoss.'
    ],
    expectedResult: 'Liste aller tragenden Elemente mit strukturellen Eigenschaften',
    tags: ['tragend', 'struktur', 'bauteile', 'statik'],
    createdAt: new Date('2024-01-01'),
    usageCount: 0,
  },
  {
    id: 'com-size-filter',
    name: 'Bauteile nach Größe filtern',
    category: 'component',
    description: 'Findet Bauteile basierend auf Größenkriterien',
    template: 'Finde {component} mit einer Fläche zwischen {minValue || 0} und {maxValue || 1000} {unit || "m²"}{floor ? ` im ${floor}` : ``}.',
    variables: [commonVariables.component, commonVariables.minValue, commonVariables.maxValue, commonVariables.unit, commonVariables.floor],
    difficulty: 'intermediate',
    examples: [
      'Finde Fenster mit einer Fläche zwischen 1 und 5 m² im 2. Obergeschoss.',
      'Finde Türen mit einer Fläche zwischen 2 und 4 m² im Erdgeschoss.',
      'Finde Wände mit einer Fläche zwischen 10 und 50 m² im gesamten Gebäude.'
    ],
    expectedResult: 'Gefilterte Liste von Bauteilen mit Flächenangaben',
    tags: ['filter', 'größe', 'fläche', 'bauteile'],
    createdAt: new Date('2024-01-01'),
    usageCount: 0,
  },
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
    expectedResult: 'Kostenschätzung basierend auf Materialmengen und aktuellen Marktpreisen',
    tags: ['kosten', 'material', 'schätzung', 'budget'],
    createdAt: new Date('2024-01-01'),
    usageCount: 0,
  },
  {
    id: 'cost-area-calculation',
    name: 'Flächenkosten berechnen',
    category: 'cost',
    description: 'Berechnet Kosten pro Flächeneinheit',
    template: 'Berechne Flächenkosten pro {unit || "m²"} für {component}{floor ? ` im ${floor}` : ``}{area ? ` im Bereich ${area}` : ``}.',
    variables: [commonVariables.component, commonVariables.unit, commonVariables.floor, commonVariables.area],
    difficulty: 'intermediate',
    examples: [
      'Berechne Flächenkosten pro m² für Wände im Erdgeschoss.',
      'Berechne Flächenkosten pro m² für Decken im gesamten Gebäude.',
      'Berechne Flächenkosten pro m² für Böden im 2. Obergeschoss.'
    ],
    expectedResult: 'Kostenkalkulation pro Flächeneinheit mit Gesamtkosten',
    tags: ['kosten', 'fläche', 'berechnung', 'einheit'],
    createdAt: new Date('2024-01-01'),
    usageCount: 0,
  },
  {
    id: 'cost-total-project',
    name: 'Gesamtprojektkosten',
    category: 'cost',
    description: 'Schätzt die Gesamtkosten für ein Bauprojekt oder einen Bereich',
    template: 'Schätze Gesamtkosten{floor ? ` für ${floor}` : " für das gesamte Gebäude"}{area ? ` im Bereich ${area}` : ``}.',
    variables: [commonVariables.floor, commonVariables.area],
    difficulty: 'advanced',
    examples: [
      'Schätze Gesamtkosten für das Erdgeschoss.',
      'Schätze Gesamtkosten für das gesamte Gebäude.',
      'Schätze Gesamtkosten für das 2. Obergeschoss im Bürobereich.'
    ],
    expectedResult: 'Umfassende Kostenschätzung mit Aufschlüsselung nach Kategorien',
    tags: ['kosten', 'gesamt', 'projekt', 'budget'],
    createdAt: new Date('2024-01-01'),
    usageCount: 0,
  },
];

// Combined template array
export const queryTemplates: QueryTemplate[] = [
  ...quantityTemplates,
  ...materialTemplates,
  ...spatialTemplates,
  ...componentTemplates,
  ...costTemplates,
];

// Helper functions
export const getTemplatesByCategory = (category: string): QueryTemplate[] => {
  return queryTemplates.filter(template => template.category === category);
};

export const getTemplatesByDifficulty = (difficulty: string): QueryTemplate[] => {
  return queryTemplates.filter(template => template.difficulty === difficulty);
};

export const getTemplateById = (id: string): QueryTemplate | undefined => {
  return queryTemplates.find(template => template.id === id);
};

export const searchTemplates = (searchTerm: string): QueryTemplate[] => {
  const term = searchTerm.toLowerCase();
  return queryTemplates.filter(template => 
    template.name.toLowerCase().includes(term) ||
    template.description.toLowerCase().includes(term) ||
    template.tags.some(tag => tag.toLowerCase().includes(term)) ||
    template.examples.some(example => example.toLowerCase().includes(term))
  );
};

export const getPopularTemplates = (limit: number = 5): QueryTemplate[] => {
  return [...queryTemplates]
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, limit);
};

// Template categories for UI
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
>>>>>>> 057e15e5bbcfbdf9cfaaddab3cc19f3c9655126e

export default queryTemplates;