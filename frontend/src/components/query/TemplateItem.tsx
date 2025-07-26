/**
 * Individual template item component.
 * Single responsibility: Display one template item.
 */

import React from 'react';
import {
  ListItem,
  ListItemButton,
  ListItemText,
  Box,
  Typography,
  Chip,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  PlayArrow as UseIcon,
} from '@mui/icons-material';

import type { QueryTemplate } from '@/types/app';

interface TemplateItemProps {
  template: QueryTemplate;
  isFavorite: boolean;
  compact?: boolean;
  onSelect: (template: QueryTemplate) => void;
  onToggleFavorite: (templateId: string) => void;
}

const TemplateItem: React.FC<TemplateItemProps> = ({
  template,
  isFavorite,
  compact = false,
  onSelect,
  onToggleFavorite,
}) => {
  return (
    <ListItem disablePadding>
      <ListItemButton
        onClick={() => onSelect(template)}
        sx={{
          borderRadius: 1,
          mb: 0.5,
          '&:hover': {
            backgroundColor: 'action.hover',
          },
        }}
      >
        <ListItemText
          primary={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant={compact ? 'body2' : 'subtitle2'} fontWeight={500}>
                {template.name}
              </Typography>
              <Chip
                label={template.difficulty}
                size="small"
                variant="outlined"
                color={
                  template.difficulty === 'beginner' ? 'success' :
                  template.difficulty === 'intermediate' ? 'warning' : 'error'
                }
              />
              {template.variables.length > 0 && (
                <Chip
                  label={`${template.variables.length} Parameter`}
                  size="small"
                  variant="outlined"
                />
              )}
            </Box>
          }
          secondary={
            compact ? undefined : (
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  {template.description}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                  {template.template}
                </Typography>
              </Box>
            )
          }
          primaryTypographyProps={{
            component: 'div',
          }}
        />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Tooltip title={isFavorite ? 'Von Favoriten entfernen' : 'Zu Favoriten hinzufügen'}>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(template.id);
              }}
            >
              {isFavorite ? <StarIcon color="primary" /> : <StarBorderIcon />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Template verwenden">
            <IconButton size="small">
              <UseIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </ListItemButton>
    </ListItem>
  );
};

export default TemplateItem;