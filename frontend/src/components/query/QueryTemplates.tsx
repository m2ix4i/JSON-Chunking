/**
 * Query templates component for enhanced query interface.
 * Orchestrates template display using smaller, focused components.
 * Follows Single Responsibility Principle and Rule of 5.
 */

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Alert,
  Divider,
} from '@mui/material';

import type { QueryTemplate } from '@/types/app';
import {
  queryTemplates,
  getPopularTemplates,
  templateCategories
} from '@/data/queryTemplates';

// Custom hooks
import { useTemplateFiltering } from '@/hooks/useTemplateFiltering';
import { useTemplateCustomization } from '@/hooks/useTemplateCustomization';
import { useFavoriteTemplates } from '@/hooks/useFavoriteTemplates';
import { useTemplateSection } from '@/hooks/useTemplateSection';

// Components
import TemplateFilters from './TemplateFilters';
import TemplateSection from './TemplateSection';
import CustomizationDialog from './CustomizationDialog';

interface QueryTemplatesProps {
  onTemplateSelect?: (template: QueryTemplate, customizedQuery: string) => void;
  compact?: boolean;
  showSearchFilter?: boolean;
  maxHeight?: number;
}

const QueryTemplates: React.FC<QueryTemplatesProps> = ({
  onTemplateSelect,
  compact = false,
  showSearchFilter = true,
  maxHeight = 600,
}) => {
  // Filter state
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');

  // Custom hooks for separation of concerns
  const { favorites, toggleFavorite } = useFavoriteTemplates();
  const { isExpanded, toggleSection } = useTemplateSection(['popular']);
  const {
    customizationDialog,
    openCustomization,
    closeCustomization,
    updateVariables,
  } = useTemplateCustomization();

  // Filter templates using custom hook
  const filteredTemplates = useTemplateFiltering(queryTemplates, {
    searchTerm,
    selectedCategory,
    selectedDifficulty,
  });

  // Popular templates
  const popularTemplates = getPopularTemplates(5);

  // Handle template selection - orchestration only
  const handleTemplateSelect = (template: QueryTemplate) => {
    if (template.variables.length > 0) {
      openCustomization(template);
    } else {
      onTemplateSelect?.(template, template.template);
    }
  };

  // Handle template customization confirmation
  const handleCustomizeTemplate = () => {
    if (!customizationDialog.template) return;

    onTemplateSelect?.(customizationDialog.template, customizationDialog.preview);
    closeCustomization();
  };

  // Render template section using component
  const renderTemplateSection = (title: string, templates: QueryTemplate[], sectionKey: string) => (
    <TemplateSection
      key={sectionKey}
      title={title}
      templates={templates}
      sectionKey={sectionKey}
      isExpanded={isExpanded(sectionKey)}
      favoriteTemplates={favorites}
      compact={compact}
      onToggleSection={toggleSection}
      onTemplateSelect={handleTemplateSelect}
      onToggleFavorite={toggleFavorite}
    />
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
            <TemplateFilters
              searchTerm={searchTerm}
              selectedCategory={selectedCategory}
              selectedDifficulty={selectedDifficulty}
              onSearchChange={setSearchTerm}
              onCategoryChange={setSelectedCategory}
              onDifficultyChange={setSelectedDifficulty}
              compact={true}
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

          <CustomizationDialog
            open={!!customizationDialog.template}
            customizationDialog={customizationDialog}
            onClose={closeCustomization}
            onConfirm={handleCustomizeTemplate}
            onVariableChange={updateVariables}
          />
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
        <TemplateFilters
          searchTerm={searchTerm}
          selectedCategory={selectedCategory}
          selectedDifficulty={selectedDifficulty}
          onSearchChange={setSearchTerm}
          onCategoryChange={setSelectedCategory}
          onDifficultyChange={setSelectedDifficulty}
        />

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

        <CustomizationDialog
          open={!!customizationDialog.template}
          customizationDialog={customizationDialog}
          onClose={closeCustomization}
          onConfirm={handleCustomizeTemplate}
          onVariableChange={updateVariables}
        />
      </CardContent>
    </Card>
  );
};

export default QueryTemplates;