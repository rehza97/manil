/**
 * Image Build Progress Indicator Component
 *
 * Visual progress indicator for Docker image build stages.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Progress } from "@/shared/components/ui/progress";
import { Badge } from "@/shared/components/ui/badge";
import { CheckCircle2, Clock, Loader2, XCircle, ShieldCheck, FileCheck } from "lucide-react";
import { ImageBuildStatus } from "../types";

interface ImageBuildProgressIndicatorProps {
  status: ImageBuildStatus;
  currentStep?: string;
  className?: string;
}

const buildStages = [
  { key: "PENDING", label: "En attente", icon: Clock },
  { key: "VALIDATING", label: "Validation", icon: FileCheck },
  { key: "BUILDING", label: "Construction", icon: Loader2 },
  { key: "SCANNING", label: "Analyse", icon: ShieldCheck },
  { key: "COMPLETED", label: "Terminé", icon: CheckCircle2 },
];

const failedStages = [
  { key: "FAILED", label: "Échoué", icon: XCircle },
  { key: "REJECTED", label: "Rejeté", icon: XCircle },
];

export function ImageBuildProgressIndicator({
  status,
  currentStep,
  className,
}: ImageBuildProgressIndicatorProps) {
  const getStageIndex = (): number => {
    const normalIndex = buildStages.findIndex((stage) => stage.key === status);
    if (normalIndex !== -1) return normalIndex;
    return buildStages.length; // Failed/Rejected stages
  };

  const getProgress = (): number => {
    const currentIndex = getStageIndex();
    if (status === "COMPLETED") return 100;
    if (status === "FAILED" || status === "REJECTED") return 0;
    // Calculate progress based on current stage
    return ((currentIndex + 1) / buildStages.length) * 100;
  };

  const isStageActive = (stageKey: string): boolean => {
    return status === stageKey;
  };

  const isStageCompleted = (stageKey: string): boolean => {
    const stageIndex = buildStages.findIndex((s) => s.key === stageKey);
    const currentIndex = getStageIndex();
    return stageIndex < currentIndex || status === "COMPLETED";
  };

  const isStageFailed = (): boolean => {
    return status === "FAILED" || status === "REJECTED";
  };

  const getStageStatus = (stageKey: string): "completed" | "active" | "pending" | "failed" => {
    if (isStageFailed() && stageKey === status) return "failed";
    if (isStageCompleted(stageKey)) return "completed";
    if (isStageActive(stageKey)) return "active";
    return "pending";
  };

  const progress = getProgress();

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Progression du build</CardTitle>
        <CardDescription>
          {currentStep && <span className="font-mono text-xs">{currentStep}</span>}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progression globale</span>
            <span className="font-medium">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Stage Indicators */}
        <div className="space-y-3">
          {buildStages.map((stage, index) => {
            const stageStatus = getStageStatus(stage.key as ImageBuildStatus);
            const Icon = stage.icon;
            const isSpinning = stageStatus === "active" && (stage.key === "VALIDATING" || stage.key === "BUILDING" || stage.key === "SCANNING");

            return (
              <div key={stage.key} className="flex items-center gap-3">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                    stageStatus === "completed"
                      ? "bg-green-100 border-green-500 text-green-700"
                      : stageStatus === "active"
                      ? "bg-blue-100 border-blue-500 text-blue-700"
                      : stageStatus === "failed"
                      ? "bg-red-100 border-red-500 text-red-700"
                      : "bg-gray-100 border-gray-300 text-gray-400"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isSpinning ? "animate-spin" : ""}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-medium ${
                        stageStatus === "completed"
                          ? "text-green-700"
                          : stageStatus === "active"
                          ? "text-blue-700"
                          : stageStatus === "failed"
                          ? "text-red-700"
                          : "text-gray-400"
                      }`}
                    >
                      {stage.label}
                    </span>
                    {stageStatus === "completed" && (
                      <Badge variant="outline" className="text-xs">
                        Done
                      </Badge>
                    )}
                    {stageStatus === "active" && (
                      <Badge variant="default" className="text-xs">
                        In Progress
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Failed/Rejected Status */}
          {(status === "FAILED" || status === "REJECTED") && (
            <div className="flex items-center gap-3 pt-2 border-t">
              <div className="flex items-center justify-center w-8 h-8 rounded-full border-2 bg-red-100 border-red-500 text-red-700">
                <XCircle className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <span className="text-sm font-medium text-red-700">
                  {status === "FAILED" ? "Build échoué" : "Image rejetée"}
                </span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}








