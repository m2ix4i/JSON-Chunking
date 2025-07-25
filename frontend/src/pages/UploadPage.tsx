/**
 * Upload page - drag-and-drop file upload interface.
 */

import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert,
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Description as FileIcon,
  Security as SecurityIcon,
  Speed as SpeedIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

// Components
import FileDropzone from '@components/upload/FileDropzone';

// Store hooks
import { useFiles } from '@stores/fileStore';
import { showSuccessNotification } from '@stores/appStore';

// Types
import type { UploadedFile } from '@types/app';

const UploadPage: React.FC = () => {
  const navigate = useNavigate();
  const files = useFiles();

  const handleFileUploaded = (file: UploadedFile) => {
    showSuccessNotification(
      `Datei "${file.filename}" erfolgreich hochgeladen. Sie können jetzt Abfragen erstellen.`
    );
  };

  const features = [
    {
      icon: <FileIcon color="primary" />,
      title: 'IFC JSON-Unterstützung',
      description: 'Vollständige Unterstützung für IFC JSON-Dateien aus gängigen Konvertierungstools',
    },
    {
      icon: <SecurityIcon color="success" />,
      title: 'Sichere Verarbeitung',
      description: 'Dateien werden sicher verarbeitet und validiert, bevor sie zur Analyse verwendet werden',
    },
    {
      icon: <SpeedIcon color="warning" />,
      title: 'Schnelle Analyse',
      description: 'Optimierte Chunking-Algorithmen für effiziente Verarbeitung großer IFC-Datensätze',
    },
  ];

  return (
    <Box>
      {/* Page header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Datei hochladen
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Laden Sie Ihre IFC JSON-Dateien hoch, um mit der intelligenten Gebäudedatenanalyse zu beginnen.
          Das System unterstützt Dateien bis 100 MB und kann mehrere Dateien gleichzeitig verarbeiten.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Upload area */}
        <Grid item xs={12} lg={8}>
          <FileDropzone
            onFileUploaded={handleFileUploaded}
            maxFiles={10}
            maxSizeMB={100}
          />
        </Grid>

        {/* Information sidebar */}
        <Grid item xs={12} lg={4}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Features */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Unterstützte Features
                </Typography>
                
                <List dense>
                  {features.map((feature, index) => (
                    <ListItem key={index} sx={{ px: 0 }}>
                      <ListItemIcon sx={{ minWidth: 40 }}>
                        {feature.icon}
                      </ListItemIcon>
                      <ListItemText
                        primary={feature.title}
                        secondary={feature.description}
                        primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                        secondaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>

            {/* Next steps */}
            {files.length > 0 && (
              <Alert severity="success">
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  Dateien erfolgreich hochgeladen!
                </Typography>
                <Typography variant="body2">
                  Sie können jetzt zur{' '}
                  <Typography
                    component="span"
                    sx={{ textDecoration: 'underline', cursor: 'pointer', fontWeight: 500 }}
                    onClick={() => navigate('/query')}
                  >
                    Abfrage-Seite
                  </Typography>
                  {' '}wechseln, um intelligente Analysen zu erstellen.
                </Typography>
              </Alert>
            )}

            {/* File format info */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Unterstützte Dateiformate
                </Typography>
                
                <List dense>
                  <ListItem sx={{ px: 0 }}>
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      <CheckIcon color="success" />
                    </ListItemIcon>
                    <ListItemText
                      primary="IFC JSON (.json)"
                      secondary="Aus IFC-zu-JSON Konvertierungstools"
                      primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                      secondaryTypographyProps={{ variant: 'body2' }}
                    />
                  </ListItem>
                </List>
                
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  Die Dateien sollten gültige IFC-Datenstrukturen enthalten und aus
                  vertrauenswürdigen Konvertierungstools stammen, um optimale Analyseergebnisse zu erzielen.
                </Typography>
              </CardContent>
            </Card>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default UploadPage;