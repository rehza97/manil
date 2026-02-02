/**
 * Single FAQ item — question (trigger) and answer (collapsible content).
 */

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/shared/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import type { FaqItem as FaqItemType } from "../types/faq.types";
import { cn } from "@/shared/utils";

interface FaqItemProps {
  item: FaqItemType;
  className?: string;
}

export const FaqItem = ({ item, className }: FaqItemProps) => {
  return (
    <Collapsible className={cn("border-b border-slate-200 last:border-0", className)}>
      <CollapsibleTrigger className="group flex w-full items-center justify-between gap-2 py-3 text-left text-sm font-medium text-slate-900 hover:text-[#38ada9] data-[state=open]:text-[#38ada9]">
        <span>{item.question}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-500 transition-transform group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <p className="pb-3 pl-0 text-sm text-slate-600">{item.answer}</p>
      </CollapsibleContent>
    </Collapsible>
  );
};
