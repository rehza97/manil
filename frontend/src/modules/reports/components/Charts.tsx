/**
 * Reusable Chart Components
 *
 * Collection of chart components built with Recharts for data visualization.
 */

import React from 'react';
import {
  BarChart as RechartsBarChart,
  Bar,
  LineChart as RechartsLineChart,
  Line,
  AreaChart as RechartsAreaChart,
  Area,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { ChartDataPoint, PieChartData, LineChartData } from '../types/report.types';

// Color palette for charts
export const CHART_COLORS = {
  primary: '#3B82F6',
  secondary: '#8B5CF6',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#06B6D4',
  gray: '#6B7280',
  purple: '#A855F7',
  pink: '#EC4899',
  indigo: '#6366F1',
};

export const PIE_COLORS = [
  CHART_COLORS.primary,
  CHART_COLORS.success,
  CHART_COLORS.warning,
  CHART_COLORS.danger,
  CHART_COLORS.secondary,
  CHART_COLORS.info,
  CHART_COLORS.purple,
  CHART_COLORS.pink,
  CHART_COLORS.indigo,
  CHART_COLORS.gray,
];

// ============================================================================
// Bar Chart Component
// ============================================================================

interface BarChartProps {
  data: ChartDataPoint[];
  dataKey?: string;
  xAxisKey?: string;
  title?: string;
  color?: string;
  height?: number;
}

export const BarChart: React.FC<BarChartProps> = ({
  data,
  dataKey = 'value',
  xAxisKey = 'name',
  title,
  color = CHART_COLORS.primary,
  height = 300,
}) => {
  return (
    <div className="w-full">
      {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis dataKey={xAxisKey} stroke="#6B7280" />
          <YAxis stroke="#6B7280" />
          <Tooltip
            contentStyle={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
            }}
          />
          <Legend />
          <Bar dataKey={dataKey} fill={color} radius={[8, 8, 0, 0]} />
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
};

// ============================================================================
// Line Chart Component
// ============================================================================

interface LineChartProps {
  data: LineChartData[];
  lines: Array<{ dataKey: string; name: string; color?: string }>;
  xAxisKey?: string;
  title?: string;
  height?: number;
  formatter?: (value: number) => string;
}

export const LineChart: React.FC<LineChartProps> = ({
  data,
  lines,
  xAxisKey = 'name',
  title,
  height = 300,
  formatter,
}) => {
  return (
    <div className="w-full">
      {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        <RechartsLineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis dataKey={xAxisKey} stroke="#6B7280" />
          <YAxis stroke="#6B7280" />
          <Tooltip
            contentStyle={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
            }}
            formatter={formatter ? (value: any) => formatter(Number(value)) : undefined}
          />
          <Legend />
          {lines.map((line, index) => (
            <Line
              key={line.dataKey}
              type="monotone"
              dataKey={line.dataKey}
              name={line.name}
              stroke={line.color || PIE_COLORS[index % PIE_COLORS.length]}
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          ))}
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
};

// ============================================================================
// Area Chart Component
// ============================================================================

interface AreaChartProps {
  data: LineChartData[];
  areas: Array<{ dataKey: string; name: string; color?: string }>;
  xAxisKey?: string;
  title?: string;
  height?: number;
  stacked?: boolean;
}

export const AreaChart: React.FC<AreaChartProps> = ({
  data,
  areas,
  xAxisKey = 'name',
  title,
  height = 300,
  stacked = false,
}) => {
  return (
    <div className="w-full">
      {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        <RechartsAreaChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <defs>
            {areas.map((area, index) => (
              <linearGradient
                key={`gradient-${area.dataKey}`}
                id={`color${area.dataKey}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stopColor={area.color || PIE_COLORS[index % PIE_COLORS.length]}
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor={area.color || PIE_COLORS[index % PIE_COLORS.length]}
                  stopOpacity={0.1}
                />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis dataKey={xAxisKey} stroke="#6B7280" />
          <YAxis stroke="#6B7280" />
          <Tooltip
            contentStyle={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
            }}
          />
          <Legend />
          {areas.map((area, index) => (
            <Area
              key={area.dataKey}
              type="monotone"
              dataKey={area.dataKey}
              name={area.name}
              stroke={area.color || PIE_COLORS[index % PIE_COLORS.length]}
              fillOpacity={1}
              fill={`url(#color${area.dataKey})`}
              stackId={stacked ? '1' : undefined}
            />
          ))}
        </RechartsAreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// ============================================================================
// Pie Chart Component
// ============================================================================

interface PieChartProps {
  data: PieChartData[];
  title?: string;
  height?: number;
  showPercentage?: boolean;
  innerRadius?: number; // For donut chart
}

export const PieChart: React.FC<PieChartProps> = ({
  data,
  title,
  height = 300,
  showPercentage = true,
  innerRadius = 0,
}) => {
  const renderLabel = (entry: PieChartData) => {
    if (showPercentage) {
      return `${entry.name}: ${entry.percentage.toFixed(1)}%`;
    }
    return entry.name;
  };

  return (
    <div className="w-full">
      {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        <RechartsPieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderLabel}
            outerRadius={height / 3}
            innerRadius={innerRadius}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color || PIE_COLORS[index % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
            }}
          />
          <Legend />
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  );
};

// ============================================================================
// Donut Chart Component (Pie with inner radius)
// ============================================================================

export const DonutChart: React.FC<PieChartProps> = (props) => {
  return <PieChart {...props} innerRadius={props.innerRadius || 60} />;
};

// ============================================================================
// Custom Tooltip Component
// ============================================================================

interface TooltipProps<ValueType = number, NameType = string> {
  active?: boolean;
  payload?: Array<{
    value: ValueType;
    name: NameType;
    color?: string;
    [key: string]: any;
  }>;
  label?: string | number;
}

interface CustomTooltipProps extends TooltipProps<number, string> {
  valueFormatter?: (value: number) => string;
}

export const CustomTooltip: React.FC<CustomTooltipProps> = ({
  active,
  payload,
  label,
  valueFormatter,
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-semibold text-gray-900 mb-2">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}:{' '}
            <span className="font-semibold">
              {valueFormatter ? valueFormatter(entry.value as number) : entry.value}
            </span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};
