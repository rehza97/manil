/**
 * Custom Image Card Component
 *
 * Displays a summary card for a custom Docker image.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { ImageBuildStatusBadge } from "./ImageBuildStatusBadge";
import { Clock, HardDrive, Eye, Trash2, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { CustomDockerImage } from "../types";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface CustomImageCardProps {
  image: CustomDockerImage;
  onDelete?: (imageId: string) => void;
  onRebuild?: (imageId: string) => void;
  showActions?: boolean;
}

export function CustomImageCard({
  image,
  onDelete,
  onRebuild,
  showActions = true,
}: CustomImageCardProps) {
  const navigate = useNavigate();

  const handleView = () => {
    navigate(`/dashboard/vps/custom-images/${image.id}`);
  };

  const handleDelete = () => {
    if (onDelete && window.confirm(`Supprimer l'image « ${image.image_name}:${image.image_tag} » ?`)) {
      onDelete(image.id);
    }
  };

  const handleRebuild = () => {
    if (onRebuild) {
      onRebuild(image.id);
    }
  };

  const canRebuild =
    image.status === "COMPLETED" || image.status === "FAILED" || image.status === "REJECTED";
  const canDelete = image.status !== "BUILDING" && image.status !== "VALIDATING" && image.status !== "SCANNING";

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg truncate">
              {image.image_name}:{image.image_tag}
            </CardTitle>
            <CardDescription className="mt-1">
              <ImageBuildStatusBadge status={image.status} />
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Metadata */}
          <div className="space-y-2 text-sm">
            {image.image_size_mb && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <HardDrive className="h-4 w-4" />
                <span>{image.image_size_mb.toFixed(2)} MB</span>
              </div>
            )}
            {image.build_duration_seconds && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Construction : {image.build_duration_seconds} s</span>
              </div>
            )}
            {image.created_at && (
              <div className="text-xs text-muted-foreground">
                Créée {formatDistanceToNow(new Date(image.created_at), { addSuffix: true, locale: fr })}
              </div>
            )}
          </div>

          {/* Security Scan Results */}
          {image.security_scan_results && (
            <div className="pt-2 border-t">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">Analyse de sécurité :</span>
                <Badge
                  variant={
                    image.security_scan_results.total_vulnerabilities === 0
                      ? "default"
                      : image.security_scan_results.vulnerabilities_by_severity.CRITICAL > 0 ||
                        image.security_scan_results.vulnerabilities_by_severity.HIGH > 0
                      ? "destructive"
                      : "secondary"
                  }
                >
                  {image.security_scan_results.total_vulnerabilities} vulnérabilité(s)
                </Badge>
              </div>
            </div>
          )}

          {/* Error Message */}
          {image.build_error && (
            <div className="pt-2 border-t">
              <p className="text-sm text-destructive line-clamp-2">{image.build_error}</p>
            </div>
          )}

          {/* Actions */}
          {showActions && (
            <div className="flex gap-2 pt-2 border-t">
              <Button variant="outline" size="sm" onClick={handleView} className="flex-1">
                <Eye className="h-4 w-4 mr-1" />
                Voir
              </Button>
              {canRebuild && onRebuild && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRebuild}
                  disabled={!canRebuild}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              )}
              {canDelete && onDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDelete}
                  disabled={!canDelete}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}








