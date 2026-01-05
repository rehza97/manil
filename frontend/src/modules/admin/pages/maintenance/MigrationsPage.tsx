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
          <h1 className="text-3xl font-bold">Database Migrations</h1>
          <p className="text-muted-foreground mt-2">
            Manage database schema versions and migrations
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => setIsDowngradeDialogOpen(true)}
          >
            <ArrowDown className="h-4 w-4 mr-2" />
            Downgrade
          </Button>
          <Button onClick={() => setIsUpgradeDialogOpen(true)}>
            <ArrowUp className="h-4 w-4 mr-2" />
            Upgrade
          </Button>
        </div>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Migration operations modify the database schema. Always backup your
          database before running migrations, especially downgrades.
        </AlertDescription>
      </Alert>

      {/* Current Migration */}
      <Card>
        <CardHeader>
          <CardTitle>Current Migration</CardTitle>
          <CardDescription>Active database schema version</CardDescription>
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
              No migration information available
            </p>
          )}
        </CardContent>
      </Card>

      {/* Migration History */}
      <Card>
        <CardHeader>
          <CardTitle>Migration History</CardTitle>
          <CardDescription>
            {migrations?.length || 0}{" "}
            {migrations?.length === 1 ? "migration" : "migrations"} available
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !migrations || migrations.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No migrations found.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Revision</TableHead>
                  <TableHead>Down Revision</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
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
                        <Badge variant="default">Current</Badge>
                      ) : (
                        <Badge variant="secondary">Pending</Badge>
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
            <DialogTitle>Upgrade Migrations</DialogTitle>
            <DialogDescription>
              Run pending migrations to upgrade the database schema.
            </DialogDescription>
          </DialogHeader>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This will apply all pending migrations. Leave revision empty to
              upgrade to the latest version.
            </AlertDescription>
          </Alert>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">
                Target Revision (optional)
              </label>
              <input
                type="text"
                value={targetRevision}
                onChange={(e) => setTargetRevision(e.target.value)}
                placeholder="Leave empty for latest"
                className="mt-1 w-full px-3 py-2 border rounded-md"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Leave empty to upgrade to the latest version (head)
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
              Cancel
            </Button>
            <Button
              onClick={handleUpgrade}
              disabled={upgradeMutation.isPending}
            >
              {upgradeMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Upgrade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Downgrade Dialog */}
      <Dialog
        open={isDowngradeDialogOpen}
        onOpenChange={setIsDowngradeDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Downgrade Migrations</DialogTitle>
            <DialogDescription>
              Rollback migrations to a previous schema version.
            </DialogDescription>
          </DialogHeader>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> Downgrading migrations can cause data
              loss. Always backup your database before downgrading.
            </AlertDescription>
          </Alert>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Target Revision</label>
              <input
                type="text"
                value={targetRevision}
                onChange={(e) => setTargetRevision(e.target.value)}
                placeholder="e.g., 025"
                className="mt-1 w-full px-3 py-2 border rounded-md"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter the revision ID to downgrade to
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
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDowngrade}
              disabled={!targetRevision || downgradeMutation.isPending}
            >
              {downgradeMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Downgrade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};










