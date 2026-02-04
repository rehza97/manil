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
  const [isRestaurerDialogOpen, setIsRestaurerDialogOpen] = useState(false);
  const [selectedBackupId, setSelectedBackupId] = useState<string | null>(null);
  const [restoreConfirm, setRestaurerConfirm] = useState(false);

  const { data: backups, isLoading } = useBackupHistory();
  const createMutation = useCreateBackup();
  const deleteMutation = useDeleteBackup();
  const downloadMutation = useDownloadBackup();
  const restoreMutation = useRestoreBackup();

  const handleCreate = async () => {
    await createMutation.mutateAsync();
    setIsCreateDialogOpen(false);
  };

  const handleRestaurer = async () => {
    if (!selectedBackupId || !restoreConfirm) return;
    await restoreMutation.mutateAsync({
      backup_id: selectedBackupId,
      confirm: restoreConfirm,
    });
    setIsRestaurerDialogOpen(false);
    setSelectedBackupId(null);
    setRestaurerConfirm(false);
  };

  const handleDownload = async (backupId: string) => {
    await downloadMutation.mutateAsync(backupId);
  };

  const handleDelete = async (backupId: string) => {
    if (window.confirm("Voulez-vous vraiment supprimer cette sauvegarde ?")) {
      await deleteMutation.mutateAsync(backupId);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestion des sauvegardes</h1>
          <p className="text-muted-foreground mt-2">
            Créer, restaurer et gérer les sauvegardes de la base de données
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Créer une sauvegarde
        </Button>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Les sauvegardes sont stockées localement. Assurez-vous d&apos;avoir assez d&apos;espace disque et téléchargez régulièrement les sauvegardes pour un stockage externe.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Historique des sauvegardes</CardTitle>
          <CardDescription>
            {backups?.length || 0}{" "}
            {backups?.length === 1 ? "sauvegarde" : "sauvegardes"} disponible{(backups?.length ?? 0) !== 1 ? "s" : ""}
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
              <p className="text-muted-foreground">Aucune sauvegarde trouvée.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom du fichier</TableHead>
                  <TableHead>Taille</TableHead>
                  <TableHead>Créé le</TableHead>
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
                            setIsRestaurerDialogOpen(true);
                          }}
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Restaurer
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

      {/* Créer une sauvegarde Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer une sauvegarde</DialogTitle>
            <DialogDescription>
              Créer une nouvelle sauvegarde de la base. L'opération peut prendre quelques minutes.
            </DialogDescription>
          </DialogHeader>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              La sauvegarde créera un dump complet de la base. Assurez-vous d&apos;avoir assez d&apos;espace disque.
            </AlertDescription>
          </Alert>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Créer une sauvegarde
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restaurer Backup Dialog */}
      <Dialog open={isRestaurerDialogOpen} onOpenChange={setIsRestaurerDialogOpen}>
        <DialogContent className="bg-red-50 border-red-200">
          <DialogHeader>
            <DialogTitle className="text-red-900">Restaurer une sauvegarde</DialogTitle>
            <DialogDescription className="text-red-700">
              Restaurer la base à partir d'une sauvegarde. Toutes les données actuelles seront remplacées.
            </DialogDescription>
          </DialogHeader>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Attention :</strong> Cette opération est irréversible et remplacera toutes les données actuelles par la sauvegarde. Assurez-vous d'avoir une sauvegarde à jour avant de continuer.
            </AlertDescription>
          </Alert>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="restore-confirm"
                checked={restoreConfirm}
                onChange={(e) => setRestaurerConfirm(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="restore-confirm">
                Je comprends que cela remplacera toutes les données actuelles
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsRestaurerDialogOpen(false);
                setRestaurerConfirm(false);
              }}
            >
              Annuler
            </Button>
            <Button
              onClick={handleRestaurer}
              disabled={!restoreConfirm || restoreMutation.isPending}
              variant="destructive"
            >
              {restoreMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Restaurer la sauvegarde
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};













