/**
 * TagManager Component
 * Dialog for creating, editing, and deleting tags
 */

import React from 'react';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, Edit2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { useTags } from '../hooks/useTags';

interface TagManagerProps {
  onTagsChange?: () => void;
}

export const TagManager: React.FC<TagManagerProps> = ({ onTagsChange }) => {
  const { data: tags = [], isLoading: tagsLoading } = useTags();
  const { createTag, updateTag, deleteTag } = useTags();

  const [isOpen, setIsOpen] = React.useState(false);
  const [isEditMode, setIsEditMode] = React.useState(false);
  const [selectedTag, setSelectedTag] = React.useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

  const [formData, setFormData] = React.useState({
    name: '',
    description: '',
    color: '#3B82F6',
  });

  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const colors = [
    '#3B82F6', // Blue
    '#EF4444', // Red
    '#10B981', // Green
    '#F59E0B', // Amber
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#06B6D4', // Cyan
    '#6366F1', // Indigo
    '#14B8A6', // Teal
  ];

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      color: '#3B82F6',
    });
    setSelectedTag(null);
    setIsEditMode(false);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      resetForm();
    }
  };

  const handleEditTag = (tag: any) => {
    setSelectedTag(tag);
    setFormData({
      name: tag.name,
      description: tag.description || '',
      color: tag.color,
    });
    setIsEditMode(true);
    setIsOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Tag name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditMode && selectedTag) {
        await updateTag.mutateAsync({
          id: selectedTag.id,
          data: formData,
        });
        toast.success('Tag updated successfully');
      } else {
        await createTag.mutateAsync(formData);
        toast.success('Tag created successfully');
      }
      resetForm();
      setIsOpen(false);
      onTagsChange?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save tag');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTag = async () => {
    if (!selectedTag) return;

    setIsSubmitting(true);
    try {
      await deleteTag.mutateAsync(selectedTag.id);
      toast.success('Tag deleted successfully');
      resetForm();
      setShowDeleteConfirm(false);
      setIsOpen(false);
      onTagsChange?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete tag');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Create Tag Dialog */}
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button size="sm" variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Manage Tags
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? 'Edit Tag' : 'Create New Tag'}
            </DialogTitle>
            <DialogDescription>
              {isEditMode
                ? 'Update the tag details below'
                : 'Create a new tag for organizing tickets'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Tag Name */}
            <div>
              <Label htmlFor="tag-name">Tag Name</Label>
              <Input
                id="tag-name"
                placeholder="e.g., Bug Report, Feature Request"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                disabled={isSubmitting}
              />
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="tag-description">Description</Label>
              <Textarea
                id="tag-description"
                placeholder="Optional description for this tag"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                disabled={isSubmitting}
                className="resize-none"
                rows={3}
              />
            </div>

            {/* Color Picker */}
            <div>
              <Label htmlFor="tag-color">Color</Label>
              <div className="flex gap-2 flex-wrap">
                {colors.map((color) => (
                  <button
                    key={color}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      formData.color === color
                        ? 'border-gray-800 ring-2 ring-offset-2'
                        : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() =>
                      setFormData({ ...formData, color })
                    }
                    disabled={isSubmitting}
                  />
                ))}
              </div>
            </div>

            {/* Tags List */}
            <div className="mt-6 max-h-60 overflow-y-auto border rounded-lg">
              <div className="p-3">
                {tagsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                  </div>
                ) : (tags && tags.length > 0) ? (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-600 mb-3">
                      Existing Tags ({tags.length})
                    </p>
                    {tags.map((tag: any) => (
                      <div
                        key={tag.id}
                        className="flex items-center justify-between p-2 rounded-lg border hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: tag.color }}
                          />
                          <div>
                            <p className="text-sm font-medium">{tag.name}</p>
                            <p className="text-xs text-gray-500">
                              {tag.usage_count} used
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditTag(tag)}
                            disabled={isSubmitting}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedTag(tag);
                              setShowDeleteConfirm(true);
                            }}
                            disabled={isSubmitting}
                          >
                            <Trash2 className="h-3 w-3 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No tags created yet
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Dialog Actions */}
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            {isEditMode && (
              <Button
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isSubmitting}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            )}
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditMode ? 'Update' : 'Create'} Tag
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogTitle>Delete Tag</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete the tag "{selectedTag?.name}"? This action cannot be undone.
          </AlertDialogDescription>
          <div className="flex gap-4 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTag}
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TagManager;
