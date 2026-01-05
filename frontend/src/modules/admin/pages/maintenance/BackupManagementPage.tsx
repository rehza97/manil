/**
 * Backup Management Page
 *
 * Admin page for managing database backups
 */

import React, { useState } from "react";
import {
  Database,
  Download,
  Trash2,
  RefreshCw,
  Plus,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Badge } from "@/shared/components/ui/badge";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Label } from "@/shared/components/ui/label";
import {
  useBackupHistory,
  useCreateBackup,
  useDeleteBackup,
  useDownloadBackup,
  useRestoreBackup,
} from "../../hooks/useMaintenance";
// Format bytes helper
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
};

export const BackupManagementPage: React.FC = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState(false);
  const [selectedBackupId, setSelectedBackupId] = useState<string | null>(null);
  const [restoreConfirm, setRestoreConfirm] = useState(false);

  const { data: backups, isLoading } = useBackupHistory();
  const createMutation = useCreateBackup();
  const deleteMutation = useDeleteBackup();
  const downloadMutation = useDownloadBackup();
  const restoreMutation = useRestoreBackup();

  const handleCreate = async () => {
    await createMutation.mutateAsync();
    setIsCreateDialogOpen(false);
  };

  const handleRestore = async () => {
    if (!selectedBackupId || !restoreConfirm) return;
    await restoreMutation.mutateAsync({
      backup_id: selectedBackupId,
      confirm: restoreConfirm,
    });
    setIsRestoreDialogOpen(false);
    setSelectedBackupId(null);
    setRestoreConfirm(false);
  };

  const handleDownload = async (backupId: string) => {
    await downloadMutation.mutateAsync(backupId);
  };

  const handleDelete = async (backupId: string) => {
    if (window.confirm("Are you sure you want to delete this backup?")) {
      await deleteMutation.mutateAsync(backupId);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Backup Management</h1>
          <p className="text-muted-foreground mt-2">
            Create, restore, and manage database backups
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Backup
        </Button>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Backups are stored locally. Ensure you have sufficient disk space and
          regularly download backups for off-site storage.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Backup History</CardTitle>
          <CardDescription>
            {backups?.length || 0}{" "}
            {backups?.length === 1 ? "backup" : "backups"} available
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !backups || backups.length === 0 ? (
            <div className="text-center py-12">
              <Database className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No backups found.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Filename</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {backups.map((backup) => (
                  <TableRow key={backup.id}>
                    <TableCell className="font-medium">
                      {backup.filename}
                    </TableCell>
                    <TableCell>{formatBytes(backup.file_size)}</TableCell>
                    <TableCell>
                      {new Date(backup.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(backup.id)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedBackupId(backup.id);
                            setIsRestoreDialogOpen(true);
                          }}
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Restore
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(backup.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Backup Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Backup</DialogTitle>
            <DialogDescription>
              Create a new database backup. This may take a few minutes.
            </DialogDescription>
          </DialogHeader>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              The backup process will create a full database dump. Ensure you
              have sufficient disk space.
            </AlertDescription>
          </Alert>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Create Backup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Backup Dialog */}
      <Dialog open={isRestoreDialogOpen} onOpenChange={setIsRestoreDialogOpen}>
        <DialogContent className="bg-red-50 border-red-200">
          <DialogHeader>
            <DialogTitle className="text-red-900">Restore Backup</DialogTitle>
            <DialogDescription className="text-red-700">
              Restore database from backup. This will replace all current data!
            </DialogDescription>
          </DialogHeader>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> This operation is irreversible and will
              replace all current database data with the backup. Ensure you have
              a current backup before proceeding.
            </AlertDescription>
          </Alert>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="restore-confirm"
                checked={restoreConfirm}
                onChange={(e) => setRestoreConfirm(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="restore-confirm">
                I understand this will replace all current data
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsRestoreDialogOpen(false);
                setRestoreConfirm(false);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRestore}
              disabled={!restoreConfirm || restoreMutation.isPending}
              variant="destructive"
            >
              {restoreMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Restore Backup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};











