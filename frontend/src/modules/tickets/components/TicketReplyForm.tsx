import React, { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { Label } from "@/shared/components/ui/label";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { useToast } from "@/shared/components/ui/use-toast";
import { Paperclip, Send, Download, X } from "lucide-react";
import { Input } from "@/shared/components/ui/input";
import { RichTextEditor } from "@/shared/components/ui/rich-text-editor";
import { ticketService } from "../services";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/shared/components/ui/badge";
import { useAuth } from "@/modules/auth";

interface TicketReplyFormProps {
  ticketId: string;
  onReplyAdded?: () => void;
}

export const TicketReplyForm: React.FC<TicketReplyFormProps> = ({
  ticketId,
  onReplyAdded,
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const isClient = user?.role === "client";
  const [message, setMessage] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch existing attachments - disable for clients since endpoint returns 404
  const { data: existingAttachments = [], refetch: refetchAttachments } = useQuery({
    queryKey: ["ticket-attachments", ticketId],
    queryFn: async () => {
      try {
        return await ticketService.getAttachments(ticketId);
      } catch (error: any) {
        // Handle 404 gracefully - endpoint may not be implemented yet
        if (error?.response?.status === 404) {
          return [];
        }
        throw error;
      }
    },
    enabled: !!ticketId && !isClient, // Disable for clients to avoid 404 errors
    retry: (failureCount, error: any) => {
      // Don't retry on 404 errors
      if (error?.response?.status === 404) {
        return false;
      }
      return failureCount < 3;
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + attachments.length > 10) {
      toast({
        title: "Erreur",
        description: "Maximum 10 pièces jointes autorisées",
        variant: "destructive",
      });
      return;
    }
    setAttachments((prev) => [...prev, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez saisir un message",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await ticketService.createReply(ticketId, {
        message: message.trim(),
        is_internal: isInternal,
      });
      
      // TODO: Upload attachments if any (separate API call)
      // if (attachments.length > 0) {
      //   await Promise.all(
      //     attachments.map((file) => ticketService.uploadAttachment(ticketId, file))
      //   );
      // }
      
      toast({
        title: "Succès",
        description: "Réponse ajoutée",
      });
      
      setMessage("");
      setIsInternal(false);
      setAttachments([]);
      onReplyAdded?.();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Échec de l'ajout de la réponse",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ajouter une réponse</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <RichTextEditor
              value={message}
              onChange={setMessage}
              placeholder="Saisir votre réponse… (formatage basique)"
              className="min-h-[150px]"
            />
            <p className="text-xs text-slate-500">
              Ctrl+B gras, Ctrl+I italique, Ctrl+U souligné
            </p>
          </div>

          {!isClient && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="internal"
                checked={isInternal}
                onCheckedChange={(checked) => setIsInternal(checked as boolean)}
              />
              <Label htmlFor="internal" className="text-sm font-normal cursor-pointer">
                Note interne (visible uniquement par le personnel)
              </Label>
            </div>
          )}

          <div className="space-y-2">
            <Label>Pièces jointes</Label>
            <div className="flex items-center gap-2">
              <Input
                type="file"
                multiple
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
                accept="image/*,.pdf,.doc,.docx,.txt"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => document.getElementById("file-upload")?.click()}
              >
                <Paperclip className="h-4 w-4 mr-2" />
                Ajouter des fichiers
              </Button>
              <span className="text-xs text-slate-500">
                Max 10 fichiers, 20 Mo chacun
              </span>
            </div>
            {attachments.length > 0 && (
              <div className="mt-2 space-y-1">
                {attachments.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-slate-50 rounded text-sm"
                  >
                    <span className="truncate flex-1">{file.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAttachment(index)}
                    >
                      Retirer
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {existingAttachments.length > 0 && (
            <div className="space-y-2">
              <Label>Pièces jointes existantes</Label>
              <div className="space-y-1">
                {existingAttachments.map((attachment: any) => (
                  <div
                    key={attachment.id}
                    className="flex items-center justify-between p-2 bg-slate-50 rounded text-sm"
                  >
                    <span className="truncate flex-1">{attachment.original_filename || attachment.filename}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        ticketService.downloadAttachment(
                          ticketId,
                          attachment.id,
                          attachment.original_filename || attachment.filename || "attachment"
                        );
                      }}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting || !message.replace(/<[^>]*>/g, "").trim()}>
              <Send className="h-4 w-4 mr-2" />
              {isSubmitting ? "Envoi…" : "Publier la réponse"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

