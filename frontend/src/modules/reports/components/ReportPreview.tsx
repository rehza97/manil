/**
 * ReportPreview Component
 *
 * Displays live preview of report data with interactive charts and tables
 * before PDF download.
 */

import React, { useState } from 'react';
import {
  Card,
  CardContent,
} from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHead,
  TableRow,
} from '@/shared/components/ui/table';
import { Badge } from '@/shared/components/ui/badge';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Separator } from '@/shared/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/shared/components/ui/tooltip';
import {
  Download,
  FileImage,
  Table2,
  FileSpreadsheet,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Loader2,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import type { ReportPreviewData, ChartConfig, TableData } from '../types/report.types';

interface ReportPreviewProps {
  data: ReportPreviewData;
  loading?: boolean;
  error?: string | null;
  onExport?: (format: 'pdf' | 'excel' | 'csv') => void;
  onRefresh?: () => void;
}

const DEFAULT_COLORS = [
  '#8884d8',
  '#82ca9d',
  '#ffc658',
  '#ff8042',
  '#0088FE',
  '#00C49F',
  '#FFBB28',
  '#FF8042',
  '#a4de6c',
  '#d0ed57',
];

export const ReportPreview: React.FC<ReportPreviewProps> = ({
  data,
  loading = false,
  error = null,
  onExport,
  onRefresh,
}) => {
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!data) {
    return (
      <Alert className="mb-4">
        <AlertDescription>
          No report data available. Please select a report to preview.
        </AlertDescription>
      </Alert>
    );
  }

  const metadata = data.metadata ?? {};
  const exportFormats = data.export_formats ?? [];

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Report Header */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <div className="flex-1">
                <h2 className="text-2xl font-semibold mb-2">
                  {metadata.report_name ?? 'Report'}
                </h2>
                {metadata.description && (
                  <p className="text-sm text-muted-foreground mb-2">
                    {metadata.description}
                  </p>
                )}
                <div className="flex flex-wrap gap-2 mt-2">
                  {metadata.period_label && (
                    <Badge variant="secondary">{metadata.period_label}</Badge>
                  )}
                  {metadata.generated_at && (
                    <Badge variant="outline">
                      Generated: {format(parseISO(metadata.generated_at), 'PPp')}
                    </Badge>
                  )}
                  {metadata.total_records !== undefined && (
                    <Badge variant="outline">
                      {metadata.total_records} records
                    </Badge>
                  )}
                </div>
              </div>

              {/* Export Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                {onRefresh && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={onRefresh}>
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Refresh Report</TooltipContent>
                  </Tooltip>
                )}
                {onExport && exportFormats.includes('pdf') && (
                  <Button onClick={() => onExport('pdf')} size="sm">
                    <FileImage className="mr-2 h-4 w-4" />
                    PDF
                  </Button>
                )}
                {onExport && exportFormats.includes('excel') && (
                  <Button variant="outline" onClick={() => onExport('excel')} size="sm">
                    <Table2 className="mr-2 h-4 w-4" />
                    Excel
                  </Button>
                )}
                {onExport && exportFormats.includes('csv') && (
                  <Button variant="outline" onClick={() => onExport('csv')} size="sm">
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    CSV
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        {data.summary && data.summary.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
            {data.summary.map((stat, index) => (
              <SummaryCard key={stat.key || index} stat={stat} />
            ))}
          </div>
        )}

        {/* Charts */}
        {data.charts && data.charts.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4">Visualizations</h3>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {data.charts.map((chart) => (
                <div
                  key={chart.chart_id}
                  className={chart.chart_type === 'pie' ? 'md:col-span-6' : 'md:col-span-12'}
                >
                  <ChartRenderer chart={chart} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tables */}
        {data.tables && data.tables.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Data Tables</h3>
            <div className="space-y-6">
              {data.tables.map((table) => (
                <DataTableRenderer key={table.table_id} table={table} />
              ))}
            </div>
          </div>
        )}

        {/* Empty state when no summary, charts, or tables */}
        {(!data.summary || data.summary.length === 0) &&
          (!data.charts || data.charts.length === 0) &&
          (!data.tables || data.tables.length === 0) && (
            <Alert className="mb-4">
              <AlertDescription>
                No summary or visualizations for this report.
              </AlertDescription>
            </Alert>
          )}
      </div>
    </TooltipProvider>
  );
};

// Summary Card Component
interface SummaryCardProps {
  stat: {
    label: string;
    value: any;
    format?: string;
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: number;
    icon?: string;
    color?: string;
  };
}

const SummaryCard: React.FC<SummaryCardProps> = ({ stat }) => {
  const formatValue = (value: any, format?: string) => {
    if (value === null || value === undefined) return 'N/A';

    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('fr-DZ', {
          style: 'currency',
          currency: 'DZD',
        }).format(value);
      case 'percentage':
        return `${value}%`;
      case 'number':
        return new Intl.NumberFormat().format(value);
      default:
        return value.toString();
    }
  };

  const getTrendIcon = () => {
    if (!stat.trend) return null;
    switch (stat.trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-destructive" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const trendColorClass =
    stat.trend === 'up'
      ? 'text-green-600'
      : stat.trend === 'down'
        ? 'text-destructive'
        : 'text-muted-foreground';

  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
        <p className="text-2xl font-semibold mb-1">
          {formatValue(stat.value, stat.format)}
        </p>
        {stat.trend && stat.trendValue !== undefined && (
          <div className="flex items-center gap-1">
            {getTrendIcon()}
            <span className={`text-sm ${trendColorClass}`}>
              {Math.abs(stat.trendValue)}%
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Chart Renderer Component
interface ChartRendererProps {
  chart: ChartConfig;
}

const ChartRenderer: React.FC<ChartRendererProps> = ({ chart }) => {
  const colors = chart.colors || DEFAULT_COLORS;

  const renderChart = () => {
    switch (chart.chart_type) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={chart.height || 300}>
            <BarChart data={chart.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={chart.dataKeys?.xAxis || 'name'} />
              <YAxis label={{ value: chart.yAxisLabel, angle: -90, position: 'insideLeft' }} />
              <RechartsTooltip />
              {chart.showLegend && <Legend />}
              {chart.series && chart.series.length > 0 ? (
                chart.series.map((series, index) => (
                  <Bar
                    key={series.dataKey}
                    dataKey={series.dataKey}
                    name={series.name}
                    fill={series.color || colors[index % colors.length]}
                    stackId={chart.stacked ? 'stack' : undefined}
                  />
                ))
              ) : (
                <Bar
                  dataKey={chart.dataKeys?.yAxis || 'value'}
                  fill={colors[0]}
                >
                  {chart.data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Bar>
              )}
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={chart.height || 300}>
            <LineChart data={chart.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={chart.dataKeys?.xAxis || 'name'} />
              <YAxis label={{ value: chart.yAxisLabel, angle: -90, position: 'insideLeft' }} />
              <RechartsTooltip />
              {chart.showLegend && <Legend />}
              {chart.series && chart.series.length > 0 ? (
                chart.series.map((series, index) => (
                  <Line
                    key={series.dataKey}
                    type="monotone"
                    dataKey={series.dataKey}
                    name={series.name}
                    stroke={series.color || colors[index % colors.length]}
                    strokeWidth={2}
                  />
                ))
              ) : (
                <Line
                  type="monotone"
                  dataKey={chart.dataKeys?.yAxis || 'value'}
                  stroke={colors[0]}
                  strokeWidth={2}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={chart.height || 300}>
            <AreaChart data={chart.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={chart.dataKeys?.xAxis || 'name'} />
              <YAxis label={{ value: chart.yAxisLabel, angle: -90, position: 'insideLeft' }} />
              <RechartsTooltip />
              {chart.showLegend && <Legend />}
              {chart.series && chart.series.length > 0 ? (
                chart.series.map((series, index) => (
                  <Area
                    key={series.dataKey}
                    type="monotone"
                    dataKey={series.dataKey}
                    name={series.name}
                    fill={series.color || colors[index % colors.length]}
                    stroke={series.color || colors[index % colors.length]}
                    stackId={chart.stacked ? 'stack' : undefined}
                  />
                ))
              ) : (
                <Area
                  type="monotone"
                  dataKey={chart.dataKeys?.yAxis || 'value'}
                  fill={colors[0]}
                  stroke={colors[0]}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'pie':
      case 'donut':
        return (
          <ResponsiveContainer width="100%" height={chart.height || 300}>
            <PieChart>
              <Pie
                data={chart.data}
                dataKey={chart.dataKeys?.yAxis || 'value'}
                nameKey={chart.dataKeys?.xAxis || 'name'}
                cx="50%"
                cy="50%"
                innerRadius={chart.chart_type === 'donut' ? '40%' : 0}
                outerRadius="80%"
                label
              >
                {chart.data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <RechartsTooltip />
              {chart.showLegend && <Legend />}
            </PieChart>
          </ResponsiveContainer>
        );

      default:
        return (
          <p className="text-sm text-muted-foreground">
            Unsupported chart type: {chart.chart_type}
          </p>
        );
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <h4 className="text-base font-semibold mb-1">{chart.title}</h4>
        {chart.subtitle && (
          <p className="text-sm text-muted-foreground mb-2">{chart.subtitle}</p>
        )}
        <Separator className="my-4" />
        {renderChart()}
      </CardContent>
    </Card>
  );
};

// Data Table Renderer Component
interface DataTableRendererProps {
  table: TableData;
}

const DataTableRenderer: React.FC<DataTableRendererProps> = ({ table }) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(table.pageSize || 10);
  const [sortBy, setSortBy] = useState<string>(table.sortBy || '');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(table.sortOrder || 'asc');

  const handleSort = (columnKey: string) => {
    const isAsc = sortBy === columnKey && sortOrder === 'asc';
    setSortOrder(isAsc ? 'desc' : 'asc');
    setSortBy(columnKey);
  };

  const formatCellValue = (value: any, type: string, format?: string) => {
    if (value === null || value === undefined) return '-';

    switch (type) {
      case 'currency':
        return new Intl.NumberFormat('fr-DZ', {
          style: 'currency',
          currency: 'DZD',
        }).format(value);
      case 'percentage':
        return `${value}%`;
      case 'number':
        return new Intl.NumberFormat().format(value);
      case 'date':
        return format ? format : parseISO(value).toLocaleDateString();
      case 'datetime':
        return format ? format : format(parseISO(value), 'PPp');
      case 'duration':
        return `${value}h`;
      default:
        return value.toString();
    }
  };

  const sortedRows = [...table.rows].sort((a, b) => {
    if (!sortBy) return 0;
    const aVal = a.data[sortBy];
    const bVal = b.data[sortBy];
    if (aVal === bVal) return 0;
    const result = aVal < bVal ? -1 : 1;
    return sortOrder === 'asc' ? result : -result;
  });

  const paginatedRows = table.pagination
    ? sortedRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
    : sortedRows;

  const totalPages = Math.ceil(table.rows.length / rowsPerPage) || 1;
  const alignClass = (align: string) =>
    align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';

  return (
    <Card>
      <CardContent className="pt-6">
        <h4 className="text-base font-semibold mb-1">{table.title}</h4>
        {table.subtitle && (
          <p className="text-sm text-muted-foreground mb-4">{table.subtitle}</p>
        )}

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {table.columns.map((column) => (
                  <TableHead
                    key={column.key}
                    className={alignClass(column.align || 'left')}
                    style={column.width ? { width: column.width } : undefined}
                  >
                    {column.sortable ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-2 h-8 font-medium"
                        onClick={() => handleSort(column.key)}
                      >
                        {column.label}
                        {sortBy === column.key ? (
                          sortOrder === 'asc' ? (
                            <ChevronUp className="ml-1 h-4 w-4" />
                          ) : (
                            <ChevronDown className="ml-1 h-4 w-4" />
                          )
                        ) : (
                          <ArrowUpDown className="ml-1 h-4 w-4 opacity-50" />
                        )}
                      </Button>
                    ) : (
                      column.label
                    )}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedRows.map((row, index) => (
                <TableRow key={index} className={row.className}>
                  {table.columns.map((column) => (
                    <TableCell
                      key={column.key}
                      className={alignClass(column.align || 'left')}
                    >
                      {formatCellValue(row.data[column.key], column.type, column.format)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
              {table.totals && (
                <TableRow className="bg-muted/50 font-semibold">
                  {table.columns.map((column) => (
                    <TableCell
                      key={column.key}
                      className={alignClass(column.align || 'left')}
                    >
                      {table.totals![column.key] !== undefined
                        ? formatCellValue(
                            table.totals![column.key],
                            column.type,
                            column.format
                          )
                        : column.key === table.columns[0].key
                          ? 'Total'
                          : ''}
                    </TableCell>
                  ))}
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {table.pagination && (
          <div className="flex items-center justify-between gap-4 mt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Rows per page</span>
              <select
                aria-label="Rows per page"
                className="h-8 rounded-md border bg-background px-2 text-sm"
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setPage(0);
                }}
              >
                {[5, 10, 25, 50].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <span>
                {page * rowsPerPage + 1}–
                {Math.min(page * rowsPerPage + rowsPerPage, table.rows.length)} of{' '}
                {table.rows.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ReportPreview;
