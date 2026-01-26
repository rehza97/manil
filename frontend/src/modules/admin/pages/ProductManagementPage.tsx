/**
 * Product Management Page - Corporate Backoffice
 * Interface for managing products, pricing, visibility, and featured status
 */
import React, { useState } from "react";
import {
  useProductsForAdmin,
  useUpdateProduct,
  useCreateProduct,
  useDeleteProduct,
} from "@/modules/products/hooks/useProducts";
import {
  CreateProductDTO,
  UpdateProductDTO,
  ServiceType,
  BillingCycle,
  ProvisioningType,
} from "@/modules/products/types/product.types";

export const ProductManagementPage: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<string | null>(null);

  // Queries and mutations
  const { data: productsData, isLoading } = useProductsForAdmin(page);
  const updateMutation = useUpdateProduct();
  const createMutation = useCreateProduct();
  const deleteMutation = useDeleteProduct();

  // Form state for new product
  const [formData, setFormData] = useState<CreateProductDTO & { service_config?: string }>({
    name: "",
    description: "",
    short_description: "",
    category_id: "",
    sku: "",
    regular_price: 0,
    sale_price: undefined,
    service_type: "general",
    billing_cycle: "one_time",
    is_recurring: false,
    provisioning_type: undefined,
    auto_renew: false,
    trial_period_days: undefined,
    service_config: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
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
      
      if (editingProductId) {
        await updateMutation.mutateAsync({
          id: editingProductId,
          data: submitData,
        });
        setEditingProductId(null);
      } else {
        await createMutation.mutateAsync(submitData);
      }
      setFormData({
        name: "",
        description: "",
        short_description: "",
        category_id: "",
        sku: "",
        regular_price: 0,
        sale_price: undefined,
        service_type: "general",
        billing_cycle: "one_time",
        is_recurring: false,
        provisioning_type: undefined,
        auto_renew: false,
        trial_period_days: undefined,
        service_config: "",
      });
      setShowForm(false);
    } catch (error) {
      console.error("Error saving product:", error);
    }
  };

  const handleToggleFeatured = async (productId: string, isFeatured: boolean) => {
    try {
      await updateMutation.mutateAsync({
        id: productId,
        data: { is_featured: !isFeatured },
      });
    } catch (error) {
      console.error("Error updating featured status:", error);
    }
  };

  const handleToggleVisibility = async (
    productId: string,
    isVisible: boolean
  ) => {
    try {
      await updateMutation.mutateAsync({
        id: productId,
        data: { is_visible: !isVisible },
      });
    } catch (error) {
      console.error("Error updating visibility:", error);
    }
  };

  const handleDelete = async (productId: string) => {
    if (confirm("Are you sure you want to delete this product?")) {
      try {
        await deleteMutation.mutateAsync(productId);
      } catch (error) {
        console.error("Error deleting product:", error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Product Management
          </h1>
          <button
            onClick={() => {
              setShowForm(!showForm);
              setEditingProductId(null);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            {showForm ? "Cancel" : "Add New Product"}
          </button>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            />
            <select
              value={filterCategory || ""}
              onChange={(e) => setFilterCategory(e.target.value || null)}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">All Categories</option>
              {/* Categories would be loaded from API */}
              <option value="electronics">Electronics</option>
              <option value="software">Software</option>
            </select>
          </div>
        </div>

        {/* New Product Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">
              {editingProductId ? "Edit Product" : "Create New Product"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Product Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Category
                  </label>
                  <select
                    required
                    value={formData.category_id}
                    onChange={(e) =>
                      setFormData({ ...formData, category_id: e.target.value })
                    }
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  >
                    <option value="">Select Category</option>
                    <option value="cat1">Electronics</option>
                    <option value="cat2">Software</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    SKU
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.sku}
                    onChange={(e) =>
                      setFormData({ ...formData, sku: e.target.value })
                    }
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Regular Price
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.regular_price}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        regular_price: parseFloat(e.target.value),
                      })
                    }
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Sale Price
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.sale_price || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        sale_price: e.target.value
                          ? parseFloat(e.target.value)
                          : undefined,
                      })
                    }
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                </div>

              </div>

              {/* Service Configuration */}
              <div className="mt-4">
                <h3 className="text-lg font-semibold mb-4">Service Configuration</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Service Type
                    </label>
                    <select
                      value={formData.service_type || "general"}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          service_type: e.target.value as ServiceType,
                        })
                      }
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                    >
                      <option value="general">General</option>
                      <option value="dns">DNS</option>
                      <option value="ssl">SSL Certificate</option>
                      <option value="email">Email Hosting</option>
                      <option value="backup">Backup Service</option>
                      <option value="monitoring">Monitoring</option>
                      <option value="domain">Domain Registration</option>
                      <option value="hosting">Hosting</option>
                      <option value="storage">Storage</option>
                      <option value="cdn">CDN</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Billing Cycle
                    </label>
                    <select
                      value={formData.billing_cycle || "one_time"}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          billing_cycle: e.target.value as BillingCycle,
                        })
                      }
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                    >
                      <option value="one_time">One Time</option>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                      <option value="usage_based">Usage Based</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Provisioning Type
                    </label>
                    <select
                      value={formData.provisioning_type || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          provisioning_type: e.target.value
                            ? (e.target.value as ProvisioningType)
                            : undefined,
                        })
                      }
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                    >
                      <option value="">None</option>
                      <option value="automatic">Automatic</option>
                      <option value="manual">Manual</option>
                      <option value="api">API</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Trial Period (days)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.trial_period_days || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          trial_period_days: e.target.value
                            ? parseInt(e.target.value)
                            : undefined,
                        })
                      }
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                      placeholder="e.g., 14"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Service Configuration (JSON)
                    </label>
                    <textarea
                      value={formData.service_config || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, service_config: e.target.value })
                      }
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm"
                      rows={4}
                      placeholder='{"key": "value"}'
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Optional JSON configuration for service-specific settings
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700">
                      Recurring Service
                    </label>
                    <input
                      type="checkbox"
                      checked={formData.is_recurring || false}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          is_recurring: e.target.checked,
                        })
                      }
                      className="h-4 w-4 text-blue-600 rounded"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700">
                      Auto Renew
                    </label>
                    <input
                      type="checkbox"
                      checked={formData.auto_renew || false}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          auto_renew: e.target.checked,
                        })
                      }
                      className="h-4 w-4 text-blue-600 rounded"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Short Description
                </label>
                <input
                  type="text"
                  value={formData.short_description || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      short_description: e.target.value,
                    })
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Full Description
                </label>
                <textarea
                  value={formData.description || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  rows={4}
                />
              </div>

              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "Saving..."
                  : "Save Product"}
              </button>
            </form>
          </div>
        )}

        {/* Products Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {isLoading ? (
            <div className="p-6 text-center">Loading...</div>
          ) : productsData?.data.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No products found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                      Product Name
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                      SKU
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                      Regular Price
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                      Sale Price
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                      Service
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {productsData?.data.map((product) => (
                    <tr key={product.id} className="border-b hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {product.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {product.sku}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        ${product.regular_price}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {product.sale_price ? `$${product.sale_price}` : "-"}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="space-y-1">
                          <span className="inline-block px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                            {product.service_type || "general"}
                          </span>
                          <div className="text-xs text-gray-500">
                            {product.billing_cycle || "one_time"}
                            {product.is_recurring && (
                              <span className="ml-1 text-blue-600">• Recurring</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              handleToggleVisibility(
                                product.id,
                                product.is_visible
                              )
                            }
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              product.is_visible
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {product.is_visible ? "Visible" : "Hidden"}
                          </button>
                          <button
                            onClick={() =>
                              handleToggleFeatured(
                                product.id,
                                product.is_featured
                              )
                            }
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              product.is_featured
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {product.is_featured ? "Featured" : "Regular"}
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingProductId(product.id);
                              setFormData({
                                name: product.name,
                                description: product.description,
                                short_description: product.short_description,
                                category_id: product.category_id,
                                sku: product.sku,
                                regular_price: product.regular_price,
                                sale_price: product.sale_price,
                                service_type: product.service_type || "general",
                                billing_cycle: product.billing_cycle || "one_time",
                                is_recurring: product.is_recurring || false,
                                provisioning_type: product.provisioning_type,
                                auto_renew: product.auto_renew || false,
                                trial_period_days: product.trial_period_days,
                                service_config: product.service_config
                                  ? JSON.stringify(product.service_config, null, 2)
                                  : "",
                              });
                              setShowForm(true);
                            }}
                            className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {productsData && productsData.total_pages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-4 py-2 border rounded-lg disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-4 py-2">
              Page {page} of {productsData.total_pages}
            </span>
            <button
              onClick={() =>
                setPage(Math.min(productsData.total_pages, page + 1))
              }
              disabled={page === productsData.total_pages}
              className="px-4 py-2 border rounded-lg disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
