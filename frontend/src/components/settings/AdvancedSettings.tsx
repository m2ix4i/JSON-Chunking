/**
 * Advanced settings component for user settings.
 * Allows configuring developer and advanced user options.
 */

import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Switch,
  FormControl,
  FormControlLabel,
  FormGroup,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
} from '@mui/material';
import {
  Code as CodeIcon,
  Memory as MemoryIcon,
  Speed as SpeedIcon,
  Warning as WarningIcon,
  RestartAlt as ResetIcon,
  Download as ExportIcon,
  Upload as ImportIcon,
} from '@mui/icons-material';
import { useSettingsStore } from '@/stores';
import { downloadSettings, generateExportFilename } from '@/services/preferences';

interface AdvancedOption {
  key: keyof typeof defaultAdvanced;
  label: string;
  description: string;
  icon: React.ReactNode;
  warning?: string;
}

const defaultAdvanced = {
  showDebugInfo: false,
  showTokenUsage: false,
  enableProfiling: false,
};

const AdvancedSettings: React.FC = () => {
  const { advanced, updateAdvanced, exportSettings, resetToDefaults } = useSettingsStore();
  const [resetDialogOpen, setResetDialogOpen] = React.useState(false);
  const [importDialogOpen, setImportDialogOpen] = React.useState(false);

  const advancedOptions: AdvancedOption[] = [
    {
      key: 'showDebugInfo',
      label: 'Debug-Informationen anzeigen',
      description: 'Zeigt technische Details und Debugging-Informationen in der Benutzeroberfläche',
      icon: <CodeIcon />,
    },
    {
      key: 'showTokenUsage',
      label: 'Token-Verbrauch anzeigen',
      description: 'Zeigt den geschätzten Token-Verbrauch für Abfragen und Verarbeitungsschritte',
      icon: <MemoryIcon />,
    },
    {
      key: 'enableProfiling',
      label: 'Performance-Profiling aktivieren',
      description: 'Aktiviert detaillierte Performance-Messungen für Optimierungszwecke',
      icon: <SpeedIcon />,
      warning: 'Kann die Anwendungsleistung beeinträchtigen',
    },
  ];

  const handleAdvancedChange = (key: keyof typeof advanced) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    updateAdvanced({ [key]: event.target.checked });
  };

  const handleExportSettings = () => {
    const settingsJson = exportSettings();
    const filename = generateExportFilename();
    downloadSettings(settingsJson, filename);
  };

  const handleImportSettings = () => {
    setImportDialogOpen(true);
  };

  const handleResetSettings = () => {
    setResetDialogOpen(true);
  };

  const confirmReset = () => {
    resetToDefaults();
    setResetDialogOpen(false);
  };

  const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const settingsJson = e.target?.result as string;
        // Here you would call importSettings from the store
        // For now, we'll just close the dialog
        setImportDialogOpen(false);
      } catch (error) {
        console.error('Failed to import settings:', error);
      }
    };
    reader.readAsText(file);
  };

  const enabledCount = Object.values(advanced).filter(Boolean).length;
  const hasWarnings = advancedOptions.some(opt => advanced[opt.key] && opt.warning);

  return (
    <Paper elevation={0} sx={{ p: 3, border: 1, borderColor: 'divider' }}>
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <CodeIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6" component="h3">
            Erweiterte Einstellungen
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          Einstellungen für Entwickler und erfahrene Benutzer.
        </Typography>
      </Box>

      {/* Summary */}
      <Box sx={{ mb: 3, p: 2, backgroundColor: 'background.default', borderRadius: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Status:
          </Typography>
          <Chip
            size="small"
            label={`${enabledCount} erweiterte Features aktiviert`}
            color={enabledCount === 0 ? 'default' : 'primary'}
            variant="outlined"
          />
          {hasWarnings && (
            <Chip
              size="small"
              label="Performance-Warnung"
              color="warning"
              variant="outlined"
              icon={<WarningIcon fontSize="small" />}
            />
          )}
        </Box>
      </Box>

      {/* Advanced Options */}
      <FormControl component="fieldset" variant="standard" fullWidth>
        <FormGroup>
          <List disablePadding>
            {advancedOptions.map((option) => (
              <ListItem key={option.key} sx={{ px: 0, py: 1 }}>
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <Box sx={{ color: 'primary.main' }}>
                    {option.icon}
                  </Box>
                </ListItemIcon>
                <ListItemText
                  primary={
                    <FormControlLabel
                      control={
                        <Switch
                          checked={advanced[option.key]}
                          onChange={handleAdvancedChange(option.key)}
                          color="primary"
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body1" fontWeight="medium">
                            {option.label}
                          </Typography>
                          {option.warning && advanced[option.key] && (
                            <Chip
                              size="small"
                              label={option.warning}
                              color="warning"
                              variant="outlined"
                              sx={{ ml: 1 }}
                            />
                          )}
                        </Box>
                      }
                      sx={{ m: 0 }}
                    />
                  }
                  secondary={
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {option.description}
                    </Typography>
                  }
                />
              </ListItem>
            ))}
          </List>
        </FormGroup>
      </FormControl>

      <Divider sx={{ my: 3 }} />

      {/* Settings Management */}
      <Box>
        <Typography variant="h6" component="h4" gutterBottom>
          Einstellungen verwalten
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Import, Export und Zurücksetzen Ihrer Einstellungen.
        </Typography>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<ExportIcon />}
            onClick={handleExportSettings}
          >
            Exportieren
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<ImportIcon />}
            onClick={handleImportSettings}
          >
            Importieren
          </Button>
          
          <Button
            variant="outlined"
            color="warning"
            startIcon={<ResetIcon />}
            onClick={handleResetSettings}
          >
            Zurücksetzen
          </Button>
        </Box>
      </Box>

      {/* Reset Confirmation Dialog */}
      <Dialog
        open={resetDialogOpen}
        onClose={() => setResetDialogOpen(false)}
        aria-labelledby="reset-dialog-title"
      >
        <DialogTitle id="reset-dialog-title">
          Einstellungen zurücksetzen
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Sind Sie sicher, dass Sie alle Einstellungen auf die Standardwerte zurücksetzen möchten?
            Diese Aktion kann nicht rückgängig gemacht werden.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetDialogOpen(false)}>
            Abbrechen
          </Button>
          <Button onClick={confirmReset} color="warning" variant="contained">
            Zurücksetzen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Import Dialog */}
      <Dialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        aria-labelledby="import-dialog-title"
      >
        <DialogTitle id="import-dialog-title">
          Einstellungen importieren
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Wählen Sie eine JSON-Datei mit exportierten Einstellungen aus.
          </DialogContentText>
          <input
            type="file"
            accept=".json"
            onChange={handleFileInput}
            style={{ width: '100%' }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialogOpen(false)}>
            Abbrechen
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default AdvancedSettings;