/**
 * DateRangePicker Component
 *
 * Allows users to select predefined date ranges or custom dates for filtering reports.
 */

import React, { useState } from 'react';
import { Calendar } from 'lucide-react';

interface DateRange {
  startDate?: string;
  endDate?: string;
  period?: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (value: DateRange) => void;
  showCustom?: boolean;
}

const PREDEFINED_RANGES = [
  { label: 'Today', value: 'today' as const },
  { label: 'Last 7 Days', value: 'week' as const },
  { label: 'Last 30 Days', value: 'month' as const },
  { label: 'Last 90 Days', value: 'quarter' as const },
  { label: 'Last Year', value: 'year' as const },
];

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  value,
  onChange,
  showCustom = true,
}) => {
  const [showCustomInput, setShowCustomInput] = useState(value.period === 'custom');

  const handlePredefinedChange = (period: typeof PREDEFINED_RANGES[number]['value']) => {
    setShowCustomInput(false);
    onChange({
      period,
      startDate: undefined,
      endDate: undefined,
    });
  };

  const handleCustomChange = () => {
    setShowCustomInput(true);
    onChange({
      period: 'custom',
      startDate: value.startDate,
      endDate: value.endDate,
    });
  };

  const handleDateChange = (type: 'start' | 'end', date: string) => {
    onChange({
      period: 'custom',
      startDate: type === 'start' ? date : value.startDate,
      endDate: type === 'end' ? date : value.endDate,
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-2">
        <Calendar className="h-4 w-4 text-slate-500" />
        <span className="text-sm font-medium text-slate-700">Date Range</span>
      </div>

      {/* Predefined Ranges */}
      <div className="flex flex-wrap gap-2">
        {PREDEFINED_RANGES.map((range) => (
          <button
            key={range.value}
            onClick={() => handlePredefinedChange(range.value)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
              value.period === range.value && !showCustomInput
                ? 'bg-blue-600 text-white shadow-sm hover:bg-blue-700'
                : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 hover:border-slate-400'
            }`}
          >
            {range.label}
          </button>
        ))}

        {showCustom && (
          <button
            onClick={handleCustomChange}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
              showCustomInput
                ? 'bg-blue-600 text-white shadow-sm hover:bg-blue-700'
                : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 hover:border-slate-400'
            }`}
          >
            Custom Range
          </button>
        )}
      </div>

      {/* Custom Date Inputs */}
      {showCustomInput && (
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <div className="flex-1 w-full sm:w-auto">
            <label htmlFor="start-date" className="block text-xs font-medium text-slate-700 mb-1.5">
              Start Date
            </label>
            <input
              id="start-date"
              type="date"
              value={value.startDate || ''}
              onChange={(e) => handleDateChange('start', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>
          <div className="flex-1 w-full sm:w-auto">
            <label htmlFor="end-date" className="block text-xs font-medium text-slate-700 mb-1.5">
              End Date
            </label>
            <input
              id="end-date"
              type="date"
              value={value.endDate || ''}
              onChange={(e) => handleDateChange('end', e.target.value)}
              min={value.startDate}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default DateRangePicker;
