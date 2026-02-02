/**
 * FAQ section — one category with title and list of FAQ items.
 */

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/shared/components/ui/collapsible";
import { ChevronRight } from "lucide-react";
import type { FaqCategory } from "../types/faq.types";
import { FaqItem } from "./FaqItem";
import { cn } from "@/shared/utils";

interface FaqSectionProps {
  category: FaqCategory;
  defaultOpen?: boolean;
  className?: string;
}

export const FaqSection = ({
  category,
  defaultOpen = true,
  className,
}: FaqSectionProps) => {
  return (
    <Collapsible
      defaultOpen={defaultOpen}
      className={cn("rounded-lg border border-slate-200 bg-white", className)}
    >
      <CollapsibleTrigger className="group flex w-full items-center justify-between gap-2 px-4 py-3 text-left font-semibold text-slate-900 hover:bg-slate-50 data-[state=open]:rounded-t-lg data-[state=open]:bg-slate-50">
        <span>{category.title}</span>
        <ChevronRight className="h-4 w-4 shrink-0 text-slate-500 transition-transform group-data-[state=open]:rotate-90" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="border-t border-slate-200 px-4">
          {category.items.map((item) => (
            <FaqItem key={item.id} item={item} />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
