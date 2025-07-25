/**
 * Query creation page with comprehensive error handling and validation.
 */

import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Alert,
  AlertTitle,
  Button,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Send as SendIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

// Components
import QueryForm from '@components/query/QueryForm';
import QuerySuggestions from '@components/query/QuerySuggestions';
import FormErrorSummary from '@components/forms/FormErrorSummary';
import ErrorAlert from '@components/error/ErrorAlert';

// Store hooks
import { useSelectedFile } from '@stores/fileStore';
import { useCurrentQuery, useQueryActions } from '@stores/queryStore';
import { useErrorHandler } from '@hooks/useErrorHandler';

// Utils
import { extractValidationErrors, type ValidationError } from '@utils/errorUtils';

const QueryPage: React.FC = () => {
  const navigate = useNavigate();
  const selectedFile = useSelectedFile();
  const { currentQuery, updateCurrentQuery } = useCurrentQuery();
  const { submitQuery } = useQueryActions();
  
  const [validationErrors, setValidationErrors] = React.useState<ValidationError[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const {
    error,
    isRetrying,
    handleError,
    retry,
    clearError,
    canRetry,
  } = useErrorHandler(
    async () => {
      if (selectedFile && currentQuery.text.trim()) {
        await handleSubmit();
      }
    },
    { context: 'Query submission' }
  );

  const validateForm = (): ValidationError[] => {
    const errors: ValidationError[] = [];

    if (!selectedFile) {
      errors.push({
        field: 'file',
        message: 'Bitte wählen Sie eine Datei aus',
        severity: 'error',
      });
    }

    if (!currentQuery.text.trim()) {
      errors.push({
        field: 'query',
        message: 'Bitte geben Sie eine Abfrage ein',
        severity: 'error',
      });
    } else if (currentQuery.text.length > 1000) {
      errors.push({
        field: 'query',
        message: 'Abfrage ist zu lang (maximal 1000 Zeichen)',
        severity: 'error',
      });
    }

    if (currentQuery.maxConcurrent < 1 || currentQuery.maxConcurrent > 10) {
      errors.push({
        field: 'maxConcurrent',
        message: 'Wert muss zwischen 1 und 10 liegen',
        severity: 'error',
      });
    }

    if (currentQuery.timeoutSeconds < 30 || currentQuery.timeoutSeconds > 600) {
      errors.push({
        field: 'timeoutSeconds',
        message: 'Zeitlimit muss zwischen 30 und 600 Sekunden liegen',
        severity: 'error',
      });
    }

    return errors;
  };

  const handleSubmit = async () => {
    try {
      // Clear previous errors
      clearError();
      setValidationErrors([]);

      // Validate form
      const errors = validateForm();
      if (errors.length > 0) {
        setValidationErrors(errors);
        return;
      }

      setIsSubmitting(true);

      // Submit query
      const queryId = await submitQuery({
        query: currentQuery.text.trim(),
        file_id: selectedFile!.file_id,
        intent_hint: currentQuery.intentHint,
        max_concurrent: currentQuery.maxConcurrent,
        timeout_seconds: currentQuery.timeoutSeconds,
        cache_results: currentQuery.cacheResults,
      });

      // Navigate to results page
      navigate(`/results/${queryId}`);

    } catch (submitError) {
      const normalizedError = handleError(submitError);
      
      // Try to extract validation errors from server response
      if (normalizedError && normalizedError.type === 'validation') {
        const serverValidationErrors = extractValidationErrors(normalizedError);
        if (serverValidationErrors.length > 0) {
          setValidationErrors(serverValidationErrors);
          return;
        }
      }

    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuggestionSelect = (suggestion: any) => {
    updateCurrentQuery({
      text: suggestion.query,
      intentHint: suggestion.intent,
    });
  };

  const handleFieldFocus = (fieldName: string) => {
    // Scroll to and focus the specific field
    const fieldElement = document.querySelector(`[name="${fieldName}"], #${fieldName}`) as HTMLElement;
    if (fieldElement) {
      fieldElement.focus();
      fieldElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const steps = [
    'Datei auswählen',
    'Abfrage erstellen',
    'Ergebnisse anzeigen',
  ];

  const currentStep = !selectedFile ? 0 : 1;

  return (
    <Box>
      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Neue Abfrage erstellen
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Stellen Sie Fragen zu Ihren IFC-Daten und erhalten Sie detaillierte Antworten.
        </Typography>
      </Box>

      {/* Progress Stepper */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stepper activeStep={currentStep} alternativeLabel>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </CardContent>
      </Card>

      {/* File Selection Alert */}
      {!selectedFile && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <AlertTitle>Keine Datei ausgewählt</AlertTitle>
          Bitte gehen Sie zur Upload-Seite und wählen Sie eine Datei aus, bevor Sie eine Abfrage erstellen.
          <Box sx={{ mt: 1 }}>
            <Button
              variant="outlined"
              startIcon={<BackIcon />}
              onClick={() => navigate('/upload')}
            >
              Zur Upload-Seite
            </Button>
          </Box>
        </Alert>
      )}

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <FormErrorSummary
          errors={validationErrors}
          onFieldFocus={handleFieldFocus}
          sx={{ mb: 3 }}
        />
      )}

      {/* Submit Error */}
      {error && (
        <ErrorAlert
          title="Abfrage-Fehler"
          message={error.message}
          details={error.details}
          errorCode={error.code}
          onClose={clearError}
          onRetry={canRetry ? retry : undefined}
          retryLabel={isRetrying ? 'Wird wiederholt...' : 'Erneut versuchen'}
          collapsible
          sx={{ mb: 3 }}
        />
      )}

      <Grid container spacing={3}>
        {/* Query Form */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Abfrage-Formular
              </Typography>
              
              <QueryForm
                disabled={!selectedFile || isSubmitting}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
                validationErrors={validationErrors}
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Suggestions Sidebar */}
        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Beispiel-Abfragen
              </Typography>
              
              <QuerySuggestions
                onSuggestionSelect={handleSuggestionSelect}
                disabled={!selectedFile || isSubmitting}
              />
            </CardContent>
          </Card>
          
          {/* Current File Info */}
          {selectedFile && (
            <Card sx={{ mt: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Ausgewählte Datei
                </Typography>
                
                <Typography variant="body2" gutterBottom>
                  <strong>Name:</strong> {selectedFile.filename}
                </Typography>
                
                <Typography variant="body2" gutterBottom>
                  <strong>Größe:</strong> {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                </Typography>
                
                <Typography variant="body2" gutterBottom>
                  <strong>Status:</strong> {
                    selectedFile.status === 'ready' ? 'Bereit' :
                    selectedFile.status === 'processing' ? 'Wird verarbeitet...' :
                    selectedFile.status === 'error' ? 'Fehler' :
                    'Unbekannt'
                  }
                </Typography>

                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => navigate('/upload')}
                  sx={{ mt: 1 }}
                >
                  Andere Datei wählen
                </Button>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

export default QueryPage;