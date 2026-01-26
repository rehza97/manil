import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateTicket, useTicketCategories } from "../hooks";
import { TicketPriority } from "../types/ticket.types";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { useToast } from "@/shared/components/ui/use-toast";
import { Label } from "@/shared/components/ui/label";
import { Paperclip, Save, X } from "lucide-react";
import { useEffect, useRef } from "react";

const ticketSchema = z.object({
  title: z.string().min(5, "Le titre doit contenir au moins 5 caractères"),
  description: z.string().min(10, "La description doit contenir au moins 10 caractères"),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  customerId: z.string().uuid("ID client invalide"),
  category: z.string().optional(),
});

type TicketFormData = z.infer<typeof ticketSchema>;

interface TicketFormProps {
  customerId?: string;
  onSuccess?: () => void;
}

const DRAFT_STORAGE_KEY = "ticket_draft";

export const TicketForm: React.FC<TicketFormProps> = ({ customerId, onSuccess }) => {
  const { toast } = useToast();
  const { mutate: createTicket, isPending } = useCreateTicket();
  const { data: categories = [], isLoading: isLoadingCategories, error: categoriesError } = useTicketCategories();
  const [attachments, setAttachments] = React.useState<File[]>([]);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load draft from localStorage
  const loadDraft = () => {
    try {
      const draft = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (draft) {
        const parsed = JSON.parse(draft);
        return parsed;
      }
    } catch (e) {
      // Ignore errors
    }
    return {
      customerId: customerId || "",
      priority: "medium",
      category: undefined,
      title: "",
      description: "",
    };
  };

  const form = useForm<TicketFormData>({
    resolver: zodResolver(ticketSchema),
    defaultValues: loadDraft(),
  });

  // Auto-save to localStorage
  useEffect(() => {
    const subscription = form.watch((value) => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      autoSaveTimerRef.current = setTimeout(() => {
        try {
          localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(value));
        } catch (e) {
          // Ignore errors
        }
      }, 2000); // Auto-save after 2 seconds of inactivity
    });
    return () => {
      subscription.unsubscribe();
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [form]);

  const handleSaveDraft = () => {
    const values = form.getValues();
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(values));
      toast({
        title: "Brouillon enregistré",
        description: "Votre brouillon de ticket a été enregistré",
      });
    } catch (e) {
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer le brouillon",
        variant: "destructive",
      });
    }
  };

  const handleClearDraft = () => {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    form.reset({
      customerId: customerId || "",
      priority: "medium",
      category: undefined,
      title: "",
      description: "",
    });
    toast({
      title: "Brouillon effacé",
      description: "Le brouillon a été effacé",
    });
  };

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

  const onSubmit = async (data: TicketFormData) => {
    createTicket(
      { ...data, attachments },
      {
        onSuccess: () => {
          toast({
            title: "Success",
            description: "Ticket created successfully",
          });
          localStorage.removeItem(DRAFT_STORAGE_KEY);
          form.reset();
          setAttachments([]);
          onSuccess?.();
        },
        onError: (error: any) => {
          toast({
            title: "Error",
            description: error.message || "Failed to create ticket",
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Créer un ticket support</CardTitle>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={handleSaveDraft}>
              <Save className="h-4 w-4 mr-2" />
              Enregistrer le brouillon
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={handleClearDraft}>
              <X className="h-4 w-4 mr-2" />
              Effacer le brouillon
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="customerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ID client</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="ID client" disabled={!!customerId} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Titre du ticket</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Résumé du problème" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Description détaillée du problème"
                      rows={5}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Catégorie</FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(value === "none" ? undefined : value)} 
                    value={field.value || "none"}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir une catégorie (optionnel)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Aucune</SelectItem>
                      {isLoadingCategories ? (
                        <SelectItem value="loading" disabled>Chargement des catégories…</SelectItem>
                      ) : categoriesError ? (
                        null
                      ) : (
                        categories.map((category: any) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <Label>Attachments (Optional)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                  id="ticket-file-upload"
                  accept="image/*,.pdf,.doc,.docx,.txt"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById("ticket-file-upload")?.click()}
                >
                  <Paperclip className="h-4 w-4 mr-2" />
                  Add Files
                </Button>
                <span className="text-xs text-slate-500">
                  Max 10 files, 20MB each
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
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => form.reset()}>
                Effacer
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Création…" : "Créer le ticket"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

TicketForm.displayName = "TicketForm";
