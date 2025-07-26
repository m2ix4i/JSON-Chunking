/**
 * Query templates for German building industry IFC analysis.
 * Provides pre-built templates for common query use cases with template repository pattern implementation.
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
      'Kunststoff', 'Stein', 'Keramik', 'Dämmstoffe'
    ],
    placeholder: 'Wählen Sie ein Material',
  },
  floor: {
    name: 'floor',
    type: 'select',
    label: 'Etage',
    description: 'Gebäudeetage oder -level',
    required: false,
    options: [
      'Keller', 'Erdgeschoss', '1. OG', '2. OG', '3. OG', '4. OG', '5. OG',
      'Dachgeschoss', 'Alle Etagen'
    ],
    placeholder: 'Wählen Sie eine Etage',
  },
  room: {
    name: 'room',
    type: 'text',
    label: 'Raum',
    description: 'Raumbezeichnung oder -typ',
    required: false,
    placeholder: 'z.B. Büro, Küche, Bad',
  },
  dimension: {
    name: 'dimension',
    type: 'select',
    label: 'Dimension',
    description: 'Art der Messung oder Dimension',
    required: true,
    options: [
      'Volumen', 'Fläche', 'Länge', 'Höhe', 'Breite', 'Tiefe',
      'Umfang', 'Anzahl', 'Gewicht', 'Kosten'
    ],
    placeholder: 'Wählen Sie eine Dimension',
  },
};

// Sample query templates following Law of Demeter principles
export const queryTemplates: QueryTemplate[] = [
  {
    id: 'quantity-concrete-volume',
    name: 'Betonvolumen ermitteln',
    description: 'Berechnet das Gesamtvolumen aller Betonbauteile im Gebäude',
    template: 'Zeige mir das Gesamtvolumen aller Betonelemente in {material_type}',
    category: 'quantity',
    tags: ['beton', 'volumen', 'mengen'],
    difficulty: 'easy',
    variables: [
      {
        ...commonVariables.material,
        defaultValue: 'Beton',
      }
    ],
    intent: 'quantity_calculation',
    popularity: 95,
    lastUsed: new Date('2024-01-15'),
    estimatedTokens: 150,
  },
  {
    id: 'spatial-wall-area',
    name: 'Wandflächen nach Etage',
    description: 'Berechnet die Gesamtfläche aller Wände pro Etage',
    template: 'Berechne die Wandfläche für {floor} mit Material {material}',
    category: 'spatial',
    tags: ['wände', 'fläche', 'etage'],
    difficulty: 'medium',
    variables: [
      commonVariables.floor,
      {
        ...commonVariables.material,
        required: false,
        defaultValue: 'Alle Materialien',
      }
    ],
    intent: 'spatial_analysis',
    popularity: 87,
    lastUsed: new Date('2024-01-12'),
    estimatedTokens: 200,
  },
  {
    id: 'component-door-count',
    name: 'Türen zählen',
    description: 'Zählt alle Türen im Gebäude oder in bestimmten Bereichen',
    template: 'Wie viele {component} befinden sich in {floor}?',
    category: 'component',
    tags: ['türen', 'anzahl', 'zählung'],
    difficulty: 'easy',
    variables: [
      {
        ...commonVariables.component,
        defaultValue: 'Türen',
      },
      {
        ...commonVariables.floor,
        defaultValue: 'Alle Etagen',
      }
    ],
    intent: 'component_counting',
    popularity: 92,
    lastUsed: new Date('2024-01-14'),
    estimatedTokens: 120,
  },
  {
    id: 'material-steel-analysis',
    name: 'Stahlanalyse',
    description: 'Analysiert alle Stahlbauteile und deren Eigenschaften',
    template: 'Analysiere alle {material}-Bauteile und zeige deren {dimension}',
    category: 'material',
    tags: ['stahl', 'analyse', 'eigenschaften'],
    difficulty: 'hard',
    variables: [
      {
        ...commonVariables.material,
        defaultValue: 'Stahl',
      },
      commonVariables.dimension
    ],
    intent: 'material_analysis',
    popularity: 78,
    lastUsed: new Date('2024-01-10'),
    estimatedTokens: 300,
  },
  {
    id: 'cost-estimation-windows',
    name: 'Fensterkostenschätzung',
    description: 'Schätzt die Kosten für alle Fenster basierend auf Größe und Material',
    template: 'Schätze die Kosten für alle {component} aus {material} in {floor}',
    category: 'cost',
    tags: ['kosten', 'fenster', 'schätzung'],
    difficulty: 'hard',
    variables: [
      {
        ...commonVariables.component,
        defaultValue: 'Fenster',
      },
      {
        ...commonVariables.material,
        defaultValue: 'Glas',
      },
      {
        ...commonVariables.floor,
        defaultValue: 'Alle Etagen',
      }
    ],
    intent: 'cost_estimation',
    popularity: 65,
    lastUsed: new Date('2024-01-08'),
    estimatedTokens: 400,
  },
];

export default queryTemplates;