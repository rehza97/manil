/**
 * Customer Reports Page
 *
 * Customer analytics and reports.
 */

import React, { useState } from 'react';
import {
  useCustomersByStatus,
  useCustomersByType,
  useCustomerGrowth,
} from '../hooks/useReports';
import {
  PieChart,
  LineChart,
  StatCard,
  DateRangePicker,
  ExportButton,
} from '../components';
import { Users, TrendingUp, CheckCircle2 } from 'lucide-react';
import type { DateRange } from '../types/report.types';

export const CustomerReportsPage: React.FC = () => {
  const [dateRange, setDateRange] = useState<DateRange>({ period: 'month' });

  const { data: statusData, isLoading: statusLoading } = useCustomersByStatus(
    dateRange.startDate,
    dateRange.endDate
  );
  const { data: typeData, isLoading: typeLoading } = useCustomersByType(
    dateRange.startDate,
    dateRange.endDate
  );
  const { data: growthData, isLoading: growthLoading } = useCustomerGrowth(
    dateRange.period || 'month'
  );

  const totalCustomers = statusData?.reduce((sum, item) => sum + item.count, 0) || 0;
  const activeCustomers = statusData?.find((s) => s.status === 'active')?.count || 0;
  const newCustomers = growthData && growthData.length > 0
    ? growthData[growthData.length - 1]?.new_customers || 0
    : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Customer Reports</h1>
          <p className="text-gray-600 mt-1">Customer analytics and growth metrics</p>
        </div>
        <ExportButton reportType="customers" filters={{ date_range: dateRange }} />
      </div>

      {/* Date Range Picker */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Total Customers"
          value={totalCustomers}
          icon={<Users className="h-6 w-6" />}
          color="blue"
          loading={statusLoading}
        />
        <StatCard
          title="Active Customers"
          value={activeCustomers}
          subtitle={`${totalCustomers ? ((activeCustomers / totalCustomers) * 100).toFixed(1) : 0}% of total`}
          icon={<CheckCircle2 className="h-6 w-6" />}
          color="green"
          loading={statusLoading}
        />
        <StatCard
          title="New Customers"
          value={newCustomers}
          subtitle={`In selected period`}
          icon={<TrendingUp className="h-6 w-6" />}
          color="purple"
          loading={growthLoading}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customers by Status */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {statusLoading ? (
            <div className="flex items-center justify-center h-[300px]">
              <div className="text-gray-500">Loading...</div>
            </div>
          ) : statusData && statusData.length > 0 ? (
            <PieChart
              data={statusData.map((item) => ({
                name: item.status,
                value: item.count,
                percentage: item.percentage,
              }))}
              title="Customers by Status"
              height={300}
            />
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-500">
              No data available
            </div>
          )}
        </div>

        {/* Customers by Type */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {typeLoading ? (
            <div className="flex items-center justify-center h-[300px]">
              <div className="text-gray-500">Loading...</div>
            </div>
          ) : typeData && typeData.length > 0 ? (
            <PieChart
              data={typeData.map((item) => ({
                name: item.customer_type,
                value: item.count,
                percentage: item.percentage,
              }))}
              title="Customers by Type"
              height={300}
            />
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-500">
              No data available
            </div>
          )}
        </div>

        {/* Customer Growth */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 lg:col-span-2">
          {growthLoading ? (
            <div className="flex items-center justify-center h-[300px]">
              <div className="text-gray-500">Loading...</div>
            </div>
          ) : growthData && growthData.length > 0 ? (
            <LineChart
              data={growthData.map((item) => ({
                name: item.period,
                'New Customers': item.new_customers,
                'Total Customers': item.total_customers,
              }))}
              lines={[
                { dataKey: 'New Customers', name: 'New Customers', color: '#8B5CF6' },
                { dataKey: 'Total Customers', name: 'Total Customers', color: '#3B82F6' },
              ]}
              title="Customer Growth Over Time"
              height={300}
            />
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-500">
              No data available
            </div>
          )}
        </div>
      </div>

      {/* Status Breakdown Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">Customer Status Breakdown</h3>
        {statusLoading ? (
          <div className="text-gray-500">Loading...</div>
        ) : statusData && statusData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Count
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Percentage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Distribution
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {statusData.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                        item.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : item.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.percentage.toFixed(1)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            item.status === 'active'
                              ? 'bg-green-600'
                              : item.status === 'pending'
                              ? 'bg-yellow-600'
                              : 'bg-gray-600'
                          }`}
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-gray-500 text-center py-8">No data available</div>
        )}
      </div>
    </div>
  );
};

export default CustomerReportsPage;
