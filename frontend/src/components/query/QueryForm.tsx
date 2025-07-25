/**
 * Query form component with validation and error handling.
 */

import React from 'react';
import {
  Box,
  TextField,
  FormControlLabel,
  Switch,
  Slider,
  Typography,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Grid,
  InputAdornment,
} from '@mui/material';
import {
  ExpandMore as ExpandIcon,
  Send as SendIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';

// Store hooks
import { useCurrentQuery } from '@stores/queryStore';
import { useSelectedFile } from '@stores/fileStore';

// Utils
import { ValidationError } from '@utils/errorUtils';

export interface QueryFormProps {
  disabled?: boolean;
  onSubmit?: () => void;
  isSubmitting?: boolean;
  validationErrors?: ValidationError[];
}

const QueryForm: React.FC<QueryFormProps> = ({
  disabled = false,
  onSubmit,
  isSubmitting = false,
  validationErrors = [],
}) => {
  const { currentQuery, updateCurrentQuery } = useCurrentQuery();
  const selectedFile = useSelectedFile();

  const getFieldError = (fieldName: string): string | undefined => {
    return validationErrors.find(error => error.field === fieldName)?.message;
  };

  const hasFieldError = (fieldName: string): boolean => {
    return validationErrors.some(error => error.field === fieldName);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (onSubmit && !disabled && !isSubmitting) {
      onSubmit();
    }
  };

  const handleQueryChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    updateCurrentQuery({ text: event.target.value });
  };

  const handleIntentChange = (event: any) => {
    updateCurrentQuery({ intentHint: event.target.value || undefined });
  };

  const handleMaxConcurrentChange = (_: Event, value: number | number[]) => {
    updateCurrentQuery({ maxConcurrent: value as number });
  };

  const handleTimeoutChange = (_: Event, value: number | number[]) => {
    updateCurrentQuery({ timeoutSeconds: value as number });
  };

  const handleCacheChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    updateCurrentQuery({ cacheResults: event.target.checked });
  };

  const intentOptions = [
    { value: '', label: 'Automatisch erkennen' },
    { value: 'quantity', label: 'Mengenanalyse' },
    { value: 'component', label: 'Bauteilanalyse' },
    { value: 'material', label: 'Materialanalyse' },
    { value: 'spatial', label: 'Räumliche Analyse' },
    { value: 'cost', label: 'Kostenanalyse' },
  ];

  return (
    <Box component="form" onSubmit={handleSubmit}>
      {/* Main Query Input */}
      <TextField
        name="query"
        id="query"
        label="Ihre Abfrage"
        multiline
        rows={4}
        fullWidth
        value={currentQuery.text}
        onChange={handleQueryChange}
        disabled={disabled || isSubmitting}
        error={hasFieldError('query')}
        helperText={getFieldError('query') || 'Beschreiben Sie, was Sie über Ihre IFC-Daten wissen möchten'}
        placeholder="z.B. Wie viele Fenster befinden sich im zweiten Stock?"
        sx={{ mb: 3 }}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <Typography variant="caption" color="text.secondary">
                {currentQuery.text.length}/1000
              </Typography>
            </InputAdornment>
          ),
        }}
      />

      {/* Intent Hint */}
      <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel id="intent-label">Abfragetyp (optional)</InputLabel>
        <Select
          labelId="intent-label"
          name="intentHint"
          id="intentHint"
          value={currentQuery.intentHint || ''}
          onChange={handleIntentChange}
          disabled={disabled || isSubmitting}
          error={hasFieldError('intentHint')}
          label="Abfragetyp (optional)"
        >
          {intentOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Advanced Settings */}
      <Accordion sx={{ mb: 3 }}>
        <AccordionSummary expandIcon={<ExpandIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SettingsIcon />
            <Typography>Erweiterte Einstellungen</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            {/* Max Concurrent */}
            <Grid item xs={12} md={6}>
              <Typography gutterBottom>
                Parallele Verarbeitung: {currentQuery.maxConcurrent}
              </Typography>
              <Slider
                name="maxConcurrent"
                value={currentQuery.maxConcurrent}
                onChange={handleMaxConcurrentChange}
                disabled={disabled || isSubmitting}
                min={1}
                max={10}
                step={1}
                marks={[
                  { value: 1, label: '1' },
                  { value: 5, label: '5' },
                  { value: 10, label: '10' },
                ]}
                valueLabelDisplay="auto"
              />
              <Typography variant="caption" color="text.secondary">
                Höhere Werte = schnellere Verarbeitung, aber mehr Ressourcenverbrauch
              </Typography>
              {hasFieldError('maxConcurrent') && (
                <Typography variant="caption" color="error" display="block">
                  {getFieldError('maxConcurrent')}
                </Typography>
              )}
            </Grid>

            {/* Timeout */}
            <Grid item xs={12} md={6}>
              <Typography gutterBottom>
                Zeitlimit: {Math.round(currentQuery.timeoutSeconds / 60)} Minuten
              </Typography>
              <Slider
                name="timeoutSeconds"
                value={currentQuery.timeoutSeconds}
                onChange={handleTimeoutChange}
                disabled={disabled || isSubmitting}
                min={30}
                max={600}
                step={30}
                marks={[
                  { value: 30, label: '30s' },
                  { value: 300, label: '5m' },
                  { value: 600, label: '10m' },
                ]}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => `${Math.round(value / 60)}m`}
              />
              <Typography variant="caption" color="text.secondary">
                Maximale Zeit für die Abfrage-Verarbeitung
              </Typography>
              {hasFieldError('timeoutSeconds') && (
                <Typography variant="caption" color="error" display="block">
                  {getFieldError('timeoutSeconds')}
                </Typography>
              )}
            </Grid>

            {/* Cache Results */}
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    name="cacheResults"
                    checked={currentQuery.cacheResults}
                    onChange={handleCacheChange}
                    disabled={disabled || isSubmitting}
                  />
                }
                label="Ergebnisse zwischenspeichern"
              />
              <Typography variant="caption" color="text.secondary" display="block">
                Aktivieren Sie dies, um ähnliche Abfragen zu beschleunigen
              </Typography>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Selected File Info */}
      {selectedFile && (
        <Box sx={{ mb: 3, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="body2" gutterBottom>
            <strong>Ausgewählte Datei:</strong>
          </Typography>
          <Chip 
            label={selectedFile.filename}
            color="primary"
            variant="outlined"
          />
        </Box>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        variant="contained"
        size="large"
        startIcon={<SendIcon />}
        disabled={disabled || isSubmitting || !selectedFile || !currentQuery.text.trim()}
        fullWidth
        sx={{ py: 1.5 }}
      >
        {isSubmitting ? 'Abfrage wird gestartet...' : 'Abfrage starten'}
      </Button>

      {/* Status Messages */}
      {!selectedFile && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
          Bitte wählen Sie eine Datei aus, bevor Sie eine Abfrage starten.
        </Typography>
      )}
      
      {selectedFile && !currentQuery.text.trim() && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
          Bitte geben Sie eine Abfrage ein.
        </Typography>
      )}
    </Box>
  );
};

export default QueryForm;