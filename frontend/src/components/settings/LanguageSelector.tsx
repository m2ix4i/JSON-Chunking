/**
 * Language selector component for user settings.
 * Allows switching between German and English.
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
  Language as LanguageIcon,
  Public as PublicIcon,
} from '@mui/icons-material';
import { useSettingsStore } from '@/stores';
import { getBrowserLanguage } from '@/services/preferences';

interface LanguageOption {
  value: 'de' | 'en';
  label: string;
  nativeLabel: string;
  description: string;
  flag: string;
}

const LanguageSelector: React.FC = () => {
  const { language, updateLanguage } = useSettingsStore();
  const browserLanguage = getBrowserLanguage();

  const languageOptions: LanguageOption[] = [
    {
      value: 'de',
      label: 'Deutsch',
      nativeLabel: 'Deutsch',
      description: 'Deutsche Benutzeroberfläche und Inhalte',
      flag: '🇩🇪',
    },
    {
      value: 'en',
      label: 'English',
      nativeLabel: 'English',
      description: 'English user interface and content',
      flag: '🇺🇸',
    },
  ];

  const handleLanguageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newLanguage = event.target.value as 'de' | 'en';
    updateLanguage(newLanguage);
  };

  return (
    <Paper elevation={0} sx={{ p: 3, border: 1, borderColor: 'divider' }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" component="h3" gutterBottom>
          <LanguageIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Sprache / Language
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {language === 'de' 
            ? 'Wählen Sie Ihre bevorzugte Sprache für die Benutzeroberfläche.'
            : 'Choose your preferred language for the user interface.'
          }
        </Typography>
      </Box>

      <FormControl component="fieldset" fullWidth>
        <FormLabel component="legend" sx={{ mb: 2 }}>
          {language === 'de' ? 'Sprache auswählen' : 'Select Language'}
        </FormLabel>
        <RadioGroup
          value={language}
          onChange={handleLanguageChange}
          aria-label="language-selection"
        >
          {languageOptions.map((option) => (
            <Box key={option.value} sx={{ mb: 2 }}>
              <FormControlLabel
                value={option.value}
                control={<Radio />}
                label={
                  <Box sx={{ ml: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Typography variant="h6" component="span">
                        {option.flag}
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {option.nativeLabel}
                      </Typography>
                      {option.value === browserLanguage && (
                        <Chip
                          size="small"
                          label={language === 'de' ? 'Browser-Standard' : 'Browser Default'}
                          color="info"
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
                  borderColor: language === option.value ? 'primary.main' : 'divider',
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
          <PublicIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
          {language === 'de' ? 'Sprachinfo' : 'Language Info'}
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Typography variant="body2">
            {language === 'de' 
              ? `Aktuelle Sprache: ${languageOptions.find(opt => opt.value === language)?.nativeLabel}`
              : `Current Language: ${languageOptions.find(opt => opt.value === language)?.nativeLabel}`
            }
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {language === 'de' 
              ? 'Die Sprachänderung wird sofort angewendet.'
              : 'Language changes are applied immediately.'
            }
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
};

export default LanguageSelector;