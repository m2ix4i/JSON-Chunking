/**
 * Query templates component for enhanced query interface.
 * Provides browsable templates for common IFC building analysis queries.
 */

import React, { useState, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  TextField,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Collapse,
  IconButton,
  Tooltip,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Badge,
  Divider,
  Alert,
} from '@mui/material';
import {
  Search as SearchIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  PlayArrow as UseIcon,
  Edit as CustomizeIcon,
  Clear as ClearIcon,
  FilterList as FilterIcon,
  Calculate as QuantityIcon,
  Palette as MaterialIcon,
  Place as SpatialIcon,
  Build as ComponentIcon,
  AttachMoney as CostIcon,
  TrendingUp as PopularIcon,
} from '@mui/icons-material';

import type { QueryTemplate, QueryVariable } from '@/types/app';
import { 
  queryTemplates, 
  getTemplatesByCategory, 
  getTemplatesByDifficulty,
  searchTemplates,
  getPopularTemplates,
  templateCategories 
} from '@/data/queryTemplates';

interface QueryTemplatesProps {
  onTemplateSelect?: (template: QueryTemplate, customizedQuery: string) => void;
  compact?: boolean;
  showSearchFilter?: boolean;
  maxHeight?: number;
}

interface TemplateCustomizationState {
  template: QueryTemplate | null;
  variables: Record<string, any>;
  preview: string;
}

const QueryTemplates: React.FC<QueryTemplatesProps> = ({
  onTemplateSelect,
  compact = false,
  showSearchFilter = true,
  maxHeight = 600,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['popular']));
  const [customizationDialog, setCustomizationDialog] = useState<TemplateCustomizationState>({
    template: null,
    variables: {},
    preview: '',
  });
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // Filter templates based on current criteria
  const filteredTemplates = useMemo(() => {
    let filtered = queryTemplates;

    // Apply search filter
    if (searchTerm.trim()) {
      filtered = searchTemplates(searchTerm);
    }

    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(template => template.category === selectedCategory);
    }

    // Apply difficulty filter
    if (selectedDifficulty !== 'all') {
      filtered = filtered.filter(template => template.difficulty === selectedDifficulty);
    }

    return filtered;
  }, [searchTerm, selectedCategory, selectedDifficulty]);

  // Popular templates
  const popularTemplates = useMemo(() => getPopularTemplates(5), []);

  // Get icon for category
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'quantity': return <QuantityIcon />;
      case 'material': return <MaterialIcon />;
      case 'spatial': return <SpatialIcon />;
      case 'component': return <ComponentIcon />;
      case 'cost': return <CostIcon />;
      default: return <SearchIcon />;
    }
  };

  // Handle template selection
  const handleTemplateSelect = (template: QueryTemplate) => {
    if (template.variables.length > 0) {
      // Show customization dialog
      setCustomizationDialog({
        template,
        variables: template.variables.reduce((acc, variable) => {
          acc[variable.name] = variable.defaultValue || '';
          return acc;
        }, {} as Record<string, any>),
        preview: template.template,
      });
    } else {
      // Use template directly
      onTemplateSelect?.(template, template.template);
    }
  };

  // Handle template customization
  const handleCustomizeTemplate = () => {
    if (!customizationDialog.template) return;

    const customizedQuery = generateCustomizedQuery(
      customizationDialog.template,
      customizationDialog.variables
    );

    onTemplateSelect?.(customizationDialog.template, customizedQuery);
    setCustomizationDialog({ template: null, variables: {}, preview: '' });
  };

  // Generate customized query from template and variables
  const generateCustomizedQuery = (template: QueryTemplate, variables: Record<string, any>): string => {
    let query = template.template;

    // Replace variables in template
    template.variables.forEach(variable => {
      const value = variables[variable.name];
      if (value) {
        const regex = new RegExp(`\\{${variable.name}(\\s*\\?[^}]*)?\\}`, 'g');
        query = query.replace(regex, value);
      } else {
        // Handle optional variables (with ?)
        const optionalRegex = new RegExp(`\\{[^}]*\\s*\\?[^}]*${variable.name}[^}]*\\}`, 'g');
        query = query.replace(optionalRegex, '');
      }
    });

    // Clean up extra spaces
    return query.replace(/\s+/g, ' ').trim();
  };

  // Update preview when variables change
  const updatePreview = (newVariables: Record<string, any>) => {
    if (!customizationDialog.template) return;

    const preview = generateCustomizedQuery(customizationDialog.template, newVariables);
    setCustomizationDialog(prev => ({
      ...prev,
      variables: newVariables,
      preview,
    }));
  };

  // Toggle section expansion
  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  // Toggle favorite
  const toggleFavorite = (templateId: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(templateId)) {
      newFavorites.delete(templateId);
    } else {
      newFavorites.add(templateId);
    }
    setFavorites(newFavorites);
  };

  // Render template item
  const renderTemplateItem = (template: QueryTemplate) => (
    <ListItem key={template.id} disablePadding>
      <ListItemButton
        onClick={() => handleTemplateSelect(template)}
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
          <Tooltip title={favorites.has(template.id) ? 'Von Favoriten entfernen' : 'Zu Favoriten hinzufügen'}>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorite(template.id);
              }}
            >
              {favorites.has(template.id) ? <StarIcon color="primary" /> : <StarBorderIcon />}
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

  // Render template section
  const renderTemplateSection = (title: string, templates: QueryTemplate[], sectionKey: string) => {
    const isExpanded = expandedSections.has(sectionKey);
    
    return (
      <Box key={sectionKey} sx={{ mb: 2 }}>
        <ListItemButton
          onClick={() => toggleSection(sectionKey)}
          sx={{ borderRadius: 1, mb: 1 }}
        >
          <ListItemText
            primary={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {sectionKey === 'popular' && <PopularIcon />}
                {sectionKey !== 'popular' && getCategoryIcon(sectionKey)}
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
            {templates.map(renderTemplateItem)}
          </List>
        </Collapse>
      </Box>
    );
  };

  // Customization dialog content
  const renderCustomizationDialog = () => (
    <Dialog
      open={!!customizationDialog.template}
      onClose={() => setCustomizationDialog({ template: null, variables: {}, preview: '' })}
      maxWidth="md"
      fullWidth
    >
      {customizationDialog.template && (
        <>
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CustomizeIcon />
              <Typography variant="h6">
                Template anpassen: {customizationDialog.template.name}
              </Typography>
            </Box>
          </DialogTitle>
          
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {customizationDialog.template.description}
            </Typography>

            <Box sx={{ mb: 3 }}>
              {customizationDialog.template.variables.map((variable) => {
                const value = customizationDialog.variables[variable.name] || '';
                
                return (
                  <Box key={variable.name} sx={{ mb: 2 }}>
                    {variable.type === 'select' ? (
                      <FormControl fullWidth>
                        <InputLabel>{variable.label}</InputLabel>
                        <Select
                          value={value}
                          onChange={(e) => updatePreview({
                            ...customizationDialog.variables,
                            [variable.name]: e.target.value,
                          })}
                          label={variable.label}
                        >
                          {variable.options?.map((option) => (
                            <MenuItem key={option} value={option}>
                              {option}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    ) : variable.type === 'boolean' ? (
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={!!value}
                            onChange={(e) => updatePreview({
                              ...customizationDialog.variables,
                              [variable.name]: e.target.checked,
                            })}
                          />
                        }
                        label={variable.label}
                      />
                    ) : (
                      <TextField
                        fullWidth
                        label={variable.label}
                        value={value}
                        onChange={(e) => updatePreview({
                          ...customizationDialog.variables,
                          [variable.name]: e.target.value,
                        })}
                        type={variable.type === 'number' ? 'number' : 'text'}
                        placeholder={variable.placeholder}
                        helperText={variable.description}
                        required={variable.required}
                      />
                    )}
                  </Box>
                );
              })}
            </Box>

            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Vorschau der generierten Abfrage:
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 500 }}>
                {customizationDialog.preview || customizationDialog.template.template}
              </Typography>
            </Alert>

            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Beispiele:
            </Typography>
            {customizationDialog.template.examples.map((example, index) => (
              <Typography key={index} variant="body2" color="text.secondary" sx={{ ml: 2, mb: 0.5 }}>
                • {example}
              </Typography>
            ))}
          </DialogContent>
          
          <DialogActions>
            <Button
              onClick={() => setCustomizationDialog({ template: null, variables: {}, preview: '' })}
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleCustomizeTemplate}
              variant="contained"
              startIcon={<UseIcon />}
            >
              Template verwenden
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );

  if (compact) {
    // Compact view for sidebar
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Abfrage-Templates
          </Typography>

          {showSearchFilter && (
            <TextField
              fullWidth
              size="small"
              placeholder="Templates suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchTerm('')}>
                      <ClearIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 2 }}
            />
          )}

          <Box sx={{ maxHeight, overflow: 'auto' }}>
            {/* Popular templates */}
            {!searchTerm && renderTemplateSection('Beliebte Templates', popularTemplates, 'popular')}

            {/* Category sections */}
            {templateCategories.map((category) => {
              const categoryTemplates = filteredTemplates.filter(t => t.category === category.id);
              if (categoryTemplates.length === 0) return null;
              
              return renderTemplateSection(category.name, categoryTemplates, category.id);
            })}

            {filteredTemplates.length === 0 && (
              <Alert severity="info">
                Keine Templates gefunden. Versuchen Sie andere Suchbegriffe.
              </Alert>
            )}
          </Box>

          {renderCustomizationDialog()}
        </CardContent>
      </Card>
    );
  }

  // Full view
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Abfrage-Templates
        </Typography>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Wählen Sie aus vorgefertigten Templates für häufige Anwendungsfälle oder durchsuchen Sie nach spezifischen Abfragen.
        </Typography>

        {/* Search and filters */}
        <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            placeholder="Templates suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
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
              onChange={(e) => setSelectedCategory(e.target.value)}
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
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              label="Schwierigkeit"
            >
              <MenuItem value="all">Alle</MenuItem>
              <MenuItem value="beginner">Einfach</MenuItem>
              <MenuItem value="intermediate">Mittel</MenuItem>
              <MenuItem value="advanced">Fortgeschritten</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Templates */}
        <Box sx={{ maxHeight, overflow: 'auto' }}>
          {!searchTerm && renderTemplateSection('Beliebte Templates', popularTemplates, 'popular')}

          {templateCategories.map((category) => {
            const categoryTemplates = filteredTemplates.filter(t => t.category === category.id);
            if (categoryTemplates.length === 0) return null;
            
            return renderTemplateSection(category.name, categoryTemplates, category.id);
          })}

          {filteredTemplates.length === 0 && (
            <Alert severity="info">
              Keine Templates gefunden. Versuchen Sie andere Suchbegriffe oder Filter.
            </Alert>
          )}
        </Box>

        {renderCustomizationDialog()}
      </CardContent>
    </Card>
  );
};

export default QueryTemplates;