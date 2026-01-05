/**
 * Resource Gauge Component
 *
 * Displays resource usage as a circular gauge with percentage and color coding.
 */

import { Progress } from "@/shared/components/ui/progress";
import { cn } from "@/shared/utils";

interface ResourceGaugeProps {
  value: number;
  max: number;
  label: string;
  unit?: string;
  className?: string;
}

export function ResourceGauge({
  value,
  max,
  label,
  unit = "",
  className,
}: ResourceGaugeProps) {
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;

  const getColorClass = (percent: number): string => {
    if (percent < 70) return "text-green-500";
    if (percent < 90) return "text-yellow-500";
    return "text-red-500";
  };

  const getProgressColorClass = (percent: number): string => {
    if (percent < 70) return "[&>div]:bg-green-500";
    if (percent < 90) return "[&>div]:bg-yellow-500";
    return "[&>div]:bg-red-500";
  };

  return (
    <div className={cn("text-center", className)}>
      <div className={cn("text-3xl font-bold mb-1", getColorClass(percentage))}>
        {percentage.toFixed(1)}%
      </div>
      <div className="text-sm text-muted-foreground mb-2">{label}</div>
      <Progress
        value={percentage}
        className={cn("h-2", getProgressColorClass(percentage))}
      />
      <div className="text-xs text-muted-foreground mt-1">
        {value.toLocaleString()} {unit} / {max.toLocaleString()} {unit}
      </div>
    </div>
  );
}

