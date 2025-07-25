/**
 * Form error summary component for displaying validation errors at the top of forms.
 */

import React from 'react';
import {
  Box,
  Alert,
  AlertTitle,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Button,
  Collapse,
  IconButton,
} from '@mui/material';
import {
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  ArrowDownward as ScrollIcon,
} from '@mui/icons-material';
import { ValidationError } from '@utils/errorUtils';

export interface FormErrorSummaryProps {
  errors: ValidationError[];
  title?: string;
  maxVisible?: number;
  collapsible?: boolean;
  onFieldFocus?: (fieldName: string) => void;
  sx?: object;
}

const FormErrorSummary: React.FC<FormErrorSummaryProps> = ({
  errors,
  title = 'Bitte korrigieren Sie die folgenden Fehler:',
  maxVisible = 5,
  collapsible = true,
  onFieldFocus,
  sx,
}) => {
  const [expanded, setExpanded] = React.useState(!collapsible);

  if (!errors || errors.length === 0) {
    return null;
  }

  const visibleErrors = expanded ? errors : errors.slice(0, maxVisible);
  const hasHiddenErrors = !expanded && errors.length > maxVisible;

  const getIcon = (severity: ValidationError['severity'] = 'error') => {
    switch (severity) {
      case 'warning':
        return <WarningIcon color="warning" />;
      case 'info':
        return <InfoIcon color="info" />;
      default:
        return <ErrorIcon color="error" />;
    }
  };

  const getSeverity = () => {
    if (errors.some(e => e.severity === 'error' || !e.severity)) return 'error';
    if (errors.some(e => e.severity === 'warning')) return 'warning';
    return 'info';
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
      intentHint: 'Abfragetyp',
      maxConcurrent: 'Maximale Parallelverarbeitung',
      timeoutSeconds: 'Zeitlimit',
      cacheResults: 'Ergebnisse zwischenspeichern',
    };
    return fieldLabels[fieldName] || fieldName;
  };

  const handleFieldClick = (fieldName: string) => {
    if (onFieldFocus) {
      onFieldFocus(fieldName);
    } else {
      // Try to focus the field by name or id
      const field = document.querySelector(`[name="${fieldName}"], #${fieldName}`) as HTMLElement;
      if (field) {
        field.focus();
        field.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  const handleToggleExpanded = () => {
    setExpanded(!expanded);
  };

  return (
    <Alert
      severity={getSeverity()}
      sx={{
        mb: 2,
        '& .MuiAlert-message': { width: '100%' },
        ...sx,
      }}
      action={
        collapsible && (
          <IconButton
            color="inherit"
            size="small"
            onClick={handleToggleExpanded}
          >
            {expanded ? <CollapseIcon /> : <ExpandIcon />}
          </IconButton>
        )
      }
    >
      <AlertTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {title}
        <Typography variant="body2" component="span">
          ({errors.length} {errors.length === 1 ? 'Fehler' : 'Fehler'})
        </Typography>
      </AlertTitle>

      <Collapse in={expanded}>
        <List dense sx={{ mt: 1 }}>
          {visibleErrors.map((error, index) => (
            <ListItem key={index} disablePadding>
              <ListItemButton
                onClick={() => handleFieldClick(error.field)}
                sx={{
                  borderRadius: 1,
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 32 }}>
                  {getIcon(error.severity)}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" component="span" sx={{ fontWeight: 500 }}>
                        {getFieldLabel(error.field)}:
                      </Typography>
                      <Typography variant="body2" component="span">
                        {error.message}
                      </Typography>
                    </Box>
                  }
                  secondary={
                    error.details && (
                      <Typography
                        variant="caption"
                        sx={{
                          display: 'block',
                          mt: 0.5,
                          fontFamily: 'monospace',
                          color: 'text.secondary',
                        }}
                      >
                        {error.details}
                      </Typography>
                    )
                  }
                />
                <ScrollIcon sx={{ ml: 1, opacity: 0.5 }} fontSize="small" />
              </ListItemButton>
            </ListItem>
          ))}
        </List>

        {hasHiddenErrors && (
          <Box sx={{ mt: 1, textAlign: 'center' }}>
            <Button
              size="small"
              onClick={handleToggleExpanded}
              startIcon={<ExpandIcon />}
            >
              {errors.length - maxVisible} weitere Fehler anzeigen
            </Button>
          </Box>
        )}
      </Collapse>

      {!expanded && hasHiddenErrors && (
        <Box sx={{ mt: 1, textAlign: 'center' }}>
          <Button
            size="small"
            onClick={handleToggleExpanded}
            startIcon={<ExpandIcon />}
          >
            {errors.length - maxVisible} weitere Fehler anzeigen
          </Button>
        </Box>
      )}
    </Alert>
  );
};

export default FormErrorSummary;