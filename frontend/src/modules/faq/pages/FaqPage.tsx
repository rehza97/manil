/**
 * FAQ page — coordinator: filters + list of sections. All UI in French.
 */

import { useMemo, useState } from "react";
import { useAuth } from "@/modules/auth";
import { LandingNavigation } from "@/modules/landing/components/LandingNavigation";
import { LandingFooter } from "@/modules/landing/components/LandingFooter";
import { faqContent } from "../data";
import { FaqSection } from "../components/FaqSection";
import { FaqFilters } from "../components/FaqFilters";
import type { FaqAudience, FaqCategory } from "../types/faq.types";

const matchesSearch = (query: string, category: FaqCategory): boolean => {
  if (!query.trim()) return true;
  const q = query.toLowerCase();
  const inTitle = category.title.toLowerCase().includes(q);
  const inItems = category.items.some(
    (item) =>
      item.question.toLowerCase().includes(q) || item.answer.toLowerCase().includes(q)
  );
  return inTitle || inItems;
};

export const FaqPage = () => {
  const { user, isAuthenticated } = useAuth();
  const defaultAudience: FaqAudience =
    isAuthenticated && user?.role === "admin" ? "admin" : "client";
  const [audience, setAudience] = useState<FaqAudience>(defaultAudience);
  const [searchQuery, setSearchQuery] = useState("");

  const categories = useMemo(() => {
    const list = faqContent[audience];
    return searchQuery.trim()
      ? list.filter((cat) => matchesSearch(searchQuery, cat))
      : list;
  }, [audience, searchQuery]);

  return (
    <div className="min-h-screen bg-white">
      <LandingNavigation />
      <section className="border-t border-slate-200 py-12">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Centre d&apos;aide — FAQ
          </h1>
          <p className="mt-2 text-slate-600">
            Choisissez votre espace et consultez les questions fréquentes.
          </p>
          <div className="mt-6">
            <FaqFilters
              audience={audience}
              onAudienceChange={setAudience}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />
          </div>
          <div className="mt-8 space-y-4">
            {categories.length === 0 ? (
              <p className="text-sm text-slate-500">
                Aucune question ne correspond à votre recherche.
              </p>
            ) : (
              categories.map((category) => (
                <FaqSection key={category.id} category={category} />
              ))
            )}
          </div>
        </div>
      </section>
      <LandingFooter />
    </div>
  );
};
