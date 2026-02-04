import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Label } from "@/shared/components/ui/label";
import { Input } from "@/shared/components/ui/input";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/shared/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Button } from "@/shared/components/ui/button";
import { Separator } from "@/shared/components/ui/separator";
import { X, Filter } from "lucide-react";
import type { ProductCategory, ServiceType, BillingCycle } from "../types";

export interface FilterState {
  category_id?: string;
  min_price?: number;
  max_price?: number;
  is_featured?: boolean;
  service_type?: ServiceType;
  billing_cycle?: BillingCycle;
  is_recurring?: boolean;
  in_stock?: boolean; // DEPRECATED: kept for backward compatibility
  sort_by?: "name" | "price" | "created_at" | "rating" | "view_count";
  sort_order?: "asc" | "desc";
}

interface ProductFiltersProps {
  categories: ProductCategory[];
  onFilterChange: (filters: FilterState) => void;
  isLoading?: boolean;
  onClose?: () => void;
}

export const ProductFilters: React.FC<ProductFiltersProps> = ({
  categories,
  onFilterChange,
  isLoading = false,
  onClose,
}) => {
  const [filters, setFilters] = useState<FilterState>({});

  const handleFilterChange = (newFilters: FilterState) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    onFilterChange(updatedFilters);
  };

  const handleReset = () => {
    setFilters({});
    onFilterChange({});
  };

  const hasActiveFilters = Object.keys(filters).some(
    (key) => filters[key as keyof FilterState] !== undefined && filters[key as keyof FilterState] !== ""
  );

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg font-semibold">Filtres</CardTitle>
          </div>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 lg:hidden"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Fermer les filtres</span>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* Category Filter */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold">Catégorie</Label>
          <RadioGroup
            value={filters.category_id || "all"}
            onValueChange={(value) =>
              handleFilterChange({ category_id: value === "all" ? undefined : value })
            }
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="all" id="category-all" />
              <Label htmlFor="category-all" className="font-normal cursor-pointer">
                Toutes les catégories
              </Label>
            </div>
            {categories.map((category) => (
              <div key={category.id} className="flex items-center space-x-2">
                <RadioGroupItem value={category.id} id={`category-${category.id}`} />
                <Label htmlFor={`category-${category.id}`} className="font-normal cursor-pointer">
                  {category.name}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <Separator />

        {/* Price Range Filter */}
        <div className="space-y-4">
          <Label className="text-sm font-semibold">Fourchette de prix</Label>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="min-price" className="text-xs text-muted-foreground">
                Prix min
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  $
                </span>
                <Input
                  id="min-price"
                  type="number"
                  value={filters.min_price || ""}
                  onChange={(e) =>
                    handleFilterChange({
                      min_price: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                  placeholder="0"
                  className="pl-7"
                  min="0"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="max-price" className="text-xs text-muted-foreground">
                Prix max
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  $
                </span>
                <Input
                  id="max-price"
                  type="number"
                  value={filters.max_price || ""}
                  onChange={(e) =>
                    handleFilterChange({
                      max_price: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                  placeholder="1000"
                  className="pl-7"
                  min="0"
                />
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Service Filters */}
        <div className="space-y-4">
          <Label className="text-sm font-semibold">Type de service</Label>
          <Select
            value={filters.service_type || "all"}
            onValueChange={(value) =>
              handleFilterChange({
                service_type: value === "all" ? undefined : (value as ServiceType),
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Tous les types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              <SelectItem value="general">Général</SelectItem>
              <SelectItem value="dns">DNS</SelectItem>
              <SelectItem value="ssl">Certificat SSL</SelectItem>
              <SelectItem value="email">Hébergement e-mail</SelectItem>
              <SelectItem value="backup">Service de sauvegarde</SelectItem>
              <SelectItem value="monitoring">Surveillance</SelectItem>
              <SelectItem value="domain">Enregistrement de domaine</SelectItem>
              <SelectItem value="hosting">Hébergement</SelectItem>
              <SelectItem value="storage">Stockage</SelectItem>
              <SelectItem value="cdn">CDN</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Billing Cycle Filter */}
        <div className="space-y-4">
          <Label className="text-sm font-semibold">Facturation</Label>
          <Select
            value={filters.billing_cycle || "all"}
            onValueChange={(value) =>
              handleFilterChange({
                billing_cycle: value === "all" ? undefined : (value as BillingCycle),
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Toutes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              <SelectItem value="one_time">Paiement unique</SelectItem>
              <SelectItem value="monthly">Mensuel</SelectItem>
              <SelectItem value="yearly">Annuel</SelectItem>
              <SelectItem value="usage_based">À l&apos;usage</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Status Filters */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold">Statut</Label>
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="featured"
                checked={filters.is_featured ?? false}
                onCheckedChange={(checked) =>
                  handleFilterChange({
                    is_featured: checked ? true : undefined,
                  })
                }
              />
              <Label htmlFor="featured" className="font-normal cursor-pointer">
                En vedette uniquement
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="recurring"
                checked={filters.is_recurring ?? false}
                onCheckedChange={(checked) =>
                  handleFilterChange({
                    is_recurring: checked ? true : undefined,
                  })
                }
              />
              <Label htmlFor="recurring" className="font-normal cursor-pointer">
                Services récurrents uniquement
              </Label>
            </div>
          </div>
        </div>

        <Separator />

        {/* Sort By */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold">Trier par</Label>
          <Select
            value={filters.sort_by || "created_at"}
            onValueChange={(value) =>
              handleFilterChange({
                sort_by: value as FilterState["sort_by"],
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Choisir le tri" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at">Plus récents</SelectItem>
              <SelectItem value="name">Nom (A-Z)</SelectItem>
              <SelectItem value="price">Prix (croissant)</SelectItem>
              <SelectItem value="rating">Mieux notés</SelectItem>
              <SelectItem value="view_count">Plus vus</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-semibold">Ordre</Label>
          <RadioGroup
            value={filters.sort_order || "desc"}
            onValueChange={(value) =>
              handleFilterChange({ sort_order: value as "asc" | "desc" })
            }
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="desc" id="order-desc" />
              <Label htmlFor="order-desc" className="font-normal cursor-pointer">
                Décroissant
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="asc" id="order-asc" />
              <Label htmlFor="order-asc" className="font-normal cursor-pointer">
                Croissant
              </Label>
            </div>
          </RadioGroup>
        </div>

        <Separator />

        <Button
          onClick={handleReset}
          disabled={isLoading || !hasActiveFilters}
          variant="outline"
          className="w-full"
        >
          Réinitialiser les filtres
        </Button>
      </CardContent>
    </Card>
  );
};
