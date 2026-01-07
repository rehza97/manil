/**
 * Data Cleanup Page
 *
 * Admin page for cleaning up old and unused data
 */

import React, { useState } from "react";
import { Trash2, Eye, Loader2, AlertTriangle, CheckSquare } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Label } from "@/shared/components/ui/label";
import { Input } from "@/shared/components/ui/input";
import { Checkbox } from "@/shared/components/ui/checkbox";
import {
  useCleanupStats,
  usePreviewCleanup,
  useRunCleanup,
} from "../../hooks/useMaintenance";
import type { CleanupRunRequest } from "../../services/maintenanceService";

export const DataCleanupPage: React.FC = () => {
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [isRunDialogOpen, setIsRunDialogOpen] = useState(false);
  const [cleanupOptions, setCleanupOptions] = useState<CleanupRunRequest>({
    cleanup_audit_logs: false,
    cleanup_soft_deleted: false,
    cleanup_orphaned_attachments: false,
    cleanup_expired_sessions: false,
    cleanup_old_backups: false,
    audit_logs_days: 90,
    soft_deleted_days: 30,
    backup_retention_days: 30,
  });

  const { data: stats, isLoading } = useCleanupStats();
  const previewMutation = usePreviewCleanup();
  const runMutation = useRunCleanup();

  const handlePreview = async () => {
    await previewMutation.mutateAsync(cleanupOptions);
    setIsPreviewDialogOpen(true);
  };

  const handleRun = async () => {
    await runMutation.mutateAsync(cleanupOptions);
    setIsRunDialogOpen(false);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Data Cleanup</h1>
        <p className="text-muted-foreground mt-2">
          Remove old and unused data to free up storage space
        </p>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Cleanup operations are irreversible. Always preview before running
          cleanup.
        </AlertDescription>
      </Alert>

      {/* Cleanup Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Old Audit Logs
            </CardTitle>
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.old_audit_logs || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Older than 90 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Soft Deleted</CardTitle>
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.soft_deleted_records || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Older than 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Orphaned Attachments
            </CardTitle>
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.orphaned_attachments || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Unreferenced files
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Expired Sessions
            </CardTitle>
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.expired_sessions || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Inactive sessions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Old Backups</CardTitle>
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.old_backups || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Beyond retention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cleanup Options */}
      <Card>
        <CardHeader>
          <CardTitle>Cleanup Options</CardTitle>
          <CardDescription>
            Select what to clean up and configure retention periods
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="cleanup_audit_logs"
                checked={cleanupOptions.cleanup_audit_logs}
                onCheckedChange={(checked) =>
                  setCleanupOptions({
                    ...cleanupOptions,
                    cleanup_audit_logs: checked as boolean,
                  })
                }
              />
              <Label htmlFor="cleanup_audit_logs" className="flex-1">
                Clean up old audit logs
              </Label>
              <Input
                type="number"
                value={cleanupOptions.audit_logs_days}
                onChange={(e) =>
                  setCleanupOptions({
                    ...cleanupOptions,
                    audit_logs_days: parseInt(e.target.value) || 90,
                  })
                }
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">days</span>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="cleanup_soft_deleted"
                checked={cleanupOptions.cleanup_soft_deleted}
                onCheckedChange={(checked) =>
                  setCleanupOptions({
                    ...cleanupOptions,
                    cleanup_soft_deleted: checked as boolean,
                  })
                }
              />
              <Label htmlFor="cleanup_soft_deleted" className="flex-1">
                Clean up soft-deleted records
              </Label>
              <Input
                type="number"
                value={cleanupOptions.soft_deleted_days}
                onChange={(e) =>
                  setCleanupOptions({
                    ...cleanupOptions,
                    soft_deleted_days: parseInt(e.target.value) || 30,
                  })
                }
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">days</span>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="cleanup_orphaned_attachments"
                checked={cleanupOptions.cleanup_orphaned_attachments}
                onCheckedChange={(checked) =>
                  setCleanupOptions({
                    ...cleanupOptions,
                    cleanup_orphaned_attachments: checked as boolean,
                  })
                }
              />
              <Label htmlFor="cleanup_orphaned_attachments" className="flex-1">
                Clean up orphaned attachments
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="cleanup_expired_sessions"
                checked={cleanupOptions.cleanup_expired_sessions}
                onCheckedChange={(checked) =>
                  setCleanupOptions({
                    ...cleanupOptions,
                    cleanup_expired_sessions: checked as boolean,
                  })
                }
              />
              <Label htmlFor="cleanup_expired_sessions" className="flex-1">
                Clean up expired sessions
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="cleanup_old_backups"
                checked={cleanupOptions.cleanup_old_backups}
                onCheckedChange={(checked) =>
                  setCleanupOptions({
                    ...cleanupOptions,
                    cleanup_old_backups: checked as boolean,
                  })
                }
              />
              <Label htmlFor="cleanup_old_backups" className="flex-1">
                Clean up old backups
              </Label>
              <Input
                type="number"
                value={cleanupOptions.backup_retention_days}
                onChange={(e) =>
                  setCleanupOptions({
                    ...cleanupOptions,
                    backup_retention_days: parseInt(e.target.value) || 30,
                  })
                }
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">days</span>
            </div>
          </div>

          <div className="flex space-x-4">
            <Button variant="outline" onClick={handlePreview}>
              <Eye className="h-4 w-4 mr-2" />
              Preview Cleanup
            </Button>
            <Button
              variant="destructive"
              onClick={() => setIsRunDialogOpen(true)}
              disabled={
                !cleanupOptions.cleanup_audit_logs &&
                !cleanupOptions.cleanup_soft_deleted &&
                !cleanupOptions.cleanup_orphaned_attachments &&
                !cleanupOptions.cleanup_expired_sessions &&
                !cleanupOptions.cleanup_old_backups
              }
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Run Cleanup
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cleanup Preview</DialogTitle>
            <DialogDescription>
              Preview of items that will be deleted
            </DialogDescription>
          </DialogHeader>
          {previewMutation.data ? (
            <div className="space-y-4">
              <div>
                <Label>Items to Delete</Label>
                <div className="mt-2 space-y-2">
                  <div className="flex justify-between">
                    <span>Old Audit Logs:</span>
                    <Badge>
                      {previewMutation.data.items_to_delete.old_audit_logs}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Soft Deleted Records:</span>
                    <Badge>
                      {
                        previewMutation.data.items_to_delete
                          .soft_deleted_records
                      }
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Orphaned Attachments:</span>
                    <Badge>
                      {
                        previewMutation.data.items_to_delete
                          .orphaned_attachments
                      }
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Expired Sessions:</span>
                    <Badge>
                      {previewMutation.data.items_to_delete.expired_sessions}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Old Backups:</span>
                    <Badge>
                      {previewMutation.data.items_to_delete.old_backups}
                    </Badge>
                  </div>
                </div>
              </div>
              <div>
                <Label>Estimated Space Freed</Label>
                <div className="text-2xl font-bold mt-2">
                  {previewMutation.data.estimated_space_freed_mb.toFixed(2)} MB
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              {previewMutation.isPending ? (
                <Loader2 className="h-8 w-8 animate-spin" />
              ) : (
                <p className="text-muted-foreground">
                  No preview data available
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsPreviewDialogOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Run Cleanup Dialog */}
      <Dialog open={isRunDialogOpen} onOpenChange={setIsRunDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Run Cleanup</DialogTitle>
            <DialogDescription>
              This will permanently delete the selected items. This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> This operation is irreversible. Make
              sure you have backups before proceeding.
            </AlertDescription>
          </Alert>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRunDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRun}
              disabled={runMutation.isPending}
            >
              {runMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Run Cleanup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};












