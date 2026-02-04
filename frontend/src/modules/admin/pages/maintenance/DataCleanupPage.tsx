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
        <h1 className="text-3xl font-bold">Nettoyage des données</h1>
        <p className="text-muted-foreground mt-2">
          Supprimer les données anciennes et inutilisées pour libérer de l&apos;espace
        </p>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Les opérations de nettoyage sont irréversibles. Toujours prévisualiser avant de lancer le nettoyage.
        </AlertDescription>
      </Alert>

      {/* Cleanup Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Anciens journaux d&apos;audit
            </CardTitle>
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.old_audit_logs || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Plus de 90 jours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Supprimés (soft)</CardTitle>
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.soft_deleted_records || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Plus de 30 jours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pièces jointes orphelines
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
              Sessions expirées
            </CardTitle>
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.expired_sessions || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Sessions inactives
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Anciennes sauvegardes</CardTitle>
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.old_backups || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Au-delà de la rétention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cleanup Options */}
      <Card>
        <CardHeader>
          <CardTitle>Options de nettoyage</CardTitle>
          <CardDescription>
            Choisir ce qui doit être nettoyé et configurer les périodes de rétention
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
                Nettoyer les anciens journaux d&apos;audit
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
              <span className="text-sm text-muted-foreground">jours</span>
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
                Nettoyer les enregistrements supprimés (soft)
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
              <span className="text-sm text-muted-foreground">jours</span>
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
                Nettoyer les pièces jointes orphelines
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
                Nettoyer les sessions expirées
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
                Nettoyer les anciennes sauvegardes
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
              <span className="text-sm text-muted-foreground">jours</span>
            </div>
          </div>

          <div className="flex space-x-4">
            <Button variant="outline" onClick={handlePreview}>
              <Eye className="h-4 w-4 mr-2" />
              Aperçu du nettoyage
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
              Lancer le nettoyage
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aperçu du nettoyage</DialogTitle>
            <DialogDescription>
              Aperçu des éléments qui seront supprimés
            </DialogDescription>
          </DialogHeader>
          {previewMutation.data ? (
            <div className="space-y-4">
              <div>
                <Label>Éléments à supprimer</Label>
                <div className="mt-2 space-y-2">
                  <div className="flex justify-between">
                    <span>Anciens journaux d&apos;audit :</span>
                    <Badge>
                      {previewMutation.data.items_to_delete.old_audit_logs}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Enregistrements supprimés (soft) :</span>
                    <Badge>
                      {
                        previewMutation.data.items_to_delete
                          .soft_deleted_records
                      }
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Pièces jointes orphelines :</span>
                    <Badge>
                      {
                        previewMutation.data.items_to_delete
                          .orphaned_attachments
                      }
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Sessions expirées :</span>
                    <Badge>
                      {previewMutation.data.items_to_delete.expired_sessions}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Anciennes sauvegardes :</span>
                    <Badge>
                      {previewMutation.data.items_to_delete.old_backups}
                    </Badge>
                  </div>
                </div>
              </div>
              <div>
                <Label>Espace libéré estimé</Label>
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
                  Aucune donnée d&apos;aperçu disponible
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsPreviewDialogOpen(false)}
            >
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Run Cleanup Dialog */}
      <Dialog open={isRunDialogOpen} onOpenChange={setIsRunDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lancer le nettoyage</DialogTitle>
            <DialogDescription>
              Les éléments sélectionnés seront définitivement supprimés. Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Attention :</strong> Cette opération est irréversible. Assurez-vous d'avoir des sauvegardes avant de continuer.
            </AlertDescription>
          </Alert>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRunDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleRun}
              disabled={runMutation.isPending}
            >
              {runMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Lancer le nettoyage
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};












