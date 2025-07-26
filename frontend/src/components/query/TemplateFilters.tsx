/**
 * Template filters component - handles search and filter UI.
 * Single responsibility: Filter interface only.
 */

import React from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  IconButton,
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';

import { templateCategories } from '@/data/queryTemplates';

interface TemplateFiltersProps {
  searchTerm: string;
  selectedCategory: string;
  selectedDifficulty: string;
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onDifficultyChange: (value: string) => void;
  compact?: boolean;
}

const TemplateFilters: React.FC<TemplateFiltersProps> = ({
  searchTerm,
  selectedCategory,
  selectedDifficulty,
  onSearchChange,
  onCategoryChange,
  onDifficultyChange,
  compact = false,
}) => {
  if (compact) {
    return (
      <TextField
        fullWidth
        size="small"
        placeholder="Templates suchen..."
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
          endAdornment: searchTerm && (
            <InputAdornment position="end">
              <IconButton size="small" onClick={() => onSearchChange('')}>
                <ClearIcon />
              </IconButton>
            </InputAdornment>
          ),
        }}
        sx={{ mb: 2 }}
      />
    );
  }

  return (
    <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
      <TextField
        placeholder="Templates suchen..."
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
        sx={{ flexGrow: 1, minWidth: 200 }}
      />
      
      <FormControl sx={{ minWidth: 120 }}>
        <InputLabel>Kategorie</InputLabel>
        <Select
          value={selectedCategory}
          onChange={(e) => onCategoryChange(e.target.value)}
          label="Kategorie"
        >
          <MenuItem value="all">Alle</MenuItem>
          {templateCategories.map((category) => (
            <MenuItem key={category.id} value={category.id}>
              {category.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      
      <FormControl sx={{ minWidth: 120 }}>
        <InputLabel>Schwierigkeit</InputLabel>
        <Select
          value={selectedDifficulty}
          onChange={(e) => onDifficultyChange(e.target.value)}
          label="Schwierigkeit"
        >
          <MenuItem value="all">Alle</MenuItem>
          <MenuItem value="beginner">Einfach</MenuItem>
          <MenuItem value="intermediate">Mittel</MenuItem>
          <MenuItem value="advanced">Fortgeschritten</MenuItem>
        </Select>
      </FormControl>
    </Box>
  );
};

export default TemplateFilters;