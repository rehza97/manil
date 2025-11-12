/**
 * WatcherManager Component
 * Add/remove watchers from a ticket
 */

import React from 'react';
import { toast } from 'sonner';
import { Eye, EyeOff, X, Loader2, Users } from 'lucide-react';
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
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Label } from '@/shared/components/ui/label';
import { useWatchers, useUsers } from '../hooks/useWatchers';

interface WatcherManagerProps {
  ticketId: string;
  onWatchersChange?: () => void;
}

export const WatcherManager: React.FC<WatcherManagerProps> = ({
  ticketId,
  onWatchersChange,
}) => {
  const {
    data: watchers = [],
    isLoading: watchersLoading,
  } = useWatchers(ticketId);
  const { data: users = [], isLoading: usersLoading } = useUsers();
  const { addWatcher, removeWatcher } = useWatchers(ticketId);

  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedUserId, setSelectedUserId] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const watcherUserIds = watchers?.map((w: any) => w.user_id) || [];
  const availableUsers = users?.filter(
    (user: any) => !watcherUserIds.includes(user.id)
  ) || [];

  const handleAddWatcher = async () => {
    if (!selectedUserId) {
      toast.error('Please select a user');
      return;
    }

    setIsSubmitting(true);
    try {
      await addWatcher.mutateAsync({
        user_id: selectedUserId,
      });
      toast.success('Watcher added successfully');
      setSelectedUserId('');
      onWatchersChange?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add watcher');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveWatcher = async (userId: string) => {
    setIsSubmitting(true);
    try {
      await removeWatcher.mutateAsync(userId);
      toast.success('Watcher removed successfully');
      onWatchersChange?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to remove watcher'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Users className="h-4 w-4 mr-2" />
          Watchers ({watchers?.length || 0})
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ticket Watchers</DialogTitle>
          <DialogDescription>
            Manage who is watching this ticket for updates
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Watchers */}
          <div>
            <p className="text-sm font-semibold mb-2">Current Watchers</p>
            {watchersLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
              </div>
            ) : watchers && watchers.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {watchers.map((watcher: any) => (
                  <div
                    key={watcher.id}
                    className="flex items-center justify-between p-2 border rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium">{watcher.user_id}</p>
                      <div className="flex gap-1 mt-1">
                        {watcher.notify_on_reply && (
                          <Badge variant="outline" className="text-xs">
                            Replies
                          </Badge>
                        )}
                        {watcher.notify_on_status_change && (
                          <Badge variant="outline" className="text-xs">
                            Status
                          </Badge>
                        )}
                        {watcher.notify_on_assignment && (
                          <Badge variant="outline" className="text-xs">
                            Assigned
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveWatcher(watcher.user_id)}
                      disabled={isSubmitting}
                    >
                      <X className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No watchers yet</p>
            )}
          </div>

          {/* Add Watcher */}
          {availableUsers.length > 0 && (
            <div className="space-y-2 border-t pt-4">
              <p className="text-sm font-semibold">Add Watcher</p>
              <div className="flex gap-2">
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a user..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUsers.map((user: any) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleAddWatcher}
                  disabled={isSubmitting || !selectedUserId}
                  size="sm"
                >
                  {isSubmitting && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Add
                </Button>
              </div>
            </div>
          )}

          {usersLoading && (
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

export default WatcherManager;
