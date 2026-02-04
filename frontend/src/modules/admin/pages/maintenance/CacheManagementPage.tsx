/**
 * Cache Management Page
 *
 * Admin page for managing system cache
 */

import React, { useState } from "react";
import { RefreshCw, Trash2, Zap, Loader2, AlertTriangle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
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
import {
  useCacheStats,
  useClearAllCache,
  useClearCacheByPattern,
  useWarmCache,
} from "../../hooks/useMaintenance";

export const CacheManagementPage: React.FC = () => {
  const [pattern, setPattern] = useState("");
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
  const [isPatternDialogOpen, setIsPatternDialogOpen] = useState(false);

  const { data: stats, isLoading } = useCacheStats();
  const clearAllMutation = useClearAllCache();
  const clearPatternMutation = useClearCacheByPattern();
  const warmMutation = useWarmCache();

  const handleClearAll = async () => {
    await clearAllMutation.mutateAsync();
    setIsClearDialogOpen(false);
  };

  const handleClearPattern = async () => {
    if (!pattern) return;
    await clearPatternMutation.mutateAsync(pattern);
    setIsPatternDialogOpen(false);
    setPattern("");
  };

  const handleWarm = async () => {
    await warmMutation.mutateAsync();
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gestion du cache</h1>
        <p className="text-muted-foreground mt-2">
          Surveiller et gérer les performances du cache système
        </p>
      </div>

      {/* Cache Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clés totales</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_keys || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Cached items</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mémoire utilisée</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.memory_used_mb.toFixed(2) || "0.00"} MB
            </div>
            <p className="text-xs text-muted-foreground mt-1">Mémoire cache</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux de succès</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.hit_rate !== null && stats?.hit_rate !== undefined
                ? `${stats.hit_rate.toFixed(1)}%`
                : "N/A"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Efficacité du cache
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Requêtes</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(stats?.keyspace_hits || 0) + (stats?.keyspace_misses || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Requêtes totales</p>
          </CardContent>
        </Card>
      </div>

      {/* Cache Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Opérations sur le cache</CardTitle>
          <CardDescription>
            Vider le cache ou le précharger avec des données courantes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Vider tout le cache</h3>
              <p className="text-sm text-muted-foreground">
                Supprimer toutes les données en cache. Le système sera temporairement ralenti jusqu&apos;à la reconstruction du cache.
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={() => setIsClearDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Tout vider
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Vider par motif</h3>
              <p className="text-sm text-muted-foreground">
                Supprimer les clés correspondant à un motif (ex. « user:* »).
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => setIsPatternDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Vider par motif
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Préchauffer le cache</h3>
              <p className="text-sm text-muted-foreground">
                Précharger les données courantes dans le cache pour améliorer les performances.
              </p>
            </div>
            <Button variant="outline" onClick={handleWarm}>
              <Zap className="h-4 w-4 mr-2" />
              Préchauffer le cache
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Statistics */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle>Detailed Statistics</CardTitle>
            <CardDescription>Cache performance metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Succès Keyspace</Label>
                <div className="text-2xl font-bold">{stats.keyspace_hits}</div>
              </div>
              <div>
                <Label className="text-muted-foreground">Échecs Keyspace</Label>
                <div className="text-2xl font-bold">
                  {stats.keyspace_misses}
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">
                  Mémoire utilisée (octets)
                </Label>
                <div className="text-2xl font-bold">
                  {stats.memory_used.toLocaleString()}
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Taux de succès</Label>
                <div className="text-2xl font-bold">
                  {stats.hit_rate !== null && stats.hit_rate !== undefined
                    ? `${stats.hit_rate.toFixed(2)}%`
                    : "N/A"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Clear All Dialog */}
      <Dialog open={isClearDialogOpen} onOpenChange={setIsClearDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear All Cache</DialogTitle>
            <DialogDescription>
              This will remove all cached data. Are you sure?
            </DialogDescription>
          </DialogHeader>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Vider tout le cache ralentira temporairement le système jusqu&apos;à sa reconstruction par l&apos;usage normal.
            </AlertDescription>
          </Alert>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsClearDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleClearAll}
              disabled={clearAllMutation.isPending}
            >
              {clearAllMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Vider tout le cache
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear Pattern Dialog */}
      <Dialog open={isPatternDialogOpen} onOpenChange={setIsPatternDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vider le cache par motif</DialogTitle>
            <DialogDescription>
              Saisir un motif pour cibler les clés (ex. « user:* », « session:* »).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="pattern">Motif</Label>
              <Input
                id="pattern"
                value={pattern}
                onChange={(e) => setPattern(e.target.value)}
                placeholder="user:*"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsPatternDialogOpen(false);
                setPattern("");
              }}
            >
              Annuler
            </Button>
            <Button
              onClick={handleClearPattern}
              disabled={!pattern || clearPatternMutation.isPending}
            >
              {clearPatternMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Vider par motif
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};












