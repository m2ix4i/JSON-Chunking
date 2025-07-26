/**
 * Query validation component for real-time query feedback.
 * Provides syntax validation, intent analysis, and improvement suggestions.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Alert,
  Chip,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Collapse,
  IconButton,
  Tooltip,
  Divider,
  Badge,
} from '@mui/material';
import {
  CheckCircle as ValidIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Lightbulb as SuggestionIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  Psychology as IntentIcon,
  Speed as ComplexityIcon,
  Timer as DurationIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';

import type { 
  ValidationResult, 
  ValidationWarning, 
  ValidationError, 
  ComplexityEstimate 
} from '@/types/app';

interface QueryValidationProps {
  query: string;
  onValidationChange?: (result: ValidationResult) => void;
  debounceMs?: number;
  showComplexityDetails?: boolean;
  compact?: boolean;
}

interface MockValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: string[];
  confidence: number;
  estimatedComplexity: number;
  estimatedDuration: number;
  intentConfidence: number;
  detectedIntent: string;
}

const QueryValidation: React.FC<QueryValidationProps> = ({
  query,
  onValidationChange,
  debounceMs = 300,
  showComplexityDetails = true,
  compact = false,
}) => {
  const [validation, setValidation] = useState<MockValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['errors', 'warnings'])
  );

  // Debounced validation
  useEffect(() => {
    if (!query.trim()) {
      setValidation(null);
      return;
    }

    setIsValidating(true);
    const timeoutId = setTimeout(() => {
      performValidation(query);
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [query, debounceMs]);

  // Mock validation function (replace with actual API call)
  const performValidation = async (queryText: string) => {
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 200));

      const result = mockValidateQuery(queryText);
      setValidation(result);
      
      // Call parent callback
      onValidationChange?.({
        isValid: result.isValid,
        errors: result.errors,
        warnings: result.warnings,
        suggestions: result.suggestions,
        confidence: result.confidence,
        estimatedComplexity: result.estimatedComplexity,
        estimatedDuration: result.estimatedDuration,
      });
    } catch (error) {
      console.error('Query validation failed:', error);
    } finally {
      setIsValidating(false);
    }
  };

  // Mock validation logic (replace with actual validation service)
  const mockValidateQuery = (queryText: string): MockValidationResult => {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: string[] = [];

    const lowerQuery = queryText.toLowerCase();
    let confidence = 0.8;
    let complexity = 3;
    let duration = 15;
    let intentConfidence = 0.7;
    let detectedIntent = 'general';

    // Intent detection
    if (lowerQuery.includes('wie viele') || lowerQuery.includes('anzahl') || lowerQuery.includes('zähl')) {
      detectedIntent = 'quantity';
      intentConfidence = 0.9;
    } else if (lowerQuery.includes('material') || lowerQuery.includes('beton') || lowerQuery.includes('stahl')) {
      detectedIntent = 'material';
      intentConfidence = 0.85;
    } else if (lowerQuery.includes('raum') || lowerQuery.includes('stockwerk') || lowerQuery.includes('etage')) {
      detectedIntent = 'spatial';
      intentConfidence = 0.8;
    } else if (lowerQuery.includes('kosten') || lowerQuery.includes('preis') || lowerQuery.includes('budget')) {
      detectedIntent = 'cost';
      intentConfidence = 0.85;
    } else if (lowerQuery.includes('wand') || lowerQuery.includes('tür') || lowerQuery.includes('fenster')) {
      detectedIntent = 'component';
      intentConfidence = 0.8;
    }

    // Basic syntax validation
    if (queryText.length < 3) {
      errors.push({
        field: 'query',
        message: 'Die Abfrage ist zu kurz. Mindestens 3 Zeichen erforderlich.',
      });
    }

    if (queryText.length > 500) {
      warnings.push({
        field: 'query',
        message: 'Sehr lange Abfrage. Kürzere Abfragen sind oft effektiver.',
        severity: 'medium',
      });
    }

    // German language validation
    const germanKeywords = ['wie', 'was', 'wo', 'wann', 'welche', 'alle', 'finde', 'zeige', 'berechne', 'analysiere'];
    const hasGermanKeywords = germanKeywords.some(keyword => lowerQuery.includes(keyword));
    
    if (!hasGermanKeywords && queryText.length > 10) {
      warnings.push({
        field: 'language',
        message: 'Die Abfrage scheint nicht auf Deutsch zu sein. Deutsche Abfragen werden besser verarbeitet.',
        severity: 'low',
      });
      confidence -= 0.1;
    }

    // Complexity estimation based on keywords
    const complexKeywords = ['berechne', 'analysiere', 'vergleiche', 'optimiere', 'schätze'];
    const complexityIndicators = complexKeywords.filter(keyword => lowerQuery.includes(keyword)).length;
    complexity = Math.min(10, 3 + complexityIndicators * 2);
    duration = Math.max(5, complexity * 5);

    // Specificity analysis
    const specificTerms = ['erdgeschoss', 'obergeschoss', 'dachgeschoss', 'büro', 'küche', 'flur'];
    const hasSpecificTerms = specificTerms.some(term => lowerQuery.includes(term));
    
    if (!hasSpecificTerms && lowerQuery.length > 20) {
      suggestions.push('Fügen Sie spezifische Bereiche oder Stockwerke hinzu für genauere Ergebnisse.');
    }

    // Building terminology validation
    const buildingTerms = ['gebäude', 'bau', 'wand', 'decke', 'dach', 'fundament', 'tür', 'fenster', 'treppe'];
    const hasBuildingTerms = buildingTerms.some(term => lowerQuery.includes(term));
    
    if (!hasBuildingTerms && queryText.length > 15) {
      suggestions.push('Verwenden Sie spezifische Gebäudeterminologie für bessere IFC-Analyse.');
    }

    // Question structure validation
    const questionWords = ['wie', 'was', 'wo', 'welche', 'wann'];
    const hasQuestionStructure = questionWords.some(word => lowerQuery.startsWith(word));
    
    if (!hasQuestionStructure && !lowerQuery.includes('finde') && !lowerQuery.includes('zeige')) {
      suggestions.push('Formulieren Sie die Abfrage als Frage oder Anweisung (z.B. "Wie viele..." oder "Finde alle...").');
    }

    // Performance suggestions
    if (lowerQuery.includes('alle') && lowerQuery.includes('gebäude')) {
      warnings.push({
        field: 'performance',
        message: 'Gebäude-weite Abfragen können länger dauern. Begrenzen Sie auf spezifische Bereiche wenn möglich.',
        severity: 'medium',
      });
      complexity += 2;
      duration += 20;
    }

    // Unit specification
    const units = ['m²', 'm³', 'stück', 'kg', 'mm', 'cm', 'meter'];
    const hasUnits = units.some(unit => lowerQuery.includes(unit));
    
    if ((lowerQuery.includes('fläche') || lowerQuery.includes('volumen')) && !hasUnits) {
      suggestions.push('Geben Sie gewünschte Maßeinheiten an (z.B. m², m³, cm).');
    }

    const isValid = errors.length === 0;

    return {
      isValid,
      errors,
      warnings,
      suggestions,
      confidence: Math.max(0.1, Math.min(1.0, confidence)),
      estimatedComplexity: complexity,
      estimatedDuration: duration,
      intentConfidence,
      detectedIntent,
    };
  };

  // Get complexity color
  const getComplexityColor = (complexity: number) => {
    if (complexity <= 3) return 'success';
    if (complexity <= 6) return 'warning';
    return 'error';
  };

  // Get intent color
  const getIntentColor = (intent: string) => {
    switch (intent) {
      case 'quantity': return 'primary';
      case 'material': return 'success';
      case 'spatial': return 'warning';
      case 'component': return 'secondary';
      case 'cost': return 'error';
      default: return 'info';
    }
  };

  // Toggle section expansion
  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  // Render validation status
  const renderValidationStatus = () => {
    if (!validation) return null;

    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        {validation.isValid ? (
          <ValidIcon color="success" />
        ) : (
          <ErrorIcon color="error" />
        )}
        <Typography variant="subtitle2" fontWeight={600}>
          {validation.isValid ? 'Abfrage gültig' : 'Abfrage hat Probleme'}
        </Typography>
        <Chip
          label={`${Math.round(validation.confidence * 100)}% Vertrauen`}
          size="small"
          color={validation.confidence > 0.7 ? 'success' : validation.confidence > 0.4 ? 'warning' : 'error'}
          variant="outlined"
        />
      </Box>
    );
  };

  // Render intent analysis
  const renderIntentAnalysis = () => {
    if (!validation || compact) return null;

    return (
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <IntentIcon />
          Erkannte Absicht
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            label={validation.detectedIntent}
            color={getIntentColor(validation.detectedIntent)}
            variant="outlined"
          />
          <Typography variant="body2" color="text.secondary">
            {Math.round(validation.intentConfidence * 100)}% Sicherheit
          </Typography>
        </Box>
      </Box>
    );
  };

  // Render complexity analysis
  const renderComplexityAnalysis = () => {
    if (!validation || !showComplexityDetails) return null;

    return (
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <ComplexityIcon />
          Komplexitätsanalyse
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              label={`Komplexität: ${validation.estimatedComplexity}/10`}
              color={getComplexityColor(validation.estimatedComplexity)}
              variant="outlined"
              size="small"
            />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DurationIcon fontSize="small" />
            <Typography variant="body2" color="text.secondary">
              ~{validation.estimatedDuration}s Verarbeitung
            </Typography>
          </Box>
        </Box>
      </Box>
    );
  };

  // Render issues section
  const renderIssuesSection = (
    title: string,
    items: (ValidationError | ValidationWarning)[],
    sectionKey: string,
    icon: React.ReactNode,
    color: 'error' | 'warning'
  ) => {
    if (items.length === 0) return null;

    const isExpanded = expandedSections.has(sectionKey);

    return (
      <Box sx={{ mb: 1 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            p: 1,
            borderRadius: 1,
            '&:hover': { backgroundColor: 'action.hover' },
          }}
          onClick={() => toggleSection(sectionKey)}
        >
          <Badge badgeContent={items.length} color={color}>
            {icon}
          </Badge>
          <Typography variant="subtitle2" sx={{ ml: 1, flexGrow: 1 }}>
            {title}
          </Typography>
          {isExpanded ? <CollapseIcon /> : <ExpandIcon />}
        </Box>
        
        <Collapse in={isExpanded}>
          <List dense>
            {items.map((item, index) => (
              <ListItem key={index}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  {color === 'error' ? (
                    <ErrorIcon color="error" fontSize="small" />
                  ) : (
                    <WarningIcon color="warning" fontSize="small" />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={item.message}
                  primaryTypographyProps={{
                    variant: 'body2',
                    color: color === 'error' ? 'error' : 'warning.main',
                  }}
                />
              </ListItem>
            ))}
          </List>
        </Collapse>
      </Box>
    );
  };

  // Render suggestions section
  const renderSuggestionsSection = () => {
    if (!validation || validation.suggestions.length === 0) return null;

    const isExpanded = expandedSections.has('suggestions');

    return (
      <Box sx={{ mb: 1 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            p: 1,
            borderRadius: 1,
            '&:hover': { backgroundColor: 'action.hover' },
          }}
          onClick={() => toggleSection('suggestions')}
        >
          <Badge badgeContent={validation.suggestions.length} color="info">
            <SuggestionIcon color="info" />
          </Badge>
          <Typography variant="subtitle2" sx={{ ml: 1, flexGrow: 1 }}>
            Verbesserungsvorschläge
          </Typography>
          {isExpanded ? <CollapseIcon /> : <ExpandIcon />}
        </Box>
        
        <Collapse in={isExpanded}>
          <List dense>
            {validation.suggestions.map((suggestion, index) => (
              <ListItem key={index}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <SuggestionIcon color="info" fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary={suggestion}
                  primaryTypographyProps={{
                    variant: 'body2',
                    color: 'info.main',
                  }}
                />
              </ListItem>
            ))}
          </List>
        </Collapse>
      </Box>
    );
  };

  if (!query.trim()) {
    return (
      <Card>
        <CardContent>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            Geben Sie eine Abfrage ein, um die Echtzeit-Validierung zu sehen.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">
            Abfrage-Validierung
          </Typography>
          {isValidating && (
            <Tooltip title="Validierung läuft...">
              <RefreshIcon color="action" sx={{ animation: 'spin 1s linear infinite' }} />
            </Tooltip>
          )}
        </Box>

        {isValidating && (
          <Box sx={{ mb: 2 }}>
            <LinearProgress />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              Analysiere Abfrage...
            </Typography>
          </Box>
        )}

        {validation && (
          <>
            {renderValidationStatus()}
            {renderIntentAnalysis()}
            {renderComplexityAnalysis()}

            {!compact && <Divider sx={{ my: 2 }} />}

            {renderIssuesSection(
              'Fehler',
              validation.errors,
              'errors',
              <ErrorIcon color="error" />,
              'error'
            )}

            {renderIssuesSection(
              'Warnungen',
              validation.warnings,
              'warnings',
              <WarningIcon color="warning" />,
              'warning'
            )}

            {renderSuggestionsSection()}

            {!compact && validation.isValid && validation.errors.length === 0 && validation.warnings.length === 0 && (
              <Alert severity="success" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  Ihre Abfrage ist gültig und bereit zur Ausführung! 
                  Geschätzte Verarbeitungszeit: {validation.estimatedDuration} Sekunden.
                </Typography>
              </Alert>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default QueryValidation;