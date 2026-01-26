/**
 * Image Upload Page
 *
 * Client page for uploading custom Docker images
 */

import React from "react";
import { useNavigate } from "react-router-dom";
import { ImageUploadForm } from "../components/ImageUploadForm";
import { Button } from "@/shared/components/ui/button";
import { ArrowLeft } from "lucide-react";

export const ImageUploadPage: React.FC = () => {
  const navigate = useNavigate();

  const handleSuccess = (imageId: string) => {
    navigate(`/dashboard/vps/custom-images/${imageId}`);
  };

  const handleCancel = () => {
    navigate("/dashboard/vps/custom-images");
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={handleCancel}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Téléverser une image Docker</h1>
          <p className="text-slate-600 mt-1">
            Téléversez une archive de projet Docker pour créer une image personnalisée
          </p>
        </div>
      </div>

      {/* Upload Form */}
      <ImageUploadForm onSuccess={handleSuccess} onCancel={handleCancel} />
    </div>
  );
};








