/**
 * Database Migrations Page
 *
 * Admin page for managing database migrations
 */

import React, { useState } from "react";
import {
  ArrowUp,
  ArrowDown,
  Loader2,
  AlertTriangle,
  CheckCircle,
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
import {
  useMigrations,
  useCurrentMigration,
  useUpgradeMigrations,
  useDowngradeMigrations,
} from "../../hooks/useMaintenance";

export const MigrationsPage: React.FC = () => {
  const [isUpgradeDialogOpen, setIsUpgradeDialogOpen] = useState(false);
  const [isDowngradeDialogOpen, setIsDowngradeDialogOpen] = useState(false);
  const [targetRevision, setTargetRevision] = useState("");

  const { data: migrations, isLoading } = useMigrations();
  const { data: currentMigration } = useCurrentMigration();
  const upgradeMutation = useUpgradeMigrations();
  const downgradeMutation = useDowngradeMigrations();

  const handleUpgrade = async () => {
    await upgradeMutation.mutateAsync(targetRevision || undefined);
    setIsUpgradeDialogOpen(false);
    setTargetRevision("");
  };

  const handleDowngrade = async () => {
    if (!targetRevision) return;
    await downgradeMutation.mutateAsync(targetRevision);
    setIsDowngradeDialogOpen(false);
    setTargetRevision("");
  };

  const currentVersion = currentMigration?.current_version;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Migrations base de données</h1>
          <p className="text-muted-foreground mt-2">
            Gérer les versions du schéma et les migrations
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => setIsDowngradeDialogOpen(true)}
          >
            <ArrowDown className="h-4 w-4 mr-2" />
            Revenir en arrière
          </Button>
          <Button onClick={() => setIsUpgradeDialogOpen(true)}>
            <ArrowUp className="h-4 w-4 mr-2" />
            Mettre à jour
          </Button>
        </div>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Les migrations modifient le schéma de la base. Sauvegardez toujours votre base avant d'exécuter des migrations, surtout un retour en arrière.
        </AlertDescription>
      </Alert>

      {/* Current Migration */}
      <Card>
        <CardHeader>
<CardTitle>Migration actuelle</CardTitle>
        <CardDescription>Version active du schéma de la base</CardDescription>
        </CardHeader>
        <CardContent>
          {currentVersion ? (
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="font-mono font-medium">{currentVersion}</span>
              <Badge variant="default">Active</Badge>
            </div>
          ) : (
            <p className="text-muted-foreground">
              Aucune information de migration disponible
            </p>
          )}
        </CardContent>
      </Card>

      {/* Migration History */}
      <Card>
        <CardHeader>
<CardTitle>Historique des migrations</CardTitle>
        <CardDescription>
            {migrations?.length || 0}{" "}
            {migrations?.length === 1 ? "migration" : "migrations"} disponible{(migrations?.length ?? 0) !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !migrations || migrations.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Aucune migration trouvée.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Révision</TableHead>
                  <TableHead>Révision précédente</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {migrations.map((migration) => (
                  <TableRow key={migration.revision}>
                    <TableCell className="font-mono">
                      {migration.revision}
                    </TableCell>
                    <TableCell className="font-mono text-muted-foreground">
                      {migration.down_revision || "-"}
                    </TableCell>
                    <TableCell>{migration.doc || "-"}</TableCell>
                    <TableCell>
                      {migration.is_current ? (
                        <Badge variant="default">Actuelle</Badge>
                      ) : (
                        <Badge variant="secondary">En attente</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Upgrade Dialog */}
      <Dialog open={isUpgradeDialogOpen} onOpenChange={setIsUpgradeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mettre à jour les migrations</DialogTitle>
            <DialogDescription>
              Exécuter les migrations en attente pour mettre à jour le schéma de la base.
            </DialogDescription>
          </DialogHeader>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Toutes les migrations en attente seront appliquées. Laisser la révision vide pour passer à la dernière version.
            </AlertDescription>
          </Alert>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">
                Révision cible (facultatif)
              </label>
              <input
                type="text"
                value={targetRevision}
                onChange={(e) => setTargetRevision(e.target.value)}
                placeholder="Laisser vide pour la dernière version"
                className="mt-1 w-full px-3 py-2 border rounded-md"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Laisser vide pour passer à la dernière version (head)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsUpgradeDialogOpen(false);
                setTargetRevision("");
              }}
            >
              Annuler
            </Button>
            <Button
              onClick={handleUpgrade}
              disabled={upgradeMutation.isPending}
            >
              {upgradeMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Mettre à jour
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revenir en arrière Dialog */}
      <Dialog
        open={isDowngradeDialogOpen}
        onOpenChange={setIsDowngradeDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revenir à une migration antérieure</DialogTitle>
            <DialogDescription>
              Revenir à une version antérieure du schéma.
            </DialogDescription>
          </DialogHeader>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Attention :</strong> Revenir à une migration antérieure peut entraîner une perte de données. Sauvegardez toujours votre base avant de revenir en arrière.
            </AlertDescription>
          </Alert>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Révision cible</label>
              <input
                type="text"
                value={targetRevision}
                onChange={(e) => setTargetRevision(e.target.value)}
                placeholder="e.g., 025"
                className="mt-1 w-full px-3 py-2 border rounded-md"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Saisir l'ID de révision à laquelle revenir
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDowngradeDialogOpen(false);
                setTargetRevision("");
              }}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleDowngrade}
              disabled={!targetRevision || downgradeMutation.isPending}
            >
              {downgradeMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Revenir en arrière
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};












