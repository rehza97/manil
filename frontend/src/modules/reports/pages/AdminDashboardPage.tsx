/**
 * Admin Dashboard Page
import { formatCurrency } from "@/shared/utils/formatters";
 *
 * System-wide metrics and analytics for administrators.
 */

import React, { useState } from 'react';
import {
  UserGroupIcon,
  TicketIcon,
  ShoppingBagIcon,
  CubeIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { useAdminDashboard } from '../hooks/useReports';
import { StatCard, LineChart, BarChart, PieChart, DateRangePicker } from '../components';
import type { DateRange } from '../types/report.types';

export const AdminDashboardPage: React.FC = () => {
  const [period, setPeriod] = useState('month');
  const { data: dashboard, isLoading, error } = useAdminDashboard(period);

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Failed to load dashboard data. Please try again.</p>
        </div>
      </div>
    );
  }

  const metrics = dashboard?.metrics;
  const recentActivity = dashboard?.recent_activity || [];
  const trends = dashboard?.trends || {};

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">System-wide metrics and analytics</p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
            <option value="quarter">Last 90 Days</option>
            <option value="year">Last Year</option>
          </select>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Total Customers"
          value={metrics?.total_customers || 0}
          subtitle={`${metrics?.active_customers || 0} active`}
          icon={<UserGroupIcon className="h-6 w-6" />}
          color="blue"
          loading={isLoading}
        />
        <StatCard
          title="Total Tickets"
          value={metrics?.total_tickets || 0}
          subtitle={`${metrics?.open_tickets || 0} open`}
          icon={<TicketIcon className="h-6 w-6" />}
          color="purple"
          loading={isLoading}
        />
        <StatCard
          title="Total Orders"
          value={metrics?.total_orders || 0}
          subtitle={`${metrics?.completed_orders || 0} completed`}
          icon={<ShoppingBagIcon className="h-6 w-6" />}
          color="green"
          loading={isLoading}
        />
        <StatCard
          title="Total Revenue"
          value={`${(metrics?.total_revenue || 0).toLocaleString()} DZD`}
          subtitle="From completed orders"
          icon={<CurrencyDollarIcon className="h-6 w-6" />}
          color="green"
          loading={isLoading}
        />
        <StatCard
          title="Total Products"
          value={metrics?.total_products || 0}
          subtitle={`${metrics?.active_products || 0} active`}
          icon={<CubeIcon className="h-6 w-6" />}
          color="yellow"
          loading={isLoading}
        />
        <StatCard
          title="Pending Customers"
          value={metrics?.pending_customers || 0}
          subtitle="Awaiting verification"
          icon={<UserGroupIcon className="h-6 w-6" />}
          color="yellow"
          loading={isLoading}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tickets Trend */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {trends.tickets && trends.tickets.length > 0 ? (
            <LineChart
              data={trends.tickets.map((t) => ({
                name: t.date,
                Tickets: t.value,
              }))}
              lines={[{ dataKey: 'Tickets', name: 'Tickets', color: '#8B5CF6' }]}
              title="Ticket Trends"
              height={300}
            />
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-500">
              {isLoading ? 'Loading chart...' : 'No trend data available'}
            </div>
          )}
        </div>

        {/* Orders Trend */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {trends.orders && trends.orders.length > 0 ? (
            <LineChart
              data={trends.orders.map((t) => ({
                name: t.date,
                Orders: t.value,
              }))}
              lines={[{ dataKey: 'Orders', name: 'Orders', color: '#10B981' }]}
              title="Order Trends"
              height={300}
            />
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-500">
              {isLoading ? 'Loading chart...' : 'No trend data available'}
            </div>
          )}
        </div>

        {/* Customer Growth */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {trends.customers && trends.customers.length > 0 ? (
            <BarChart
              data={trends.customers.map((t) => ({
                name: t.date,
                value: t.value,
              }))}
              title="Customer Growth"
              color="#3B82F6"
              height={300}
            />
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-500">
              {isLoading ? 'Loading chart...' : 'No trend data available'}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <ChartBarIcon className="h-5 w-5 mr-2 text-gray-500" />
            Recent Activity
          </h3>
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {isLoading ? (
              <div className="text-gray-500">Loading activity...</div>
            ) : recentActivity.length > 0 ? (
              recentActivity.map((activity, index) => (
                <div
                  key={activity.id || index}
                  className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div
                    className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${
                      activity.type === 'ticket'
                        ? 'bg-purple-500'
                        : activity.type === 'order'
                        ? 'bg-green-500'
                        : 'bg-blue-500'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {activity.title}
                    </p>
                    {activity.description && (
                      <p className="text-sm text-gray-500 truncate">
                        {activity.description}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(activity.timestamp).toLocaleString()}
                    </p>
                  </div>
                  {activity.status && (
                    <span
                      className={`flex-shrink-0 px-2 py-1 text-xs font-medium rounded-full ${
                        activity.status === 'open' || activity.status === 'request'
                          ? 'bg-yellow-100 text-yellow-800'
                          : activity.status === 'resolved' ||
                            activity.status === 'delivered'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {activity.status}
                    </span>
                  )}
                </div>
              ))
            ) : (
              <div className="text-gray-500 text-center py-8">No recent activity</div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-800">Ticket Resolution Rate</p>
              <p className="text-3xl font-bold text-blue-900 mt-2">
                {metrics?.total_tickets
                  ? Math.round(
                      ((metrics.resolved_tickets || 0) / metrics.total_tickets) * 100
                    )
                  : 0}
                %
              </p>
            </div>
            <TicketIcon className="h-12 w-12 text-blue-600 opacity-50" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-800">Order Completion Rate</p>
              <p className="text-3xl font-bold text-green-900 mt-2">
                {metrics?.total_orders
                  ? Math.round(
                      ((metrics.completed_orders || 0) / metrics.total_orders) * 100
                    )
                  : 0}
                %
              </p>
            </div>
            <ShoppingBagIcon className="h-12 w-12 text-green-600 opacity-50" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-800">Customer Activation Rate</p>
              <p className="text-3xl font-bold text-purple-900 mt-2">
                {metrics?.total_customers
                  ? Math.round(
                      ((metrics.active_customers || 0) / metrics.total_customers) * 100
                    )
                  : 0}
                %
              </p>
            </div>
            <UserGroupIcon className="h-12 w-12 text-purple-600 opacity-50" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
