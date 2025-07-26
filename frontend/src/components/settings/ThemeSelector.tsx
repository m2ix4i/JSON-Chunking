/**
 * Theme selector component for user settings.
 * Allows switching between light, dark, and auto themes.
 */

import React from 'react';
import {
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Box,
  Typography,
  Paper,
  Chip,
} from '@mui/material';
import {
  LightMode as LightModeIcon,
  DarkMode as DarkModeIcon,
  SettingsBrightness as AutoModeIcon,
} from '@mui/icons-material';
import { useSettingsStore } from '@/stores';
import { getSystemTheme, supportsSystemTheme } from '@/services/preferences';

interface ThemeOption {
  value: 'light' | 'dark' | 'auto';
  label: string;
  description: string;
  icon: React.ReactNode;
}

const ThemeSelector: React.FC = () => {
  const { theme, updateTheme } = useSettingsStore();
  const systemTheme = supportsSystemTheme() ? getSystemTheme() : 'light';

  const themeOptions: ThemeOption[] = [
    {
      value: 'light',
      label: 'Helles Design',
      description: 'Helle Farben für bessere Sichtbarkeit bei Tageslicht',
      icon: <LightModeIcon />,
    },
    {
      value: 'dark',
      label: 'Dunkles Design',
      description: 'Dunkle Farben schonen die Augen bei wenig Licht',
      icon: <DarkModeIcon />,
    },
    {
      value: 'auto',
      label: 'Automatisch',
      description: `Folgt der Systemeinstellung${supportsSystemTheme() ? ` (aktuell: ${systemTheme === 'dark' ? 'dunkel' : 'hell'})` : ''}`,
      icon: <AutoModeIcon />,
    },
  ];

  const handleThemeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newTheme = event.target.value as 'light' | 'dark' | 'auto';
    updateTheme(newTheme);
  };

  return (
    <Paper elevation={0} sx={{ p: 3, border: 1, borderColor: 'divider' }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" component="h3" gutterBottom>
          Design-Modus
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Wählen Sie das bevorzugte Farbschema für die Anwendung.
        </Typography>
      </Box>

      <FormControl component="fieldset" fullWidth>
        <FormLabel component="legend" sx={{ mb: 2 }}>
          Farbschema
        </FormLabel>
        <RadioGroup
          value={theme}
          onChange={handleThemeChange}
          aria-label="theme-selection"
        >
          {themeOptions.map((option) => (
            <Box key={option.value} sx={{ mb: 2 }}>
              <FormControlLabel
                value={option.value}
                control={<Radio />}
                label={
                  <Box sx={{ ml: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      {option.icon}
                      <Typography variant="body1" fontWeight="medium">
                        {option.label}
                      </Typography>
                      {option.value === 'auto' && !supportsSystemTheme() && (
                        <Chip
                          size="small"
                          label="Nicht unterstützt"
                          color="warning"
                          variant="outlined"
                        />
                      )}
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {option.description}
                    </Typography>
                  </Box>
                }
                sx={{
                  m: 0,
                  p: 1.5,
                  border: 1,
                  borderColor: theme === option.value ? 'primary.main' : 'divider',
                  borderRadius: 1,
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  },
                  transition: 'all 0.2s ease-in-out',
                }}
              />
            </Box>
          ))}
        </RadioGroup>
      </FormControl>

      {/* Preview section */}
      <Box sx={{ mt: 3, p: 2, backgroundColor: 'background.default', borderRadius: 1 }}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Vorschau
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Box
            sx={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              backgroundColor: 'primary.main',
            }}
          />
          <Box
            sx={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              backgroundColor: 'secondary.main',
            }}
          />
          <Box
            sx={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              backgroundColor: 'text.primary',
            }}
          />
          <Typography variant="body2" sx={{ ml: 1 }}>
            Aktuelles Farbschema: {theme === 'auto' ? `Automatisch (${systemTheme === 'dark' ? 'Dunkel' : 'Hell'})` : theme === 'dark' ? 'Dunkel' : 'Hell'}
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
};

export default ThemeSelector;