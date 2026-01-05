/**
 * TemplateList Component
 * Displays a list of response templates with CRUD actions
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/shared/components/ui/pagination';
import { Badge } from '@/shared/components/ui/badge';
import { Loader2, MoreHorizontal, Trash2, Edit, Eye, Copy } from 'lucide-react';
import {
  useTemplates,
  useDeleteTemplate,
} from '../hooks/useTemplates';
import { TemplateCategory } from '../types/template.types';
import type { TemplateFilters } from '../types/template.types';
import { toast } from 'sonner';

interface TemplateListProps {
  onTemplateSelected?: (templateId: string) => void;
  canDelete?: boolean;
  canEdit?: boolean;
}

const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  [TemplateCategory.TECHNICAL]: 'Technical',
  [TemplateCategory.BILLING]: 'Billing',
  [TemplateCategory.GENERAL]: 'General',
  [TemplateCategory.URGENT]: 'Urgent',
  [TemplateCategory.ESCALATION]: 'Escalation',
  [TemplateCategory.CLOSING]: 'Closing',
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

export const TemplateList: React.FC<TemplateListProps> = ({
  onTemplateSelected,
  canDelete = true,
  canEdit = true,
}) => {
  const navigate = useNavigate();
  const deleteTemplateMutation = useDeleteTemplate();

  const [filters, setFilters] = useState<Partial<TemplateFilters>>({
    page: 1,
    page_size: 10,
  });

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');

  const { data, isLoading } = useTemplates(filters);

  const handleSearch = (value: string) => {
    setSearch(value);
    setFilters({
      ...filters,
      search: value || undefined,
      page: 1,
    });
  };

  const handleCategoryChange = (value: string) => {
    setCategory(value);
    setFilters({
      ...filters,
      category: value && value !== 'all' ? (value as TemplateCategory) : undefined,
      page: 1,
    });
  };

  const handlePageChange = (page: number) => {
    setFilters({
      ...filters,
      page,
    });
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await deleteTemplateMutation.mutateAsync(deleteId);
      setDeleteId(null);
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handleCopyTemplate = (template: any) => {
    navigator.clipboard.writeText(template.content);
    toast.success('Template copied to clipboard');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const templates = data?.items || [];
  const totalPages = Math.ceil((data?.total || 0) / (filters.page_size || 10));

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <Input
          placeholder="Search templates..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="flex-1 min-w-[200px]"
        />
        <Select value={category} onValueChange={handleCategoryChange}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Usage</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <p className="text-gray-500">No templates found</p>
                </TableCell>
              </TableRow>
            ) : (
              templates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell className="font-medium max-w-xs truncate">
                    {template.title}
                    {template.is_default && (
                      <Badge variant="outline" className="ml-2">
                        Default
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={CATEGORY_COLORS[template.category as TemplateCategory]}
                    >
                      {CATEGORY_LABELS[template.category as TemplateCategory]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {template.usage_count}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {new Date(template.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            navigate(`/admin/tickets/templates/${template.id}`)
                          }
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </DropdownMenuItem>

                        {canEdit && (
                          <DropdownMenuItem
                            onClick={() =>
                              navigate(
                                `/admin/tickets/templates/${template.id}/edit`
                              )
                            }
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                        )}

                        <DropdownMenuItem
                          onClick={() => handleCopyTemplate(template)}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copy
                        </DropdownMenuItem>

                        {canDelete && (
                          <DropdownMenuItem
                            onClick={() => setDeleteId(template.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        )}

                        {onTemplateSelected && (
                          <DropdownMenuItem
                            onClick={() => onTemplateSelected(template.id)}
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Use Template
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            {filters.page! > 1 && (
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => handlePageChange(filters.page! - 1)}
                />
              </PaginationItem>
            )}

            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = i + 1;
              return (
                <PaginationItem key={pageNum}>
                  <PaginationLink
                    onClick={() => handlePageChange(pageNum)}
                    isActive={pageNum === filters.page}
                  >
                    {pageNum}
                  </PaginationLink>
                </PaginationItem>
              );
            })}

            {filters.page! < totalPages && (
              <PaginationItem>
                <PaginationNext
                  onClick={() => handlePageChange(filters.page! + 1)}
                />
              </PaginationItem>
            )}
          </PaginationContent>
        </Pagination>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>Delete Template</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this template? This action cannot be undone.
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
