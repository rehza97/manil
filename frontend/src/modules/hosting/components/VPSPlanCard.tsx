/**
 * VPS Plan Card Component
 *
 * Displays VPS plan with specs, pricing, and features.
 */

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Separator } from "@/shared/components/ui/separator";
import { Check, Cpu, MemoryStick, HardDrive, Network } from "lucide-react";
import type { VPSPlan } from "../types";
import { formatDZD } from "@/shared/utils/formatters";

interface VPSPlanCardProps {
  plan: VPSPlan;
  onSelect: (planId: string) => void;
  isPopular?: boolean;
  isRecommended?: boolean;
}

export function VPSPlanCard({
  plan,
  onSelect,
  isPopular,
  isRecommended,
}: VPSPlanCardProps) {
  return (
    <Card className="relative hover:shadow-lg transition-shadow h-full flex flex-col">
      {(isPopular || isRecommended) && (
        <Badge
          className="absolute top-2 right-2 z-10"
          variant={isPopular ? "default" : "secondary"}
        >
          {isPopular ? "Popular" : "Recommended"}
        </Badge>
      )}

      <CardHeader>
        <CardTitle>{plan.name}</CardTitle>
        {plan.description && (
          <CardDescription>{plan.description}</CardDescription>
        )}
      </CardHeader>

      <CardContent className="flex-1">
        <div className="text-3xl font-bold mb-4">
          {formatDZD(typeof plan.monthly_price === 'number' ? plan.monthly_price : Number(plan.monthly_price || 0))}
          <span className="text-sm font-normal text-muted-foreground">
            /month
          </span>
        </div>

        {plan.setup_fee > 0 && (
          <div className="text-sm text-muted-foreground mb-4">
            Setup Fee: {formatDZD(typeof plan.setup_fee === 'number' ? plan.setup_fee : Number(plan.setup_fee || 0))}
          </div>
        )}

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              {plan.cpu_cores} CPU Core{plan.cpu_cores > 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <MemoryStick className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{plan.ram_gb} GB RAM</span>
          </div>
          <div className="flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{plan.storage_gb} GB Storage</span>
          </div>
          <div className="flex items-center gap-2">
            <Network className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{plan.bandwidth_tb} TB Bandwidth</span>
          </div>
        </div>

        <Separator className="my-4" />

        {plan.features && Object.keys(plan.features).length > 0 && (
          <div className="space-y-2">
            {Object.entries(plan.features).map(
              ([key, value]) =>
                value && (
                  <div key={key} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span className="text-sm capitalize">
                      {key.replace(/_/g, " ")}
                    </span>
                  </div>
                )
            )}
          </div>
        )}
      </CardContent>

      <CardFooter>
        <Button onClick={() => onSelect(plan.id)} className="w-full">
          Request This Plan
        </Button>
      </CardFooter>
    </Card>
  );
}

