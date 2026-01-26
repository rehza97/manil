import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Switch } from "@/shared/components/ui/switch";
import { apiClient } from "@/shared/api/client";
import type {
  ServiceType,
  BillingCycle,
  ProvisioningType,
  CreateProductDTO,
} from "@/modules/products/types/product.types";

interface ProductCategory {
  id: string;
  name: string;
}

interface ProductFormData extends Omit<CreateProductDTO, "service_config"> {
  service_config?: string; // JSON string for textarea input
}

const ProductFormPage: React.FC = () => {
  const { productId } = useParams<{ productId?: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(productId);

  const [formData, setFormData] = useState<ProductFormData>({
    name: "",
    slug: "",
    description: "",
    short_description: "",
    category_id: "",
    sku: "",
    regular_price: 0,
    sale_price: null,
    service_type: "general",
    billing_cycle: "one_time",
    is_recurring: false,
    provisioning_type: undefined,
    auto_renew: false,
    trial_period_days: undefined,
    service_config: "",
    is_featured: false,
    is_active: true,
    is_visible: true,
  });

  // Fetch categories
  const { data: categories } = useQuery<ProductCategory[]>({
    queryKey: ["product-categories"],
    queryFn: async () => {
      const response = await apiClient.get("/products/categories");
      return response.data;
    },
  });

  // Fetch product if editing
  const { data: product } = useQuery({
    queryKey: ["product", productId],
    queryFn: async () => {
      const response = await apiClient.get(`/products/${productId}`);
      return response.data;
    },
    enabled: isEdit,
  });

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || "",
        slug: product.slug || "",
        description: product.description || "",
        short_description: product.short_description || "",
        category_id: product.category_id || "",
        sku: product.sku || "",
        regular_price: product.regular_price || 0,
        sale_price: product.sale_price || null,
        service_type: product.service_type || "general",
        billing_cycle: product.billing_cycle || "one_time",
        is_recurring: product.is_recurring || false,
        provisioning_type: product.provisioning_type,
        auto_renew: product.auto_renew || false,
        trial_period_days: product.trial_period_days,
        service_config: product.service_config
          ? JSON.stringify(product.service_config, null, 2)
          : "",
        is_featured: product.is_featured || false,
        is_active: product.is_active !== undefined ? product.is_active : true,
        is_visible: product.is_visible !== undefined ? product.is_visible : true,
      });
    }
  }, [product]);

  // Create/Update mutation
  const mutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      if (isEdit) {
        return apiClient.put(`/products/${productId}`, data);
      } else {
        return apiClient.post("/products", data);
      }
    },
    onSuccess: () => {
      navigate("/admin/products");
    },
    onError: (error: any) => {
      alert(error.response?.data?.detail || "Failed to save product");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Parse service_config JSON if provided
    const submitData: CreateProductDTO = {
      ...formData,
      service_config: formData.service_config
        ? (() => {
            try {
              return JSON.parse(formData.service_config);
            } catch {
              return undefined;
            }
          })()
        : undefined,
    };
    
    mutation.mutate(submitData as any);
  };

  const handleChange = (
    field: keyof ProductFormData,
    value: string | number | boolean | null
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Auto-generate slug from name
  const generateSlug = () => {
    const slug = formData.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    handleChange("slug", slug);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin/products")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {isEdit ? "Edit Product" : "Create Product"}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {isEdit ? "Update product details" : "Add a new product to your catalog"}
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-lg border p-6 space-y-6">
          {/* Basic Information */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="name">Product Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  onBlur={generateSlug}
                  required
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="slug">Slug *</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => handleChange("slug", e.target.value)}
                  required
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="short_description">Short Description</Label>
                <Input
                  id="short_description"
                  value={formData.short_description}
                  onChange={(e) => handleChange("short_description", e.target.value)}
                  placeholder="Brief product description"
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  rows={5}
                  placeholder="Detailed product description"
                />
              </div>

              <div>
                <Label htmlFor="category_id">Category *</Label>
                <Select
                  value={formData.category_id}
                  onValueChange={(value) => handleChange("category_id", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="sku">SKU *</Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) => handleChange("sku", e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          {/* Service Configuration */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Service Configuration</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="service_type">Service Type *</Label>
                <Select
                  value={formData.service_type}
                  onValueChange={(value) => handleChange("service_type", value as ServiceType)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select service type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="dns">DNS</SelectItem>
                    <SelectItem value="ssl">SSL Certificate</SelectItem>
                    <SelectItem value="email">Email Hosting</SelectItem>
                    <SelectItem value="backup">Backup Service</SelectItem>
                    <SelectItem value="monitoring">Monitoring</SelectItem>
                    <SelectItem value="domain">Domain Registration</SelectItem>
                    <SelectItem value="hosting">Hosting</SelectItem>
                    <SelectItem value="storage">Storage</SelectItem>
                    <SelectItem value="cdn">CDN</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="billing_cycle">Billing Cycle *</Label>
                <Select
                  value={formData.billing_cycle}
                  onValueChange={(value) => handleChange("billing_cycle", value as BillingCycle)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select billing cycle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one_time">One Time</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                    <SelectItem value="usage_based">Usage Based</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="provisioning_type">Provisioning Type</Label>
                <Select
                  value={formData.provisioning_type || undefined}
                  onValueChange={(value) =>
                    handleChange("provisioning_type", value ? (value as ProvisioningType) : undefined)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select provisioning type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="automatic">Automatic</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="api">API</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="trial_period_days">Trial Period (days)</Label>
                <Input
                  id="trial_period_days"
                  type="number"
                  min="0"
                  value={formData.trial_period_days || ""}
                  onChange={(e) =>
                    handleChange(
                      "trial_period_days",
                      e.target.value ? parseInt(e.target.value) : undefined
                    )
                  }
                  placeholder="e.g., 14"
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="service_config">Service Configuration (JSON)</Label>
                <Textarea
                  id="service_config"
                  value={formData.service_config || ""}
                  onChange={(e) => handleChange("service_config", e.target.value)}
                  rows={6}
                  placeholder='{"key": "value"}'
                  className="font-mono text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Optional JSON configuration for service-specific settings
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="is_recurring">Recurring Service</Label>
                  <p className="text-xs text-gray-500">Service auto-renews</p>
                </div>
                <Switch
                  id="is_recurring"
                  checked={formData.is_recurring}
                  onCheckedChange={(checked) => handleChange("is_recurring", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="auto_renew">Auto Renew</Label>
                  <p className="text-xs text-gray-500">Enable auto-renewal by default</p>
                </div>
                <Switch
                  id="auto_renew"
                  checked={formData.auto_renew}
                  onCheckedChange={(checked) => handleChange("auto_renew", checked)}
                />
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Pricing</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="regular_price">Regular Price *</Label>
                <Input
                  id="regular_price"
                  type="number"
                  step="0.01"
                  value={formData.regular_price}
                  onChange={(e) => handleChange("regular_price", parseFloat(e.target.value))}
                  required
                />
              </div>

              <div>
                <Label htmlFor="sale_price">Sale Price</Label>
                <Input
                  id="sale_price"
                  type="number"
                  step="0.01"
                  value={formData.sale_price || ""}
                  onChange={(e) =>
                    handleChange("sale_price", e.target.value ? parseFloat(e.target.value) : null)
                  }
                />
              </div>
            </div>
          </div>

          {/* Settings */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Settings</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="is_active">Active</Label>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => handleChange("is_active", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="is_visible">Visible in Catalog</Label>
                <Switch
                  id="is_visible"
                  checked={formData.is_visible}
                  onCheckedChange={(checked) => handleChange("is_visible", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="is_featured">Featured Product</Label>
                <Switch
                  id="is_featured"
                  checked={formData.is_featured}
                  onCheckedChange={(checked) => handleChange("is_featured", checked)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/admin/products")}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-green-600 hover:bg-green-700"
            disabled={mutation.isPending}
          >
            <Save className="mr-2 h-4 w-4" />
            {mutation.isPending ? "Saving..." : isEdit ? "Update Product" : "Create Product"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ProductFormPage;
