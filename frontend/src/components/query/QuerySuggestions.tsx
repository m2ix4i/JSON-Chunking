/**
 * Query suggestions component with German examples organized by intent.
 */

import React from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
} from '@mui/material';
import {
  ExpandMore as ExpandIcon,
  Calculate as QuantityIcon,
  Build as ComponentIcon,
  Palette as MaterialIcon,
  Place as SpatialIcon,
  AttachMoney as CostIcon,
  Search as GeneralIcon,
} from '@mui/icons-material';

export interface GermanQuerySuggestion {
  id: string;
  intent: 'quantity' | 'component' | 'material' | 'spatial' | 'cost' | 'general';
  query: string;
  description: string;
  difficulty: 'einfach' | 'mittel' | 'fortgeschritten';
}

export interface QuerySuggestionsProps {
  onSuggestionSelect?: (suggestion: GermanQuerySuggestion) => void;
  disabled?: boolean;
}

const QuerySuggestions: React.FC<QuerySuggestionsProps> = ({
  onSuggestionSelect,
  disabled = false,
}) => {
  const suggestions: GermanQuerySuggestion[] = [
    // Quantity Analysis
    {
      id: 'q1',
      intent: 'quantity',
      query: 'Wie viele Fenster gibt es im Gebäude?',
      description: 'Zählt alle Fensterelemente',
      difficulty: 'einfach',
    },
    {
      id: 'q2',
      intent: 'quantity',
      query: 'Wie viele Türen befinden sich im ersten Obergeschoss?',
      description: 'Türen in einem bestimmten Geschoss',
      difficulty: 'mittel',
    },
    {
      id: 'q3',
      intent: 'quantity',
      query: 'Welche Gesamtfläche haben alle Wände im Erdgeschoss?',
      description: 'Flächenberechnung nach Geschoss',
      difficulty: 'mittel',
    },

    // Component Analysis
    {
      id: 'c1',
      intent: 'component',
      query: 'Zeige mir alle Eigenschaften der Außenwände',
      description: 'Detaillierte Bauteilinformationen',
      difficulty: 'einfach',
    },
    {
      id: 'c2',
      intent: 'component',
      query: 'Welche Wände haben eine Dicke von mehr als 30 cm?',
      description: 'Filterung nach Abmessungen',
      difficulty: 'mittel',
    },
    {
      id: 'c3',
      intent: 'component',
      query: 'Liste alle tragenden Stützen mit ihren Dimensionen auf',
      description: 'Strukturelle Bauteile analysieren',
      difficulty: 'mittel',
    },

    // Material Analysis
    {
      id: 'm1',
      intent: 'material',
      query: 'Welche Materialien werden für die Außenwände verwendet?',
      description: 'Materialzusammensetzung',
      difficulty: 'einfach',
    },
    {
      id: 'm2',
      intent: 'material',
      query: 'Wie viel Beton wird insgesamt im Projekt benötigt?',
      description: 'Materialmengen berechnen',
      difficulty: 'mittel',
    },
    {
      id: 'm3',
      intent: 'material',
      query: 'Welche Wärmeleitfähigkeit haben die verwendeten Dämmstoffe?',
      description: 'Materialeigenschaften analysieren',
      difficulty: 'fortgeschritten',
    },

    // Spatial Analysis
    {
      id: 's1',
      intent: 'spatial',
      query: 'Welche Räume befinden sich im zweiten Stock?',
      description: 'Räumliche Zuordnung',
      difficulty: 'einfach',
    },
    {
      id: 's2',
      intent: 'spatial',
      query: 'Wie ist die Raumaufteilung im Erdgeschoss?',
      description: 'Raumlayout verstehen',
      difficulty: 'mittel',
    },
    {
      id: 's3',
      intent: 'spatial',
      query: 'Welche Bauteile grenzen an den Haupteingang?',
      description: 'Räumliche Beziehungen',
      difficulty: 'fortgeschritten',
    },

    // Cost Analysis
    {
      id: 'cost1',
      intent: 'cost',
      query: 'Schätze die Kosten für alle Fenster im Projekt',
      description: 'Kostenberechnung für Bauteile',
      difficulty: 'mittel',
    },
    {
      id: 'cost2',
      intent: 'cost',
      query: 'Welche Bauteile haben die höchsten Materialkosten?',
      description: 'Kostenanalyse nach Priorität',
      difficulty: 'fortgeschritten',
    },

    // General Queries
    {
      id: 'g1',
      intent: 'general',
      query: 'Gib mir eine Übersicht über das gesamte Projekt',
      description: 'Allgemeine Projektinformationen',
      difficulty: 'einfach',
    },
    {
      id: 'g2',
      intent: 'general',
      query: 'Welche Probleme oder Inkonsistenzen findest du in den Daten?',
      description: 'Qualitätsprüfung der Daten',
      difficulty: 'fortgeschritten',
    },
  ];

  const groupedSuggestions = suggestions.reduce((groups, suggestion) => {
    const intent = suggestion.intent;
    if (!groups[intent]) {
      groups[intent] = [];
    }
    groups[intent].push(suggestion);
    return groups;
  }, {} as Record<string, GermanQuerySuggestion[]>);

  const getIntentIcon = (intent: string) => {
    switch (intent) {
      case 'quantity':
        return <QuantityIcon color="primary" />;
      case 'component':
        return <ComponentIcon color="secondary" />;
      case 'material':
        return <MaterialIcon color="success" />;
      case 'spatial':
        return <SpatialIcon color="warning" />;
      case 'cost':
        return <CostIcon color="error" />;
      default:
        return <GeneralIcon color="info" />;
    }
  };

  const getIntentLabel = (intent: string) => {
    const labels: Record<string, string> = {
      quantity: 'Mengenanalyse',
      component: 'Bauteilanalyse',
      material: 'Materialanalyse',
      spatial: 'Räumliche Analyse',
      cost: 'Kostenanalyse',
      general: 'Allgemeine Abfragen',
    };
    return labels[intent] || intent;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'einfach':
        return 'success';
      case 'mittel':
        return 'warning';
      case 'fortgeschritten':
        return 'error';
      default:
        return 'default';
    }
  };

  const handleSuggestionClick = (suggestion: GermanQuerySuggestion) => {
    if (onSuggestionSelect && !disabled) {
      onSuggestionSelect(suggestion);
    }
  };

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Wählen Sie eine Beispiel-Abfrage aus oder lassen Sie sich inspirieren:
      </Typography>

      {Object.entries(groupedSuggestions).map(([intent, intentSuggestions]) => (
        <Accordion key={intent} defaultExpanded={intent === 'quantity'}>
          <AccordionSummary expandIcon={<ExpandIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {getIntentIcon(intent)}
              <Typography variant="subtitle1">
                {getIntentLabel(intent)}
              </Typography>
              <Chip
                label={intentSuggestions.length}
                size="small"
                variant="outlined"
              />
            </Box>
          </AccordionSummary>
          
          <AccordionDetails sx={{ pt: 0 }}>
            <List dense>
              {intentSuggestions.map((suggestion) => (
                <ListItem key={suggestion.id} disablePadding>
                  <ListItemButton
                    onClick={() => handleSuggestionClick(suggestion)}
                    disabled={disabled}
                    sx={{
                      borderRadius: 1,
                      mb: 0.5,
                      '&:hover': {
                        backgroundColor: 'action.hover',
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      {getIntentIcon(suggestion.intent)}
                    </ListItemIcon>
                    
                    <ListItemText
                      primary={suggestion.query}
                      secondary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            {suggestion.description}
                          </Typography>
                          <Chip
                            label={suggestion.difficulty}
                            size="small"
                            color={getDifficultyColor(suggestion.difficulty) as any}
                            variant="outlined"
                          />
                        </Box>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </AccordionDetails>
        </Accordion>
      ))}

      <Box sx={{ mt: 2, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
        <Typography variant="body2" color="text.secondary">
          <strong>Tipp:</strong> Sie können die Beispiel-Abfragen als Ausgangspunkt verwenden und anpassen.
          Die Schwierigkeitsgrade helfen bei der Einschätzung der Komplexität.
        </Typography>
      </Box>
    </Box>
  );
};

export default QuerySuggestions;