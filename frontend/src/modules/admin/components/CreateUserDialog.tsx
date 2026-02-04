/**
 * Create User Dialog Component
 *
 * Dialog form for creating new users
 */

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateUser } from "../hooks/useUsers";
import { useRoles } from "../hooks/useRoles";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { useToast } from "@/shared/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import type { UserCreate } from "../types";

const createUserSchema = z.object({
  email: z.string().email("Adresse e-mail invalide"),
  full_name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
  role_id: z.string().min(1, "Le rôle est requis"),
  is_active: z.boolean().default(true),
});

type CreateUserFormValues = z.infer<typeof createUserSchema>;

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const CreateUserDialog: React.FC<CreateUserDialogProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  const { toast } = useToast();
  const createUser = useCreateUser();
  const { data: rolesData } = useRoles(1, 100, { is_active: true });
  const roles = rolesData?.roles ?? [];

  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      email: "",
      full_name: "",
      password: "",
      role_id: "",
      is_active: true,
    },
  });

  useEffect(() => {
    if (roles.length > 0 && !form.getValues("role_id")) {
      const defaultRoleId = roles.find((r) => r.slug === "client")?.id ?? roles[0]?.id ?? "";
      form.setValue("role_id", defaultRoleId);
    }
  }, [roles, form]);

  const onSubmit = async (data: CreateUserFormValues) => {
    try {
      const payload: UserCreate = {
        email: data.email,
        full_name: data.full_name,
        password: data.password,
        role_id: data.role_id,
        is_active: data.is_active,
      };
      await createUser.mutateAsync(payload);
      toast({
        title: "Succès",
        description: "Utilisateur créé avec succès",
      });
      form.reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error?.response?.data?.detail || error.message || "Échec de la création de l'utilisateur",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px] bg-white border-gray-200">
        <DialogHeader className="space-y-3 pb-4">
          <DialogTitle className="text-2xl font-semibold">
            Ajouter un utilisateur
          </DialogTitle>
          <DialogDescription className="text-base text-slate-600">
            Créez un nouveau compte utilisateur. L'utilisateur recevra ses identifiants par e-mail.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Nom complet
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Jean Dupont"
                        className="h-10"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Adresse e-mail
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="utilisateur@exemple.com"
                        className="h-10"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Mot de passe
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Minimum 8 caractères"
                        className="h-10"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Rôle</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Sélectionner un rôle" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {roles.map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="gap-2 pt-4 sm:pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={createUser.isPending}
                className="px-6"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={createUser.isPending}
                className="px-6"
              >
                {createUser.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Créer l'utilisateur
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

