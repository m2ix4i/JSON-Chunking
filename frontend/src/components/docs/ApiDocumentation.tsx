import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Paper,
  Button,
  TextField,
  Alert,
  Grid,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Code as CodeIcon,
  PlayArrow as PlayArrowIcon,
  Description as DescriptionIcon,
  Api as ApiIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`api-tabpanel-${index}`}
      aria-labelledby={`api-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

interface ApiEndpoint {
  method: 'GET' | 'POST' | 'DELETE' | 'WS';
  path: string;
  title: string;
  description: string;
  requestSchema?: object;
  responseSchema?: object;
  examples: {
    request?: string;
    response?: string;
    curl?: string;
  };
  parameters?: Array<{
    name: string;
    type: string;
    required: boolean;
    description: string;
  }>;
}

const API_ENDPOINTS: ApiEndpoint[] = [
  {
    method: 'POST',
    path: '/api/query',
    title: 'Query Processing',
    description: 'Verarbeitet eine Anfrage gegen die hochgeladenen IFC-Daten mit intelligenter Intent-Erkennung.',
    requestSchema: {
      query: 'string',
      chunks: 'Chunk[]',
      intent_hint: 'QueryIntent?',
      parameters: 'QueryParameters?',
      max_concurrent: 'number?',
      timeout_seconds: 'number?'
    },
    responseSchema: {
      query_id: 'string',
      original_query: 'string',
      intent: 'QueryIntent',
      status: 'QueryStatus',
      answer: 'string',
      chunk_results: 'ChunkResult[]',
      total_chunks: 'number',
      successful_chunks: 'number',
      processing_time: 'number',
      confidence_score: 'number'
    },
    examples: {
      request: JSON.stringify({
        query: "Wie viele Türen gibt es im Erdgeschoss?",
        chunks: [
          {
            chunk_id: "chunk_001",
            content: "IFC JSON data...",
            chunk_type: "entity_group"
          }
        ],
        intent_hint: "quantity",
        parameters: {
          language: "de",
          precision_level: "standard",
          aggregate_results: true
        }
      }, null, 2),
      response: JSON.stringify({
        query_id: "query_abc123",
        original_query: "Wie viele Türen gibt es im Erdgeschoss?",
        intent: "quantity",
        status: "completed",
        answer: "Im Erdgeschoss befinden sich 12 Türen...",
        chunk_results: [],
        total_chunks: 5,
        successful_chunks: 5,
        processing_time: 2.34,
        confidence_score: 0.89
      }, null, 2),
      curl: `curl -X POST "http://localhost:8000/api/query" \\
  -H "Content-Type: application/json" \\
  -d '{
    "query": "Wie viele Türen gibt es im Erdgeschoss?",
    "chunks": [...],
    "parameters": {"language": "de"}
  }'`
    }
  },
  {
    method: 'GET',
    path: '/api/query/{query_id}/status',
    title: 'Query Status',
    description: 'Ruft den aktuellen Status einer laufenden Abfrage ab.',
    parameters: [
      {
        name: 'query_id',
        type: 'string',
        required: true,
        description: 'Eindeutige ID der Abfrage'
      }
    ],
    responseSchema: {
      query_id: 'string',
      status: 'QueryStatus',
      progress_percentage: 'number',
      current_step: 'number',
      total_steps: 'number',
      message: 'string'
    },
    examples: {
      response: JSON.stringify({
        query_id: "query_abc123",
        status: "processing",
        progress_percentage: 65.5,
        current_step: 3,
        total_steps: 4,
        message: "Verarbeitung von Chunk 3 von 5"
      }, null, 2),
      curl: `curl -X GET "http://localhost:8000/api/query/query_abc123/status"`
    }
  },
  {
    method: 'POST',
    path: '/api/files/upload',
    title: 'File Upload',
    description: 'Lädt IFC JSON-Dateien hoch und erstellt automatisch Chunks für die Verarbeitung.',
    requestSchema: {
      file: 'File (multipart/form-data)',
      chunk_strategy: 'string?',
      chunk_size: 'number?'
    },
    responseSchema: {
      file_id: 'string',
      filename: 'string',
      size: 'number',
      chunks_created: 'number',
      processing_time: 'number',
      chunk_strategy: 'string'
    },
    examples: {
      response: JSON.stringify({
        file_id: "file_xyz789",
        filename: "building_model.ifc.json",
        size: 2548736,
        chunks_created: 45,
        processing_time: 1.23,
        chunk_strategy: "semantic_chunking"
      }, null, 2),
      curl: `curl -X POST "http://localhost:8000/api/files/upload" \\
  -F "file=@building_model.ifc.json" \\
  -F "chunk_strategy=semantic_chunking"`
    }
  },
  {
    method: 'WS',
    path: '/ws/query/{query_id}',
    title: 'Real-time Progress',
    description: 'WebSocket-Verbindung für Echtzeit-Updates während der Abfrageverarbeitung.',
    parameters: [
      {
        name: 'query_id',
        type: 'string',
        required: true,
        description: 'ID der zu verfolgenden Abfrage'
      }
    ],
    examples: {
      response: JSON.stringify({
        event_type: "chunk_completed",
        query_id: "query_abc123",
        current_step: 3,
        total_steps: 5,
        progress_percentage: 60.0,
        message: "Chunk 3 erfolgreich verarbeitet",
        chunk_id: "chunk_003",
        timestamp: 1640995200.123
      }, null, 2)
    }
  }
];

const QUERY_INTENTS = [
  { value: 'quantity', label: 'Mengen (Quantity)', description: 'Wie viel, Wieviele - quantitative Analysen', example: 'Wie viele Türen gibt es?' },
  { value: 'component', label: 'Komponenten (Component)', description: 'Welche, Alle - Bauteilidentifikation', example: 'Welche Fenstertypen gibt es?' },
  { value: 'material', label: 'Materialien (Material)', description: 'Material, Stoff - Materialklassifikation', example: 'Welche Materialien werden verwendet?' },
  { value: 'spatial', label: 'Räumlich (Spatial)', description: 'Raum, Stock - Raum/Ort-Abfragen', example: 'Was befindet sich im Erdgeschoss?' },
  { value: 'cost', label: 'Kosten (Cost)', description: 'Kosten, Preis - Kostenanalyse', example: 'Wie hoch sind die Materialkosten?' }
];

export const ApiDocumentation: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [expandedEndpoint, setExpandedEndpoint] = useState<string | false>('POST-/api/query');
  const [testingEndpoint, setTestingEndpoint] = useState<string | null>(null);
  const [testRequestBody, setTestRequestBody] = useState('');
  const { isMobile } = useResponsiveLayout();

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  const handleAccordionChange = (panel: string) => (
    event: React.SyntheticEvent,
    isExpanded: boolean
  ) => {
    setExpandedEndpoint(isExpanded ? panel : false);
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'success';
      case 'POST': return 'primary';
      case 'DELETE': return 'error';
      case 'WS': return 'warning';
      default: return 'default';
    }
  };

  const renderEndpointCard = (endpoint: ApiEndpoint) => {
    const panelId = `${endpoint.method}-${endpoint.path}`;
    const isExpanded = expandedEndpoint === panelId;

    return (
      <Accordion
        key={panelId}
        expanded={isExpanded}
        onChange={handleAccordionChange(panelId)}
        sx={{ mb: 2 }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
            <Chip
              label={endpoint.method}
              color={getMethodColor(endpoint.method) as any}
              size="small"
              sx={{ minWidth: '60px', fontWeight: 'bold' }}
            />
            <Typography variant="h6" sx={{ flex: 1 }}>
              {endpoint.path}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
              {endpoint.title}
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ p: 2 }}>
            <Typography variant="body1" sx={{ mb: 3 }}>
              {endpoint.description}
            </Typography>

            {/* Parameters */}
            {endpoint.parameters && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SettingsIcon fontSize="small" />
                  Parameter
                </Typography>
                <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                  {endpoint.parameters.map((param) => (
                    <Box key={param.name} sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" component="span">
                        {param.name}
                      </Typography>
                      <Chip
                        label={param.type}
                        size="small"
                        sx={{ ml: 1, mr: 2 }}
                      />
                      {param.required && (
                        <Chip
                          label="Erforderlich"
                          size="small"
                          color="error"
                          sx={{ mr: 2 }}
                        />
                      )}
                      <Typography variant="body2" color="text.secondary">
                        {param.description}
                      </Typography>
                    </Box>
                  ))}
                </Paper>
              </Box>
            )}

            <Grid container spacing={3}>
              {/* Request Schema */}
              {endpoint.requestSchema && (
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ApiIcon fontSize="small" />
                    Request Schema
                  </Typography>
                  <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                    <pre style={{ fontSize: '0.875rem', margin: 0, overflow: 'auto' }}>
                      {JSON.stringify(endpoint.requestSchema, null, 2)}
                    </pre>
                  </Paper>
                </Grid>
              )}

              {/* Response Schema */}
              {endpoint.responseSchema && (
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CodeIcon fontSize="small" />
                    Response Schema
                  </Typography>
                  <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                    <pre style={{ fontSize: '0.875rem', margin: 0, overflow: 'auto' }}>
                      {JSON.stringify(endpoint.responseSchema, null, 2)}
                    </pre>
                  </Paper>
                </Grid>
              )}

              {/* Request Example */}
              {endpoint.examples.request && (
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Beispiel Request
                  </Typography>
                  <Paper sx={{ p: 2, bgcolor: 'grey.900', color: 'white' }}>
                    <pre style={{ fontSize: '0.75rem', margin: 0, overflow: 'auto' }}>
                      {endpoint.examples.request}
                    </pre>
                  </Paper>
                </Grid>
              )}

              {/* Response Example */}
              {endpoint.examples.response && (
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Beispiel Response
                  </Typography>
                  <Paper sx={{ p: 2, bgcolor: 'grey.900', color: 'white' }}>
                    <pre style={{ fontSize: '0.75rem', margin: 0, overflow: 'auto' }}>
                      {endpoint.examples.response}
                    </pre>
                  </Paper>
                </Grid>
              )}

              {/* cURL Example */}
              {endpoint.examples.curl && (
                <Grid item xs={12}>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    cURL Beispiel
                  </Typography>
                  <Paper sx={{ p: 2, bgcolor: 'grey.900', color: 'white' }}>
                    <pre style={{ fontSize: '0.75rem', margin: 0, overflow: 'auto' }}>
                      {endpoint.examples.curl}
                    </pre>
                  </Paper>
                </Grid>
              )}
            </Grid>

            {/* Interactive Testing */}
            {endpoint.method !== 'WS' && (
              <Box sx={{ mt: 3 }}>
                <Button
                  variant="outlined"
                  startIcon={<PlayArrowIcon />}
                  onClick={() => setTestingEndpoint(testingEndpoint === panelId ? null : panelId)}
                  sx={{ mb: 2 }}
                >
                  {testingEndpoint === panelId ? 'Test schließen' : 'API testen'}
                </Button>

                {testingEndpoint === panelId && (
                  <Paper sx={{ p: 3, bgcolor: 'primary.50' }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      Interaktiver API-Test
                    </Typography>
                    <Alert severity="info" sx={{ mb: 2 }}>
                      Diese Funktion wird in einer späteren Version implementiert.
                      Verwenden Sie vorerst die cURL-Beispiele oder ein API-Test-Tool wie Postman.
                    </Alert>
                    {endpoint.requestSchema && (
                      <TextField
                        fullWidth
                        multiline
                        rows={6}
                        label="Request Body (JSON)"
                        value={testRequestBody}
                        onChange={(e) => setTestRequestBody(e.target.value)}
                        placeholder={endpoint.examples.request || 'JSON Request Body hier eingeben...'}
                        sx={{ mb: 2 }}
                      />
                    )}
                    <Button
                      variant="contained"
                      startIcon={<PlayArrowIcon />}
                      disabled
                    >
                      Request senden
                    </Button>
                  </Paper>
                )}
              </Box>
            )}
          </Box>
        </AccordionDetails>
      </Accordion>
    );
  };

  const renderQueryIntentsGuide = () => (
    <Box>
      <Typography variant="h5" sx={{ mb: 3 }}>
        Query Intents - Intelligente Anfrageerkennung
      </Typography>
      <Typography variant="body1" sx={{ mb: 3 }}>
        Das System erkennt automatisch die Absicht Ihrer Anfrage und optimiert die Verarbeitung entsprechend.
        Hier sind die unterstützten Intent-Typen für die Baubranche:
      </Typography>

      {QUERY_INTENTS.map((intent) => (
        <Card key={intent.value} sx={{ mb: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Chip
                label={intent.value.toUpperCase()}
                color="primary"
                variant="outlined"
              />
              <Typography variant="h6">
                {intent.label}
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {intent.description}
            </Typography>
            <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
              <Typography variant="caption" color="text.secondary">
                Beispiel:
              </Typography>
              <Typography variant="body2" fontStyle="italic">
                "{intent.example}"
              </Typography>
            </Paper>
          </CardContent>
        </Card>
      ))}
    </Box>
  );

  const renderWebSocketGuide = () => (
    <Box>
      <Typography variant="h5" sx={{ mb: 3 }}>
        WebSocket Integration - Echtzeit-Updates
      </Typography>
      <Typography variant="body1" sx={{ mb: 3 }}>
        Für Echtzeit-Updates während der Abfrageverarbeitung können Sie eine WebSocket-Verbindung aufbauen.
        Dies ermöglicht es, den Fortschritt der Verarbeitung live zu verfolgen.
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            JavaScript WebSocket Beispiel
          </Typography>
          <Paper sx={{ p: 2, bgcolor: 'grey.900', color: 'white' }}>
            <pre style={{ fontSize: '0.875rem', margin: 0, overflow: 'auto' }}>
{`// WebSocket-Verbindung aufbauen
const ws = new WebSocket('ws://localhost:8000/ws/query/query_abc123');

// Event-Handler
ws.onopen = (event) => {
  console.log('WebSocket verbunden');
};

ws.onmessage = (event) => {
  const progressEvent = JSON.parse(event.data);
  console.log('Fortschritt:', progressEvent);
  
  // Progress UI aktualisieren
  updateProgressBar(progressEvent.progress_percentage);
  showMessage(progressEvent.message);
};

ws.onclose = (event) => {
  console.log('WebSocket geschlossen');
};

ws.onerror = (error) => {
  console.error('WebSocket Fehler:', error);
};`}
            </pre>
          </Paper>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            React Hook Beispiel
          </Typography>
          <Paper sx={{ p: 2, bgcolor: 'grey.900', color: 'white' }}>
            <pre style={{ fontSize: '0.875rem', margin: 0, overflow: 'auto' }}>
{`const useQueryProgress = (queryId: string) => {
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!queryId) return;

    const ws = new WebSocket(\`ws://localhost:8000/ws/query/\${queryId}\`);
    
    ws.onopen = () => setIsConnected(true);
    ws.onclose = () => setIsConnected(false);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setProgress(data.progress_percentage);
      setMessage(data.message);
    };

    return () => ws.close();
  }, [queryId]);

  return { progress, message, isConnected };
};`}
            </pre>
          </Paper>
        </CardContent>
      </Card>
    </Box>
  );

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Tabs
          value={selectedTab}
          onChange={handleTabChange}
          variant={isMobile ? "scrollable" : "standard"}
          scrollButtons="auto"
          sx={{ px: 2 }}
        >
          <Tab
            label="API Endpunkte"
            icon={<ApiIcon />}
            iconPosition="start"
          />
          <Tab
            label="Query Intents"
            icon={<DescriptionIcon />}
            iconPosition="start"
          />
          <Tab
            label="WebSocket"
            icon={<CodeIcon />}
            iconPosition="start"
          />
        </Tabs>
      </Box>

      <TabPanel value={selectedTab} index={0}>
        <Typography variant="h4" sx={{ mb: 3 }}>
          API Endpunkte
        </Typography>
        <Typography variant="body1" sx={{ mb: 4, color: 'text.secondary' }}>
          Vollständige API-Dokumentation mit interaktiven Beispielen für das IFC JSON Chunking System.
          Alle Beispiele sind auf die deutsche Baubranche zugeschnitten.
        </Typography>

        {API_ENDPOINTS.map(renderEndpointCard)}
      </TabPanel>

      <TabPanel value={selectedTab} index={1}>
        {renderQueryIntentsGuide()}
      </TabPanel>

      <TabPanel value={selectedTab} index={2}>
        {renderWebSocketGuide()}
      </TabPanel>
    </Box>
  );
};