/**
 * TemplateVariableReference Component
 * Displays available template variables with descriptions
 * Can be used as a standalone reference guide
 */

import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Input } from '@/shared/components/ui/input';
import { Badge } from '@/shared/components/ui/badge';
import { Search } from 'lucide-react';
import {
  SYSTEM_VARIABLES,
  CUSTOM_VARIABLES,
  TemplateVariableReference,
} from '../types/template.types';

interface TemplateVariableReferenceProps {
  compact?: boolean;
  onVariableSelect?: (variableName: string) => void;
}

export const TemplateVariableReferenceComponent: React.FC<
  TemplateVariableReferenceProps
> = ({ compact = false, onVariableSelect }) => {
  const [searchTerm, setSearchTerm] = React.useState('');

  const filterVariables = (variables: TemplateVariableReference[]) => {
    if (!searchTerm) return variables;
    const lower = searchTerm.toLowerCase();
    return variables.filter(
      (v) =>
        v.name.toLowerCase().includes(lower) ||
        v.description.toLowerCase().includes(lower)
    );
  };

  const systemFiltered = filterVariables(SYSTEM_VARIABLES);
  const customFiltered = filterVariables(CUSTOM_VARIABLES);

  if (compact) {
    return (
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Template Variables</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-700">System</p>
            {SYSTEM_VARIABLES.slice(0, 3).map((variable) => (
              <div key={variable.name} className="text-xs">
                <code className="bg-white px-2 py-1 rounded text-blue-600">
                  {variable.name}
                </code>
                <p className="text-gray-600 mt-0.5">{variable.description}</p>
              </div>
            ))}
            <p className="text-xs text-gray-500 mt-2">
              +{SYSTEM_VARIABLES.length - 3} more...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Template Variable Reference</CardTitle>
        <CardDescription>
          Available variables to use in your templates
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search variables..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="system" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="system">
              System ({systemFiltered.length})
            </TabsTrigger>
            <TabsTrigger value="custom">
              Custom ({customFiltered.length})
            </TabsTrigger>
          </TabsList>

          {/* System Variables Tab */}
          <TabsContent value="system" className="space-y-3 mt-4">
            {systemFiltered.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No variables match your search
              </p>
            ) : (
              systemFiltered.map((variable) => (
                <VariableCard
                  key={variable.name}
                  variable={variable}
                  onSelect={onVariableSelect}
                  variant="system"
                />
              ))
            )}
          </TabsContent>

          {/* Custom Variables Tab */}
          <TabsContent value="custom" className="space-y-3 mt-4">
            {customFiltered.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No variables match your search
              </p>
            ) : (
              customFiltered.map((variable) => (
                <VariableCard
                  key={variable.name}
                  variable={variable}
                  onSelect={onVariableSelect}
                  variant="custom"
                />
              ))
            )}
          </TabsContent>
        </Tabs>

        {/* Info Section */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200 space-y-2">
          <h4 className="font-semibold text-sm">How to Use Variables</h4>
          <ul className="text-xs text-gray-700 space-y-1">
            <li>• Use double curly braces around variable names</li>
            <li>• Example: {'{{'} customer_name {'}}'}</li>
            <li>• Variables are replaced with actual values when template is used</li>
            <li>• Each variable has specific context where it's available</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * VariableCard Component
 * Individual variable display card
 */
interface VariableCardProps {
  variable: TemplateVariableReference;
  onSelect?: (variableName: string) => void;
  variant?: 'system' | 'custom';
}

const VariableCard: React.FC<VariableCardProps> = ({
  variable,
  onSelect,
  variant = 'system',
}) => {
  return (
    <div
      className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
        variant === 'system'
          ? 'bg-blue-50 border-blue-200 hover:border-blue-400'
          : 'bg-purple-50 border-purple-200 hover:border-purple-400'
      }`}
      onClick={() => onSelect?.(variable.name)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <code
              className={`text-xs font-semibold px-2 py-1 rounded ${
                variant === 'system'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-purple-100 text-purple-700'
              }`}
            >
              {variable.name}
            </code>
            {variable.required && (
              <Badge variant="destructive" className="text-xs h-5">
                Required
              </Badge>
            )}
          </div>
          <p className="text-sm text-gray-700">{variable.description}</p>
          {variable.example && (
            <p className="text-xs text-gray-500 mt-2">
              <strong>Example:</strong> {variable.example}
            </p>
          )}
          {variable.available_in && (
            <p className="text-xs text-gray-500 mt-2">
              <strong>Available in:</strong> {variable.available_in.join(', ')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * VariableQuickReference Component
 * Compact version for sidebars and modals
 */
interface VariableQuickReferenceProps {
  limit?: number;
  showSystemOnly?: boolean;
}

export const VariableQuickReference: React.FC<
  VariableQuickReferenceProps
> = ({ limit = 5, showSystemOnly = false }) => {
  const variables = showSystemOnly
    ? SYSTEM_VARIABLES.slice(0, limit)
    : [...SYSTEM_VARIABLES, ...CUSTOM_VARIABLES].slice(0, limit);

  return (
    <div className="space-y-2 text-sm">
      <h4 className="font-semibold">Quick Variable Reference</h4>
      <div className="space-y-1">
        {variables.map((variable) => (
          <div key={variable.name} className="text-xs">
            <code className="bg-gray-100 px-2 py-1 rounded text-blue-600 font-mono">
              {variable.name}
            </code>
            <p className="text-gray-600 text-xs mt-0.5">
              {variable.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TemplateVariableReferenceComponent;
