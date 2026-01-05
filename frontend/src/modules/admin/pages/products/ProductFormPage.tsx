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

interface ProductCategory {
  id: string;
  name: string;
}

interface ProductFormData {
  name: string;
  slug: string;
  description: string;
  short_description: string;
  category_id: string;
  sku: string;
  barcode: string;
  regular_price: number;
  sale_price: number | null;
  cost_price: number | null;
  stock_quantity: number;
  low_stock_threshold: number;
  is_featured: boolean;
  is_active: boolean;
  is_visible: boolean;
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
    barcode: "",
    regular_price: 0,
    sale_price: null,
    cost_price: null,
    stock_quantity: 0,
    low_stock_threshold: 10,
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
        barcode: product.barcode || "",
        regular_price: product.regular_price || 0,
        sale_price: product.sale_price,
        cost_price: product.cost_price,
        stock_quantity: product.stock_quantity || 0,
        low_stock_threshold: product.low_stock_threshold || 10,
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
    mutation.mutate(formData);
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

              <div>
                <Label htmlFor="barcode">Barcode</Label>
                <Input
                  id="barcode"
                  value={formData.barcode}
                  onChange={(e) => handleChange("barcode", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Pricing</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

              <div>
                <Label htmlFor="cost_price">Cost Price</Label>
                <Input
                  id="cost_price"
                  type="number"
                  step="0.01"
                  value={formData.cost_price || ""}
                  onChange={(e) =>
                    handleChange("cost_price", e.target.value ? parseFloat(e.target.value) : null)
                  }
                />
              </div>
            </div>
          </div>

          {/* Inventory */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Inventory</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="stock_quantity">Stock Quantity</Label>
                <Input
                  id="stock_quantity"
                  type="number"
                  value={formData.stock_quantity}
                  onChange={(e) => handleChange("stock_quantity", parseInt(e.target.value))}
                />
              </div>

              <div>
                <Label htmlFor="low_stock_threshold">Low Stock Threshold</Label>
                <Input
                  id="low_stock_threshold"
                  type="number"
                  value={formData.low_stock_threshold}
                  onChange={(e) => handleChange("low_stock_threshold", parseInt(e.target.value))}
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
