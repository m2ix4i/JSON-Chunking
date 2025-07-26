/**
 * Template customization dialog component.
 * Single responsibility: Handle template variable customization.
 */

import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Alert,
} from '@mui/material';
import {
  Edit as CustomizeIcon,
  PlayArrow as UseIcon,
} from '@mui/icons-material';

import type { QueryTemplate, QueryVariable } from '@/types/app';
import { TemplateCustomizationState } from '@/hooks/useTemplateCustomization';

interface CustomizationDialogProps {
  open: boolean;
  customizationDialog: TemplateCustomizationState;
  onClose: () => void;
  onConfirm: () => void;
  onVariableChange: (variables: Record<string, any>) => void;
}

const CustomizationDialog: React.FC<CustomizationDialogProps> = ({
  open,
  customizationDialog,
  onClose,
  onConfirm,
  onVariableChange,
}) => {
  if (!customizationDialog.template) return null;

  const { template, variables, preview } = customizationDialog;

  const handleVariableUpdate = (variableName: string, value: any) => {
    const newVariables = {
      ...variables,
      [variableName]: value,
    };
    onVariableChange(newVariables);
  };

  const renderVariableInput = (variable: QueryVariable) => {
    const value = variables[variable.name] || '';
    
    if (variable.type === 'select') {
      return (
        <FormControl fullWidth>
          <InputLabel>{variable.label}</InputLabel>
          <Select
            value={value}
            onChange={(e) => handleVariableUpdate(variable.name, e.target.value)}
            label={variable.label}
          >
            {variable.options?.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      );
    }
    
    if (variable.type === 'boolean') {
      return (
        <FormControlLabel
          control={
            <Checkbox
              checked={!!value}
              onChange={(e) => handleVariableUpdate(variable.name, e.target.checked)}
            />
          }
          label={variable.label}
        />
      );
    }
    
    return (
      <TextField
        fullWidth
        label={variable.label}
        value={value}
        onChange={(e) => handleVariableUpdate(variable.name, e.target.value)}
        type={variable.type === 'number' ? 'number' : 'text'}
        placeholder={variable.placeholder}
        helperText={variable.description}
        required={variable.required}
      />
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CustomizeIcon />
          <Typography variant="h6">
            Template anpassen: {template.name}
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {template.description}
        </Typography>

        <Box sx={{ mb: 3 }}>
          {template.variables.map((variable) => (
            <Box key={variable.name} sx={{ mb: 2 }}>
              {renderVariableInput(variable)}
            </Box>
          ))}
        </Box>

        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Vorschau der generierten Abfrage:
          </Typography>
          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 500 }}>
            {preview || template.template}
          </Typography>
        </Alert>

        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Beispiele:
        </Typography>
        {template.examples.map((example, index) => (
          <Typography key={index} variant="body2" color="text.secondary" sx={{ ml: 2, mb: 0.5 }}>
            • {example}
          </Typography>
        ))}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>
          Abbrechen
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          startIcon={<UseIcon />}
        >
          Template verwenden
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CustomizationDialog;