import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Breadcrumbs,
  Link,
  useTheme,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  IconButton,
  AppBar,
  Toolbar,
  useMediaQuery
} from '@mui/material';
import {
  Menu as MenuIcon,
  Home as HomeIcon,
  Api as ApiIcon,
  Code as CodeIcon,
  School as SchoolIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { ApiDocumentation } from '../components/docs/ApiDocumentation';
import { ApiTester } from '../components/docs/ApiTester';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';

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
      id={`docs-tabpanel-${index}`}
      aria-labelledby={`docs-tab-${index}`}
      {...other}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const NAVIGATION_ITEMS: NavigationItem[] = [
  {
    id: 'overview',
    label: 'Übersicht',
    icon: <HomeIcon />,
    description: 'Einführung in das IFC JSON Chunking System'
  },
  {
    id: 'api-docs',
    label: 'API Dokumentation',
    icon: <ApiIcon />,
    description: 'Vollständige API-Referenz mit Beispielen'
  },
  {
    id: 'api-tester',
    label: 'API Tester',
    icon: <CodeIcon />,
    description: 'Interaktive API-Tests und Experimente'
  },
  {
    id: 'tutorials',
    label: 'Tutorials',
    icon: <SchoolIcon />,
    description: 'Schritt-für-Schritt Anleitungen'
  },
  {
    id: 'configuration',
    label: 'Konfiguration',
    icon: <SettingsIcon />,
    description: 'System-Konfiguration und Einstellungen'
  }
];

export const DocumentationPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const theme = useTheme();
  useResponsiveLayout();
  const isMobileView = useMediaQuery(theme.breakpoints.down('md'));

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    if (isMobileView) {
      setMobileDrawerOpen(false);
    }
  };

  const renderOverview = () => (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h3" component="h1" sx={{ mb: 3 }}>
        IFC JSON Chunking System
      </Typography>
      <Typography variant="h5" color="text.secondary" sx={{ mb: 4 }}>
        Intelligente Verarbeitung und Analyse von IFC-Gebäudedaten für die deutsche Baubranche
      </Typography>

      <Paper sx={{ p: 4, mb: 4 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Was ist das IFC JSON Chunking System?
        </Typography>
        <Typography variant="body1" sx={{ mb: 3 }}>
          Das IFC JSON Chunking System ist eine fortschrittliche Plattform zur intelligenten Verarbeitung
          und Analyse von IFC (Industry Foundation Classes) Gebäudedaten. Es ermöglicht es Architekten,
          Ingenieuren und Bauexperten, komplexe Gebäudeinformationen effizient zu durchsuchen und zu analysieren.
        </Typography>

        <Typography variant="h6" sx={{ mb: 2 }}>
          Hauptfunktionen
        </Typography>
        <Box component="ul" sx={{ pl: 3, mb: 3 }}>
          <li>
            <Typography variant="body1" sx={{ mb: 1 }}>
              <strong>Intelligente Query-Verarbeitung</strong>: Natürlichsprachige Anfragen in deutscher Sprache
              mit automatischer Intent-Erkennung (Mengen, Kompo nenten, Materialien, Räume, Kosten)
            </Typography>
          </li>
          <li>
            <Typography variant="body1" sx={{ mb: 1 }}>
              <strong>Chunk-basierte Verarbeitung</strong>: Effiziente Auftelung großer IFC-Dateien in
              verarbeitbare Segmente mit semantischer Gruppierung
            </Typography>
          </li>
          <li>
            <Typography variant="body1" sx={{ mb: 1 }}>
              <strong>Echtzeit-Progress</strong>: WebSocket-basierte Fortschrittsverfolgung für
              langwierige Analyseprozesse
            </Typography>
          </li>
          <li>
            <Typography variant="body1" sx={{ mb: 1 }}>
              <strong>LLM-Integration</strong>: Fortschrittliche KI-basierte Datenextraktion und -analyse
              mit Google Gemini Integration
            </Typography>
          </li>
          <li>
            <Typography variant="body1" sx={{ mb: 1 }}>
              <strong>Responsive Web-Interface</strong>: Moderne React-basierte Benutzeroberfläche
              optimiert für Desktop und mobile Geräte
            </Typography>
          </li>
        </Box>

        <Typography variant="h6" sx={{ mb: 2 }}>
          Typische Anwendungsfälle
        </Typography>
        <Box component="ul" sx={{ pl: 3 }}>
          <li>
            <Typography variant="body1" sx={{ mb: 1 }}>
              <strong>Mengenermittlung</strong>: "Wie viele Türen gibt es im Erdgeschoss?"
            </Typography>
          </li>
          <li>
            <Typography variant="body1" sx={{ mb: 1 }}>
              <strong>Materialanalyse</strong>: "Welche Materialien werden in den Außenwänden verwendet?"
            </Typography>
          </li>
          <li>
            <Typography variant="body1" sx={{ mb: 1 }}>
              <strong>Raumanalyse</strong>: "Was befindet sich im ersten Obergeschoss?"
            </Typography>
          </li>
          <li>
            <Typography variant="body1" sx={{ mb: 1 }}>
              <strong>Kostenanalyse</strong>: "Wie hoch sind die Materialkosten für die Fassade?"
            </Typography>
          </li>
        </Box>
      </Paper>

      <Paper sx={{ p: 4 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Erste Schritte
        </Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          1. Laden Sie Ihre IFC JSON-Datei über die Upload-Seite hoch
        </Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          2. Stellen Sie Ihre Frage in natürlicher deutscher Sprache
        </Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          3. Verfolgen Sie den Verarbeitungsfortschritt in Echtzeit
        </Typography>
        <Typography variant="body1">
          4. Erhalten Sie strukturierte Antworten mit detaillierten Analyseergebnissen
        </Typography>
      </Paper>
    </Container>
  );

  const renderTutorials = () => (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Tutorials und Anleitungen
      </Typography>
      
      <Paper sx={{ p: 4, mb: 4 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Tutorial 1: Erste IFC-Datei hochladen und analysieren
        </Typography>
        <Typography variant="body1" sx={{ mb: 3 }}>
          Eine Schritt-für-Schritt Anleitung für Ihren ersten Analysevorgang.
        </Typography>
        
        <Box component="ol" sx={{ pl: 3, mb: 3 }}>
          <li>
            <Typography variant="body1" sx={{ mb: 2 }}>
              <strong>Datei vorbereiten</strong>: Stellen Sie sicher, dass Ihre IFC-Datei bereits
              in JSON-Format konvertiert wurde. Unterstützte Dateiformate: .json, .ifc.json
            </Typography>
          </li>
          <li>
            <Typography variant="body1" sx={{ mb: 2 }}>
              <strong>Upload durchführen</strong>: Navigieren Sie zur Upload-Seite und ziehen Sie
              Ihre Datei in den Upload-Bereich oder klicken Sie zum Auswählen
            </Typography>
          </li>
          <li>
            <Typography variant="body1" sx={{ mb: 2 }}>
              <strong>Chunking-Strategie wählen</strong>: Wählen Sie die geeignete Chunking-Strategie:
              - Semantic Chunking (empfohlen für komplexe Analysen)
              - Entity Grouping (für strukturierte Abfragen)
              - Size-based (für große Dateien)
            </Typography>
          </li>
          <li>
            <Typography variant="body1" sx={{ mb: 2 }}>
              <strong>Erste Abfrage stellen</strong>: Gehen Sie zur Query-Seite und stellen Sie
              eine einfache Frage wie "Wie viele Räume gibt es?"
            </Typography>
          </li>
          <li>
            <Typography variant="body1" sx={{ mb: 2 }}>
              <strong>Ergebnis interpretieren</strong>: Das System zeigt Ihnen die Antwort zusammen
              mit Konfidenz-Scores und detaillierten Analysedetails
            </Typography>
          </li>
        </Box>
      </Paper>

      <Paper sx={{ p: 4, mb: 4 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Tutorial 2: Erweiterte Query-Techniken
        </Typography>
        <Typography variant="body1" sx={{ mb: 3 }}>
          Lernen Sie, wie Sie komplexe Anfragen für detaillierte Analysen formulieren.
        </Typography>

        <Typography variant="subtitle1" sx={{ mb: 2 }}>
          Intent-spezifische Fragen:
        </Typography>
        <Box component="ul" sx={{ pl: 3, mb: 3 }}>
          <li><Typography variant="body2">Quantity: "Wieviele Fenster gibt es in der Südfassade?"</Typography></li>
          <li><Typography variant="body2">Material: "Aus welchem Material bestehen die Innenwände?"</Typography></li>
          <li><Typography variant="body2">Spatial: "Welche Räume befinden sich im 2. Obergeschoss?"</Typography></li>
          <li><Typography variant="body2">Component: "Alle Stützen im Erdgeschoss auflisten"</Typography></li>
          <li><Typography variant="body2">Cost: "Materialkosten für die Dachkonstruktion"</Typography></li>
        </Box>

        <Typography variant="subtitle1" sx={{ mb: 2 }}>
          Parameter für präzisere Ergebnisse:
        </Typography>
        <Box component="ul" sx={{ pl: 3 }}>
          <li><Typography variant="body2">Precision Level: "standard", "high" für detailliertere Analysen</Typography></li>
          <li><Typography variant="body2">Entity Types: Einschränkung auf bestimmte IFC-Entitätstypen</Typography></li>
          <li><Typography variant="body2">Spatial Constraints: Filterung nach Räumen oder Ebenen</Typography></li>
        </Box>
      </Paper>

      <Paper sx={{ p: 4 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Tutorial 3: API-Integration für Entwickler
        </Typography>
        <Typography variant="body1" sx={{ mb: 3 }}>
          Integration des IFC JSON Chunking Systems in Ihre eigenen Anwendungen.
        </Typography>

        <Typography variant="subtitle1" sx={{ mb: 2 }}>
          Basis-Integration:
        </Typography>
        <Paper sx={{ p: 2, bgcolor: 'grey.900', color: 'white', mb: 3 }}>
          <pre style={{ fontSize: '0.875rem', margin: 0, overflow: 'auto' }}>
{`// JavaScript Beispiel
const response = await fetch('/api/query', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    query: 'Wie viele Türen gibt es?',
    chunks: uploadedChunks,
    parameters: {
      language: 'de',
      precision_level: 'standard'
    }
  })
});

const result = await response.json();
console.log('Antwort:', result.answer);`}
          </pre>
        </Paper>

        <Typography variant="subtitle1" sx={{ mb: 2 }}>
          WebSocket für Progress-Updates:
        </Typography>
        <Paper sx={{ p: 2, bgcolor: 'grey.900', color: 'white' }}>
          <pre style={{ fontSize: '0.875rem', margin: 0, overflow: 'auto' }}>
{`// WebSocket Progress Tracking
const ws = new WebSocket(\`ws://localhost:8000/ws/query/\${queryId}\`);
ws.onmessage = (event) => {
  const progress = JSON.parse(event.data);
  updateProgressBar(progress.progress_percentage);
};`}
          </pre>
        </Paper>
      </Paper>
    </Container>
  );

  const renderConfiguration = () => (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        System-Konfiguration
      </Typography>

      <Paper sx={{ p: 4, mb: 4 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Umgebungsvariablen
        </Typography>
        <Typography variant="body1" sx={{ mb: 3 }}>
          Konfigurieren Sie das System über Umgebungsvariablen oder eine .env-Datei:
        </Typography>

        <Paper sx={{ p: 2, bgcolor: 'grey.50', mb: 3 }}>
          <pre style={{ fontSize: '0.875rem', margin: 0 }}>
{`# API-Konfiguration
GEMINI_API_KEY=your_api_key_here
TARGET_LLM_MODEL=gemini-pro
REQUEST_TIMEOUT=30

# Rate Limiting
RATE_LIMIT_RPM=60
MAX_CONCURRENT_REQUESTS=10

# Chunking-Einstellungen
DEFAULT_CHUNK_SIZE=8000
OVERLAP_SIZE=200
MAX_CHUNK_COUNT=100

# WebSocket-Konfiguration
WS_HEARTBEAT_INTERVAL=30
WS_MAX_CONNECTIONS=100

# Logging
LOG_LEVEL=INFO
LOG_FILE_PATH=./logs/app.log`}
          </pre>
        </Paper>
      </Paper>

      <Paper sx={{ p: 4, mb: 4 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Chunking-Strategien
        </Typography>
        <Typography variant="body1" sx={{ mb: 3 }}>
          Verschiedene Strategien für die Aufteilung von IFC-Daten:
        </Typography>

        <Box component="ul" sx={{ pl: 3, mb: 3 }}>
          <li>
            <Typography variant="body1" sx={{ mb: 2 }}>
              <strong>SemanticChunkingStrategy</strong>: Intelligente Gruppierung basierend auf
              semantischen Beziehungen (empfohlen für komplexe Analysen)
            </Typography>
          </li>
          <li>
            <Typography variant="body1" sx={{ mb: 2 }}>
              <strong>EntityGroupingStrategy</strong>: Gruppierung nach IFC-Entitätstypen
              (optimal für strukturierte Abfragen)
            </Typography>
          </li>
          <li>
            <Typography variant="body1" sx={{ mb: 2 }}>
              <strong>SizeBasedStrategy</strong>: Einfache größenbasierte Aufteilung
              (für sehr große Dateien)
            </Typography>
          </li>
          <li>
            <Typography variant="body1" sx={{ mb: 2 }}>
              <strong>RelationshipPreservingStrategy</strong>: Erhaltung von IFC-Beziehungen
              über Chunk-Grenzen hinweg
            </Typography>
          </li>
        </Box>
      </Paper>

      <Paper sx={{ p: 4 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Performance-Optimierung
        </Typography>
        <Typography variant="body1" sx={{ mb: 3 }}>
          Empfehlungen für optimale System-Performance:
        </Typography>

        <Box component="ul" sx={{ pl: 3 }}>
          <li>
            <Typography variant="body1" sx={{ mb: 1 }}>
              <strong>Chunk-Größe</strong>: 8000-12000 Token für optimale LLM-Performance
            </Typography>
          </li>
          <li>
            <Typography variant="body1" sx={{ mb: 1 }}>
              <strong>Parallelisierung</strong>: Max. 10 gleichzeitige Requests bei Standard-API-Limits
            </Typography>
          </li>
          <li>
            <Typography variant="body1" sx={{ mb: 1 }}>
              <strong>Caching</strong>: Aktivieren Sie Caching für häufig verwendete Anfragen
            </Typography>
          </li>
          <li>
            <Typography variant="body1" sx={{ mb: 1 }}>
              <strong>Memory</strong>: Min. 4GB RAM für größere IFC-Dateien empfohlen
            </Typography>
          </li>
        </Box>
      </Paper>
    </Container>
  );

  const drawerContent = (
    <Box sx={{ width: 280, py: 2 }}>
      <Typography variant="h6" sx={{ px: 2, mb: 2 }}>
        Dokumentation
      </Typography>
      <List>
        {NAVIGATION_ITEMS.map((item, index) => (
          <ListItem key={item.id} disablePadding>
            <ListItemButton
              selected={activeTab === index}
              onClick={() => handleTabChange({} as any, index)}
            >
              <Box sx={{ mr: 2 }}>{item.icon}</Box>
              <ListItemText
                primary={item.label}
                secondary={item.description}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Desktop Sidebar */}
      {!isMobileView && (
        <Drawer
          variant="permanent"
          sx={{
            width: 280,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: 280,
              boxSizing: 'border-box',
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}

      {/* Mobile Drawer */}
      {isMobileView && (
        <Drawer
          variant="temporary"
          open={mobileDrawerOpen}
          onClose={() => setMobileDrawerOpen(false)}
          ModalProps={{
            keepMounted: true,
          }}
        >
          {drawerContent}
        </Drawer>
      )}

      {/* Main Content */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Mobile App Bar */}
        {isMobileView && (
          <AppBar position="static">
            <Toolbar>
              <IconButton
                color="inherit"
                edge="start"
                onClick={() => setMobileDrawerOpen(true)}
                sx={{ mr: 2 }}
              >
                <MenuIcon />
              </IconButton>
              <Typography variant="h6">
                {NAVIGATION_ITEMS[activeTab]?.label || 'Dokumentation'}
              </Typography>
            </Toolbar>
          </AppBar>
        )}

        {/* Breadcrumbs */}
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Breadcrumbs>
            <Link underline="hover" color="inherit" href="/">
              Home
            </Link>
            <Typography color="text.primary">
              {NAVIGATION_ITEMS[activeTab]?.label || 'Dokumentation'}
            </Typography>
          </Breadcrumbs>
        </Box>

        {/* Tab Content */}
        <Box sx={{ flexGrow: 1, bgcolor: 'background.default' }}>
          <TabPanel value={activeTab} index={0}>
            {renderOverview()}
          </TabPanel>
          <TabPanel value={activeTab} index={1}>
            <ApiDocumentation />
          </TabPanel>
          <TabPanel value={activeTab} index={2}>
            <ApiTester />
          </TabPanel>
          <TabPanel value={activeTab} index={3}>
            {renderTutorials()}
          </TabPanel>
          <TabPanel value={activeTab} index={4}>
            {renderConfiguration()}
          </TabPanel>
        </Box>
      </Box>
    </Box>
  );
};