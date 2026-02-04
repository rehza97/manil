/**
 * DNS Templates Page (Admin)
 *
 * Manage DNS record templates for quick zone setup.
 */
import { useState } from "react";
import { Plus, Edit, Trash2, Eye } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { Badge } from "@/shared/components/ui/badge";
import { RecordTypeBadge } from "../../components";
import {
  useAdminDNSTemplates,
  useDeleteDNSTemplate,
} from "../../hooks";
import type { DNSTemplate } from "../../types";

export default function DNSTemplatesPage() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<DNSTemplate | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<DNSTemplate | null>(null);

  // Fetch templates
  const { data: templates, isLoading } = useAdminDNSTemplates();

  // Mutations
  const deleteMutation = useDeleteDNSTemplate();

  const handleDelete = () => {
    if (!deletingTemplate) return;

    deleteMutation.mutate(deletingTemplate.id, {
      onSuccess: () => {
        setDeletingTemplate(null);
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Modèles DNS</h1>
          <p className="text-muted-foreground">
            Gérer les modèles d&apos;enregistrements DNS pour une configuration rapide des zones
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Créer un modèle
        </Button>
      </div>

      {/* Templates List */}
      <Card>
        <CardHeader>
          <CardTitle>Available Templates</CardTitle>
          <CardDescription>
            Predefined DNS record configurations for common use cases
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : !templates || templates.length === 0 ? (
            <div className="rounded-lg border border-dashed p-12 text-center">
              <h3 className="mb-2 text-lg font-semibold">Aucun modèle trouvé</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Créez votre premier modèle DNS pour aider les utilisateurs à configurer les zones rapidement
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Créer un modèle
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {templates.map((template) => (
                <Card key={template.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">{template.name}</CardTitle>
                          {template.is_default && (
                            <Badge variant="secondary">Default</Badge>
                          )}
                        </div>
                        <CardDescription className="mt-1">
                          {template.description}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPreviewTemplate(template)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => alert("Edit functionality coming soon")}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletingTemplate(template)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{template.record_definitions?.length || 0} enregistrement{(template.record_definitions?.length ?? 0) !== 1 ? "s" : ""}</span>
                      <span>•</span>
                      <span>
                        Utilisé {template.usage_count || 0} fois
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Template Dialog (Placeholder) */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Créer un modèle DNS</DialogTitle>
          </DialogHeader>
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Le formulaire de création de modèle sera implémenté en phase 7
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Template Dialog */}
      <Dialog
        open={!!previewTemplate}
        onOpenChange={() => setPreviewTemplate(null)}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{previewTemplate?.name}</DialogTitle>
          </DialogHeader>
          {previewTemplate && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {previewTemplate.description}
              </p>
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Valeur</TableHead>
                      <TableHead>TTL</TableHead>
                      <TableHead>Priorité</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewTemplate.record_definitions?.map((record, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono text-sm">
                          {record.record_name}
                        </TableCell>
                        <TableCell>
                          <RecordTypeBadge type={record.record_type} />
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {record.record_value}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {record.ttl || "Par défaut"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {record.priority || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {previewTemplate.record_definitions?.some(
                (r) =>
                  r.record_value.includes("{VPS_IP}") ||
                  r.record_value.includes("{ZONE_NAME}")
              ) && (
                <div className="rounded-lg bg-muted p-3 text-sm">
                  <p className="font-medium">Variables du modèle :</p>
                  <ul className="mt-1 list-inside list-disc text-muted-foreground">
                    <li>
                      <code className="font-mono">{"{VPS_IP}"}</code> — Adresse IP du VPS
                    </li>
                    <li>
                      <code className="font-mono">{"{ZONE_NAME}"}</code> — Nom de domaine de la zone
                    </li>
                  </ul>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deletingTemplate}
        onOpenChange={() => setDeletingTemplate(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le modèle ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le modèle «
              {deletingTemplate?.name} » ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Suppression…" : "Supprimer le modèle"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
