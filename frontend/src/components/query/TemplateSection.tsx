/**
 * Template section component - displays a collapsible group of templates.
 * Single responsibility: Section display and expansion state.
 */

import React from 'react';
import {
  Box,
  List,
  ListItemButton,
  ListItemText,
  Typography,
  Badge,
  Collapse,
} from '@mui/material';
import {
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  TrendingUp as PopularIcon,
  Calculate as QuantityIcon,
  Palette as MaterialIcon,
  Place as SpatialIcon,
  Build as ComponentIcon,
  AttachMoney as CostIcon,
  Search as SearchIcon,
} from '@mui/icons-material';

import type { QueryTemplate } from '@/types/app';
import TemplateItem from './TemplateItem';

interface TemplateSectionProps {
  title: string;
  templates: QueryTemplate[];
  sectionKey: string;
  isExpanded: boolean;
  favoriteTemplates: Set<string>;
  compact?: boolean;
  onToggleSection: (section: string) => void;
  onTemplateSelect: (template: QueryTemplate) => void;
  onToggleFavorite: (templateId: string) => void;
}

const TemplateSection: React.FC<TemplateSectionProps> = ({
  title,
  templates,
  sectionKey,
  isExpanded,
  favoriteTemplates,
  compact = false,
  onToggleSection,
  onTemplateSelect,
  onToggleFavorite,
}) => {
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'quantity': return <QuantityIcon />;
      case 'material': return <MaterialIcon />;
      case 'spatial': return <SpatialIcon />;
      case 'component': return <ComponentIcon />;
      case 'cost': return <CostIcon />;
      case 'popular': return <PopularIcon />;
      default: return <SearchIcon />;
    }
  };

  return (
    <Box sx={{ mb: 2 }}>
      <ListItemButton
        onClick={() => onToggleSection(sectionKey)}
        sx={{ borderRadius: 1, mb: 1 }}
      >
        <ListItemText
          primary={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {getCategoryIcon(sectionKey)}
              <Typography variant="subtitle1" fontWeight={600}>
                {title}
              </Typography>
              <Badge badgeContent={templates.length} color="primary" />
            </Box>
          }
        />
        {isExpanded ? <CollapseIcon /> : <ExpandIcon />}
      </ListItemButton>
      
      <Collapse in={isExpanded}>
        <List dense={compact}>
          {templates.map(template => (
            <TemplateItem
              key={template.id}
              template={template}
              isFavorite={favoriteTemplates.has(template.id)}
              compact={compact}
              onSelect={onTemplateSelect}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </List>
      </Collapse>
    </Box>
  );
};

export default TemplateSection;