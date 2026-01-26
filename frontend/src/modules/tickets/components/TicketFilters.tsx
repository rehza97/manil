import React from "react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { TicketStatus, TicketPriority } from "../types/ticket.types";
import { X } from "lucide-react";

export interface TicketFilters {
  status?: TicketStatus;
  priority?: TicketPriority;
  category?: string;
  assignedTo?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

interface TicketFiltersProps {
  filters: TicketFilters;
  onFiltersChange: (filters: TicketFilters) => void;
  onClear: () => void;
}

export const TicketFilters: React.FC<TicketFiltersProps> = ({
  filters,
  onFiltersChange,
  onClear,
}) => {
  const hasActiveFilters = Object.values(filters).some((value) => value !== undefined && value !== "");

  const updateFilter = (key: keyof TicketFilters, value: string | undefined) => {
    onFiltersChange({
      ...filters,
      [key]: value || undefined,
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Filtres</CardTitle>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={onClear}>
              <X className="h-4 w-4 mr-1" />
              Effacer
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="search">Recherche</Label>
          <Input
            id="search"
            placeholder="Rechercher des tickets…"
            value={filters.search || ""}
            onChange={(e) => updateFilter("search", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Statut</Label>
          <Select
            value={filters.status || "all"}
            onValueChange={(value) => updateFilter("status", value === "all" ? undefined : value)}
          >
            <SelectTrigger id="status">
              <SelectValue placeholder="Tous les statuts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value={TicketStatus.OPEN}>Ouvert</SelectItem>
              <SelectItem value={TicketStatus.IN_PROGRESS}>En cours</SelectItem>
              <SelectItem value={TicketStatus.RESOLVED}>Résolu</SelectItem>
              <SelectItem value={TicketStatus.CLOSED}>Fermé</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="priority">Priorité</Label>
          <Select
            value={filters.priority || "all"}
            onValueChange={(value) => updateFilter("priority", value === "all" ? undefined : value)}
          >
            <SelectTrigger id="priority">
              <SelectValue placeholder="Toutes les priorités" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les priorités</SelectItem>
              <SelectItem value={TicketPriority.LOW}>Basse</SelectItem>
              <SelectItem value={TicketPriority.MEDIUM}>Moyenne</SelectItem>
              <SelectItem value={TicketPriority.HIGH}>Haute</SelectItem>
              <SelectItem value={TicketPriority.URGENT}>Urgente</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Catégorie</Label>
          <Select
            value={filters.category || "all"}
            onValueChange={(value) => updateFilter("category", value === "all" ? undefined : value)}
          >
            <SelectTrigger id="category">
              <SelectValue placeholder="Toutes les catégories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les catégories</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="assignedTo">Assigné à</Label>
          <Input
            id="assignedTo"
            placeholder="Nom ou ID de l'agent"
            value={filters.assignedTo || ""}
            onChange={(e) => updateFilter("assignedTo", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="dateFrom">Du</Label>
          <Input
            id="dateFrom"
            type="date"
            value={filters.dateFrom || ""}
            onChange={(e) => updateFilter("dateFrom", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="dateTo">Au</Label>
          <Input
            id="dateTo"
            type="date"
            value={filters.dateTo || ""}
            onChange={(e) => updateFilter("dateTo", e.target.value)}
          />
        </div>
      </CardContent>
    </Card>
  );
};






