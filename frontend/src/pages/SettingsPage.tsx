/**
 * Settings page - application settings and preferences.
 * Comprehensive user settings and configuration interface.
 */

import React, { useEffect } from 'react';
import {
  Box,
  Typography,
  Container,
  Grid,
  Alert,
  Chip,
  Fade,
  Divider,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  CheckCircle as SuccessIcon,
} from '@mui/icons-material';
import { initializeSettings, useLanguage } from '@/stores';
import { isStorageAvailable } from '@/services/preferences';

// Import all settings components
import ThemeSelector from '@/components/settings/ThemeSelector';
import LanguageSelector from '@/components/settings/LanguageSelector';
import QueryDefaults from '@/components/settings/QueryDefaults';
import NotificationSettings from '@/components/settings/NotificationSettings';
import AdvancedSettings from '@/components/settings/AdvancedSettings';

const SettingsPage: React.FC = () => {
  const language = useLanguage();
  const [storageAvailable, setStorageAvailable] = React.useState(true);

  // Initialize settings on component mount
  useEffect(() => {
    initializeSettings();
    setStorageAvailable(isStorageAvailable());
  }, []);

  const sections = [
    {
      id: 'appearance',
      title: language === 'de' ? 'Erscheinungsbild' : 'Appearance',
      description: language === 'de' 
        ? 'Design-Modus und Sprach-Einstellungen' 
        : 'Theme and language settings',
      components: [ThemeSelector, LanguageSelector],
    },
    {
      id: 'query',
      title: language === 'de' ? 'Abfrage-Einstellungen' : 'Query Settings',
      description: language === 'de' 
        ? 'Standard-Parameter für Abfragen' 
        : 'Default parameters for queries',
      components: [QueryDefaults],
    },
    {
      id: 'notifications',
      title: language === 'de' ? 'Benachrichtigungen' : 'Notifications',
      description: language === 'de' 
        ? 'Benachrichtigungs-Präferenzen' 
        : 'Notification preferences',
      components: [NotificationSettings],
    },
    {
      id: 'advanced',
      title: language === 'de' ? 'Erweitert' : 'Advanced',
      description: language === 'de' 
        ? 'Entwickler-Optionen und Einstellungen-Verwaltung' 
        : 'Developer options and settings management',
      components: [AdvancedSettings],
    },
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <SettingsIcon sx={{ fontSize: 32, color: 'primary.main', mr: 2 }} />
          <Typography variant="h4" component="h1">
            {language === 'de' ? 'Einstellungen' : 'Settings'}
          </Typography>
          <Chip
            icon={<SuccessIcon />}
            label={language === 'de' ? 'Aktiv' : 'Active'}
            color="success"
            variant="outlined"
            size="small"
            sx={{ ml: 2 }}
          />
        </Box>
        <Typography variant="body1" color="text.secondary">
          {language === 'de' 
            ? 'Konfigurieren Sie Ihre Präferenzen und Anwendungseinstellungen.'
            : 'Configure your preferences and application settings.'
          }
        </Typography>
      </Box>

      {/* Storage warning */}
      {!storageAvailable && (
        <Alert severity="warning" sx={{ mb: 4 }}>
          <Typography variant="body2">
            {language === 'de' 
              ? 'LocalStorage ist nicht verfügbar. Einstellungen werden nicht gespeichert.'
              : 'LocalStorage is not available. Settings will not be persisted.'
            }
          </Typography>
        </Alert>
      )}

      {/* Settings sections */}
      <Box sx={{ mb: 4 }}>
        {sections.map((section, sectionIndex) => (
          <Fade in={true} timeout={300 + sectionIndex * 200} key={section.id}>
            <Box sx={{ mb: 6 }}>
              {/* Section header */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h5" component="h2" gutterBottom>
                  {section.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {section.description}
                </Typography>
                {sectionIndex < sections.length - 1 && (
                  <Divider sx={{ mt: 2 }} />
                )}
              </Box>

              {/* Section components */}
              <Grid container spacing={3}>
                {section.components.map((Component, componentIndex) => (
                  <Grid item xs={12} key={`${section.id}-${componentIndex}`}>
                    <Fade in={true} timeout={500 + componentIndex * 150}>
                      <Box>
                        <Component />
                      </Box>
                    </Fade>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Fade>
        ))}
      </Box>

      {/* Footer */}
      <Box 
        sx={{ 
          mt: 6, 
          pt: 3, 
          borderTop: 1, 
          borderColor: 'divider',
          textAlign: 'center',
        }}
      >
        <Typography variant="body2" color="text.secondary">
          {language === 'de' 
            ? 'Einstellungen werden automatisch gespeichert und sofort angewendet.'
            : 'Settings are automatically saved and applied immediately.'
          }
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          {language === 'de' 
            ? 'IFC JSON Chunking Tool - Benutzereinstellungen'
            : 'IFC JSON Chunking Tool - User Settings'
          }
        </Typography>
      </Box>
    </Container>
  );
};

export default SettingsPage;