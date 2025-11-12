/**
 * TemplateDetail Component
 * Display full template details with metadata and variable reference
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog';
import { Loader2, Edit, Trash2, Copy, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useTemplate, useDeleteTemplate } from '../hooks/useTemplates';
import {
  TemplateCategory,
  SYSTEM_VARIABLES,
  CUSTOM_VARIABLES,
} from '../types/template.types';
import { formatDistanceToNow } from 'date-fns';

interface TemplateDetailProps {
  templateId: string;
  onBack?: () => void;
}

const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  [TemplateCategory.TECHNICAL]: 'Technical Support',
  [TemplateCategory.BILLING]: 'Billing Inquiry',
  [TemplateCategory.GENERAL]: 'General Question',
  [TemplateCategory.URGENT]: 'Urgent Issue',
  [TemplateCategory.ESCALATION]: 'Escalation',
  [TemplateCategory.CLOSING]: 'Ticket Closing',
  [TemplateCategory.ACKNOWLEDGMENT]: 'Acknowledgment',
};

const CATEGORY_COLORS: Record<TemplateCategory, string> = {
  [TemplateCategory.TECHNICAL]: 'bg-blue-100 text-blue-800',
  [TemplateCategory.BILLING]: 'bg-green-100 text-green-800',
  [TemplateCategory.GENERAL]: 'bg-gray-100 text-gray-800',
  [TemplateCategory.URGENT]: 'bg-red-100 text-red-800',
  [TemplateCategory.ESCALATION]: 'bg-orange-100 text-orange-800',
  [TemplateCategory.CLOSING]: 'bg-purple-100 text-purple-800',
  [TemplateCategory.ACKNOWLEDGMENT]: 'bg-indigo-100 text-indigo-800',
};

export const TemplateDetail: React.FC<TemplateDetailProps> = ({
  templateId,
  onBack,
}) => {
  const navigate = useNavigate();
  const { data: template, isLoading } = useTemplate(templateId);
  const deleteTemplateMutation = useDeleteTemplate();
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);

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
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-red-600">Template not found</p>
          </CardContent>
        </Card>
        {onBack && (
          <Button onClick={onBack} variant="outline">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        )}
      </div>
    );
  }

  const handleCopyContent = () => {
    navigator.clipboard.writeText(template.content);
    toast.success('Template content copied to clipboard');
  };

  const handleDelete = async () => {
    try {
      await deleteTemplateMutation.mutateAsync(templateId);
      setShowDeleteDialog(false);
      navigate('/admin/tickets/templates');
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handleEdit = () => {
    navigate(`/admin/tickets/templates/${templateId}/edit`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          {onBack && (
            <Button
              onClick={onBack}
              variant="outline"
              size="sm"
              className="mb-3"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-3xl font-bold">{template.title}</h1>
              {template.is_default && (
                <Badge variant="outline" className="mt-1">
                  Default
                </Badge>
              )}
            </div>
            <p className="text-gray-600">
              Created {formatDistanceToNow(new Date(template.created_at), { addSuffix: true })}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button onClick={handleEdit} variant="outline" size="sm">
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button
            onClick={() => setShowDeleteDialog(true)}
            variant="destructive"
            size="sm"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Metadata Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Category</p>
                  <Badge
                    className={
                      CATEGORY_COLORS[template.category as TemplateCategory]
                    }
                  >
                    {CATEGORY_LABELS[template.category as TemplateCategory]}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Usage Count</p>
                  <p className="text-2xl font-bold">{template.usage_count}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Created</p>
                  <p className="text-sm">
                    {new Date(template.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Last Updated</p>
                  <p className="text-sm">
                    {new Date(template.updated_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t">
                <p className="text-xs text-gray-600 mb-1">Character Count</p>
                <p className="text-sm">
                  {template.content.length} / 5000 characters
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Content Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Template Content</CardTitle>
                <Button
                  onClick={handleCopyContent}
                  variant="outline"
                  size="sm"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 p-4 rounded-lg font-mono text-sm whitespace-pre-wrap break-words max-h-96 overflow-y-auto border">
                {template.content}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Variables Reference */}
        <div className="space-y-4">
          {/* System Variables */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">System Variables</CardTitle>
              <CardDescription className="text-xs">
                Available placeholders for this template
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {SYSTEM_VARIABLES.map((variable) => (
                <div
                  key={variable.name}
                  className="p-3 bg-gray-50 rounded border border-gray-200"
                >
                  <p className="text-xs font-mono font-semibold text-blue-600">
                    {variable.name}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {variable.description}
                  </p>
                  {variable.example && (
                    <p className="text-xs text-gray-500 mt-1 italic">
                      Example: {variable.example}
                    </p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Custom Variables */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Custom Variables</CardTitle>
              <CardDescription className="text-xs">
                Additional dynamic content placeholders
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {CUSTOM_VARIABLES.map((variable) => (
                <div
                  key={variable.name}
                  className="p-3 bg-blue-50 rounded border border-blue-200"
                >
                  <p className="text-xs font-mono font-semibold text-blue-700">
                    {variable.name}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {variable.description}
                  </p>
                  {variable.example && (
                    <p className="text-xs text-gray-500 mt-1 italic">
                      Example: {variable.example}
                    </p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Tips Card */}
          <Card className="bg-amber-50 border-amber-200">
            <CardHeader>
              <CardTitle className="text-sm">Tips</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-amber-900 space-y-2">
              <p>• Use double curly braces for variables: {'{{'}</p>
              <p>• Variables are replaced when template is used</p>
              <p>• Click variables in the form to insert them quickly</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogTitle>Delete Template</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{template.title}"? This action cannot be undone.
          </AlertDialogDescription>
          <div className="flex gap-4 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteTemplateMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteTemplateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
