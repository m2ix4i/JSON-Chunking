/**
 * Query preview component showing expected results and processing information.
 * Provides users with insights into what their query will produce before execution.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  LinearProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Skeleton,
  IconButton,
  Tooltip,
  Badge,
} from '@mui/material';
import {
  ExpandMore as ExpandIcon,
  Preview as PreviewIcon,
  Speed as ComplexityIcon,
  Timer as DurationIcon,
  Memory as MemoryIcon,
  DataObject as DataIcon,
  PlayArrow as ProcessIcon,
  TrendingUp as OptimizationIcon,
  Assessment as ResultsIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';

import type { 
  QueryPreview as QueryPreviewType,
  ResultStructurePreview,
  ProcessingStep,
  ResourceEstimate,
  ComplexityEstimate,
  ComplexityFactor 
} from '@/types/app';

interface QueryPreviewProps {
  query: string;
  fileId?: string;
  compact?: boolean;
  autoRefresh?: boolean;
  debounceMs?: number;
  onPreviewChange?: (preview: QueryPreviewType | null) => void;
}

interface MockQueryPreview extends QueryPreviewType {
  generatedAt: Date;
  confidence: number;
}

const QueryPreview: React.FC<QueryPreviewProps> = ({
  query,
  fileId,
  compact = false,
  autoRefresh = true,
  debounceMs = 500,
  onPreviewChange,
}) => {
  const [preview, setPreview] = useState<MockQueryPreview | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(compact ? [] : ['structure', 'complexity'])
  );

  // Debounced preview generation
  useEffect(() => {
    if (!query.trim() || query.length < 5) {
      setPreview(null);
      setError(null);
      return;
    }

    if (!autoRefresh) return;

    setIsGenerating(true);
    setError(null);

    const timeoutId = setTimeout(() => {
      generatePreview(query, fileId);
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [query, fileId, autoRefresh, debounceMs]);

  // Mock preview generation (replace with actual API call)
  const generatePreview = async (queryText: string, fileId?: string) => {
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300));

      const preview = mockGeneratePreview(queryText, fileId);
      setPreview(preview);
      onPreviewChange?.(preview);
    } catch (error: any) {
      console.error('Preview generation failed:', error);
      setError(error.message || 'Vorschau-Generierung fehlgeschlagen');
    } finally {
      setIsGenerating(false);
    }
  };

  // Mock preview generation logic
  const mockGeneratePreview = (queryText: string, fileId?: string): MockQueryPreview => {
    const lowerQuery = queryText.toLowerCase();
    
    // Estimate results count based on query type
    let estimatedResults = 10;
    let entityTypes: string[] = ['IfcWall', 'IfcSpace'];
    let dataCategories: string[] = ['Geometrie', 'Eigenschaften'];
    
    if (lowerQuery.includes('wie viele') || lowerQuery.includes('anzahl')) {
      estimatedResults = 1; // Count queries return single number
      dataCategories = ['Anzahl', 'Zusammenfassung'];
    } else if (lowerQuery.includes('alle') && lowerQuery.includes('gebäude')) {
      estimatedResults = 150; // Building-wide queries
    } else if (lowerQuery.includes('material')) {
      entityTypes = ['IfcMaterial', 'IfcMaterialProperties'];
      dataCategories = ['Materialien', 'Eigenschaften', 'Mengen'];
      estimatedResults = 25;
    } else if (lowerQuery.includes('raum') || lowerQuery.includes('stockwerk')) {
      entityTypes = ['IfcSpace', 'IfcBuildingStorey'];
      dataCategories = ['Räume', 'Flächen', 'Volumen'];
      estimatedResults = 8;
    }

    // Processing steps based on query complexity
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

    // Resource estimation
    const baseTokens = Math.max(500, queryText.length * 10);
    const complexityMultiplier = steps.length > 3 ? 2 : 1.5;
    const estimatedTokens = Math.round(baseTokens * complexityMultiplier);
    const estimatedDuration = steps.reduce((sum, step) => sum + step.estimatedDuration, 0);

    // Complexity factors
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

    // Optimization suggestions
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

    const recommendation = complexityScore <= 4 
      ? 'Einfache Abfrage mit schneller Verarbeitung'
      : complexityScore <= 7
      ? 'Mittlere Komplexität, angemessene Verarbeitungszeit'
      : 'Komplexe Abfrage, längere Verarbeitungszeit zu erwarten';

    return {
      estimatedResults,
      resultStructure: {
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
      },
      processingSteps: steps,
      resourceEstimate: {
        estimatedTokens,
        estimatedMemory: Math.round(estimatedResults * 0.5), // MB
        estimatedDuration,
        concurrencyImpact: Math.max(1, Math.round(estimatedDuration * 0.3)),
      },
      complexity: {
        score: Math.min(10, complexityScore),
        factors: complexityFactors,
        recommendation,
        optimization: optimizations,
      },
      generatedAt: new Date(),
      confidence: Math.max(0.6, Math.min(0.95, 1 - (complexityScore * 0.05))),
    };
  };

  // Manual refresh
  const handleManualRefresh = () => {
    if (query.trim() && query.length >= 5) {
      generatePreview(query, fileId);
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

  // Get complexity color
  const getComplexityColor = (score: number) => {
    if (score <= 3) return 'success';
    if (score <= 6) return 'warning';
    return 'error';
  };

  // Format duration
  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  // Render skeleton loading
  const renderSkeleton = () => (
    <Box sx={{ p: 2 }}>
      <Skeleton variant="text" width="60%" height={32} />
      <Skeleton variant="rectangular" width="100%" height={100} sx={{ mt: 2 }} />
      <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
        <Skeleton variant="rectangular" width={80} height={32} />
        <Skeleton variant="rectangular" width={120} height={32} />
        <Skeleton variant="rectangular" width={100} height={32} />
      </Box>
    </Box>
  );

  // Render summary section
  const renderSummary = () => {
    if (!preview) return null;

    return (
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PreviewIcon />
            Abfrage-Vorschau
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              label={`${Math.round(preview.confidence * 100)}% Vertrauen`}
              size="small"
              color={preview.confidence > 0.8 ? 'success' : preview.confidence > 0.6 ? 'warning' : 'error'}
              variant="outlined"
            />
            <Tooltip title="Vorschau aktualisieren">
              <IconButton size="small" onClick={handleManualRefresh} disabled={isGenerating}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Chip
            icon={<ResultsIcon />}
            label={`~${preview.estimatedResults} Ergebnisse`}
            color="primary"
            variant="outlined"
          />
          <Chip
            icon={<ComplexityIcon />}
            label={`Komplexität: ${preview.complexity.score}/10`}
            color={getComplexityColor(preview.complexity.score)}
            variant="outlined"
          />
          <Chip
            icon={<DurationIcon />}
            label={`~${formatDuration(preview.resourceEstimate.estimatedDuration)}`}
            color="info"
            variant="outlined"
          />
          <Chip
            icon={<MemoryIcon />}
            label={`~${preview.resourceEstimate.estimatedMemory}MB`}
            color="secondary"
            variant="outlined"
          />
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {preview.complexity.recommendation}
        </Typography>
      </Box>
    );
  };

  // Render expandable sections
  const renderSection = (
    key: string,
    title: string,
    icon: React.ReactNode,
    content: React.ReactNode,
    badge?: number
  ) => (
    <Accordion
      expanded={expandedSections.has(key)}
      onChange={() => toggleSection(key)}
      sx={{ boxShadow: 'none', border: '1px solid', borderColor: 'divider' }}
    >
      <AccordionSummary expandIcon={<ExpandIcon />}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {badge !== undefined ? (
            <Badge badgeContent={badge} color="primary">
              {icon}
            </Badge>
          ) : (
            icon
          )}
          <Typography variant="subtitle2">{title}</Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails>{content}</AccordionDetails>
    </Accordion>
  );

  if (!query.trim() || query.length < 5) {
    return (
      <Card>
        <CardContent>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            Geben Sie eine Abfrage ein (min. 5 Zeichen), um eine Vorschau zu sehen.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <Alert severity="error">
            <Typography variant="body2">
              {error}
            </Typography>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        {isGenerating && renderSkeleton()}
        
        {preview && (
          <>
            {renderSummary()}

            {!compact && (
              <Box sx={{ mt: 2 }}>
                {/* Result Structure */}
                {renderSection(
                  'structure',
                  'Erwartete Ergebnisstruktur',
                  <DataIcon />,
                  <Box>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                      Die Abfrage wird voraussichtlich folgende Datentypen zurückgeben:
                    </Typography>
                    
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Kategorie</TableCell>
                          <TableCell>Typen</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        <TableRow>
                          <TableCell>IFC-Entitäten</TableCell>
                          <TableCell>
                            {preview.resultStructure.entityTypes.map((type, index) => (
                              <Chip key={index} label={type} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                            ))}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Datenkategorien</TableCell>
                          <TableCell>
                            {preview.resultStructure.dataCategories.map((category, index) => (
                              <Chip key={index} label={category} size="small" variant="outlined" sx={{ mr: 0.5, mb: 0.5 }} />
                            ))}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </Box>,
                  preview.resultStructure.entityTypes.length
                )}

                {/* Processing Steps */}
                {renderSection(
                  'processing',
                  'Verarbeitungsschritte',
                  <ProcessIcon />,
                  <List dense>
                    {preview.processingSteps.map((step, index) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          <Box sx={{ 
                            width: 24, 
                            height: 24, 
                            borderRadius: '50%', 
                            backgroundColor: 'primary.main', 
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            fontWeight: 'bold'
                          }}>
                            {index + 1}
                          </Box>
                        </ListItemIcon>
                        <ListItemText
                          primary={step.name}
                          secondary={
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                {step.description}
                              </Typography>
                              <Typography variant="caption" color="primary">
                                ~{step.estimatedDuration}s
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>,
                  preview.processingSteps.length
                )}

                {/* Complexity Analysis */}
                {renderSection(
                  'complexity',
                  'Komplexitätsanalyse',
                  <ComplexityIcon />,
                  <Box>
                    {preview.complexity.factors.length > 0 && (
                      <>
                        <Typography variant="body2" sx={{ mb: 2 }}>
                          Faktoren, die die Komplexität beeinflussen:
                        </Typography>
                        <List dense>
                          {preview.complexity.factors.map((factor, index) => (
                            <ListItem key={index}>
                              <ListItemIcon>
                                <InfoIcon color="info" />
                              </ListItemIcon>
                              <ListItemText
                                primary={factor.name}
                                secondary={
                                  <Box>
                                    <Typography variant="body2" color="text.secondary">
                                      {factor.description}
                                    </Typography>
                                    <LinearProgress
                                      variant="determinate"
                                      value={(factor.impact / 3) * 100}
                                      sx={{ mt: 0.5, width: 100 }}
                                      color={factor.impact > 2 ? 'error' : factor.impact > 1 ? 'warning' : 'success'}
                                    />
                                  </Box>
                                }
                              />
                            </ListItem>
                          ))}
                        </List>
                      </>
                    )}
                  </Box>,
                  preview.complexity.factors.length
                )}

                {/* Optimization Suggestions */}
                {preview.complexity.optimization.length > 0 && renderSection(
                  'optimization',
                  'Optimierungsvorschläge',
                  <OptimizationIcon />,
                  <List dense>
                    {preview.complexity.optimization.map((suggestion, index) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          <CheckIcon color="success" />
                        </ListItemIcon>
                        <ListItemText
                          primary={suggestion}
                          primaryTypographyProps={{
                            variant: 'body2',
                            color: 'text.secondary',
                          }}
                        />
                      </ListItem>
                    ))}
                  </List>,
                  preview.complexity.optimization.length
                )}
              </Box>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default QueryPreview;