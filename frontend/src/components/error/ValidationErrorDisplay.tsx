/**
 * Component for displaying validation errors in forms and user inputs.
 */

import React from 'react';
import {
  Box,
  Alert,
  AlertTitle,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
} from '@mui/material';
import {
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  ExpandMore as ExpandIcon,
} from '@mui/icons-material';

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
  severity?: 'error' | 'warning' | 'info';
  details?: string;
}

export interface ValidationErrorDisplayProps {
  errors: ValidationError[];
  title?: string;
  collapsible?: boolean;
  showFieldNames?: boolean;
  groupByField?: boolean;
  maxErrors?: number;
  sx?: object;
}

const ValidationErrorDisplay: React.FC<ValidationErrorDisplayProps> = ({
  errors,
  title = 'Validierungsfehler',
  collapsible = false,
  showFieldNames = true,
  groupByField = false,
  maxErrors,
  sx,
}) => {
  const [expanded, setExpanded] = React.useState(!collapsible);

  if (!errors || errors.length === 0) {
    return null;
  }

  const displayErrors = maxErrors ? errors.slice(0, maxErrors) : errors;
  const hasMoreErrors = maxErrors && errors.length > maxErrors;

  const getIcon = (severity: 'error' | 'warning' | 'info' = 'error') => {
    switch (severity) {
      case 'warning':
        return <WarningIcon color="warning" />;
      case 'info':
        return <InfoIcon color="info" />;
      default:
        return <ErrorIcon color="error" />;
    }
  };

  const getFieldLabel = (fieldName: string): string => {
    const fieldLabels: Record<string, string> = {
      file: 'Datei',
      query: 'Abfrage',
      email: 'E-Mail',
      password: 'Passwort',
      name: 'Name',
      timeout: 'Zeitüberschreitung',
      concurrent: 'Gleichzeitige Verarbeitung',
      format: 'Format',
      size: 'Größe',
      type: 'Typ',
    };
    return fieldLabels[fieldName] || fieldName;
  };

  const groupErrorsByField = (errors: ValidationError[]) => {
    const grouped: Record<string, ValidationError[]> = {};
    errors.forEach(error => {
      if (!grouped[error.field]) {
        grouped[error.field] = [];
      }
      grouped[error.field].push(error);
    });
    return grouped;
  };

  const renderErrorList = (errors: ValidationError[]) => (
    <List dense>
      {errors.map((error, index) => (
        <ListItem key={index}>
          <ListItemIcon>
            {getIcon(error.severity)}
          </ListItemIcon>
          <ListItemText
            primary={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {showFieldNames && (
                  <Chip
                    label={getFieldLabel(error.field)}
                    size="small"
                    variant="outlined"
                    color={error.severity === 'error' ? 'error' : 'default'}
                  />
                )}
                <Typography variant="body2">
                  {error.message}
                </Typography>
              </Box>
            }
            secondary={
              error.details && (
                <Typography
                  variant="caption"
                  component="pre"
                  sx={{
                    fontFamily: 'monospace',
                    mt: 0.5,
                    whiteSpace: 'pre-wrap',
                    color: 'text.secondary',
                  }}
                >
                  {error.details}
                </Typography>
              )
            }
          />
        </ListItem>
      ))}
    </List>
  );

  const renderGroupedErrors = () => {
    const grouped = groupErrorsByField(displayErrors);
    
    return (
      <Box>
        {Object.entries(grouped).map(([field, fieldErrors]) => (
          <Accordion key={field} defaultExpanded>
            <AccordionSummary expandIcon={<ExpandIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {getIcon(fieldErrors[0].severity)}
                <Typography variant="subtitle1">
                  {getFieldLabel(field)} ({fieldErrors.length})
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              {renderErrorList(fieldErrors)}
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>
    );
  };

  const getSeverity = () => {
    if (errors.some(e => e.severity === 'error' || !e.severity)) return 'error';
    if (errors.some(e => e.severity === 'warning')) return 'warning';
    return 'info';
  };

  const content = (
    <Box>
      {groupByField ? renderGroupedErrors() : renderErrorList(displayErrors)}
      
      {hasMoreErrors && (
        <Alert severity="info" sx={{ mt: 1 }}>
          <Typography variant="body2">
            ... und {errors.length - maxErrors!} weitere Fehler
          </Typography>
        </Alert>
      )}
    </Box>
  );

  if (collapsible) {
    return (
      <Accordion
        expanded={expanded}
        onChange={() => setExpanded(!expanded)}
        sx={sx}
      >
        <AccordionSummary expandIcon={<ExpandIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {getIcon(getSeverity())}
            <Typography variant="h6">
              {title} ({errors.length})
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          {content}
        </AccordionDetails>
      </Accordion>
    );
  }

  return (
    <Alert severity={getSeverity()} sx={sx}>
      <AlertTitle>
        {title} ({errors.length})
      </AlertTitle>
      {content}
    </Alert>
  );
};

export default ValidationErrorDisplay;