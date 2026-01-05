/**
 * VPS Deploy Component
 *
 * Provides file upload and deployment interface for VPS containers with two modes:
 * 1. Direct Deploy: Extract archive and copy files to container's /data directory
 * 2. Build & Deploy: Upload project and trigger Docker image build workflow
 */

import React, { useState, useRef } from "react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Card } from "@/shared/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Label } from "@/shared/components/ui/label";
import { AlertCircle, Upload, Loader2, CheckCircle2, FileArchive } from "lucide-react";
import { vpsService } from "../services/vpsService";

type VPSDeployProps = {
  subscriptionId: string;
};

type DeployResult = {
  success: boolean;
  target_path?: string;
  files_deployed?: number;
  archive_size?: number;
  deployed_at?: string;
  error?: string;
};

type BuildResult = {
  subscription_id: string;
  image_id: string;
  image_name: string;
  image_tag: string;
  status: string;
  build_triggered_at: string;
  message: string;
};

export const VPSDeploy: React.FC<VPSDeployProps> = ({ subscriptionId }) => {
  const [mode, setMode] = useState<"direct" | "build">("direct");
  const [file, setFile] = useState<File | null>(null);
  const [targetPath, setTargetPath] = useState("/data");
  const [imageName, setImageName] = useState("");
  const [imageTag, setImageTag] = useState("latest");
  const [dockerfilePath, setDockerfilePath] = useState("Dockerfile");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DeployResult | BuildResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      const allowedExtensions = ['.zip', '.tar', '.gz', '.tar.gz'];
      const fileName = selectedFile.name.toLowerCase();
      const isValid = allowedExtensions.some(ext => fileName.endsWith(ext));
      
      if (!isValid) {
        setError(`Invalid file type. Allowed: ${allowedExtensions.join(', ')}`);
        setFile(null);
        return;
      }
      
      // Check file size (500 MB limit)
      const maxSize = 500 * 1024 * 1024; // 500 MB
      if (selectedFile.size > maxSize) {
        setError("File too large. Maximum size: 500 MB");
        setFile(null);
        return;
      }
      
      setFile(selectedFile);
      setError(null);
      setResult(null);
    }
  };

  const handleDirectDeploy = async () => {
    if (!file) {
      setError("Please select a file to deploy");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const deployResult = await vpsService.deployFilesAdmin(
        subscriptionId,
        file,
        targetPath
      );
      setResult(deployResult as DeployResult);
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || err.message || "Failed to deploy files";
      setError(errorMsg);
      setResult({ success: false, error: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  const handleBuildDeploy = async () => {
    if (!file) {
      setError("Please select a file to deploy");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const buildResult = await vpsService.triggerBuildDeployAdmin(
        subscriptionId,
        file,
        imageName || undefined,
        imageTag,
        dockerfilePath
      );
      setResult(buildResult as BuildResult);
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || err.message || "Failed to trigger build";
      setError(errorMsg);
      setResult({ success: false, error: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setError(null);
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Deploy Files</h3>
        </div>

        <Tabs value={mode} onValueChange={(v) => setMode(v as "direct" | "build")}>
          <TabsList>
            <TabsTrigger value="direct">Direct Deploy</TabsTrigger>
            <TabsTrigger value="build">Build & Deploy</TabsTrigger>
          </TabsList>

          <TabsContent value="direct" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="file-direct">Project Archive</Label>
                <div className="mt-2">
                  <Input
                    id="file-direct"
                    ref={fileInputRef}
                    type="file"
                    accept=".zip,.tar,.tar.gz,.gz"
                    onChange={handleFileSelect}
                    disabled={loading}
                  />
                  <p className="text-sm text-slate-500 mt-1">
                    Upload zip, tar, or tar.gz archive. Files will be extracted to the target directory.
                  </p>
                </div>
                {file && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                    <FileArchive className="h-4 w-4" />
                    <span>{file.name}</span>
                    <span className="text-slate-400">
                      ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="target-path">Target Directory</Label>
                <Input
                  id="target-path"
                  value={targetPath}
                  onChange={(e) => setTargetPath(e.target.value)}
                  placeholder="/data"
                  disabled={loading}
                  className="mt-2"
                />
                <p className="text-sm text-slate-500 mt-1">
                  Directory in container where files will be deployed (default: /data)
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleDirectDeploy}
                  disabled={loading || !file}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Deploying...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Deploy Files
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={resetForm} disabled={loading}>
                  Reset
                </Button>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {result && 'success' in result && result.success && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <div>Files deployed successfully!</div>
                    {result.files_deployed !== undefined && (
                      <div className="text-sm">
                        {result.files_deployed} files deployed to {result.target_path}
                      </div>
                    )}
                    {result.archive_size && (
                      <div className="text-sm text-slate-500">
                        Archive size: {(result.archive_size / 1024 / 1024).toFixed(2)} MB
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="build" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="file-build">Project Archive with Dockerfile</Label>
                <div className="mt-2">
                  <Input
                    id="file-build"
                    ref={fileInputRef}
                    type="file"
                    accept=".zip,.tar,.tar.gz,.gz"
                    onChange={handleFileSelect}
                    disabled={loading}
                  />
                  <p className="text-sm text-slate-500 mt-1">
                    Upload archive containing Dockerfile. Image will be built automatically.
                  </p>
                </div>
                {file && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                    <FileArchive className="h-4 w-4" />
                    <span>{file.name}</span>
                    <span className="text-slate-400">
                      ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="image-name">Image Name (Optional)</Label>
                <Input
                  id="image-name"
                  value={imageName}
                  onChange={(e) => setImageName(e.target.value)}
                  placeholder="custom-app"
                  disabled={loading}
                  className="mt-2"
                />
                <p className="text-sm text-slate-500 mt-1">
                  Custom name for the Docker image (auto-generated if not provided)
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="image-tag">Image Tag</Label>
                  <Input
                    id="image-tag"
                    value={imageTag}
                    onChange={(e) => setImageTag(e.target.value)}
                    placeholder="latest"
                    disabled={loading}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="dockerfile-path">Dockerfile Path</Label>
                  <Input
                    id="dockerfile-path"
                    value={dockerfilePath}
                    onChange={(e) => setDockerfilePath(e.target.value)}
                    placeholder="Dockerfile"
                    disabled={loading}
                    className="mt-2"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleBuildDeploy}
                  disabled={loading || !file}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Starting Build...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Build & Deploy
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={resetForm} disabled={loading}>
                  Reset
                </Button>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {result && 'image_id' in result && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <div>Build process started!</div>
                    <div className="text-sm">
                      Image: {result.image_name}:{result.image_tag}
                    </div>
                    <div className="text-sm text-slate-500">
                      Image ID: {result.image_id}
                    </div>
                    <div className="text-sm text-slate-500">
                      Status: {result.status}
                    </div>
                    <div className="text-sm text-slate-500 mt-2">
                      {result.message}
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Card>
  );
};


