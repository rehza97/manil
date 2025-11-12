/**
 * TagFilter Component
 * Filter tickets by tags
 */

import React from 'react';
import { X, Check } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/components/ui/popover';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Label } from '@/shared/components/ui/label';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { useTags } from '../hooks/useTags';

interface TagFilterProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
}

export const TagFilter: React.FC<TagFilterProps> = ({
  selectedTags,
  onTagsChange,
}) => {
  const { data: tags = [], isLoading } = useTags();
  const [searchTerm, setSearchTerm] = React.useState('');

  const filteredTags = tags?.filter((tag: any) =>
    tag.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleToggleTag = (tagId: string) => {
    if (selectedTags.includes(tagId)) {
      onTagsChange(selectedTags.filter((id) => id !== tagId));
    } else {
      onTagsChange([...selectedTags, tagId]);
    }
  };

  const getSelectedTagsInfo = () => {
    return selectedTags
      .map((tagId) => tags?.find((tag: any) => tag.id === tagId))
      .filter(Boolean);
  };

  const selectedTagsInfo = getSelectedTagsInfo();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={selectedTags.length > 0 ? 'default' : 'outline'}
          size="sm"
          className="relative"
        >
          Filter by Tags
          {selectedTags.length > 0 && (
            <Badge
              variant="secondary"
              className="ml-2 bg-blue-100 text-blue-800"
            >
              {selectedTags.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Filter by Tags</h4>
            <p className="text-xs text-gray-500">
              Select one or more tags to filter tickets
            </p>
          </div>

          {/* Selected Tags Display */}
          {selectedTagsInfo.length > 0 && (
            <div className="bg-blue-50 p-3 rounded-lg space-y-2">
              <p className="text-xs font-semibold text-gray-600">
                Selected ({selectedTagsInfo.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedTagsInfo.map((tag: any) => (
                  <Badge
                    key={tag.id}
                    className="flex items-center gap-1"
                    style={{ backgroundColor: tag.color }}
                  >
                    {tag.name}
                    <button
                      onClick={() => handleToggleTag(tag.id)}
                      className="ml-1 hover:bg-white/20 rounded p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Tag Search */}
          <div>
            <input
              type="text"
              placeholder="Search tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-2 py-1 text-sm border rounded-md"
            />
          </div>

          {/* Tags List */}
          <ScrollArea className="h-64 border rounded-lg">
            <div className="p-3 space-y-2">
              {isLoading ? (
                <p className="text-xs text-gray-500 text-center py-4">
                  Loading tags...
                </p>
              ) : filteredTags.length > 0 ? (
                filteredTags.map((tag: any) => (
                  <div
                    key={tag.id}
                    className="flex items-center space-x-2 p-2 rounded hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleToggleTag(tag.id)}
                  >
                    <Checkbox
                      checked={selectedTags.includes(tag.id)}
                      onCheckedChange={() => handleToggleTag(tag.id)}
                      id={`tag-${tag.id}`}
                    />
                    <Label
                      htmlFor={`tag-${tag.id}`}
                      className="flex items-center gap-2 flex-1 cursor-pointer"
                    >
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="text-sm">{tag.name}</span>
                      {tag.usage_count > 0 && (
                        <span className="text-xs text-gray-500 ml-auto">
                          {tag.usage_count}
                        </span>
                      )}
                    </Label>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-500 text-center py-4">
                  No tags found
                </p>
              )}
            </div>
          </ScrollArea>

          {/* Actions */}
          <div className="flex gap-2 justify-end border-t pt-3">
            {selectedTags.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onTagsChange([])}
              >
                Clear All
              </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default TagFilter;
