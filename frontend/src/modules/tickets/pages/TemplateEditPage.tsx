/**
 * TemplateEditPage
 * Page for editing an existing response template
 */

import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@/shared/components/ui/breadcrumb';
import type { ResponseTemplate } from '../types/template.types';
import { TemplateForm } from '../components/TemplateForm';
import { useTemplate } from '../hooks/useTemplates';

export const TemplateEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: template, isLoading } = useTemplate(id);

  if (!id) {
    return (
      <div className="space-y-4">
        <p className="text-red-600">Template ID is missing</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="space-y-4">
        <p className="text-red-600">Template not found</p>
      </div>
    );
  }

  const handleSuccess = (updatedTemplate: ResponseTemplate) => {
    navigate(`/admin/tickets/templates/${updatedTemplate.id}`);
  };

  const handleCancel = () => {
    navigate(`/admin/tickets/templates/${id}`);
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
          <BreadcrumbItem>
            <BreadcrumbLink href={`/admin/tickets/templates/${id}`}>
              {template.title}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>Edit</BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Edit Template</h1>
        <p className="text-gray-600 mt-1">
          Update the template "{template.title}"
        </p>
      </div>

      {/* Form */}
      <TemplateForm
        template={template}
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </div>
  );
};
