/**
 * Image Upload Form Component
 *
 * Form for uploading custom Docker images with metadata.
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Upload, FileArchive, X } from "lucide-react";
import { useUploadCustomImage } from "../hooks/useCustomImages";

interface ImageUploadFormProps {
  onSuccess?: (imageId: string) => void;
  onCancel?: () => void;
  subscriptionId?: string;
}

interface FormData {
  file: FileList;
  image_name: string;
  image_tag: string;
  dockerfile_path: string;
  build_args: string; // JSON string
}

export function ImageUploadForm({
  onSuccess,
  onCancel,
  subscriptionId,
}: ImageUploadFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<FormData>({
    defaultValues: {
      dockerfile_path: "Dockerfile",
      image_tag: "latest",
      build_args: "{}",
    },
  });

  const uploadMutation = useUploadCustomImage();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [buildArgsError, setBuildArgsError] = useState<string | null>(null);

  const fileInput = watch("file");

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Auto-fill image name from filename if not set
      const currentName = watch("image_name");
      if (!currentName) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
        setValue("image_name", nameWithoutExt);
      }
    }
  };

  // Validate and parse build args
  const validateBuildArgs = (value: string): boolean => {
    if (!value || value.trim() === "") {
      setBuildArgsError(null);
      return true;
    }
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed !== "object" || Array.isArray(parsed)) {
        setBuildArgsError("Build args must be a JSON object");
        return false;
      }
      for (const [key, val] of Object.entries(parsed)) {
        if (typeof val !== "string") {
          setBuildArgsError("All build arg values must be strings");
          return false;
        }
      }
      setBuildArgsError(null);
      return true;
    } catch {
      setBuildArgsError("Invalid JSON format");
      return false;
    }
  };

  const onSubmit = async (data: FormData) => {
    if (!selectedFile) {
      return;
    }

    // Validate build args
    if (!validateBuildArgs(data.build_args)) {
      return;
    }

    let buildArgs: Record<string, string> = {};
    if (data.build_args && data.build_args.trim() !== "") {
      try {
        buildArgs = JSON.parse(data.build_args);
      } catch {
        return;
      }
    }

    try {
      const result = await uploadMutation.mutateAsync({
        file: selectedFile,
        metadata: {
          image_name: data.image_name || undefined,
          image_tag: data.image_tag || undefined,
          dockerfile_path: data.dockerfile_path || undefined,
          build_args: Object.keys(buildArgs).length > 0 ? buildArgs : undefined,
          subscription_id: subscriptionId,
        },
      });

      if (onSuccess) {
        onSuccess(result.id);
      }
    } catch (error) {
      // Error is handled by the mutation hook
      console.error("Upload failed:", error);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + " MB";
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Custom Docker Image</CardTitle>
        <CardDescription>
          Upload a Docker project archive (tar.gz, tar, or zip) to build a custom image.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="file">Project Archive *</Label>
            <div className="flex items-center gap-4">
              <Input
                id="file"
                type="file"
                accept=".tar.gz,.tar,.zip"
                {...register("file", {
                  required: "Please select a file to upload",
                  onChange: handleFileChange,
                })}
                className="cursor-pointer"
              />
            </div>
            {errors.file && (
              <p className="text-sm text-destructive">{errors.file.message}</p>
            )}
            {selectedFile && (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                <FileArchive className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedFile(null);
                    setValue("file", undefined as any);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Image Name */}
          <div className="space-y-2">
            <Label htmlFor="image_name">Image Name</Label>
            <Input
              id="image_name"
              placeholder="my-custom-app"
              {...register("image_name", {
                pattern: {
                  value: /^[a-z0-9]([a-z0-9._-]*[a-z0-9])?$/,
                  message: "Invalid image name format (lowercase alphanumeric, dots, dashes, underscores)",
                },
              })}
            />
            {errors.image_name && (
              <p className="text-sm text-destructive">{errors.image_name.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Optional. If not provided, will be derived from filename.
            </p>
          </div>

          {/* Image Tag */}
          <div className="space-y-2">
            <Label htmlFor="image_tag">Image Tag</Label>
            <Input
              id="image_tag"
              placeholder="latest"
              {...register("image_tag", {
                pattern: {
                  value: /^[a-z0-9]([a-z0-9._-]*[a-z0-9])?$/,
                  message: "Invalid tag format",
                },
              })}
            />
            {errors.image_tag && (
              <p className="text-sm text-destructive">{errors.image_tag.message}</p>
            )}
          </div>

          {/* Dockerfile Path */}
          <div className="space-y-2">
            <Label htmlFor="dockerfile_path">Dockerfile Path</Label>
            <Input
              id="dockerfile_path"
              placeholder="Dockerfile"
              {...register("dockerfile_path")}
            />
            <p className="text-xs text-muted-foreground">
              Path to Dockerfile within the archive (default: Dockerfile)
            </p>
          </div>

          {/* Build Args */}
          <div className="space-y-2">
            <Label htmlFor="build_args">Build Arguments (JSON)</Label>
            <Textarea
              id="build_args"
              placeholder='{"NODE_ENV": "production", "API_URL": "https://api.example.com"}'
              rows={4}
              {...register("build_args", {
                validate: validateBuildArgs,
              })}
              className="font-mono text-sm"
            />
            {buildArgsError && (
              <p className="text-sm text-destructive">{buildArgsError}</p>
            )}
            {errors.build_args && (
              <p className="text-sm text-destructive">{errors.build_args.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Optional JSON object with build-time variables (e.g., {"{"}"NODE_ENV": "production"{"}"})
            </p>
          </div>

          {/* Error Alert */}
          {uploadMutation.isError && (
            <Alert variant="destructive">
              <AlertDescription>
                {uploadMutation.error instanceof Error
                  ? uploadMutation.error.message
                  : "Failed to upload image"}
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={uploadMutation.isPending || !selectedFile}
            >
              {uploadMutation.isPending ? (
                <>
                  <Upload className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Image
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}








