/**
 * Query form component with validation and error handling.
 * Enhanced with query preview functionality.
 */

import React, { useState } from 'react';
import { 
  Box, 
  TextField, 
  Button, 
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Typography
} from '@mui/material';

// Store hooks
import { useQueryStore } from '@stores/queryStore';
import { useSelectedFile } from '@stores/fileStore';

// Components
import QueryPreview from './QueryPreview';

export interface QueryFormProps {
  disabled?: boolean;
  onSubmit?: () => void;
  isSubmitting?: boolean;
  validationErrors?: any[];
}

const QueryForm: React.FC<QueryFormProps> = ({
  disabled = false,
  onSubmit,
  isSubmitting = false,
  validationErrors = [],
}) => {
  const { currentQuery, updateCurrentQuery } = useQueryStore();
  const selectedFile = useSelectedFile();
  const [localQuery, setLocalQuery] = useState(currentQuery.text);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateCurrentQuery({ text: localQuery });
    onSubmit?.();
  };

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setLocalQuery(newQuery);
    // Update store immediately for preview generation
    updateCurrentQuery({ text: newQuery });
  };

  const handleIntentChange = (e: any) => {
    updateCurrentQuery({ intentHint: e.target.value });
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ p: 2 }}>
      <TextField
        fullWidth
        label="Enter your query"
        value={localQuery}
        onChange={handleQueryChange}
        disabled={disabled || isSubmitting}
        multiline
        rows={3}
        margin="normal"
        variant="outlined"
      />

      <FormControl fullWidth margin="normal">
        <InputLabel>Query Intent (optional)</InputLabel>
        <Select
          value={currentQuery.intentHint || ''}
          onChange={handleIntentChange}
          disabled={disabled || isSubmitting}
          label="Query Intent (optional)"
        >
          <MenuItem value="">Auto-detect</MenuItem>
          <MenuItem value="quantity">Quantity</MenuItem>
          <MenuItem value="component">Component</MenuItem>
          <MenuItem value="material">Material</MenuItem>
          <MenuItem value="spatial">Spatial</MenuItem>
          <MenuItem value="cost">Cost</MenuItem>
        </Select>
      </FormControl>

      <Box sx={{ mt: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
        <Button 
          type="submit" 
          variant="contained" 
          disabled={disabled || isSubmitting || !localQuery.trim()}
          startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
        >
          {isSubmitting ? 'Processing...' : 'Submit Query'}
        </Button>
        
        {validationErrors.length > 0 && (
          <Typography color="error" variant="body2">
            Please fix validation errors
          </Typography>
        )}
      </Box>

      {/* Query Preview - shows when user types */}
      {localQuery.trim() && (
        <QueryPreview
          queryText={localQuery}
          fileId={selectedFile?.file_id}
        />
      )}
    </Box>
  );
};

export default QueryForm;