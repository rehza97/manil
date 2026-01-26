/**
 * Corporate Dashboard Page
 *
 * Business operations overview for corporate users.
 */

import React, { useState } from 'react';
import {
  Users,
  Ticket,
  ShoppingCart,
  DollarSign,
  Clock,
  CheckCircle2,
  ShoppingBag as ShoppingBagIcon,
} from 'lucide-react';
import { useCorporateDashboard } from '../hooks/useReports';
import { StatCard, LineChart, AreaChart, PieChart } from '../components';
import { RevenueCard } from '@/modules/revenue/components';
import { RevenueType } from '@/modules/revenue/types/revenue.types';
import { useQuery } from '@tanstack/react-query';
import { revenueService } from '@/modules/revenue/services/revenueService';

export const CorporateDashboardPage: React.FC = () => {
  const [period, setPeriod] = useState('month');
  const { data: dashboard, isLoading, error } = useCorporateDashboard(period);

  // Fetch revenue overview for consistent revenue display
  const { data: revenueOverview } = useQuery({
    queryKey: ["revenue", "overview", period],
    queryFn: () => revenueService.getOverview(period),
  });

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
          <h1 className="text-3xl font-bold text-gray-900">Corporate Dashboard</h1>
          <p className="text-gray-600 mt-1">Business operations overview</p>
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

      {/* Key Business Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Active Customers"
          value={metrics?.active_customers || 0}
          subtitle={`${metrics?.total_customers || 0} total`}
          icon={<Users className="h-6 w-6" />}
          color="blue"
          loading={isLoading}
        />
        <StatCard
          title="Open Tickets"
          value={metrics?.open_tickets || 0}
          subtitle={`${metrics?.total_tickets || 0} total`}
          icon={<Ticket className="h-6 w-6" />}
          color="yellow"
          loading={isLoading}
        />
        <StatCard
          title="Pending Orders"
          value={metrics?.pending_orders || 0}
          subtitle="Awaiting processing"
          icon={<Clock className="h-6 w-6" />}
          color="purple"
          loading={isLoading}
        />
        <RevenueCard
          title="Revenue (Month)"
          value={Number(revenueOverview?.metrics.booked_revenue || metrics?.total_revenue || 0)}
          type={RevenueType.BOOKED}
          subtitle="From delivered orders"
          icon={<DollarSign className="h-6 w-6" />}
        />
      </div>

      {/* Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Ticket Performance</h3>
            <Ticket className="h-8 w-8 text-purple-500" />
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Resolution Rate</span>
                <span className="text-sm font-semibold text-gray-900">
                  {metrics?.total_tickets
                    ? Math.round(
                        ((metrics.resolved_tickets || 0) / metrics.total_tickets) * 100
                      )
                    : 0}
                  %
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full transition-all"
                  style={{
                    width: `${
                      metrics?.total_tickets
                        ? Math.round(
                            ((metrics.resolved_tickets || 0) / metrics.total_tickets) * 100
                          )
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
            <div className="pt-4 border-t border-gray-200">
              <p className="text-2xl font-bold text-gray-900">
                {metrics?.resolved_tickets || 0}
              </p>
              <p className="text-sm text-gray-600">Tickets Resolved</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Order Performance</h3>
            <ShoppingBagIcon className="h-8 w-8 text-green-500" />
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Completion Rate</span>
                <span className="text-sm font-semibold text-gray-900">
                  {metrics?.total_orders
                    ? Math.round(
                        ((metrics.completed_orders || 0) / metrics.total_orders) * 100
                      )
                    : 0}
                  %
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all"
                  style={{
                    width: `${
                      metrics?.total_orders
                        ? Math.round(
                            ((metrics.completed_orders || 0) / metrics.total_orders) * 100
                          )
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
            <div className="pt-4 border-t border-gray-200">
              <p className="text-2xl font-bold text-gray-900">
                {metrics?.completed_orders || 0}
              </p>
              <p className="text-sm text-gray-600">Orders Completed</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Customer Engagement</h3>
            <Users className="h-8 w-8 text-blue-500" />
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Active Rate</span>
                <span className="text-sm font-semibold text-gray-900">
                  {metrics?.total_customers
                    ? Math.round(
                        ((metrics.active_customers || 0) / metrics.total_customers) * 100
                      )
                    : 0}
                  %
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{
                    width: `${
                      metrics?.total_customers
                        ? Math.round(
                            ((metrics.active_customers || 0) / metrics.total_customers) * 100
                          )
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
            <div className="pt-4 border-t border-gray-200">
              <p className="text-2xl font-bold text-gray-900">
                {metrics?.active_customers || 0}
              </p>
              <p className="text-sm text-gray-600">Active Customers</p>
            </div>
          </div>
        </div>
      </div>

      {/* Trends Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {trends.tickets && trends.tickets.length > 0 && trends.orders && trends.orders.length > 0 ? (
            <AreaChart
              data={trends.tickets.map((t, index) => ({
                name: t.date,
                Tickets: t.value,
                Orders: trends.orders[index]?.value || 0,
              }))}
              areas={[
                { dataKey: 'Tickets', name: 'Tickets', color: '#8B5CF6' },
                { dataKey: 'Orders', name: 'Orders', color: '#10B981' },
              ]}
              title="Business Activity Trends"
              height={300}
              stacked={false}
            />
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-500">
              {isLoading ? 'Loading chart...' : 'No trend data available'}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {isLoading ? (
              <div className="text-gray-500">Loading activity...</div>
            ) : recentActivity.length > 0 ? (
              recentActivity.slice(0, 8).map((activity, index) => (
                <div
                  key={activity.id || index}
                  className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100"
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
    </div>
  );
};

export default CorporateDashboardPage;
