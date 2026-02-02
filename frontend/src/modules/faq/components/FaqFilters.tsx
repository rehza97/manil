/**
 * FAQ filters — audience tabs (Espace client / Administrateurs) and search.
 */

import { Tabs, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Input } from "@/shared/components/ui/input";
import { Search } from "lucide-react";
import type { FaqAudience } from "../types/faq.types";

interface FaqFiltersProps {
  audience: FaqAudience;
  onAudienceChange: (audience: FaqAudience) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const FaqFilters = ({
  audience,
  onAudienceChange,
  searchQuery,
  onSearchChange,
}: FaqFiltersProps) => {
  return (
    <div className="space-y-4">
      <Tabs
        value={audience}
        onValueChange={(v) => onAudienceChange(v as FaqAudience)}
      >
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="client">Espace client</TabsTrigger>
          <TabsTrigger value="admin">Administrateurs</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          type="search"
          placeholder="Rechercher dans les questions..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
    </div>
  );
};
