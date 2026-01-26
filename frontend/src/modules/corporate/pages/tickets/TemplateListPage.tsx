/**
 * TemplateListPage (Corporate View)
 * Page displaying all response templates with filtering and CRUD operations
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@/shared/components/ui/breadcrumb';
import { Button } from '@/shared/components/ui/button';
import { Plus } from 'lucide-react';
import { TemplateList } from '@/modules/tickets/components/TemplateList';

export const TemplateListPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/corporate">Corporate</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/corporate/tickets">Tickets</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>Templates</BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Response Templates</h1>
          <p className="text-gray-600 mt-1">
            Manage response templates for quick replies to tickets
          </p>
        </div>
        <Button onClick={() => navigate('/corporate/tickets/templates/create')}>
          <Plus className="h-4 w-4 mr-2" />
          Create Template
        </Button>
      </div>

      {/* Content */}
      <TemplateList canDelete={false} canEdit={true} />
    </div>
  );
};
