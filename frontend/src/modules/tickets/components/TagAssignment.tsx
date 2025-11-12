/**
 * TagAssignment Component
 * Assign tags to a ticket
 */

import React from 'react';
import { toast } from 'sonner';
import { X, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { useTags, useTicketTags } from '../hooks/useTags';

interface TagAssignmentProps {
  ticketId: string;
  onTagsChange?: () => void;
}

export const TagAssignment: React.FC<TagAssignmentProps> = ({
  ticketId,
  onTagsChange,
}) => {
  const { data: allTags = [], isLoading: tagsLoading } = useTags();
  const { data: assignedTags = [], isLoading: assignedLoading } = useTicketTags(ticketId);
  const { assignTag, removeTag } = useTicketTags(ticketId);

  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedTagId, setSelectedTagId] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const assignedTagIds = assignedTags?.map((tag: any) => tag.id) || [];
  const availableTags = allTags?.filter(
    (tag: any) => !assignedTagIds.includes(tag.id)
  ) || [];

  const handleAssignTag = async () => {
    if (!selectedTagId) {
      toast.error('Please select a tag');
      return;
    }

    setIsSubmitting(true);
    try {
      await assignTag.mutateAsync({ tag_ids: [selectedTagId] });
      toast.success('Tag assigned successfully');
      setSelectedTagId('');
      onTagsChange?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to assign tag');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    setIsSubmitting(true);
    try {
      await removeTag.mutateAsync(tagId);
      toast.success('Tag removed successfully');
      onTagsChange?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove tag');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Manage Tags
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Tags</DialogTitle>
          <DialogDescription>
            Add or remove tags to organize this ticket
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Assigned Tags */}
          <div>
            <p className="text-sm font-semibold mb-2">Assigned Tags</p>
            {assignedLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
              </div>
            ) : assignedTags && assignedTags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {assignedTags.map((tag: any) => (
                  <Badge
                    key={tag.id}
                    className="flex items-center gap-1 pl-2"
                    style={{ backgroundColor: tag.color }}
                  >
                    {tag.name}
                    <button
                      onClick={() => handleRemoveTag(tag.id)}
                      disabled={isSubmitting}
                      className="ml-1 hover:bg-white/20 rounded p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No tags assigned yet</p>
            )}
          </div>

          {/* Assign New Tag */}
          {availableTags.length > 0 && (
            <div className="space-y-2 border-t pt-4">
              <p className="text-sm font-semibold">Add New Tag</p>
              <div className="flex gap-2">
                <Select value={selectedTagId} onValueChange={setSelectedTagId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a tag..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTags.map((tag: any) => (
                      <SelectItem key={tag.id} value={tag.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: tag.color }}
                          />
                          {tag.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleAssignTag}
                  disabled={isSubmitting || !selectedTagId}
                  size="sm"
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Add
                </Button>
              </div>
            </div>
          )}

          {availableTags.length === 0 && assignedTags.length > 0 && (
            <p className="text-sm text-gray-500 text-center py-2">
              All tags have been assigned
            </p>
          )}

          {tagsLoading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end border-t pt-4">
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isSubmitting}
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TagAssignment;
