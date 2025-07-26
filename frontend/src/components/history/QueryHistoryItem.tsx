/**
 * QueryHistoryItem - Individual query history entry component
 * Displays query information, status, and action buttons
 */

import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  IconButton,
  Button,
  Tooltip,
  Stack,
  Divider,
} from '@mui/material';
import {
  PlayArrow as RerunIcon,
  Visibility as ViewResultsIcon,
  Delete as DeleteIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CompletedIcon,
  Error as ErrorIcon,
  HourglassEmpty as ProcessingIcon,
  Cancel as CancelledIcon,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import type { QueryStatusResponse } from '@/types/api';

interface QueryHistoryItemProps {
  query: QueryStatusResponse;
  onRerun: (queryId: string) => void;
  onViewResults: (queryId: string) => void;
  onDelete: (queryId: string) => void;
  disabled?: boolean;
}

const QueryHistoryItem: React.FC<QueryHistoryItemProps> = ({
  query,
  onRerun,
  onViewResults,
  onDelete,
  disabled = false,
}) => {
  // Status configuration
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'completed':
        return {
          icon: <CompletedIcon fontSize="small" />,
          color: 'success' as const,
          label: 'Erfolgreich',
          bgColor: 'success.light',
          textColor: 'success.contrastText',
        };
      case 'failed':
        return {
          icon: <ErrorIcon fontSize="small" />,
          color: 'error' as const,
          label: 'Fehlgeschlagen',
          bgColor: 'error.light',
          textColor: 'error.contrastText',
        };
      case 'processing':
      case 'preprocessing':
        return {
          icon: <ProcessingIcon fontSize="small" />,
          color: 'warning' as const,
          label: 'In Bearbeitung',
          bgColor: 'warning.light',
          textColor: 'warning.contrastText',
        };
      case 'cancelled':
        return {
          icon: <CancelledIcon fontSize="small" />,
          color: 'default' as const,
          label: 'Abgebrochen',
          bgColor: 'grey.300',
          textColor: 'text.primary',
        };
      case 'started':
      default:
        return {
          icon: <ScheduleIcon fontSize="small" />,
          color: 'primary' as const,
          label: 'Gestartet',
          bgColor: 'primary.light',
          textColor: 'primary.contrastText',
        };
    }
  };

  const statusConfig = getStatusConfig(query.status);
  
  // Format timestamps
  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return formatDistanceToNow(date, { 
        addSuffix: true, 
        locale: de 
      });
    } catch {
      return 'Unbekannt';
    }
  };

  // Truncate long query text
  const truncateQuery = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Determine which actions are available
  const canRerun = query.status === 'completed' || query.status === 'failed' || query.status === 'cancelled';
  const canViewResults = query.status === 'completed';
  const canDelete = query.status !== 'processing' && query.status !== 'preprocessing';

  return (
    <Card 
      sx={{ 
        mb: 2, 
        '&:hover': { 
          boxShadow: 3 
        },
        opacity: disabled ? 0.6 : 1,
        transition: 'all 0.2s ease-in-out',
      }}
      elevation={1}
    >
      <CardContent sx={{ pb: 2 }}>
        <Box>
          {/* Header with status and timestamp */}
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
            <Chip
              icon={statusConfig.icon}
              label={statusConfig.label}
              color={statusConfig.color}
              size="small"
              sx={{
                fontWeight: 'medium',
                '& .MuiChip-icon': {
                  color: 'inherit',
                },
              }}
            />
            
            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <ScheduleIcon fontSize="inherit" />
              {formatTimestamp(query.created_at)}
            </Typography>
          </Box>

          {/* Query text */}
          <Typography 
            variant="body1" 
            sx={{ 
              mb: 2,
              lineHeight: 1.5,
              fontWeight: 500,
            }}
          >
            {truncateQuery(query.original_query || 'Abfrage-ID: ' + query.query_id)}
          </Typography>

          {/* Progress information for processing queries */}
          {(query.status === 'processing' || query.status === 'preprocessing') && (
            <Box mb={2}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="body2" color="text.secondary">
                  Fortschritt: {Math.round(query.progress_percentage)}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {query.current_step} / {query.total_steps}
                </Typography>
              </Box>
              <Box 
                sx={{
                  width: '100%',
                  height: 6,
                  backgroundColor: 'grey.200',
                  borderRadius: 3,
                  overflow: 'hidden',
                }}
              >
                <Box
                  sx={{
                    width: `${query.progress_percentage}%`,
                    height: '100%',
                    backgroundColor: 'primary.main',
                    transition: 'width 0.3s ease',
                  }}
                />
              </Box>
            </Box>
          )}

          {/* Error message for failed queries */}
          {query.status === 'failed' && query.error_message && (
            <Box mb={2}>
              <Typography variant="body2" color="error.main" sx={{ fontStyle: 'italic' }}>
                Fehler: {query.error_message}
              </Typography>
            </Box>
          )}

          {/* Status message */}
          {query.message && (
            <Typography variant="body2" color="text.secondary" mb={2}>
              {query.message}
            </Typography>
          )}

          <Divider sx={{ my: 2 }} />

          {/* Action buttons */}
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            {canViewResults && (
              <Tooltip title="Ergebnisse anzeigen">
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<ViewResultsIcon />}
                  onClick={() => onViewResults(query.query_id)}
                  disabled={disabled}
                  sx={{ minWidth: 'auto' }}
                >
                  Ergebnisse
                </Button>
              </Tooltip>
            )}
            
            {canRerun && (
              <Tooltip title="Abfrage erneut ausführen">
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<RerunIcon />}
                  onClick={() => onRerun(query.query_id)}
                  disabled={disabled}
                  color="primary"
                  sx={{ minWidth: 'auto' }}
                >
                  Erneut
                </Button>
              </Tooltip>
            )}
            
            {canDelete && (
              <Tooltip title="Abfrage löschen">
                <IconButton
                  size="small"
                  onClick={() => onDelete(query.query_id)}
                  disabled={disabled}
                  color="error"
                  sx={{ 
                    '&:hover': {
                      backgroundColor: 'error.light',
                      color: 'error.contrastText',
                    }
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        </Box>
      </CardContent>
    </Card>
  );
};

export default QueryHistoryItem;