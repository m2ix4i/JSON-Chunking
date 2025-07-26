/**
 * Query preview sections component - displays detailed preview sections.
 * Focused component following Single Responsibility Principle.
 */

import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Stack,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Timeline as TimelineIcon,
  DataObject as DataObjectIcon,
  Memory as MemoryIcon,
  TipsAndUpdates as TipsIcon,
} from '@mui/icons-material';

import type { QueryPreview } from '@/types/app';

interface QueryPreviewSectionsProps {
  preview: QueryPreview;
}

const QueryPreviewSections: React.FC<QueryPreviewSectionsProps> = ({
  preview,
}) => {
  const { processingSteps, resultStructure, complexity, resourceEstimate } = preview;

  return (
    <Stack spacing={2}>
      {/* Processing Steps */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box display="flex" alignItems="center" gap={1}>
            <TimelineIcon color="primary" />
            <Typography variant="h6">
              Verarbeitungsschritte ({processingSteps.length})
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <List>
            {processingSteps.map((step, index) => (
              <React.Fragment key={step.name}>
                <ListItem>
                  <ListItemText
                    primary={
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="subtitle2">{step.name}</Typography>
                        <Chip label={`${step.estimatedDuration}s`} size="small" />
                      </Box>
                    }
                    secondary={step.description}
                  />
                </ListItem>
                {index < processingSteps.length - 1 && <Divider component="li" />}
              </React.Fragment>
            ))}
          </List>
        </AccordionDetails>
      </Accordion>

      {/* Result Structure */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box display="flex" alignItems="center" gap={1}>
            <DataObjectIcon color="primary" />
            <Typography variant="h6">Erwartete Ergebnisstruktur</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Entity-Typen:
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {resultStructure.entityTypes.map((type) => (
                  <Chip key={type} label={type} size="small" />
                ))}
              </Stack>
            </Box>
            
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Datenkategorien:
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {resultStructure.dataCategories.map((category) => (
                  <Chip key={category} label={category} size="small" color="secondary" />
                ))}
              </Stack>
            </Box>

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Beispiel-Ausgabe:
              </Typography>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="body2" component="pre" sx={{ fontFamily: 'monospace' }}>
                    {JSON.stringify(resultStructure.sampleOutput, null, 2)}
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          </Stack>
        </AccordionDetails>
      </Accordion>

      {/* Resource Estimate */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box display="flex" alignItems="center" gap={1}>
            <MemoryIcon color="primary" />
            <Typography variant="h6">Ressourcenschätzung</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            <Box display="flex" justifyContent="space-between">
              <Typography variant="body2">Geschätzte Tokens:</Typography>
              <Typography variant="body2" fontWeight="bold">
                {resourceEstimate.estimatedTokens.toLocaleString()}
              </Typography>
            </Box>
            <Box display="flex" justifyContent="space-between">
              <Typography variant="body2">Speicherbedarf:</Typography>
              <Typography variant="body2" fontWeight="bold">
                ~{resourceEstimate.estimatedMemory} MB
              </Typography>
            </Box>
            <Box display="flex" justifyContent="space-between">
              <Typography variant="body2">Verarbeitungszeit:</Typography>
              <Typography variant="body2" fontWeight="bold">
                ~{resourceEstimate.estimatedDuration}s
              </Typography>
            </Box>
            <Box display="flex" justifyContent="space-between">
              <Typography variant="body2">Parallelitäts-Impact:</Typography>
              <Typography variant="body2" fontWeight="bold">
                +{resourceEstimate.concurrencyImpact}s
              </Typography>
            </Box>
          </Stack>
        </AccordionDetails>
      </Accordion>

      {/* Optimization Suggestions */}
      {complexity.optimization.length > 0 && (
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box display="flex" alignItems="center" gap={1}>
              <TipsIcon color="primary" />
              <Typography variant="h6">Optimierungsvorschläge</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <List>
              {complexity.optimization.map((suggestion, index) => (
                <ListItem key={index}>
                  <ListItemText
                    primary={suggestion}
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
              ))}
            </List>
          </AccordionDetails>
        </Accordion>
      )}
    </Stack>
  );
};

export default QueryPreviewSections;