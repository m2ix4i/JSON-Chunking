/**
 * Query suggestions component with categorized German examples.
 */

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  IconButton,
  Tooltip,
  Collapse,
  Badge,
} from '@mui/material';
import {
  Calculate as QuantityIcon,
  Build as ComponentIcon,
  Palette as MaterialIcon,
  Place as SpatialIcon,
  AttachMoney as CostIcon,
  Help as GeneralIcon,
  ContentCopy as CopyIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
} from '@mui/icons-material';

// Store hooks
import { useGermanSuggestions } from '@stores/queryStore';
import { showSuccessNotification } from '@stores/appStore';

// Types
import type { QueryIntentHint, GermanQuerySuggestion } from '@/types/app';

interface QuerySuggestionsProps {
  onSuggestionSelect?: (suggestion: GermanQuerySuggestion) => void;
  compact?: boolean;
}

interface CategoryInfo {
  category: QueryIntentHint;
  label: string;
  icon: React.ReactElement;
  description: string;
  color: 'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'error';
}

const categories: CategoryInfo[] = [
  {
    category: 'quantity',
    label: 'Mengen',
    icon: <QuantityIcon />,
    description: 'Quantitative Analysen, Volumen, Flächen, Anzahlen',
    color: 'primary',
  },
  {
    category: 'component',
    label: 'Bauteile',
    icon: <ComponentIcon />,
    description: 'Gebäudekomponenten, Elemente, Systeme',
    color: 'secondary',
  },
  {
    category: 'material',
    label: 'Materialien',
    icon: <MaterialIcon />,
    description: 'Materialien, Eigenschaften, Spezifikationen',
    color: 'success',
  },
  {
    category: 'spatial',
    label: 'Räumlich',
    icon: <SpatialIcon />,
    description: 'Räume, Stockwerke, räumliche Beziehungen',
    color: 'warning',
  },
  {
    category: 'cost',
    label: 'Kosten',
    icon: <CostIcon />,
    description: 'Kostenschätzungen, Budget, Wirtschaftlichkeit',
    color: 'error',
  },
  {
    category: 'general',
    label: 'Allgemein',
    icon: <GeneralIcon />,
    description: 'Allgemeine Informationen und Übersichten',
    color: 'info',
  },
];

const QuerySuggestions: React.FC<QuerySuggestionsProps> = ({
  onSuggestionSelect,
  compact = false,
}) => {
  const suggestions = useGermanSuggestions();
  const [selectedCategory, setSelectedCategory] = useState<QueryIntentHint>('quantity');
  const [expandedCategories, setExpandedCategories] = useState<Set<QueryIntentHint>>(
    new Set(['quantity'])
  );

  const handleCategoryChange = (_: React.SyntheticEvent, newValue: QueryIntentHint) => {
    setSelectedCategory(newValue);
  };

  const toggleCategoryExpansion = (category: QueryIntentHint) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const handleSuggestionClick = (suggestion: GermanQuerySuggestion) => {
    if (onSuggestionSelect) {
      onSuggestionSelect(suggestion);
    }
  };

  const handleCopyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showSuccessNotification('Abfrage in die Zwischenablage kopiert');
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const getSuggestionsByCategory = (category: QueryIntentHint) => {
    return suggestions.filter(suggestion => suggestion.category === category);
  };

  const getCategoryInfo = (category: QueryIntentHint) => {
    return categories.find(cat => cat.category === category);
  };

  const renderSuggestionList = (categorySuggestions: GermanQuerySuggestion[]) => (
    <List dense={compact}>
      {categorySuggestions.map((suggestion, index) => (
        <ListItem key={index} disablePadding>
          <ListItemButton
            onClick={() => handleSuggestionClick(suggestion)}
            sx={{
              borderRadius: 1,
              mb: 0.5,
              '&:hover': {
                backgroundColor: 'action.hover',
              },
            }}
          >
            <ListItemText
              primary={suggestion.text}
              secondary={compact ? undefined : suggestion.description}
              primaryTypographyProps={{
                variant: compact ? 'body2' : 'body1',
                fontWeight: 500,
              }}
              secondaryTypographyProps={{
                variant: 'body2',
                color: 'text.secondary',
              }}
            />
            <Tooltip title="In Zwischenablage kopieren">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopyToClipboard(suggestion.text);
                }}
                sx={{ ml: 1 }}
              >
                <CopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </ListItemButton>
        </ListItem>
      ))}
    </List>
  );

  if (compact) {
    // Compact view - show as expandable categories
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Beispielabfragen
          </Typography>
          
          {categories.map((categoryInfo) => {
            const categorySuggestions = getSuggestionsByCategory(categoryInfo.category);
            const isExpanded = expandedCategories.has(categoryInfo.category);
            
            return (
              <Box key={categoryInfo.category} sx={{ mb: 1 }}>
                <ListItemButton
                  onClick={() => toggleCategoryExpansion(categoryInfo.category)}
                  sx={{
                    borderRadius: 1,
                    border: 1,
                    borderColor: 'divider',
                    mb: 1,
                  }}
                >
                  <Badge badgeContent={categorySuggestions.length} color={categoryInfo.color}>
                    {categoryInfo.icon}
                  </Badge>
                  <ListItemText
                    primary={categoryInfo.label}
                    secondary={categoryInfo.description}
                    sx={{ ml: 2 }}
                  />
                  {isExpanded ? <CollapseIcon /> : <ExpandIcon />}
                </ListItemButton>
                
                <Collapse in={isExpanded}>
                  <Box sx={{ ml: 2, mr: 1 }}>
                    {renderSuggestionList(categorySuggestions)}
                  </Box>
                </Collapse>
              </Box>
            );
          })}
        </CardContent>
      </Card>
    );
  }

  // Full view - show with tabs
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Beispielabfragen nach Kategorie
        </Typography>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Wählen Sie eine Kategorie aus und klicken Sie auf eine Beispielabfrage, um sie zu verwenden.
        </Typography>

        <Tabs
          value={selectedCategory}
          onChange={handleCategoryChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ mb: 3 }}
        >
          {categories.map((categoryInfo) => {
            const count = getSuggestionsByCategory(categoryInfo.category).length;
            return (
              <Tab
                key={categoryInfo.category}
                value={categoryInfo.category}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {categoryInfo.icon}
                    <Typography sx={{ ml: 1, mr: 1 }}>
                      {categoryInfo.label}
                    </Typography>
                    <Chip
                      label={count}
                      size="small"
                      color={categoryInfo.color}
                      variant="outlined"
                    />
                  </Box>
                }
              />
            );
          })}
        </Tabs>

        {/* Category Description */}
        {(() => {
          const categoryInfo = getCategoryInfo(selectedCategory);
          return categoryInfo ? (
            <Box sx={{ mb: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
              <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center' }}>
                {categoryInfo.icon}
                <Box sx={{ ml: 1 }}>{categoryInfo.label}</Box>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {categoryInfo.description}
              </Typography>
            </Box>
          ) : null;
        })()}

        {/* Suggestions for selected category */}
        {renderSuggestionList(getSuggestionsByCategory(selectedCategory))}
      </CardContent>
    </Card>
  );
};

export default QuerySuggestions;