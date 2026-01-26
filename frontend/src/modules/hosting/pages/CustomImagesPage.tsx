/**
 * Custom Images Page
 *
 * Client page for viewing and managing custom Docker images
 */

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCustomImages, useDeleteCustomImage } from "../hooks/useCustomImages";
import { CustomImageCard } from "../components/CustomImageCard";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Upload, AlertCircle, RefreshCw } from "lucide-react";
import { ImageBuildStatus } from "../types";

export const CustomImagesPage: React.FC = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [statusFilter, setStatusFilter] = useState<ImageBuildStatus | "all">("all");

  const { data, isLoading, error, refetch } = useCustomImages({
    status: statusFilter === "all" ? undefined : statusFilter,
    page,
    page_size: pageSize,
  });

  const deleteMutation = useDeleteCustomImage();

  const images = data?.items || [];
  const pagination = data
    ? {
        total: data.total,
        page: data.page,
        page_size: data.page_size,
        total_pages: data.total_pages,
      }
    : null;

  const handleDelete = (imageId: string) => {
    deleteMutation.mutate(imageId);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Images Docker personnalisées</h1>
          <p className="text-slate-600 mt-1">
            Téléversez et gérez vos images Docker personnalisées
          </p>
        </div>
        <Button onClick={() => navigate("/dashboard/vps/custom-images/upload")}>
          <Upload className="h-4 w-4 mr-2" />
          Téléverser une image
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <Select
          value={statusFilter}
          onValueChange={(value) => {
            setStatusFilter(value as ImageBuildStatus | "all");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filtrer par statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value={ImageBuildStatus.PENDING}>En attente</SelectItem>
            <SelectItem value={ImageBuildStatus.VALIDATING}>Validation</SelectItem>
            <SelectItem value={ImageBuildStatus.BUILDING}>Construction</SelectItem>
            <SelectItem value={ImageBuildStatus.SCANNING}>Analyse</SelectItem>
            <SelectItem value={ImageBuildStatus.COMPLETED}>Terminé</SelectItem>
            <SelectItem value={ImageBuildStatus.FAILED}>Échoué</SelectItem>
            <SelectItem value={ImageBuildStatus.REJECTED}>Rejeté</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualiser
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error instanceof Error
              ? error.message
              : "Impossible de charger les images personnalisées"}
          </AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-[200px]" />
          ))}
        </div>
      )}

      {/* Images Grid */}
      {!isLoading && !error && (
        <>
          {images.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No custom images found</p>
              <Button onClick={() => navigate("/dashboard/vps/custom-images/upload")}>
                <Upload className="h-4 w-4 mr-2" />
                Upload Your First Image
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {images.map((image) => (
                  <CustomImageCard
                    key={image.id}
                    image={image}
                    onDelete={handleDelete}
                    showActions={true}
                  />
                ))}
              </div>

              {/* Pagination */}
              {pagination && pagination.total_pages > 1 && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    {((pagination.page - 1) * pagination.page_size) + 1} –{" "}
                    {Math.min(pagination.page * pagination.page_size, pagination.total)} sur{" "}
                    {pagination.total} images
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={pagination.page === 1}
                    >
                      Précédent
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(pagination.total_pages, p + 1))}
                      disabled={pagination.page === pagination.total_pages}
                    >
                      Suivant
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

