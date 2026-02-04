import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useCreateCustomer,
  useUpdateCustomer,
  useCustomer,
} from "../hooks/useCustomers";
import { CustomerType, type CreateCustomerDTO } from "../types";
import { useUsers } from "@/modules/admin/hooks/useUsers";
import { Button } from "@/shared/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

const customerFormSchema = z
  .object({
    name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
    email: z.string().email("Adresse e-mail invalide"),
    phone: z.string().min(7, "Le téléphone doit contenir au moins 7 caractères"),
    customerType: z.nativeEnum(CustomerType).optional(),
    companyName: z.string().optional(),
    taxId: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    postalCode: z
      .string()
      .max(20, "Le code postal doit contenir au maximum 20 caractères")
      .optional(),
  })
  .refine(
    (data) => {
      if (data.customerType === CustomerType.corporate) {
        return !!data.companyName;
      }
      return true;
    },
    {
      message: "Le nom de l'entreprise est requis pour les clients professionnels",
      path: ["companyName"],
    }
  );

type CustomerFormValues = z.infer<typeof customerFormSchema>;

interface CustomerFormProps {
  customerId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function CustomerForm({
  customerId,
  onSuccess,
  onCancel,
}: CustomerFormProps) {
  const isEdit = !!customerId;
  const { data: customer, isLoading: isLoadingCustomer } = useCustomer(
    customerId || ""
  );
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();

  // Fetch users for selection (only when creating, not editing)
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const { data: usersData } = useUsers(1, 100); // Fetch up to 100 users
  const users = usersData?.data || [];

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      customerType: CustomerType.individual,
      companyName: "",
      taxId: "",
      address: "",
      city: "",
      state: "",
      country: "",
      postalCode: "",
    },
  });

  const { watch, setValue } = form;
  const customerType = watch("customerType");

  // Handle user selection - auto-fill form when user is selected
  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId);
    const selectedUser = users.find((u) => u.id === userId);
    if (selectedUser) {
      setValue("name", selectedUser.full_name);
      setValue("email", selectedUser.email);
      // Phone is not available in User model, so we leave it empty for manual entry
    }
  };

  // Load customer data for editing
  useEffect(() => {
    if (customer && isEdit) {
      form.reset({
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        customerType: customer.customerType,
        companyName: customer.companyName || "",
        taxId: customer.taxId || "",
        address: customer.address || "",
        city: customer.city || "",
        state: customer.state || "",
        country: customer.country || "",
        postalCode: customer.postalCode || "",
      });
    }
  }, [customer, isEdit, form]);

  const onSubmit = async (data: CustomerFormValues) => {
    try {
      if (isEdit && customerId) {
        await updateCustomer.mutateAsync({ id: customerId, data });
      } else {
        await createCustomer.mutateAsync(data as CreateCustomerDTO);
      }
      onSuccess?.();
    } catch (error) {
      console.error("Failed to save customer:", error);
    }
  };

  const isSaving = createCustomer.isPending || updateCustomer.isPending;

  if (isLoadingCustomer && isEdit) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isEdit ? "Edit Customer" : "Create New Customer"}
        </CardTitle>
        <CardDescription>
          {isEdit
            ? "Update customer information and details"
            : "Add a new customer to your system"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* User Selection (only when creating) */}
            {!isEdit && (
              <div className="space-y-2 p-4 bg-gray-50 rounded-lg border">
                <FormLabel className="text-base font-medium">
                  Lier à un utilisateur existant (optionnel)
                </FormLabel>
                <FormDescription>
                  Sélectionnez un utilisateur existant pour préremplir les informations client.
                  Laissez vide pour créer un nouveau client.
                </FormDescription>
                <Select value={selectedUserId} onValueChange={handleUserSelect}>
                  <SelectTrigger className="bg-white border-gray-200">
                    <SelectValue placeholder="Sélectionner un utilisateur (optionnel)" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    {users.map((user) => (
                      <SelectItem
                        key={user.id}
                        value={user.id}
                        className="bg-white hover:bg-gray-50"
                      >
                        {user.full_name} ({user.email}) -{" "}
                        {typeof user.role === "string"
                          ? user.role
                          : (user.role as { name?: string; slug?: string })?.name ??
                            (user.role as { name?: string; slug?: string })?.slug ??
                            "—"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedUserId && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedUserId("");
                      setValue("name", "");
                      setValue("email", "");
                    }}
                  >
                    Effacer la sélection
                  </Button>
                )}
              </div>
            )}

            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Informations de base</h3>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom complet *</FormLabel>
                    <FormControl>
                      <Input placeholder="Jean Dupont" {...field} />
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
                    <FormLabel>Adresse e-mail *</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="jean@exemple.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Numéro de téléphone *</FormLabel>
                    <FormControl>
                      <Input placeholder="+33 6 12 34 56 78" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customerType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-white border-gray-200">
                          <SelectValue placeholder="Select customer type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-white border-gray-200">
                        <SelectItem
                          value={CustomerType.individual}
                          className="bg-white hover:bg-gray-50"
                        >
                          Individual
                        </SelectItem>
                        <SelectItem
                          value={CustomerType.corporate}
                          className="bg-white hover:bg-gray-50"
                        >
                          Corporate
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Choose whether this is an individual or corporate customer
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Corporate Information */}
            {customerType === CustomerType.corporate && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Informations entreprise</h3>

                <FormField
                  control={form.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom de l&apos;entreprise *</FormLabel>
                      <FormControl>
                        <Input placeholder="Société Exemple SAS" {...field} />
                      </FormControl>
                      <FormDescription>
                        Requis pour les clients professionnels
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="taxId"
                  render={({ field }) => (
                    <FormItem>
                    <FormLabel>N° TVA / SIRET</FormLabel>
                    <FormControl>
                      <Input placeholder="123 456 789 00012" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Address Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Adresse (optionnel)</h3>

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adresse</FormLabel>
                    <FormControl>
                      <Input placeholder="123 rue Principale" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input placeholder="Algiers" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                    <FormLabel>Région / Département</FormLabel>
                    <FormControl>
                      <Input placeholder="Île-de-France" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <FormControl>
                        <Input placeholder="Algeria" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="postalCode"
                  render={({ field }) => (
                    <FormItem>
                    <FormLabel>Code postal</FormLabel>
                    <FormControl>
                      <Input placeholder="75001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  Annuler
                </Button>
              )}
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEdit ? "Mettre à jour le client" : "Créer le client"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
