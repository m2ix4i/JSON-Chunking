/**
 * Query defaults component for user settings.
 * Allows configuring default query parameters.
 */

import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Slider,
  Switch,
  FormControl,
  FormControlLabel,
  FormGroup,
  Grid,
  Chip,
  Alert,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  Timer as TimerIcon,
  Speed as SpeedIcon,
  Memory as CacheIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { useSettingsStore } from '@/stores';
import { validateSettings } from '@/services/preferences';

const QueryDefaults: React.FC = () => {
  const { defaultQuerySettings, updateQueryDefaults } = useSettingsStore();
  const { maxConcurrent, timeoutSeconds, cacheResults } = defaultQuerySettings;

  const validation = validateSettings({ defaultQuerySettings });

  const handleMaxConcurrentChange = (_event: Event, value: number | number[]) => {
    const newValue = Array.isArray(value) ? value[0] : value;
    updateQueryDefaults({ maxConcurrent: newValue });
  };

  const handleTimeoutChange = (_event: Event, value: number | number[]) => {
    const newValue = Array.isArray(value) ? value[0] : value;
    updateQueryDefaults({ timeoutSeconds: newValue });
  };

  const handleCacheChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    updateQueryDefaults({ cacheResults: event.target.checked });
  };

  const formatTimeoutLabel = (value: number) => {
    if (value < 60) {
      return `${value}s`;
    }
    const minutes = Math.floor(value / 60);
    const seconds = value % 60;
    return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
  };

  const getPerformanceLevel = (concurrent: number, timeout: number): string => {
    if (concurrent >= 5 && timeout >= 60) return 'Hoch';
    if (concurrent >= 3 && timeout >= 30) return 'Mittel';
    return 'Niedrig';
  };

  const performanceLevel = getPerformanceLevel(maxConcurrent, timeoutSeconds);

  return (
    <Paper elevation={0} sx={{ p: 3, border: 1, borderColor: 'divider' }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" component="h3" gutterBottom>
          Query-Standardeinstellungen
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Konfigurieren Sie die Standard-Parameter für neue Abfragen.
        </Typography>
      </Box>

      {/* Validation alerts */}
      {!validation.isValid && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="body2" component="div">
            {validation.errors.map((error, index) => (
              <div key={index}>• {error}</div>
            ))}
          </Typography>
        </Alert>
      )}

      {validation.warnings.length > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="body2" component="div">
            {validation.warnings.map((warning, index) => (
              <div key={index}>• {warning}</div>
            ))}
          </Typography>
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Max Concurrent Requests */}
        <Grid item xs={12} md={6}>
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <SpeedIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="body1" fontWeight="medium">
                Gleichzeitige Anfragen
              </Typography>
              <Tooltip title="Höhere Werte können die Verarbeitung beschleunigen, aber auch die Serverlast erhöhen.">
                <IconButton size="small" sx={{ ml: 0.5 }}>
                  <InfoIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
            <Box sx={{ px: 2 }}>
              <Slider
                value={maxConcurrent}
                onChange={handleMaxConcurrentChange}
                min={1}
                max={10}
                step={1}
                marks
                valueLabelDisplay="auto"
                aria-label="max-concurrent-requests"
                color="primary"
              />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
              <Typography variant="caption" color="text.secondary">
                1 (Langsam)
              </Typography>
              <Typography variant="caption" color="text.secondary">
                10 (Schnell)
              </Typography>
            </Box>
          </Box>
        </Grid>

        {/* Timeout */}
        <Grid item xs={12} md={6}>
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <TimerIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="body1" fontWeight="medium">
                Timeout ({formatTimeoutLabel(timeoutSeconds)})
              </Typography>
              <Tooltip title="Zeit in Sekunden, nach der eine Abfrage abgebrochen wird.">
                <IconButton size="small" sx={{ ml: 0.5 }}>
                  <InfoIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
            <Box sx={{ px: 2 }}>
              <Slider
                value={timeoutSeconds}
                onChange={handleTimeoutChange}
                min={5}
                max={300}
                step={5}
                valueLabelDisplay="auto"
                valueLabelFormat={formatTimeoutLabel}
                aria-label="timeout-seconds"
                color="primary"
              />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
              <Typography variant="caption" color="text.secondary">
                5s (Kurz)
              </Typography>
              <Typography variant="caption" color="text.secondary">
                5m (Lang)
              </Typography>
            </Box>
          </Box>
        </Grid>

        {/* Cache Results */}
        <Grid item xs={12}>
          <FormControl component="fieldset" variant="standard">
            <FormGroup>
              <FormControlLabel
                control={
                  <Switch
                    checked={cacheResults}
                    onChange={handleCacheChange}
                    color="primary"
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <CacheIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="body1" fontWeight="medium">
                      Ergebnisse zwischenspeichern
                    </Typography>
                  </Box>
                }
              />
            </FormGroup>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, ml: 4 }}>
              Aktiviert das Caching von Abfrageergebnissen für bessere Performance bei wiederholten Anfragen.
            </Typography>
          </FormControl>
        </Grid>
      </Grid>

      {/* Performance Summary */}
      <Box sx={{ mt: 4, p: 2, backgroundColor: 'background.default', borderRadius: 1 }}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Performance-Einstellung
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Chip
            label={`${performanceLevel} Performance`}
            color={performanceLevel === 'Hoch' ? 'success' : performanceLevel === 'Mittel' ? 'warning' : 'default'}
            variant="outlined"
          />
          <Typography variant="body2">
            {maxConcurrent} gleichzeitige Anfragen, {formatTimeoutLabel(timeoutSeconds)} Timeout
            {cacheResults && ', Caching aktiviert'}
          </Typography>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          Diese Einstellungen werden als Standard für neue Abfragen verwendet.
        </Typography>
      </Box>
    </Paper>
  );
};

export default QueryDefaults;