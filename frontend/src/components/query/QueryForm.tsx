/**
 * Query form component with validation and error handling.
 */

import React from 'react';
import { Box } from '@mui/material';

// Hooks
import { useQueryForm } from '@hooks/useQueryForm';

// Components
import QueryInput from './QueryInput';
import IntentSelector from './IntentSelector';
import AdvancedSettings from './AdvancedSettings';
import SelectedFileInfo from './SelectedFileInfo';
import SubmitSection from './SubmitSection';

// Utils
import { ValidationError } from '@utils/errorUtils';

export interface QueryFormProps {
  disabled?: boolean;
  onSubmit?: () => void;
  isSubmitting?: boolean;
  validationErrors?: ValidationError[];
}

const QueryForm: React.FC<QueryFormProps> = ({
  disabled = false,
  onSubmit,
  isSubmitting = false,
  validationErrors = [],
}) => {
  const {
    currentQuery,
    selectedFile,
    getFieldError,
    hasFieldError,
    handleSubmit,
    handleQueryChange,
    handleIntentChange,
    handleMaxConcurrentChange,
    handleTimeoutChange,
    handleCacheChange,
    canSubmit,
  } = useQueryForm({
    disabled,
    onSubmit,
    isSubmitting,
    validationErrors,
  });

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <QueryInput
        value={currentQuery.text}
        onChange={handleQueryChange}
        disabled={disabled || isSubmitting}
        error={hasFieldError('query')}
        helperText={getFieldError('query')}
      />

      <IntentSelector
        value={currentQuery.intentHint || ''}
        onChange={handleIntentChange}
        disabled={disabled || isSubmitting}
        error={hasFieldError('intentHint')}
      />

      <AdvancedSettings
        maxConcurrent={currentQuery.maxConcurrent}
        timeoutSeconds={currentQuery.timeoutSeconds}
        cacheResults={currentQuery.cacheResults}
        onMaxConcurrentChange={handleMaxConcurrentChange}
        onTimeoutChange={handleTimeoutChange}
        onCacheChange={handleCacheChange}
        disabled={disabled || isSubmitting}
        getFieldError={getFieldError}
        hasFieldError={hasFieldError}
      />

      {selectedFile && <SelectedFileInfo filename={selectedFile.filename} />}

      <SubmitSection
        canSubmit={canSubmit}
        isSubmitting={isSubmitting}
        disabled={disabled}
        hasSelectedFile={!!selectedFile}
        hasQueryText={!!currentQuery.text.trim()}
      />
    </Box>
  );
};

export default QueryForm;