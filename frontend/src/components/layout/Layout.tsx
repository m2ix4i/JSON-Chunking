/**
 * Main layout component with navigation and responsive design.
 */

import React from 'react';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  CloudUpload as UploadIcon,
  Search as QueryIcon,
  Assignment as ResultsIcon,
  History as HistoryIcon,
  Settings as SettingsIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

// Store hooks
import { useAppStore, useSidebarOpen, useDarkMode } from '@stores/appStore';

// Types
import type { AppPage } from '@/types/app';

interface LayoutProps {
  children: React.ReactNode;
}

const drawerWidth = 280;

interface NavigationItem {
  page: AppPage;
  label: string;
  icon: React.ReactElement;
  path: string;
}

const navigationItems: NavigationItem[] = [
  {
    page: 'dashboard',
    label: 'Dashboard',
    icon: <DashboardIcon />,
    path: '/dashboard',
  },
  {
    page: 'upload',
    label: 'Datei hochladen',
    icon: <UploadIcon />,
    path: '/upload',
  },
  {
    page: 'query',
    label: 'Abfrage erstellen',
    icon: <QueryIcon />,
    path: '/query',
  },
  {
    page: 'results',
    label: 'Ergebnisse',
    icon: <ResultsIcon />,
    path: '/results',
  },
  {
    page: 'history',
    label: 'Verlauf',
    icon: <HistoryIcon />,
    path: '/history',
  },
  {
    page: 'settings',
    label: 'Einstellungen',
    icon: <SettingsIcon />,
    path: '/settings',
  },
];

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();

  // Store state
  const sidebarOpen = useSidebarOpen();
  const darkMode = useDarkMode();
  const { toggleSidebar, toggleDarkMode, setCurrentPage } = useAppStore();

  // Get current page from pathname
  const currentPath = location.pathname;
  const currentPage = navigationItems.find(item => 
    currentPath.startsWith(item.path)
  )?.page || 'dashboard';

  const handleNavigation = (item: NavigationItem) => {
    setCurrentPage(item.page);
    navigate(item.path);
    
    // Close sidebar on mobile after navigation
    if (isMobile && sidebarOpen) {
      toggleSidebar();
    }
  };

  const handleDrawerToggle = () => {
    toggleSidebar();
  };

  const drawer = (
    <Box>
      {/* Logo and title */}
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
          IFC JSON Chunking
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Gebäudedatenanalyse
        </Typography>
      </Box>
      
      <Divider />
      
      {/* Navigation items */}
      <List sx={{ px: 1, py: 2 }}>
        {navigationItems.map((item) => (
          <ListItem key={item.page} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              selected={currentPage === item.page}
              onClick={() => handleNavigation(item)}
              sx={{
                borderRadius: 2,
                mx: 1,
                '&.Mui-selected': {
                  backgroundColor: theme.palette.primary.main,
                  color: theme.palette.primary.contrastText,
                  '&:hover': {
                    backgroundColor: theme.palette.primary.dark,
                  },
                  '& .MuiListItemIcon-root': {
                    color: theme.palette.primary.contrastText,
                  },
                },
                '&:hover': {
                  backgroundColor: theme.palette.action.hover,
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      
      <Divider />
      
      {/* Theme toggle */}
      <List sx={{ px: 1, py: 1 }}>
        <ListItem disablePadding>
          <ListItemButton
            onClick={toggleDarkMode}
            sx={{
              borderRadius: 2,
              mx: 1,
              '&:hover': {
                backgroundColor: theme.palette.action.hover,
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
            </ListItemIcon>
            <ListItemText 
              primary={darkMode ? 'Heller Modus' : 'Dunkler Modus'} 
            />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', width: '100%' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { md: sidebarOpen ? `calc(100% - ${drawerWidth}px)` : '100%' },
          ml: { md: sidebarOpen ? `${drawerWidth}px` : 0 },
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="toggle navigation"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {navigationItems.find(item => item.page === currentPage)?.label || 'Dashboard'}
          </Typography>
          
          {/* Add any additional header actions here */}
        </Toolbar>
      </AppBar>

      {/* Navigation Drawer */}
      <Box
        component="nav"
        sx={{ 
          width: { md: sidebarOpen ? drawerWidth : 0 },
          flexShrink: { md: 0 } 
        }}
      >
        {/* Mobile drawer */}
        {isMobile ? (
          <Drawer
            variant="temporary"
            open={sidebarOpen}
            onClose={handleDrawerToggle}
            ModalProps={{
              keepMounted: true, // Better open performance on mobile
            }}
            sx={{
              '& .MuiDrawer-paper': {
                boxSizing: 'border-box',
                width: drawerWidth,
              },
            }}
          >
            {drawer}
          </Drawer>
        ) : (
          /* Desktop drawer */
          <Drawer
            variant="persistent"
            open={sidebarOpen}
            sx={{
              '& .MuiDrawer-paper': {
                boxSizing: 'border-box',
                width: drawerWidth,
                transition: theme.transitions.create('width', {
                  easing: theme.transitions.easing.sharp,
                  duration: theme.transitions.duration.enteringScreen,
                }),
              },
            }}
          >
            {drawer}
          </Drawer>
        )}
      </Box>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { 
            md: sidebarOpen ? `calc(100% - ${drawerWidth}px)` : '100%' 
          },
          mt: '64px', // Account for app bar height
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          minHeight: 'calc(100vh - 64px)',
          backgroundColor: theme.palette.background.default,
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default Layout;