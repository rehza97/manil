/**
 * TemplateCreatePage
 * Page for creating a new response template
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
import type { ResponseTemplate } from '../types/template.types';
import { TemplateForm } from '../components/TemplateForm';

export const TemplateCreatePage: React.FC = () => {
  const navigate = useNavigate();

  const handleSuccess = (template: ResponseTemplate) => {
    navigate(`/admin/tickets/templates/${template.id}`);
  };

  const handleCancel = () => {
    navigate('/admin/tickets/templates');
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin">Admin</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin/tickets">Tickets</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin/tickets/templates">
              Templates
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>Create</BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Create New Template</h1>
        <p className="text-gray-600 mt-1">
          Create a new response template for quick replies
        </p>
      </div>

      {/* Form */}
      <TemplateForm onSuccess={handleSuccess} onCancel={handleCancel} />
    </div>
  );
};
