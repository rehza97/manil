/**
 * ExportButton Component
 *
 * Dropdown button for exporting reports in different formats (CSV, Excel, PDF).
 */

import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { useExportReport, useDownloadExport } from '../hooks/useReports';
import type { ExportRequest } from '../types/report.types';

interface ExportButtonProps {
  reportType: 'tickets' | 'customers' | 'orders';
  filters?: ExportRequest['filters'];
  disabled?: boolean;
}

export const ExportButton: React.FC<ExportButtonProps> = ({
  reportType,
  filters,
  disabled = false,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const exportMutation = useExportReport();
  const downloadMutation = useDownloadExport();

  const handleExport = async (format: 'csv' | 'excel' | 'pdf') => {
    setShowMenu(false);

    try {
      // First, request export
      const exportResponse = await exportMutation.mutateAsync({
        report_type: reportType,
        format,
        filters,
      });

      // Then download the file
      await downloadMutation.mutateAsync(exportResponse.file_name);
    } catch (error) {
      console.error('Export failed:', error);
      // Handle error (show notification, etc.)
    }
  };

  const isLoading = exportMutation.isPending || downloadMutation.isPending;

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={disabled || isLoading}
        className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
          disabled || isLoading
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
      >
        <Download className="h-5 w-5 mr-2" />
        {isLoading ? 'Exporting...' : 'Export'}
      </button>

      {/* Dropdown Menu */}
      {showMenu && !disabled && !isLoading && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowMenu(false)}
          />

          {/* Menu */}
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
            <button
              onClick={() => handleExport('csv')}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Export as CSV
            </button>
            <button
              onClick={() => handleExport('excel')}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Export as Excel
            </button>
            <button
              onClick={() => handleExport('pdf')}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Export as PDF
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default ExportButton;
