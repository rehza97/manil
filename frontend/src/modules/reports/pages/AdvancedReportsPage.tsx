/**
 * Advanced Reports Page
 *
 * Comprehensive reporting system with 7 categories and 28 professional reports.
 * Features live preview with interactive charts and tables.
 */

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  TextField,
  Checkbox,
  FormControlLabel,
  Stack,
  Chip,
  Divider,
  Paper,
  Alert,
} from '@mui/material';
import {
  AttachMoney,
  ShoppingCart,
  People,
  Business,
  Storage,
  Security,
  Dashboard,
  PictureAsPdf,
  TableChart,
  InsertDriveFile,
  FilterList,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers';
import { useQuery } from '@tanstack/react-query';
import { ReportPreview } from '../components/ReportPreview';
import { reportService } from '../services/reportService';
import type { ReportPreviewData } from '../types/report.types';

// Report categories configuration
const REPORT_CATEGORIES = [
  {
    id: 'financial',
    name: 'Rapports financiers',
    icon: AttachMoney,
    color: '#10b981',
    reports: [
      {
        id: 'invoice-aging',
        name: 'Vieillissement des factures',
        description: 'Tranches (0-30, 31-60, 61-90, 90+ jours), montants impayés',
      },
      {
        id: 'payment-status',
        name: 'Statut des paiements',
        description: 'Répartition payé/impayé/en retard, modes de paiement',
      },
      {
        id: 'revenue-recognition',
        name: 'Reconnaissance du chiffre d\'affaires',
        description: 'Résumé, comptabilisé, différé, récurrent',
      },
      {
        id: 'tax-summary',
        name: 'Résumé fiscal',
        description: 'TVA (19 %) et TVA (0,5 %), conformité algérienne',
      },
      {
        id: 'profit-margin',
        name: 'Analyse des marges',
        description: 'Chiffre d\'affaires vs coûts par catégorie, pourcentages de marge',
      },
    ],
  },
  {
    id: 'sales',
    name: 'Rapports ventes',
    icon: ShoppingCart,
    color: '#3b82f6',
    reports: [
      {
        id: 'quote-conversion',
        name: 'Conversion des devis',
        description: 'Taux de conversion devis→commande, valeur pipeline',
      },
      {
        id: 'order-pipeline',
        name: 'Pipeline des commandes',
        description: 'Étapes (brouillon, en attente, confirmée, expédiée), valeurs',
      },
      {
        id: 'product-performance',
        name: 'Performance des produits',
        description: 'Ventes par produit, tendances, meilleurs vendeurs',
      },
      {
        id: 'customer-purchase-patterns',
        name: 'Modèles d\'achat',
        description: 'Fréquence, RFM, cohortes clients',
      },
    ],
  },
  {
    id: 'customers',
    name: 'Intelligence client',
    icon: People,
    color: '#8b5cf6',
    reports: [
      {
        id: 'customer-intelligence',
        name: 'Intelligence client',
        description: 'Segmentation, insights comportementaux',
      },
      {
        id: 'customer-lifetime-value',
        name: 'Valeur vie client (CLV)',
        description: 'CLV, segments de valeur',
      },
      {
        id: 'customer-churn-risk',
        name: 'Risque d\'attrition',
        description: 'Identification clients à risque',
      },
      {
        id: 'customer-satisfaction',
        name: 'Satisfaction client',
        description: 'Scores CSAT, feedback',
      },
    ],
  },
  {
    id: 'operations',
    name: 'Rapports opérations',
    icon: Business,
    color: '#f59e0b',
    reports: [
      {
        id: 'workflow-efficiency',
        name: 'Efficacité des flux',
        description: 'Métriques d\'efficacité des processus',
      },
      {
        id: 'team-productivity',
        name: 'Productivité des équipes',
        description: 'Performance et productivité des équipes',
      },
      {
        id: 'resource-utilization',
        name: 'Utilisation des ressources',
        description: 'Allocation et usage des ressources',
      },
      {
        id: 'sla-compliance',
        name: 'Conformité SLA',
        description: 'Suivi des accords de niveau de service',
      },
    ],
  },
  {
    id: 'hosting',
    name: 'Rapports hébergement',
    icon: Storage,
    color: '#06b6d4',
    reports: [
      {
        id: 'vps-utilization',
        name: 'Utilisation VPS',
        description: 'Usage ressources VPS et capacité',
      },
      {
        id: 'container-performance',
        name: 'Performance conteneurs',
        description: 'Métriques et santé des conteneurs',
      },
      {
        id: 'hosting-revenue',
        name: 'Revenus hébergement',
        description: 'Analyse revenus abonnements VPS',
      },
      {
        id: 'infrastructure-health',
        name: 'Santé infrastructure',
        description: 'Santé système et uptime',
      },
    ],
  },
  {
    id: 'audit',
    name: 'Audit et conformité',
    icon: Security,
    color: '#ef4444',
    reports: [
      {
        id: 'audit-trail',
        name: 'Journal d\'audit',
        description: 'Logs d\'audit système et modifications',
      },
      {
        id: 'compliance-report',
        name: 'Rapport de conformité',
        description: 'Suivi conformité réglementaire',
      },
      {
        id: 'security-events',
        name: 'Événements de sécurité',
        description: 'Incidents et alertes de sécurité',
      },
    ],
  },
  {
    id: 'executive',
    name: 'Rapports direction',
    icon: Dashboard,
    color: '#6366f1',
    reports: [
      {
        id: 'kpi-dashboard',
        name: 'Tableau de bord KPI',
        description: 'Vue d\'ensemble des indicateurs clés de performance',
      },
      {
        id: 'business-health',
        name: 'Santé de l\'entreprise',
        description: 'Métriques globales de santé de l\'entreprise',
      },
      {
        id: 'forecast',
        name: 'Prévisions',
        description: 'Prévisions de revenus et de croissance',
      },
    ],
  },
];

export const AdvancedReportsPage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
  const [endDate, setEndDate] = useState<Date | null>(new Date());
  const [includeCharts, setIncludeCharts] = useState(true);
  const [period, setPeriod] = useState('30-days');

  // Get current category and report
  const currentCategory = REPORT_CATEGORIES.find(c => c.id === selectedCategory);
  const currentReport = currentCategory?.reports.find(r => r.id === selectedReport);

  // Fetch report preview data
  const { data: previewData, isLoading, error, refetch } = useQuery<ReportPreviewData>({
    queryKey: ['advanced-report', selectedCategory, selectedReport, startDate, endDate],
    queryFn: async () => {
      if (!selectedCategory || !selectedReport) return null;
      return reportService.getAdvancedReport(
        selectedCategory,
        selectedReport,
        {
          start_date: startDate?.toISOString(),
          end_date: endDate?.toISOString(),
          format: 'json',
        }
      );
    },
    enabled: !!selectedCategory && !!selectedReport,
  });

  const handleExport = async (format: 'pdf' | 'excel' | 'csv') => {
    if (!selectedCategory || !selectedReport) return;

    try {
      await reportService.downloadAdvancedReport(
        selectedCategory,
        selectedReport,
        {
          start_date: startDate?.toISOString(),
          end_date: endDate?.toISOString(),
          format,
          include_charts: includeCharts,
        }
      );
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const handleQuickPeriod = (days: number) => {
    const end = new Date();
    const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
    setStartDate(start);
    setEndDate(end);
    setPeriod(`${days}-days`);
  };

  const totalReports = REPORT_CATEGORIES.reduce((sum, cat) => sum + cat.reports.length, 0);

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" gutterBottom>
          Système de rapports avancés
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Analytique complète sur tous les modules • {REPORT_CATEGORIES.length} catégories • {totalReports} rapports professionnels
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Left Panel: Categories and Reports */}
        <Grid item xs={12} md={5} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FilterList /> Choisir une catégorie
              </Typography>
              <List>
                {REPORT_CATEGORIES.map((category) => (
                  <React.Fragment key={category.id}>
                    <ListItem disablePadding>
                      <ListItemButton
                        selected={selectedCategory === category.id}
                        onClick={() => {
                          setSelectedCategory(category.id);
                          setSelectedReport(null);
                        }}
                      >
                        <ListItemIcon>
                          <category.icon sx={{ color: category.color }} />
                        </ListItemIcon>
                        <ListItemText
                          primary={category.name}
                          secondary={`${category.reports.length} rapports`}
                        />
                      </ListItemButton>
                    </ListItem>

                    {/* Show reports for selected category */}
                    {selectedCategory === category.id && (
                      <Box sx={{ pl: 4, bgcolor: 'grey.50' }}>
                        {category.reports.map((report) => (
                          <ListItem key={report.id} disablePadding>
                            <ListItemButton
                              selected={selectedReport === report.id}
                              onClick={() => setSelectedReport(report.id)}
                            >
                              <ListItemText
                                primary={report.name}
                                secondary={report.description}
                                primaryTypographyProps={{ variant: 'body2' }}
                                secondaryTypographyProps={{ variant: 'caption' }}
                              />
                            </ListItemButton>
                          </ListItem>
                        ))}
                      </Box>
                    )}
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Right Panel: Parameters and Preview */}
        <Grid item xs={12} md={7} lg={8}>
          {/* Parameters Card */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Paramètres du rapport
              </Typography>

              {!currentReport && (
                <Alert severity="info">
                  Sélectionnez une catégorie et un rapport pour commencer
                </Alert>
              )}

              {currentReport && (
                <>
                  {/* Quick Period Selection */}
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Période
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      <Button
                        variant={period === '30-days' ? 'contained' : 'outlined'}
                        size="small"
                        onClick={() => handleQuickPeriod(30)}
                      >
                        30 derniers jours
                      </Button>
                      <Button
                        variant={period === '90-days' ? 'contained' : 'outlined'}
                        size="small"
                        onClick={() => handleQuickPeriod(90)}
                      >
                        90 jours
                      </Button>
                      <Button
                        variant={period === '365-days' ? 'contained' : 'outlined'}
                        size="small"
                        onClick={() => handleQuickPeriod(365)}
                      >
                        1 an
                      </Button>
                    </Stack>
                  </Box>

                  {/* Date Range */}
                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid item xs={12} sm={6}>
                      <DatePicker
                        label="Date de début"
                        value={startDate}
                        onChange={setStartDate}
                        slotProps={{
                          textField: { fullWidth: true, size: 'small' }
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <DatePicker
                        label="To Date"
                        value={endDate}
                        onChange={setEndDate}
                        slotProps={{
                          textField: { fullWidth: true, size: 'small' }
                        }}
                      />
                    </Grid>
                  </Grid>

                  {/* Options */}
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Options
                    </Typography>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={includeCharts}
                          onChange={(e) => setIncludeCharts(e.target.checked)}
                        />
                      }
                      label="Inclure graphiques et visualisations"
                    />
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  {/* Export Buttons */}
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    <Button
                      variant="contained"
                      startIcon={<PictureAsPdf />}
                      onClick={() => handleExport('pdf')}
                    >
                      Générer PDF avec graphiques
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<TableChart />}
                      onClick={() => handleExport('excel')}
                    >
                      Excel (multi-feuilles)
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<InsertDriveFile />}
                      onClick={() => handleExport('csv')}
                    >
                      Exporter CSV
                    </Button>
                  </Stack>

                  {/* Report Info */}
                  <Paper sx={{ mt: 2, p: 2, bgcolor: 'grey.50' }}>
                    <Typography variant="h6" gutterBottom>
                      {currentReport.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      {currentReport.description}
                    </Typography>
                    <Stack direction="row" spacing={1}>
                      <Chip label={`Catégorie: ${currentCategory?.name}`} size="small" />
                      <Chip
                        label={`Plage de dates: ${startDate?.toLocaleDateString('fr-FR')} — ${endDate?.toLocaleDateString('fr-FR')}`}
                        size="small"
                      />
                      <Chip label={includeCharts ? 'Visualisations: Activé' : 'Visualisations: Désactivé'} size="small" />
                    </Stack>
                    <Alert severity="info" sx={{ mt: 2 }}>
                      Le rapport sera généré avec les paramètres actuels
                    </Alert>
                  </Paper>
                </>
              )}
            </CardContent>
          </Card>

          {/* Live Preview */}
          {currentReport && (
            <ReportPreview
              data={previewData}
              loading={isLoading}
              error={error?.message}
              onExport={handleExport}
              onRefresh={() => refetch()}
            />
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

export default AdvancedReportsPage;
