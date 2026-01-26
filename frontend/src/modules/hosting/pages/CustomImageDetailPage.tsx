/**
 * Custom Image Detail Page
 *
 * Client page for viewing detailed information about a custom Docker image
 */

import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCustomImage, useImageBuildLogs, useRebuildCustomImage, useDeleteCustomImage } from "../hooks/useCustomImages";
import { CustomImageDetailPanel } from "../components/CustomImageDetailPanel";
import { ImageBuildLogsViewer } from "../components/ImageBuildLogsViewer";
import { ImageBuildProgressIndicator } from "../components/ImageBuildProgressIndicator";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Card } from "@/shared/components/ui/card";
import { ArrowLeft, RefreshCw, Trash2, AlertCircle } from "lucide-react";
import { ImageBuildStatus } from "../types";

export const CustomImageDetailPage: React.FC = () => {
  const { imageId } = useParams<{ imageId: string }>();
  const navigate = useNavigate();
  const [autoRefresh, setAutoRefresh] = useState(true);

  const { data: image, isLoading, error, refetch } = useCustomImage(imageId || "");
  const { data: logs, isLoading: logsLoading } = useImageBuildLogs(imageId || "");
  const rebuildMutation = useRebuildCustomImage();
  const deleteMutation = useDeleteCustomImage();

  // Auto-refresh if image is still building
  useEffect(() => {
    if (!image || !autoRefresh) return;

    const isBuilding =
      image.status === ImageBuildStatus.PENDING ||
      image.status === ImageBuildStatus.VALIDATING ||
      image.status === ImageBuildStatus.BUILDING ||
      image.status === ImageBuildStatus.SCANNING;

    if (isBuilding) {
      const interval = setInterval(() => {
        refetch();
      }, 5000); // Refresh every 5 seconds

      return () => clearInterval(interval);
    }
  }, [image, autoRefresh, refetch]);

  const handleRebuild = () => {
    if (!imageId) return;
    if (window.confirm("Reconstruire cette image ? Un nouveau build sera créé.")) {
      rebuildMutation.mutate({ imageId });
    }
  };

  const handleDelete = () => {
    if (!imageId) return;
    if (window.confirm(`Supprimer l'image « ${image?.image_name}:${image?.image_tag} » ? Cette action est irréversible.`)) {
      deleteMutation.mutate(imageId, {
        onSuccess: () => {
          navigate("/dashboard/vps/custom-images");
        },
      });
    }
  };

  const isBuilding =
    image?.status === ImageBuildStatus.PENDING ||
    image?.status === ImageBuildStatus.VALIDATING ||
    image?.status === ImageBuildStatus.BUILDING ||
    image?.status === ImageBuildStatus.SCANNING;

  const canRebuild =
    image?.status === ImageBuildStatus.COMPLETED ||
    image?.status === ImageBuildStatus.FAILED ||
    image?.status === ImageBuildStatus.REJECTED;

  const canDelete = !isBuilding;

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  if (error || !image) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error instanceof Error
              ? error.message
              : "Impossible de charger les détails de l'image"}
          </AlertDescription>
        </Alert>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => navigate("/dashboard/vps/custom-images")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour aux images
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate("/dashboard/vps/custom-images")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              {image.image_name}:{image.image_tag}
            </h1>
            <p className="text-slate-600 mt-1">Custom Docker Image Details</p>
          </div>
        </div>
        <div className="flex gap-2">
          {canRebuild && (
            <Button variant="outline" onClick={handleRebuild} disabled={rebuildMutation.isPending}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Rebuild
            </Button>
          )}
          {canDelete && (
            <Button
              variant="outline"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* Build Progress (if building) */}
      {isBuilding && (
        <ImageBuildProgressIndicator status={image.status} />
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Details Panel */}
        <div className="lg:col-span-2">
          <CustomImageDetailPanel image={image} />
        </div>

        {/* Build Logs */}
        <div className="lg:col-span-1">
          <ImageBuildLogsViewer
            logs={logs || []}
            isLoading={logsLoading || isBuilding}
            autoScroll={isBuilding}
          />
        </div>
      </div>

      {/* Auto-refresh toggle */}
      {isBuilding && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Actualisation auto</p>
              <p className="text-xs text-muted-foreground">
                Actualiser la page automatiquement pendant la construction
              </p>
            </div>
            <Button
              variant={autoRefresh ? "default" : "outline"}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              {autoRefresh ? "Activé" : "Désactivé"}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};








