/**
 * History page - query history display and management.
 * Displays all previous queries with search, filtering, and management capabilities.
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  InputAdornment,
  Paper,
} from '@mui/material';
import { Search as SearchIcon, FilterList as FilterIcon } from '@mui/icons-material';
import QueryHistoryList from '@/components/history/QueryHistoryList';

const HistoryPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  return (
    <Box>
      {/* Page header */}
      <Typography variant="h4" component="h1" gutterBottom>
        Verlauf
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Überblick über alle Ihre bisherigen Abfragen und Ergebnisse.
      </Typography>

      {/* Search and filter controls */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          {/* Search input */}
          <TextField
            placeholder="Abfragen durchsuchen..."
            variant="outlined"
            size="medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            }}
            sx={{ flex: 1 }}
          />

          {/* Status filter */}
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel id="status-filter-label">Status Filter</InputLabel>
            <Select
              labelId="status-filter-label"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              label="Status Filter"
              startAdornment={
                <InputAdornment position="start">
                  <FilterIcon color="action" />
                </InputAdornment>
              }
            >
              <MenuItem value="">Alle Status</MenuItem>
              <MenuItem value="completed">Erfolgreich</MenuItem>
              <MenuItem value="failed">Fehlgeschlagen</MenuItem>
              <MenuItem value="processing">In Bearbeitung</MenuItem>
              <MenuItem value="cancelled">Abgebrochen</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      {/* Query history list */}
      <QueryHistoryList 
        searchTerm={searchTerm}
        statusFilter={statusFilter || null}
      />
    </Box>
  );
};

export default HistoryPage;