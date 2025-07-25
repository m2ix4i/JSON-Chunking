/**
 * Query form component with German language support and intelligent suggestions.
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Autocomplete,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  Grid,
  LinearProgress,
} from '@mui/material';
import {
  Search as QueryIcon,
  ExpandMore as ExpandIcon,
  AutoAwesome as SuggestionIcon,
  Settings as AdvancedIcon,
  FilePresent as FileIcon,
} from '@mui/icons-material';

// Store hooks
import { useQuerySubmission, useGermanSuggestions } from '@stores/queryStore';
import { useSelectedFile, useFileSelection } from '@stores/fileStore';
import { showErrorNotification, showInfoNotification } from '@stores/appStore';

// Types
import type { QueryIntentHint, QueryRequest } from '@types/api';
import type { GermanQuerySuggestion } from '@types/app';

const QueryForm: React.FC = () => {
  const { currentQuery, updateCurrentQuery, submitQuery, resetCurrentQuery } = useQuerySubmission();
  const suggestions = useGermanSuggestions();
  const selectedFile = useSelectedFile();
  const { files, selectFile } = useFileSelection();

  // Local state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<GermanQuerySuggestion[]>([]);

  // Filter suggestions based on query text
  useEffect(() => {
    if (currentQuery.text.trim().length > 2) {
      const filtered = suggestions.filter(suggestion =>
        suggestion.text.toLowerCase().includes(currentQuery.text.toLowerCase()) ||
        suggestion.description.toLowerCase().includes(currentQuery.text.toLowerCase())
      );
      setFilteredSuggestions(filtered);
    } else {
      setFilteredSuggestions(suggestions);
    }
  }, [currentQuery.text, suggestions]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    // Validation
    if (!currentQuery.text.trim()) {
      showErrorNotification('Bitte geben Sie eine Abfrage ein');
      return;
    }

    if (!selectedFile) {
      showErrorNotification('Bitte wählen Sie zuerst eine Datei aus');
      return;
    }

    setIsSubmitting(true);

    try {
      const request: QueryRequest = {
        query: currentQuery.text.trim(),
        file_id: selectedFile.file_id,
        intent_hint: currentQuery.intentHint || undefined,
        max_concurrent: currentQuery.maxConcurrent,
        timeout_seconds: currentQuery.timeoutSeconds,
        cache_results: currentQuery.cacheResults,
      };

      await submitQuery(request);
      resetCurrentQuery();
      showInfoNotification('Abfrage wurde erfolgreich gestartet. Sie können den Fortschritt auf der Ergebnisseite verfolgen.');
      
    } catch (error) {
      console.error('Query submission failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuggestionSelect = (suggestion: GermanQuerySuggestion) => {
    updateCurrentQuery({
      text: suggestion.text,
      intentHint: suggestion.category,
    });
    showInfoNotification(`Beispielabfrage ausgewählt: ${suggestion.category.toUpperCase()}`);
  };

  const intentHintOptions: { value: QueryIntentHint; label: string; description: string }[] = [
    { value: 'quantity', label: 'Mengen', description: 'Quantitative Analysen und Berechnungen' },
    { value: 'component', label: 'Bauteile', description: 'Identifikation von Gebäudekomponenten' },
    { value: 'material', label: 'Materialien', description: 'Materialanalyse und -eigenschaften' },
    { value: 'spatial', label: 'Räumlich', description: 'Räume, Stockwerke und räumliche Beziehungen' },
    { value: 'cost', label: 'Kosten', description: 'Kostenschätzungen und Budgetanalysen' },
    { value: 'general', label: 'Allgemein', description: 'Allgemeine Informationsabfragen' },
  ];

  return (
    <Card>
      <CardContent>
        <Box component="form" onSubmit={handleSubmit}>
          {/* File Selection */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <FileIcon sx={{ mr: 1 }} />
              Dateiauswahl
            </Typography>
            
            {files.length === 0 ? (
              <Alert severity="warning">
                Keine Dateien verfügbar. Bitte laden Sie zuerst eine IFC JSON-Datei hoch.
              </Alert>
            ) : (
              <Autocomplete
                value={selectedFile}
                onChange={(_, value) => selectFile(value?.file_id || null)}
                options={files}
                getOptionLabel={(option) => `${option.filename} (${(option.size / 1024 / 1024).toFixed(1)} MB)`}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Wählen Sie eine Datei für die Abfrage"
                    placeholder="Keine Datei ausgewählt"
                    required
                  />
                )}
                renderOption={(props, option) => (
                  <Box component="li" {...props}>
                    <Box>
                      <Typography variant="body1">{option.filename}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {(option.size / 1024 / 1024).toFixed(1)} MB • 
                        Hochgeladen: {new Date(option.upload_timestamp).toLocaleDateString('de-DE')}
                      </Typography>
                    </Box>
                  </Box>
                )}
              />
            )}
          </Box>

          {/* Query Input */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Ihre Abfrage
            </Typography>
            
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Stellen Sie Ihre Frage auf Deutsch"
              placeholder="z.B. 'Wie viel Kubikmeter Beton sind verbaut?' oder 'Welche Materialien werden in den Wänden verwendet?'"
              value={currentQuery.text}
              onChange={(e) => updateCurrentQuery({ text: e.target.value })}
              required
              disabled={isSubmitting}
              helperText="Formulieren Sie Ihre Frage in natürlicher deutscher Sprache. Das System erkennt automatisch die Absicht Ihrer Abfrage."
            />
          </Box>

          {/* Suggestions */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <SuggestionIcon sx={{ mr: 1 }} />
              Beispielabfragen
            </Typography>
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
              {filteredSuggestions.slice(0, 6).map((suggestion, index) => (
                <Chip
                  key={index}
                  label={suggestion.text}
                  variant="outlined"
                  clickable
                  onClick={() => handleSuggestionSelect(suggestion)}
                  disabled={isSubmitting}
                  sx={{
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                  }}
                />
              ))}
            </Box>
            
            <Typography variant="body2" color="text.secondary">
              Klicken Sie auf eine Beispielabfrage, um sie zu verwenden, oder erstellen Sie Ihre eigene Abfrage.
            </Typography>
          </Box>

          {/* Advanced Settings */}
          <Accordion expanded={showAdvanced} onChange={(_, expanded) => setShowAdvanced(expanded)}>
            <AccordionSummary expandIcon={<ExpandIcon />}>
              <Typography sx={{ display: 'flex', alignItems: 'center' }}>
                <AdvancedIcon sx={{ mr: 1 }} />
                Erweiterte Einstellungen
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Absichtshinweis (optional)</InputLabel>
                    <Select
                      value={currentQuery.intentHint || ''}
                      onChange={(e) => updateCurrentQuery({ 
                        intentHint: e.target.value as QueryIntentHint || null 
                      })}
                      disabled={isSubmitting}
                    >
                      <MenuItem value="">
                        <em>Automatische Erkennung</em>
                      </MenuItem>
                      {intentHintOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          <Box>
                            <Typography variant="body1">{option.label}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              {option.description}
                            </Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Max. gleichzeitige Verarbeitung"
                    value={currentQuery.maxConcurrent}
                    onChange={(e) => updateCurrentQuery({ 
                      maxConcurrent: parseInt(e.target.value) || 10 
                    })}
                    disabled={isSubmitting}
                    inputProps={{ min: 1, max: 50 }}
                    helperText="Anzahl der parallel verarbeiteten Chunks"
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Timeout (Sekunden)"
                    value={currentQuery.timeoutSeconds}
                    onChange={(e) => updateCurrentQuery({ 
                      timeoutSeconds: parseInt(e.target.value) || 300 
                    })}
                    disabled={isSubmitting}
                    inputProps={{ min: 30, max: 1800 }}
                    helperText="Maximale Verarbeitungszeit"
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={currentQuery.cacheResults}
                        onChange={(e) => updateCurrentQuery({ 
                          cacheResults: e.target.checked 
                        })}
                        disabled={isSubmitting}
                      />
                    }
                    label="Ergebnisse zwischenspeichern"
                  />
                  <Typography variant="body2" color="text.secondary">
                    Ähnliche Abfragen werden schneller verarbeitet
                  </Typography>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>

          {/* Submit Button */}
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            {isSubmitting && (
              <Box sx={{ mb: 2 }}>
                <LinearProgress />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Abfrage wird gestartet...
                </Typography>
              </Box>
            )}
            
            <Button
              type="submit"
              variant="contained"
              size="large"
              startIcon={<QueryIcon />}
              disabled={isSubmitting || !selectedFile || !currentQuery.text.trim()}
              sx={{ minWidth: 200 }}
            >
              {isSubmitting ? 'Wird gestartet...' : 'Abfrage starten'}
            </Button>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default QueryForm;