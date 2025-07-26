/**
 * Main navigation component with error-aware routing.
 */

import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Badge,
  Tooltip,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Search as QueryIcon,
  Assessment as ResultsIcon,
  Error as ErrorIcon,
  Home as HomeIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useErrorState } from '@stores/appStore';
import { useActiveQueries } from '@stores/queryStore';

// Components
import SystemStatus from '@components/status/SystemStatus';

const Navigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { lastError } = useErrorState();
  const activeQueries = useActiveQueries();

  // Count active queries
  const activeQueryCount = Object.values(activeQueries).filter(
    query => ['started', 'preprocessing', 'processing'].includes(query.status.status)
  ).length;

  const isActive = (path: string) => location.pathname === path;

  const navigationItems = [
    {
      label: 'Dateien',
      path: '/upload',
      icon: UploadIcon,
      description: 'IFC-Dateien hochladen und verwalten',
    },
    {
      label: 'Abfragen',
      path: '/query',
      icon: QueryIcon,
      description: 'Neue Abfragen erstellen',
    },
    {
      label: 'Ergebnisse',
      path: '/results',
      icon: ResultsIcon,
      description: 'Abfrage-Ergebnisse anzeigen',
      badge: activeQueryCount > 0 ? activeQueryCount : undefined,
    },
  ];

  return (
    <AppBar position="static" elevation={1}>
      <Toolbar>
        {/* Logo/Brand */}
        <IconButton
          edge="start"
          color="inherit"
          onClick={() => navigate('/')}
          sx={{ mr: 2 }}
        >
          <HomeIcon />
        </IconButton>
        
        <Typography variant="h6" component="div" sx={{ mr: 4 }}>
          IFC Query System
        </Typography>

        {/* Navigation Items */}
        <Box sx={{ display: 'flex', gap: 1, flexGrow: 1 }}>
          {navigationItems.map((item) => (
            <Tooltip key={item.path} title={item.description}>
              <Button
                color="inherit"
                startIcon={
                  item.badge ? (
                    <Badge badgeContent={item.badge} color="secondary">
                      <item.icon />
                    </Badge>
                  ) : (
                    <item.icon />
                  )
                }
                onClick={() => navigate(item.path)}
                sx={{
                  backgroundColor: isActive(item.path) ? 'rgba(255,255,255,0.1)' : 'transparent',
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.1)',
                  },
                }}
              >
                {item.label}
              </Button>
            </Tooltip>
          ))}
        </Box>

        {/* System Status Indicator */}
        <SystemStatus sx={{ mr: 1 }} />

        {/* Error Indicator */}
        {lastError && (
          <Tooltip title={`Letzter Fehler: ${lastError.message}`}>
            <IconButton
              color="inherit"
              sx={{
                backgroundColor: 'error.main',
                '&:hover': {
                  backgroundColor: 'error.dark',
                },
              }}
            >
              <ErrorIcon />
            </IconButton>
          </Tooltip>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Navigation;