import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Package,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  Filter,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { apiClient } from "@/shared/api/client";
import { formatDZD } from "@/shared/utils/formatters";
import type { Product, ServiceType, BillingCycle } from "@/modules/products/types/product.types";

interface ProductListItem extends Omit<Product, "category"> {
  category: {
    id: string;
    name: string;
  } | null;
}

interface ProductListResponse {
  data: ProductListItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

const ProductListPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");

  const { data, isLoading, error } = useQuery<ProductListResponse>({
    queryKey: ["admin-products", page, pageSize, search, sortBy, sortOrder],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
        sort_by: sortBy,
        sort_order: sortOrder,
      });

      if (search) {
        params.append("search", search);
      }

      const response = await apiClient.get(`/products?${params.toString()}`);
      return response.data;
    },
  });

  const handleDelete = async (productId: string) => {
    if (!confirm("Voulez-vous vraiment supprimer ce produit ?")) return;

    try {
      await apiClient.delete(`/products/${productId}`);
      // Refetch products
      window.location.reload();
    } catch (error) {
      console.error("Error deleting product:", error);
      alert("Échec de la suppression du produit");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Gestion des produits
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Gérez votre catalogue de services numériques et les tarifs
          </p>
        </div>
        <Link to="/admin/products/new">
          <Button className="bg-green-600 hover:bg-green-700">
            <Plus className="mr-2 h-4 w-4" />
            Ajouter un produit
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Rechercher des produits..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger>
              <SelectValue placeholder="Trier par" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Nom</SelectItem>
              <SelectItem value="price">Prix</SelectItem>
              <SelectItem value="created_at">Date de création</SelectItem>
              <SelectItem value="rating">Note</SelectItem>
              <SelectItem value="view_count">Vues</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortOrder} onValueChange={setSortOrder}>
            <SelectTrigger>
              <SelectValue placeholder="Ordre" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="asc">Croissant</SelectItem>
              <SelectItem value="desc">Décroissant</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-lg border">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Chargement des produits…</div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">
            Erreur lors du chargement des produits. Veuillez réessayer.
          </div>
        ) : data && data.data.length > 0 ? (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produit</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead>Prix</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="flex items-center">
                        <Package className="mr-2 h-4 w-4 text-gray-400" />
                        <div>
                          <div className="font-medium">{product.name}</div>
                          {product.is_featured && (
                            <Badge variant="secondary" className="mt-1">
                              En vedette
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {product.sku}
                    </TableCell>
                    <TableCell>{product.category?.name || "Sans catégorie"}</TableCell>
                    <TableCell>
                      <div>
                        {product.sale_price ? (
                          <>
                            <span className="line-through text-gray-400 text-sm">
                              {formatDZD(product.regular_price)}
                            </span>
                            <span className="ml-2 text-green-600 font-semibold">
                              {formatDZD(product.sale_price)}
                            </span>
                          </>
                        ) : (
                          <span className="font-semibold">
                            {formatDZD(product.regular_price)}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Badge variant="outline" className="text-xs">
                          {product.service_type || "general"}
                        </Badge>
                        <div className="text-xs text-gray-500">
                          {product.billing_cycle || "one_time"}
                          {product.is_recurring && (
                            <span className="ml-1 text-blue-600">• Récurrent</span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={product.is_active ? "default" : "secondary"}>
                        {product.is_active ? "Actif" : "Inactif"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/products/${product.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/admin/products/${product.id}/edit`}>
                            <Edit className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(product.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <div className="text-sm text-gray-500">
                Affichage de {(page - 1) * pageSize + 1} à{" "}
                {Math.min(page * pageSize, data.total)} sur {data.total} produits
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  Précédent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page >= data.total_pages}
                >
                  Suivant
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="p-8 text-center">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              Aucun produit trouvé
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Commencez par créer un nouveau produit.
            </p>
            <div className="mt-6">
              <Link to="/admin/products/new">
                <Button className="bg-green-600 hover:bg-green-700">
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter un produit
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductListPage;
