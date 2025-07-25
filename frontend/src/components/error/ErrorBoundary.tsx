/**
 * Error boundary component for catching and handling React errors gracefully.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  AlertTitle,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
} from '@mui/material';
import {
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandIcon,
  BugReport as BugIcon,
} from '@mui/icons-material';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    const errorId = `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return {
      hasError: true,
      error,
      errorId,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // In production, you might want to send this to an error reporting service
    // reportError(error, errorInfo, this.state.errorId);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <ErrorIcon sx={{ fontSize: 48, color: 'error.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4" component="h1" color="error">
                    Ups! Etwas ist schiefgelaufen
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Es ist ein unerwarteter Fehler aufgetreten. Bitte versuchen Sie es erneut.
                  </Typography>
                </Box>
              </Box>

              <Alert severity="error" sx={{ mb: 3 }}>
                <AlertTitle>Fehler-Details</AlertTitle>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', mt: 1 }}>
                  ID: {this.state.errorId}
                </Typography>
                {this.state.error && (
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {this.state.error.message}
                  </Typography>
                )}
              </Alert>

              <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <Button
                  variant="contained"
                  startIcon={<RefreshIcon />}
                  onClick={this.handleReset}
                >
                  Erneut versuchen
                </Button>
                <Button
                  variant="outlined"
                  onClick={this.handleReload}
                >
                  Seite neu laden
                </Button>
              </Box>

              {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandIcon />}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <BugIcon sx={{ mr: 1 }} />
                        <Typography variant="h6">
                          Entwickler-Informationen
                        </Typography>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography variant="body2" component="pre" sx={{ 
                        fontFamily: 'monospace',
                        whiteSpace: 'pre-wrap',
                        fontSize: '0.75rem',
                        backgroundColor: 'grey.100',
                        p: 2,
                        borderRadius: 1,
                        overflow: 'auto',
                      }}>
                        {this.state.error && this.state.error.stack}
                        {'\n\n--- Component Stack ---\n'}
                        {this.state.errorInfo.componentStack}
                      </Typography>
                    </AccordionDetails>
                  </Accordion>
                </>
              )}
            </CardContent>
          </Card>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;