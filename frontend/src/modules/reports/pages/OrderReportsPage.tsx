/**
 * Order Reports Page
 *
 * Order analytics and performance reports.
 */

import React, { useState } from 'react';
import {
  useOrdersByStatus,
  useOrderValueMetrics,
  useMonthlyOrders,
  useProductPerformance,
} from '../hooks/useReports';
import {
  PieChart,
  BarChart,
  LineChart,
  StatCard,
  DateRangePicker,
  ExportButton,
} from '../components';
import {
  ShoppingCart,
  DollarSign,
  BarChart3,
  TrendingUp,
} from 'lucide-react';
import type { DateRange } from '../types/report.types';
import { RevenueCard } from '@/modules/revenue/components';
import { RevenueType } from '@/modules/revenue/types/revenue.types';
import { formatRevenue } from '@/shared/utils/revenueFormatters';

export const OrderReportsPage: React.FC = () => {
  const [dateRange, setDateRange] = useState<DateRange>({ period: 'month' });

  const { data: statusData, isLoading: statusLoading } = useOrdersByStatus(
    dateRange.startDate,
    dateRange.endDate
  );
  const { data: valueMetrics, isLoading: valueLoading } = useOrderValueMetrics(
    dateRange.startDate,
    dateRange.endDate
  );
  const { data: monthlyData, isLoading: monthlyLoading } = useMonthlyOrders(12);
  const { data: productData, isLoading: productLoading } = useProductPerformance(
    dateRange.startDate,
    dateRange.endDate,
    10
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Order Reports</h1>
          <p className="text-gray-600 mt-1">Order analytics and revenue metrics</p>
        </div>
        <ExportButton reportType="orders" filters={{ date_range: dateRange }} />
      </div>

      {/* Date Range Picker */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Orders"
          value={valueMetrics?.total_orders || 0}
          icon={<ShoppingCart className="h-6 w-6" />}
          color="blue"
          loading={valueLoading}
        />
        <RevenueCard
          title="Total Revenue"
          value={Number(valueMetrics?.total_value || 0)}
          type={RevenueType.BOOKED}
          subtitle="From order values"
          icon={<DollarSign className="h-6 w-6" />}
        />
        <StatCard
          title="Avg Order Value"
          value={formatRevenue(valueMetrics?.avg_order_value || 0)}
          icon={<BarChart3 className="h-6 w-6" />}
          color="purple"
          loading={valueLoading}
        />
        <StatCard
          title="Max Order Value"
          value={formatRevenue(valueMetrics?.max_order_value || 0)}
          icon={<TrendingUp className="h-6 w-6" />}
          color="yellow"
          loading={valueLoading}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Orders by Status */}
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
              title="Orders by Status"
              height={300}
            />
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-500">
              No data available
            </div>
          )}
        </div>

        {/* Monthly Orders */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {monthlyLoading ? (
            <div className="flex items-center justify-center h-[300px]">
              <div className="text-gray-500">Loading...</div>
            </div>
          ) : monthlyData && monthlyData.length > 0 ? (
            <BarChart
              data={monthlyData.map((item) => ({
                name: item.month,
                value: item.order_count,
              }))}
              title="Monthly Order Volume"
              color="#3B82F6"
              height={300}
            />
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-500">
              No data available
            </div>
          )}
        </div>

        {/* Monthly Revenue */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 lg:col-span-2">
          {monthlyLoading ? (
            <div className="flex items-center justify-center h-[300px]">
              <div className="text-gray-500">Loading...</div>
            </div>
          ) : monthlyData && monthlyData.length > 0 ? (
            <LineChart
              data={monthlyData.map((item) => ({
                name: item.month,
                Revenue: item.total_value,
                'Avg Order Value': item.avg_order_value,
              }))}
              lines={[
                { dataKey: 'Revenue', name: 'Revenue', color: '#10B981' },
                {
                  dataKey: 'Avg Order Value',
                  name: 'Avg Order Value',
                  color: '#8B5CF6',
                },
              ]}
              title="Monthly Revenue Trends"
              height={300}
              formatter={(value: number) => formatRevenue(value)}
            />
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-500">
              No data available
            </div>
          )}
        </div>
      </div>

      {/* Top Products */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">Top Performing Products</h3>
        {productLoading ? (
          <div className="text-gray-500">Loading...</div>
        ) : productData && productData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Orders
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity Sold
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Performance
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {productData.map((product, index) => (
                  <tr key={product.product_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-semibold text-sm">
                            #{index + 1}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {product.product_name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.order_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.quantity_sold}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                      {formatRevenue(Number(product.total_revenue))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{
                            width: `${Math.min(
                              (product.total_revenue /
                                (productData[0]?.total_revenue || 1)) *
                                100,
                              100
                            )}%`,
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-gray-500 text-center py-8">No product data available</div>
        )}
      </div>

      {/* Order Status Details */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">Order Status Details</h3>
        {statusLoading ? (
          <div className="text-gray-500">Loading...</div>
        ) : statusData && statusData.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {statusData.map((item) => (
              <div
                key={item.status}
                className="bg-gray-50 rounded-lg p-4 border border-gray-200"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600 uppercase">
                    {item.status}
                  </span>
                  <span className="text-xs text-gray-500">
                    {item.percentage.toFixed(1)}%
                  </span>
                </div>
                <p className="text-2xl font-bold text-gray-900 mb-1">{item.count}</p>
                <p className="text-sm text-green-600 font-medium">
                  {formatRevenue(Number(item.total_value))}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-500 text-center py-8">No data available</div>
        )}
      </div>
    </div>
  );
};

export default OrderReportsPage;
