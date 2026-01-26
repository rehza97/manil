/**
 * Email Templates Management Page
 *
 * Admin page for managing and previewing email templates
 */

import React, { useState, useEffect } from "react";
import { Eye, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { toast } from "sonner";
import { apiClient } from "@/shared/api";

interface TemplatePreview {
  html: string;
  text: string;
  variables: string[];
  is_valid: boolean;
  context_used?: Record<string, any>;
  error?: string;
}

export const EmailTemplatesPage: React.FC = () => {
  const [templates, setTemplates] = useState<string[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [preview, setPreview] = useState<TemplatePreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [showText, setShowText] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get("/api/v1/settings/templates/list");
      setTemplates(response.data.templates || []);
      if (response.data.templates && response.data.templates.length > 0) {
        setSelectedTemplate(response.data.templates[0]);
      }
    } catch (error: any) {
      toast.error("Failed to load templates", {
        description: error.response?.data?.detail || error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async () => {
    if (!selectedTemplate) return;

    try {
      setPreviewLoading(true);
      const response = await apiClient.post("/api/v1/settings/templates/preview", {
        template_name: selectedTemplate,
        format: "html",
      });
      setPreview(response.data);
    } catch (error: any) {
      toast.error("Failed to preview template", {
        description: error.response?.data?.detail || error.message,
      });
    } finally {
      setPreviewLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Email Templates</CardTitle>
          <CardDescription>
            Preview and manage email templates used for notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Select a template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template} value={template}>
                    {template.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handlePreview} disabled={!selectedTemplate || previewLoading}>
              <Eye className="mr-2 h-4 w-4" />
              {previewLoading ? "Loading..." : "Preview"}
            </Button>
          </div>

          {preview && (
            <div className="mt-6 space-y-4">
              <div className="flex gap-2">
                <Button
                  variant={!showText ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowText(false)}
                >
                  HTML
                </Button>
                <Button
                  variant={showText ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowText(true)}
                >
                  Text
                </Button>
              </div>

              {preview.is_valid ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Preview</CardTitle>
                    {preview.variables && preview.variables.length > 0 && (
                      <CardDescription>
                        Variables: {preview.variables.join(", ")}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    {showText ? (
                      <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded">
                        {preview.text}
                      </pre>
                    ) : (
                      <div
                        className="border rounded p-4 bg-white"
                        dangerouslySetInnerHTML={{ __html: preview.html }}
                      />
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-destructive">
                  <CardContent className="pt-6">
                    <p className="text-destructive">Template Error: {preview.error}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
