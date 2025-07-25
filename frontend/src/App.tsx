/**
 * Main App component with error boundaries and global providers.
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box } from '@mui/material';
import { deDE } from '@mui/material/locale';

// Error Boundary and Notifications
import ErrorBoundary from '@components/error/ErrorBoundary';
import NotificationProvider from '@components/notifications/NotificationProvider';

// Pages
import UploadPage from '@pages/UploadPage';
import QueryPage from '@pages/QueryPage';
import ResultsPage from '@pages/ResultsPage';

// Navigation
import Navigation from '@components/navigation/Navigation';

// Create responsive theme with German locale
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    // Responsive typography
    h4: {
      fontSize: '2rem',
      '@media (max-width:600px)': {
        fontSize: '1.5rem',
      },
    },
    h5: {
      fontSize: '1.5rem',
      '@media (max-width:600px)': {
        fontSize: '1.25rem',
      },
    },
    h6: {
      fontSize: '1.25rem',
      '@media (max-width:600px)': {
        fontSize: '1.1rem',
      },
    },
  },
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 900,
      lg: 1200,
      xl: 1536,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          // Responsive button sizing
          '@media (max-width:600px)': {
            minHeight: 44, // Touch-friendly size
            fontSize: '0.875rem',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          // Responsive card padding
          '& .MuiCardContent-root': {
            '@media (max-width:600px)': {
              padding: '16px 12px',
            },
          },
        },
      },
    },
    MuiContainer: {
      styleOverrides: {
        root: {
          '@media (max-width:600px)': {
            paddingLeft: 16,
            paddingRight: 16,
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          // Touch-friendly input fields
          '@media (max-width:600px)': {
            '& .MuiInputBase-input': {
              fontSize: '16px', // Prevents zoom on iOS
            },
          },
        },
      },
    },
    MuiToolbar: {
      styleOverrides: {
        root: {
          // Responsive toolbar padding
          '@media (max-width:600px)': {
            minHeight: 56,
            paddingLeft: 8,
            paddingRight: 8,
          },
        },
      },
    },
  },
}, deDE);

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ErrorBoundary>
        <Router>
          <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            {/* Navigation */}
            <Navigation />
            
            {/* Main Content */}
            <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
              <ErrorBoundary>
                <Routes>
                  <Route path="/" element={<Navigate to="/upload" replace />} />
                  <Route path="/upload" element={<UploadPage />} />
                  <Route path="/query" element={<QueryPage />} />
                  <Route path="/results" element={<ResultsPage />} />
                  <Route path="/results/:queryId" element={<ResultsPage />} />
                  <Route path="*" element={<Navigate to="/upload" replace />} />
                </Routes>
              </ErrorBoundary>
            </Box>
          </Box>
          
          {/* Global Notifications */}
          <NotificationProvider />
        </Router>
      </ErrorBoundary>
    </ThemeProvider>
  );
};

export default App;