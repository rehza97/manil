/**
 * Ticket Reports Page
 *
 * Comprehensive ticket analytics and reports.
 */

import React, { useState } from 'react';
import {
  useTicketsByStatus,
  useTicketsByPriority,
  useTicketsByAgent,
  useResponseTimeMetrics,
  useResolutionTimeMetrics,
} from '../hooks/useReports';
import {
  BarChart,
  PieChart,
  StatCard,
  DateRangePicker,
  ExportButton,
} from '../components';
import { TicketIcon, ClockIcon, CheckCircleIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import type { DateRange } from '../types/report.types';

export const TicketReportsPage: React.FC = () => {
  const [dateRange, setDateRange] = useState<DateRange>({ period: 'month' });

  const { data: statusData, isLoading: statusLoading } = useTicketsByStatus(
    dateRange.startDate,
    dateRange.endDate
  );
  const { data: priorityData, isLoading: priorityLoading } = useTicketsByPriority(
    dateRange.startDate,
    dateRange.endDate
  );
  const { data: agentData, isLoading: agentLoading } = useTicketsByAgent(
    dateRange.startDate,
    dateRange.endDate
  );
  const { data: responseMetrics, isLoading: responseLoading } = useResponseTimeMetrics(
    dateRange.startDate,
    dateRange.endDate
  );
  const { data: resolutionMetrics, isLoading: resolutionLoading } = useResolutionTimeMetrics(
    dateRange.startDate,
    dateRange.endDate
  );

  const totalTickets =
    statusData?.reduce((sum, item) => sum + item.count, 0) || 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Ticket Reports</h1>
          <p className="text-gray-600 mt-1">Comprehensive ticket analytics and metrics</p>
        </div>
        <ExportButton reportType="tickets" filters={{ date_range: dateRange }} />
      </div>

      {/* Date Range Picker */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Tickets"
          value={totalTickets}
          icon={<TicketIcon className="h-6 w-6" />}
          color="blue"
          loading={statusLoading}
        />
        <StatCard
          title="Avg Response Time"
          value={
            responseMetrics?.avg_first_response_time
              ? `${responseMetrics.avg_first_response_time.toFixed(1)}h`
              : 'N/A'
          }
          subtitle="First response"
          icon={<ClockIcon className="h-6 w-6" />}
          color="purple"
          loading={responseLoading}
        />
        <StatCard
          title="Avg Resolution Time"
          value={
            resolutionMetrics?.avg_resolution_time
              ? `${resolutionMetrics.avg_resolution_time.toFixed(1)}h`
              : 'N/A'
          }
          subtitle="Time to resolve"
          icon={<CheckCircleIcon className="h-6 w-6" />}
          color="green"
          loading={resolutionLoading}
        />
        <StatCard
          title="SLA Compliance"
          value={
            responseMetrics?.sla_compliance_rate
              ? `${responseMetrics.sla_compliance_rate.toFixed(1)}%`
              : 'N/A'
          }
          subtitle="Response time SLA"
          icon={<CheckCircleIcon className="h-6 w-6" />}
          color="green"
          loading={responseLoading}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tickets by Status */}
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
              title="Tickets by Status"
              height={300}
            />
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-500">
              No data available
            </div>
          )}
        </div>

        {/* Tickets by Priority */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {priorityLoading ? (
            <div className="flex items-center justify-center h-[300px]">
              <div className="text-gray-500">Loading...</div>
            </div>
          ) : priorityData && priorityData.length > 0 ? (
            <BarChart
              data={priorityData.map((item) => ({
                name: item.priority,
                value: item.count,
              }))}
              title="Tickets by Priority"
              color="#F59E0B"
              height={300}
            />
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-500">
              No data available
            </div>
          )}
        </div>

        {/* Agent Performance */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <UserGroupIcon className="h-5 w-5 mr-2 text-gray-500" />
            Agent Performance
          </h3>
          {agentLoading ? (
            <div className="flex items-center justify-center h-[200px]">
              <div className="text-gray-500">Loading...</div>
            </div>
          ) : agentData && agentData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Agent
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Tickets
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Open
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Resolved
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Avg Response (h)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Resolution Rate
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {agentData.map((agent) => (
                    <tr key={agent.agent_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {agent.agent_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {agent.total_tickets}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600">
                        {agent.open_tickets}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                        {agent.resolved_tickets}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {agent.avg_response_time
                          ? agent.avg_response_time.toFixed(1)
                          : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="text-sm text-gray-900 mr-2">
                            {agent.resolution_rate.toFixed(1)}%
                          </span>
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-green-600 h-2 rounded-full"
                              style={{ width: `${agent.resolution_rate}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-gray-500 text-center py-8">No agent data available</div>
          )}
        </div>
      </div>

      {/* SLA Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Response Time SLA</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Within SLA</span>
              <span className="text-sm font-semibold text-green-600">
                {responseMetrics?.within_sla || 0} tickets
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Breached SLA</span>
              <span className="text-sm font-semibold text-red-600">
                {responseMetrics?.breached_sla || 0} tickets
              </span>
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <span className="text-sm font-medium text-gray-900">Compliance Rate</span>
              <span className="text-2xl font-bold text-green-600">
                {responseMetrics?.sla_compliance_rate?.toFixed(1) || 0}%
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Resolution Time SLA</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Within SLA</span>
              <span className="text-sm font-semibold text-green-600">
                {resolutionMetrics?.within_sla || 0} tickets
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Breached SLA</span>
              <span className="text-sm font-semibold text-red-600">
                {resolutionMetrics?.breached_sla || 0} tickets
              </span>
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <span className="text-sm font-medium text-gray-900">Compliance Rate</span>
              <span className="text-2xl font-bold text-green-600">
                {resolutionMetrics?.sla_compliance_rate?.toFixed(1) || 0}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketReportsPage;
