import React, { useState, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  Chip,
  Paper,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Divider,
  IconButton,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  PlayArrow as PlayArrowIcon,
  ContentCopy as CopyIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';

interface ApiTestRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  endpoint: string;
  headers: Record<string, string>;
  body?: string;
}

interface ApiTestResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  timing: number;
}

interface TestScenario {
  name: string;
  description: string;
  request: ApiTestRequest;
  expectedStatus: number;
}

const TEST_SCENARIOS: TestScenario[] = [
  {
    name: 'Einfache Mengen-Abfrage',
    description: 'Fragt nach der Anzahl von Türen im Gebäude',
    request: {
      method: 'POST',
      endpoint: '/api/query',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: 'Wie viele Türen gibt es im Gebäude?',
        chunks: [
          {
            chunk_id: 'demo_chunk_001',
            content: '{"IfcDoor": [{"GlobalId": "1A2B3C", "Name": "Eingangstür", "ObjectType": "Door"}]}',
            chunk_type: 'entity_group'
          }
        ],
        parameters: {
          language: 'de',
          precision_level: 'standard'
        }
      }, null, 2)
    },
    expectedStatus: 200
  },
  {
    name: 'Material-Analyse',
    description: 'Analysiert verwendete Materialien im Gebäude',
    request: {
      method: 'POST',
      endpoint: '/api/query',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: 'Welche Materialien werden in den Wänden verwendet?',
        chunks: [
          {
            chunk_id: 'demo_chunk_002',
            content: '{"IfcMaterial": [{"Name": "Beton C25/30", "Category": "Concrete"}]}',
            chunk_type: 'material_group'
          }
        ],
        parameters: {
          language: 'de',
          precision_level: 'high'
        }
      }, null, 2)
    },
    expectedStatus: 200
  },
  {
    name: 'Query Status abrufen',
    description: 'Ruft den Status einer laufenden Abfrage ab',
    request: {
      method: 'GET',
      endpoint: '/api/query/demo_query_123/status',
      headers: {}
    },
    expectedStatus: 200
  },
  {
    name: 'System Health Check',
    description: 'Überprüft die Systemgesundheit',
    request: {
      method: 'GET',
      endpoint: '/api/health',
      headers: {}
    },
    expectedStatus: 200
  }
];

export const ApiTester: React.FC = () => {
  const [selectedScenario, setSelectedScenario] = useState<TestScenario>(TEST_SCENARIOS[0]);
  const [customRequest, setCustomRequest] = useState<ApiTestRequest>({
    method: 'POST',
    endpoint: '/api/query',
    headers: { 'Content-Type': 'application/json' },
    body: ''
  });
  const [response, setResponse] = useState<ApiTestResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useCustomRequest, setUseCustomRequest] = useState(false);
  const { isMobile } = useResponsiveLayout();

  const executeRequest = useCallback(async (request: ApiTestRequest) => {
    setIsLoading(true);
    setError(null);
    setResponse(null);

    const startTime = performance.now();

    try {
      // Mock API response for demonstration
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

      const mockResponse: ApiTestResponse = {
        status: 200,
        statusText: 'OK',
        headers: {
          'content-type': 'application/json',
          'x-response-time': '1.23s'
        },
        body: generateMockResponse(request),
        timing: performance.now() - startTime
      };

      setResponse(mockResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const generateMockResponse = (request: ApiTestRequest): string => {
    if (request.endpoint === '/api/health') {
      return JSON.stringify({
        status: 'healthy',
        version: '1.0.0',
        uptime: 3600,
        components: {
          database: true,
          llm_service: true,
          file_storage: true
        }
      }, null, 2);
    }

    if (request.endpoint.includes('/status')) {
      return JSON.stringify({
        query_id: 'demo_query_123',
        status: 'completed',
        progress_percentage: 100,
        current_step: 4,
        total_steps: 4,
        message: 'Abfrageverarbeitung erfolgreich abgeschlossen'
      }, null, 2);
    }

    // Query response
    return JSON.stringify({
      query_id: 'demo_query_' + Math.random().toString(36).substr(2, 9),
      original_query: 'Wie viele Türen gibt es im Gebäude?',
      intent: 'quantity',
      status: 'completed',
      answer: 'Im analysierten Gebäude wurden insgesamt 24 Türen gefunden. Davon sind 18 Innentüren und 6 Außentüren. Die Türen sind auf 3 Etagen verteilt: Erdgeschoss (10 Türen), 1. Obergeschoss (8 Türen), 2. Obergeschoss (6 Türen).',
      chunk_results: [
        {
          chunk_id: 'demo_chunk_001',
          status: 'completed',
          confidence_score: 0.92,
          extraction_quality: 'high'
        }
      ],
      total_chunks: 1,
      successful_chunks: 1,
      failed_chunks: 0,
      processing_time: 2.34,
      confidence_score: 0.92,
      completeness_score: 0.95,
      relevance_score: 0.89
    }, null, 2);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'success';
    if (status >= 400 && status < 500) return 'warning';
    if (status >= 500) return 'error';
    return 'default';
  };

  const getStatusIcon = (status: number) => {
    if (status >= 200 && status < 300) return <CheckCircleIcon />;
    if (status >= 400 && status < 500) return <WarningIcon />;
    if (status >= 500) return <ErrorIcon />;
    return null;
  };

  const currentRequest = useCustomRequest ? customRequest : selectedScenario.request;

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        API Tester - Interaktive Tests
      </Typography>
      <Typography variant="body1" sx={{ mb: 4, color: 'text.secondary' }}>
        Testen Sie die API-Endpunkte interaktiv mit vorgefertigten Szenarien oder benutzerdefinierten Anfragen.
      </Typography>

      <Grid container spacing={3}>
        {/* Request Configuration */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 3 }}>
                Request Konfiguration
              </Typography>

              {/* Scenario Selection */}
              <Box sx={{ mb: 3 }}>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Test-Szenario auswählen</InputLabel>
                  <Select
                    value={useCustomRequest ? 'custom' : TEST_SCENARIOS.indexOf(selectedScenario)}
                    onChange={(e) => {
                      if (e.target.value === 'custom') {
                        setUseCustomRequest(true);
                      } else {
                        setUseCustomRequest(false);
                        setSelectedScenario(TEST_SCENARIOS[e.target.value as number]);
                      }
                    }}
                  >
                    {TEST_SCENARIOS.map((scenario, index) => (
                      <MenuItem key={index} value={index}>
                        {scenario.name}
                      </MenuItem>
                    ))}
                    <MenuItem value="custom">Benutzerdefiniert</MenuItem>
                  </Select>
                </FormControl>

                {!useCustomRequest && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    {selectedScenario.description}
                  </Alert>
                )}
              </Box>

              {/* HTTP Method and Endpoint */}
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={3}>
                  <FormControl fullWidth>
                    <InputLabel>Method</InputLabel>
                    <Select
                      value={currentRequest.method}
                      onChange={(e) => {
                        if (useCustomRequest) {
                          setCustomRequest({
                            ...customRequest,
                            method: e.target.value as any
                          });
                        }
                      }}
                      disabled={!useCustomRequest}
                    >
                      <MenuItem value="GET">GET</MenuItem>
                      <MenuItem value="POST">POST</MenuItem>
                      <MenuItem value="DELETE">DELETE</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={9}>
                  <TextField
                    fullWidth
                    label="Endpoint"
                    value={currentRequest.endpoint}
                    onChange={(e) => {
                      if (useCustomRequest) {
                        setCustomRequest({
                          ...customRequest,
                          endpoint: e.target.value
                        });
                      }
                    }}
                    disabled={!useCustomRequest}
                  />
                </Grid>
              </Grid>

              {/* Headers */}
              <Accordion sx={{ mb: 2 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>Headers</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                    <pre style={{ fontSize: '0.875rem', margin: 0 }}>
                      {JSON.stringify(currentRequest.headers, null, 2)}
                    </pre>
                  </Paper>
                </AccordionDetails>
              </Accordion>

              {/* Request Body */}
              {(currentRequest.method === 'POST' || currentRequest.method === 'PUT') && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Request Body
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={8}
                    value={currentRequest.body || ''}
                    onChange={(e) => {
                      if (useCustomRequest) {
                        setCustomRequest({
                          ...customRequest,
                          body: e.target.value
                        });
                      }
                    }}
                    disabled={!useCustomRequest}
                    placeholder="JSON Request Body..."
                    sx={{ 
                      '& .MuiInputBase-input': { 
                        fontFamily: 'monospace',
                        fontSize: '0.875rem'
                      }
                    }}
                  />
                </Box>
              )}

              {/* Execute Button */}
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  startIcon={isLoading ? <CircularProgress size={20} /> : <PlayArrowIcon />}
                  onClick={() => executeRequest(currentRequest)}
                  disabled={isLoading}
                  fullWidth={isMobile}
                >
                  {isLoading ? 'Wird ausgeführt...' : 'Request ausführen'}
                </Button>
                <Tooltip title="Request kopieren">
                  <IconButton
                    onClick={() => copyToClipboard(JSON.stringify(currentRequest, null, 2))}
                  >
                    <CopyIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Response Display */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6">
                  Response
                </Typography>
                {response && (
                  <Tooltip title="Response kopieren">
                    <IconButton
                      onClick={() => copyToClipboard(response.body)}
                      size="small"
                    >
                      <CopyIcon />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>

              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  Fehler: {error}
                </Alert>
              )}

              {isLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              )}

              {response && (
                <Box>
                  {/* Status */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Chip
                      icon={getStatusIcon(response.status)}
                      label={`${response.status} ${response.statusText}`}
                      color={getStatusColor(response.status) as any}
                    />
                    <Typography variant="body2" color="text.secondary">
                      {response.timing.toFixed(0)}ms
                    </Typography>
                  </Box>

                  {/* Headers */}
                  <Accordion sx={{ mb: 2 }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography>Response Headers</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                        <pre style={{ fontSize: '0.875rem', margin: 0 }}>
                          {JSON.stringify(response.headers, null, 2)}
                        </pre>
                      </Paper>
                    </AccordionDetails>
                  </Accordion>

                  {/* Body */}
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Response Body
                  </Typography>
                  <Paper sx={{ p: 2, bgcolor: 'grey.900', color: 'white', maxHeight: 400, overflow: 'auto' }}>
                    <pre style={{ fontSize: '0.75rem', margin: 0, whiteSpace: 'pre-wrap' }}>
                      {response.body}
                    </pre>
                  </Paper>
                </Box>
              )}

              {!response && !isLoading && !error && (
                <Alert severity="info">
                  Wählen Sie ein Szenario aus und klicken Sie auf "Request ausführen", um die API zu testen.
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Information */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Hinweise zum API-Tester
          </Typography>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Dies ist eine Demo-Implementierung. Die Antworten sind simuliert und keine echten API-Aufrufe.
            In der Produktionsversion werden echte HTTP-Requests an die Backend-API gesendet.
          </Alert>
          <Typography variant="body2" color="text.secondary">
            Der API-Tester zeigt die erwartete Funktionalität der verschiedenen Endpunkte.
            Verwenden Sie die vorgefertigten Szenarien für häufige Anwendungsfälle oder erstellen Sie
            benutzerdefinierte Requests für spezielle Tests.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};