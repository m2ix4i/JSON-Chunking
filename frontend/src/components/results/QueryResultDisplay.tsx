/**
 * Structured query result display with German language support.
 */

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  Alert,
  Button,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
  Divider,
} from '@mui/material';
import {
  ExpandMore as ExpandIcon,
  Assessment as AnalysisIcon,
  Calculate as QuantityIcon,
  Build as ComponentIcon,
  Palette as MaterialIcon,
  Place as SpatialIcon,
  AttachMoney as CostIcon,
  Download as DownloadIcon,
  Share as ShareIcon,
  ContentCopy as CopyIcon,
  Visibility as ViewIcon,
  Timer as TimerIcon,
  TrendingUp as ConfidenceIcon,
  CheckCircle as SuccessIcon,
  ErrorOutline as ErrorIcon,
} from '@mui/icons-material';

// Store hooks
import { showSuccessNotification, showErrorNotification } from '@stores/appStore';

// Types
import type { QueryResultResponse } from '@types/api';

interface QueryResultDisplayProps {
  result: QueryResultResponse;
  onExport?: (format: 'json' | 'csv' | 'pdf') => void;
  onShare?: () => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div hidden={value !== index}>
    {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
  </div>
);

const QueryResultDisplay: React.FC<QueryResultDisplayProps> = ({
  result,
  onExport,
  onShare,
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['summary', 'answer'])
  );

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const handleCopyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showSuccessNotification('In Zwischenablage kopiert');
    } catch (error) {
      showErrorNotification('Kopieren fehlgeschlagen');
    }
  };

  const getIntentIcon = (intent: string) => {
    switch (intent.toLowerCase()) {
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
        return <AnalysisIcon color="info" />;
    }
  };

  const getIntentLabel = (intent: string) => {
    const labels: Record<string, string> = {
      quantity: 'Mengenanalyse',
      component: 'Bauteilanalyse',
      material: 'Materialanalyse',
      spatial: 'Räumliche Analyse',
      cost: 'Kostenanalyse',
      general: 'Allgemeine Analyse',
    };
    return labels[intent.toLowerCase()] || intent;
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'success';
    if (score >= 0.6) return 'warning';
    return 'error';
  };

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds.toFixed(1)}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
  };

  const renderSummaryTab = () => (
    <Grid container spacing={3}>
      {/* Key Metrics */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Ergebnis-Metriken
            </Typography>
            
            <List>
              <ListItem>
                <ListItemIcon>
                  <ConfidenceIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Vertrauen"
                  secondary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={result.confidence_score * 100}
                        sx={{ width: 100, height: 6, borderRadius: 3 }}
                        color={getConfidenceColor(result.confidence_score)}
                      />
                      <Typography variant="body2">
                        {Math.round(result.confidence_score * 100)}%
                      </Typography>
                    </Box>
                  }
                />
              </ListItem>
              
              <ListItem>
                <ListItemIcon>
                  <TimerIcon color="info" />
                </ListItemIcon>
                <ListItemText
                  primary="Verarbeitungszeit"
                  secondary={formatDuration(result.processing_time)}
                />
              </ListItem>
              
              <ListItem>
                <ListItemIcon>
                  {result.successful_chunks === result.total_chunks ? 
                    <SuccessIcon color="success" /> : 
                    <ErrorIcon color="warning" />
                  }
                </ListItemIcon>
                <ListItemText
                  primary="Chunk-Verarbeitung"
                  secondary={`${result.successful_chunks}/${result.total_chunks} erfolgreich`}
                />
              </ListItem>
            </List>
          </CardContent>
        </Card>
      </Grid>

      {/* Query Info */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Abfrage-Details
            </Typography>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Absicht
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                {getIntentIcon(result.intent)}
                <Typography variant="body1">
                  {getIntentLabel(result.intent)}
                </Typography>
              </Box>
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Ursprüngliche Abfrage
              </Typography>
              <Typography variant="body1" sx={{ mt: 0.5 }}>
                {result.original_query}
              </Typography>
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Verwendetes Modell
              </Typography>
              <Chip label={result.model_used} size="small" sx={{ mt: 0.5 }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Answer */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6">
                Antwort
              </Typography>
              <Tooltip title="Antwort kopieren">
                <IconButton
                  size="small"
                  onClick={() => handleCopyToClipboard(result.answer)}
                >
                  <CopyIcon />
                </IconButton>
              </Tooltip>
            </Box>
            
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
              {result.answer}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderStructuredDataTab = () => (
    <Box>
      {result.structured_data ? (
        <Grid container spacing={3}>
          {/* Entities */}
          {result.structured_data.entities && result.structured_data.entities.length > 0 && (
            <Grid item xs={12}>
              <Accordion 
                expanded={expandedSections.has('entities')}
                onChange={() => toggleSection('entities')}
              >
                <AccordionSummary expandIcon={<ExpandIcon />}>
                  <Typography variant="h6">
                    Erkannte Entitäten ({result.structured_data.entities.length})
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Typ</TableCell>
                          <TableCell>Name</TableCell>
                          <TableCell>Eigenschaften</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {result.structured_data.entities.map((entity, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <Chip label={entity.type} size="small" variant="outlined" />
                            </TableCell>
                            <TableCell>{entity.name}</TableCell>
                            <TableCell>
                              {Object.keys(entity.properties).length} Eigenschaften
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </AccordionDetails>
              </Accordion>
            </Grid>
          )}

          {/* Quantities */}
          {result.structured_data.quantities && Object.keys(result.structured_data.quantities).length > 0 && (
            <Grid item xs={12}>
              <Accordion 
                expanded={expandedSections.has('quantities')}
                onChange={() => toggleSection('quantities')}
              >
                <AccordionSummary expandIcon={<ExpandIcon />}>
                  <Typography variant="h6">
                    Mengenangaben ({Object.keys(result.structured_data.quantities).length})
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Messgröße</TableCell>
                          <TableCell align="right">Wert</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {Object.entries(result.structured_data.quantities).map(([key, value]) => (
                          <TableRow key={key}>
                            <TableCell>{key}</TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                {typeof value === 'number' ? value.toLocaleString('de-DE') : value}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </AccordionDetails>
              </Accordion>
            </Grid>
          )}

          {/* Materials */}
          {result.structured_data.materials && result.structured_data.materials.length > 0 && (
            <Grid item xs={12}>
              <Accordion 
                expanded={expandedSections.has('materials')}
                onChange={() => toggleSection('materials')}
              >
                <AccordionSummary expandIcon={<ExpandIcon />}>
                  <Typography variant="h6">
                    Materialien ({result.structured_data.materials.length})
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {result.structured_data.materials.map((material, index) => (
                      <Chip key={index} label={material} variant="outlined" />
                    ))}
                  </Box>
                </AccordionDetails>
              </Accordion>
            </Grid>
          )}

          {/* Spatial Context */}
          {result.structured_data.spatial_context && Object.keys(result.structured_data.spatial_context).length > 0 && (
            <Grid item xs={12}>
              <Accordion 
                expanded={expandedSections.has('spatial')}
                onChange={() => toggleSection('spatial')}
              >
                <AccordionSummary expandIcon={<ExpandIcon />}>
                  <Typography variant="h6">
                    Räumlicher Kontext
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Räumliche Informationen und Zuordnungen
                  </Typography>
                  <pre style={{ fontSize: '0.875rem', overflow: 'auto' }}>
                    {JSON.stringify(result.structured_data.spatial_context, null, 2)}
                  </pre>
                </AccordionDetails>
              </Accordion>
            </Grid>
          )}
        </Grid>
      ) : (
        <Alert severity="info">
          Keine strukturierten Daten verfügbar für diese Abfrage.
        </Alert>
      )}
    </Box>
  );

  return (
    <Card>
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {getIntentIcon(result.intent)}
            <Box>
              <Typography variant="h5" component="h2">
                {getIntentLabel(result.intent)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Abfrage-ID: {result.query_id.slice(0, 8)}...
              </Typography>
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            {onShare && (
              <Tooltip title="Ergebnis teilen">
                <IconButton onClick={onShare}>
                  <ShareIcon />
                </IconButton>
              </Tooltip>
            )}
            
            {onExport && (
              <Tooltip title="Als JSON exportieren">
                <IconButton onClick={() => onExport('json')}>
                  <DownloadIcon />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={activeTab} onChange={handleTabChange}>
            <Tab label="Zusammenfassung" icon={<ViewIcon />} iconPosition="start" />
            <Tab label="Strukturierte Daten" icon={<AnalysisIcon />} iconPosition="start" />
          </Tabs>
        </Box>

        {/* Tab Content */}
        <TabPanel value={activeTab} index={0}>
          {renderSummaryTab()}
        </TabPanel>
        
        <TabPanel value={activeTab} index={1}>
          {renderStructuredDataTab()}
        </TabPanel>
      </CardContent>
    </Card>
  );
};

export default QueryResultDisplay;