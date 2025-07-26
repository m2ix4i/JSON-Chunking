/**
 * Query preview sections component - handles accordion sections display.
 * Focused component following Single Responsibility Principle.
 */

import React from 'react';
import {
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  ExpandMore as ExpandIcon,
  Assessment as ResultsIcon,
  PlayArrow as ProcessIcon,
  TrendingUp as OptimizationIcon,
  Memory as MemoryIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
} from '@mui/icons-material';

import type { QueryPreview } from '@/types/app';

interface QueryPreviewSectionsProps {
  preview: QueryPreview;
  expandedSections: Set<string>;
  onToggleSection: (section: string) => void;
  compact?: boolean;
}

const QueryPreviewSections: React.FC<QueryPreviewSectionsProps> = ({
  preview,
  expandedSections,
  onToggleSection,
  compact = false,
}) => {
  const formatBytes = (bytes: number): string => {
    return bytes >= 1024 ? `${(bytes / 1024).toFixed(1)} GB` : `${bytes} MB`;
  };

  const getComplexityColor = (score: number) => {
    if (score <= 3) return 'success';
    if (score <= 6) return 'warning';
    return 'error';
  };

  if (compact) {
    return (
      <Box sx={{ mt: 2 }}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Verarbeitungsschritte ({preview.processingSteps.length})
        </Typography>
        
        {preview.processingSteps.map((step, index) => (
          <Box key={index} sx={{ mb: 1 }}>
            <Typography variant="caption" sx={{ fontWeight: 500 }}>
              {index + 1}. {step.name}
            </Typography>
            <LinearProgress 
              variant="determinate" 
              value={100} 
              sx={{ height: 4, borderRadius: 2, mt: 0.5 }}
            />
          </Box>
        ))}
      </Box>
    );
  }

  return (
    <Box>
      {/* Result Structure Section */}
      <Accordion 
        expanded={expandedSections.has('structure')}
        onChange={() => onToggleSection('structure')}
      >
        <AccordionSummary expandIcon={<ExpandIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ResultsIcon />
            <Typography variant="subtitle1">Ergebnisstruktur</Typography>
            <Chip 
              label={`${preview.resultStructure.entityTypes.length} Typen`}
              size="small"
              variant="outlined"
            />
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Entity-Typen:
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
              {preview.resultStructure.entityTypes.map((type, index) => (
                <Chip key={index} label={type} size="small" />
              ))}
            </Box>
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Datenkategorien:
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {preview.resultStructure.dataCategories.map((category, index) => (
                <Chip 
                  key={index} 
                  label={category} 
                  size="small" 
                  variant="outlined"
                  color="primary"
                />
              ))}
            </Box>
          </Box>

          <Typography variant="body2" color="text.secondary">
            Erwartete Felder: {preview.resultStructure.expectedFields.join(', ')}
          </Typography>
        </AccordionDetails>
      </Accordion>

      {/* Processing Steps Section */}
      <Accordion 
        expanded={expandedSections.has('steps')}
        onChange={() => onToggleSection('steps')}
      >
        <AccordionSummary expandIcon={<ExpandIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ProcessIcon />
            <Typography variant="subtitle1">Verarbeitungsschritte</Typography>
            <Chip 
              label={`${preview.processingSteps.length} Schritte`}
              size="small"
              variant="outlined"
            />
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <List dense>
            {preview.processingSteps.map((step, index) => (
              <React.Fragment key={index}>
                <ListItem>
                  <ListItemIcon>
                    <Box sx={{ 
                      minWidth: 24, 
                      height: 24, 
                      borderRadius: '50%', 
                      bgcolor: 'primary.main', 
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
                        <Typography variant="caption" color="text.secondary">
                          Geschätzte Dauer: {step.estimatedDuration}s
                          {step.dependencies.length > 0 && (
                            ` • Abhängigkeiten: ${step.dependencies.join(', ')}`
                          )}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
                {index < preview.processingSteps.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </AccordionDetails>
      </Accordion>

      {/* Complexity Section */}
      <Accordion 
        expanded={expandedSections.has('complexity')}
        onChange={() => onToggleSection('complexity')}
      >
        <AccordionSummary expandIcon={<ExpandIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <OptimizationIcon />
            <Typography variant="subtitle1">Komplexitätsanalyse</Typography>
            <Chip 
              label={`${preview.complexity.score}/10`}
              size="small"
              color={getComplexityColor(preview.complexity.score)}
            />
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" gutterBottom>
            {preview.complexity.recommendation}
          </Typography>

          {preview.complexity.factors.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Komplexitätsfaktoren:
              </Typography>
              {preview.complexity.factors.map((factor, index) => (
                <Box key={index} sx={{ mb: 1, p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {factor.name}
                    </Typography>
                    <Chip 
                      label={`+${factor.impact}`} 
                      size="small" 
                      color={factor.impact > 2 ? 'error' : 'warning'}
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {factor.description}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}

          {preview.complexity.optimization.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Optimierungsvorschläge:
              </Typography>
              <List dense>
                {preview.complexity.optimization.map((optimization, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <InfoIcon color="info" fontSize="small" />
                    </ListItemIcon>
                    <ListItemText 
                      primary={optimization}
                      primaryTypographyProps={{ variant: 'body2' }}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </AccordionDetails>
      </Accordion>

      {/* Resources Section */}
      <Accordion 
        expanded={expandedSections.has('resources')}
        onChange={() => onToggleSection('resources')}
      >
        <AccordionSummary expandIcon={<ExpandIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <MemoryIcon />
            <Typography variant="subtitle1">Ressourcenschätzung</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Ressource</TableCell>
                <TableCell align="right">Geschätzter Wert</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>Tokens</TableCell>
                <TableCell align="right">
                  {preview.resourceEstimate.estimatedTokens.toLocaleString()}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Arbeitsspeicher</TableCell>
                <TableCell align="right">
                  {formatBytes(preview.resourceEstimate.estimatedMemory)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Verarbeitungsdauer</TableCell>
                <TableCell align="right">
                  {preview.resourceEstimate.estimatedDuration}s
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Parallelitäts-Impact</TableCell>
                <TableCell align="right">
                  {preview.resourceEstimate.concurrencyImpact}s
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};

export default QueryPreviewSections;