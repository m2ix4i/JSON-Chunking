/**
 * Main App component for IFC JSON Chunking Frontend.
 * Sets up theme, routing, and global providers with performance optimizations.
 */

import React, { useEffect, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// Store hooks
import { useAppStore, useDarkMode } from '@stores/appStore';

// Service Worker for PWA functionality
import { serviceWorkerManager } from '@/services/serviceWorker';
import { offlineService } from '@/services/offline';
import { syncService } from '@/services/sync';

// Components (non-lazy loaded for immediate availability)
import Layout from '@components/layout/Layout';
import NotificationContainer from '@components/notifications/NotificationContainer';
import ErrorBoundary from '@components/error/ErrorBoundary';
import LazyWrapper from '@components/common/LazyWrapper';
import OfflineIndicator from '@components/common/OfflineIndicator';

// Lazy-loaded pages for code splitting
const Dashboard = lazy(() => import('@pages/Dashboard'));
const UploadPage = lazy(() => import('@pages/UploadPage'));
const QueryPage = lazy(() => import('@pages/QueryPage'));
const ResultsPage = lazy(() => import('@pages/ResultsPage'));
const HistoryPage = lazy(() => import('@pages/HistoryPage'));
const SettingsPage = lazy(() => import('@pages/SettingsPage'));
const DocumentationPage = lazy(() => import('@pages/DocumentationPage').then(module => ({ default: module.DocumentationPage })));

// Query client configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
    },
    mutations: {
      retry: 1,
    },
  },
});

const App: React.FC = () => {
  const darkMode = useDarkMode();
  const initialize = useAppStore((state) => state.initialize);

  // Initialize app on mount
  useEffect(() => {
    initialize();
    
    // Initialize PWA services
    const initializePWA = async () => {
      try {
        // Initialize service worker
        if (import.meta.env.PROD) {
          await serviceWorkerManager.register();
        }
        
        // Initialize offline service
        await offlineService.initialize();
        
        // Initialize sync service
        await syncService.initialize();
        
        console.log('PWA services initialized successfully');
      } catch (error) {
        console.error('PWA services initialization failed:', error);
      }
    };
    
    initializePWA();
  }, [initialize]);

  // Create Material-UI theme
  const theme = createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: {
        main: '#1976d2',
        light: '#42a5f5',
        dark: '#1565c0',
      },
      secondary: {
        main: '#dc004e',
        light: '#f5325b',
        dark: '#9a0036',
      },
      background: {
        default: darkMode ? '#121212' : '#fafafa',
        paper: darkMode ? '#1d1d1d' : '#ffffff',
      },
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h1: {
        fontSize: '2.5rem',
        fontWeight: 600,
        lineHeight: 1.2,
      },
      h2: {
        fontSize: '2rem',
        fontWeight: 600,
        lineHeight: 1.3,
      },
      h3: {
        fontSize: '1.75rem',
        fontWeight: 600,
        lineHeight: 1.4,
      },
      h4: {
        fontSize: '1.5rem',
        fontWeight: 600,
        lineHeight: 1.4,
      },
      h5: {
        fontSize: '1.25rem',
        fontWeight: 600,
        lineHeight: 1.5,
      },
      h6: {
        fontSize: '1.125rem',
        fontWeight: 600,
        lineHeight: 1.5,
      },
      body1: {
        fontSize: '1rem',
        lineHeight: 1.6,
      },
      body2: {
        fontSize: '0.875rem',
        lineHeight: 1.5,
      },
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: 8,
            fontWeight: 500,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            boxShadow: darkMode
              ? '0 4px 6px rgba(0, 0, 0, 0.3)'
              : '0 4px 6px rgba(0, 0, 0, 0.1)',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 12,
          },
        },
      },
      MuiTextField: {
        defaultProps: {
          variant: 'outlined',
        },
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 8,
            },
          },
        },
      },
    },
  });

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <Router>
            <Box sx={{ display: 'flex', minHeight: '100vh' }}>
              <Layout>
                <Routes>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route 
                    path="/dashboard" 
                    element={
                      <LazyWrapper type="page">
                        <Dashboard />
                      </LazyWrapper>
                    } 
                  />
                  <Route 
                    path="/upload" 
                    element={
                      <LazyWrapper type="page">
                        <UploadPage />
                      </LazyWrapper>
                    } 
                  />
                  <Route 
                    path="/query" 
                    element={
                      <LazyWrapper type="page">
                        <QueryPage />
                      </LazyWrapper>
                    } 
                  />
                  <Route 
                    path="/results" 
                    element={
                      <LazyWrapper type="page">
                        <ResultsPage />
                      </LazyWrapper>
                    } 
                  />
                  <Route 
                    path="/results/:queryId" 
                    element={
                      <LazyWrapper type="page">
                        <ResultsPage />
                      </LazyWrapper>
                    } 
                  />
                  <Route 
                    path="/history" 
                    element={
                      <LazyWrapper type="page">
                        <HistoryPage />
                      </LazyWrapper>
                    } 
                  />
                  <Route 
                    path="/settings" 
                    element={
                      <LazyWrapper type="page">
                        <SettingsPage />
                      </LazyWrapper>
                    } 
                  />
                  <Route 
                    path="/docs" 
                    element={
                      <LazyWrapper type="page">
                        <DocumentationPage />
                      </LazyWrapper>
                    } 
                  />
                  <Route 
                    path="/documentation" 
                    element={
                      <LazyWrapper type="page">
                        <DocumentationPage />
                      </LazyWrapper>
                    } 
                  />
                  {/* Catch-all route */}
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </Layout>
            </Box>
          </Router>
          
          {/* Global notification container */}
          <NotificationContainer />
          
          {/* PWA Offline Indicator */}
          <OfflineIndicator />
          
          {/* React Query DevTools (only in development) */}
          {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;