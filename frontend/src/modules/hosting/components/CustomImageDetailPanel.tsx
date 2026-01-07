/**
 * Custom Image Detail Panel Component
 *
 * Displays comprehensive details about a custom Docker image.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Separator } from "@/shared/components/ui/separator";
import { ImageBuildStatusBadge } from "./ImageBuildStatusBadge";
import { formatDistanceToNow, format } from "date-fns";
import type { CustomDockerImage } from "../types";
import {
  Calendar,
  Clock,
  HardDrive,
  FileText,
  Shield,
  Tag,
  Hash,
  AlertTriangle,
} from "lucide-react";

interface CustomImageDetailPanelProps {
  image: CustomDockerImage;
}

export function CustomImageDetailPanel({ image }: CustomImageDetailPanelProps) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">{image.image_name}</CardTitle>
              <CardDescription className="mt-1">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  {image.image_tag}
                </div>
              </CardDescription>
            </div>
            <ImageBuildStatusBadge status={image.status} />
          </div>
        </CardHeader>
      </Card>

      {/* Build Information */}
      <Card>
        <CardHeader>
          <CardTitle>Build Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Dockerfile Path</div>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="font-mono text-sm">{image.dockerfile_path}</span>
              </div>
            </div>
            {image.docker_image_id && (
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Docker Image ID</div>
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  <span className="font-mono text-sm truncate">{image.docker_image_id}</span>
                </div>
              </div>
            )}
            {image.image_size_mb && (
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Image Size</div>
                <div className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-muted-foreground" />
                  <span>{image.image_size_mb.toFixed(2)} MB</span>
                </div>
              </div>
            )}
            {image.build_duration_seconds && (
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Build Duration</div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{image.build_duration_seconds} seconds</span>
                </div>
              </div>
            )}
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            {image.build_started_at && (
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Build Started</div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {format(new Date(image.build_started_at), "PPpp")}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(image.build_started_at), { addSuffix: true })}
                </div>
              </div>
            )}
            {image.build_completed_at && (
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Build Completed</div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {format(new Date(image.build_completed_at), "PPpp")}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(image.build_completed_at), { addSuffix: true })}
                </div>
              </div>
            )}
          </div>

          {image.build_error && (
            <>
              <Separator />
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  Build Error
                </div>
                <div className="p-3 bg-destructive/10 rounded-md">
                  <p className="text-sm text-destructive whitespace-pre-wrap">{image.build_error}</p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Build Arguments */}
      {image.build_args && Object.keys(image.build_args).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Build Arguments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(image.build_args).map(([key, value]) => (
                <div key={key} className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono">
                    {key}
                  </Badge>
                  <span className="text-sm text-muted-foreground">=</span>
                  <span className="text-sm font-mono">{value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Security Scan Results */}
      {image.security_scan_results && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Scan Results
            </CardTitle>
            <CardDescription>
              {image.scan_completed_at &&
                `Completed ${formatDistanceToNow(new Date(image.scan_completed_at), { addSuffix: true })}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Total Vulnerabilities:</span>
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
                {image.security_scan_results.total_vulnerabilities}
              </Badge>
            </div>

            {image.security_scan_results.total_vulnerabilities > 0 && (
              <>
                <Separator />
                <div className="grid grid-cols-4 gap-2">
                  <div className="text-center p-2 bg-red-50 rounded">
                    <div className="text-lg font-bold text-red-800">
                      {image.security_scan_results.vulnerabilities_by_severity.CRITICAL}
                    </div>
                    <div className="text-xs text-red-600">Critical</div>
                  </div>
                  <div className="text-center p-2 bg-orange-50 rounded">
                    <div className="text-lg font-bold text-orange-800">
                      {image.security_scan_results.vulnerabilities_by_severity.HIGH}
                    </div>
                    <div className="text-xs text-orange-600">High</div>
                  </div>
                  <div className="text-center p-2 bg-yellow-50 rounded">
                    <div className="text-lg font-bold text-yellow-800">
                      {image.security_scan_results.vulnerabilities_by_severity.MEDIUM}
                    </div>
                    <div className="text-xs text-yellow-600">Medium</div>
                  </div>
                  <div className="text-center p-2 bg-blue-50 rounded">
                    <div className="text-lg font-bold text-blue-800">
                      {image.security_scan_results.vulnerabilities_by_severity.LOW}
                    </div>
                    <div className="text-xs text-blue-600">Low</div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Metadata */}
      <Card>
        <CardHeader>
          <CardTitle>Metadata</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Version:</span>
            <span>{image.version}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Upload Filename:</span>
            <span className="font-mono text-xs truncate max-w-[200px]">{image.upload_filename}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Upload Size:</span>
            <span>{(image.upload_size_bytes / (1024 * 1024)).toFixed(2)} MB</span>
          </div>
          {image.exposed_ports && image.exposed_ports.length > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Exposed Ports:</span>
              <div className="flex gap-1">
                {image.exposed_ports.map((port) => (
                  <Badge key={port} variant="outline">
                    {port}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Created:</span>
            <span>{format(new Date(image.created_at), "PPpp")}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Updated:</span>
            <span>{format(new Date(image.updated_at), "PPpp")}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}








