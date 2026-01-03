"use client";

import React from "react";
import { CheckCircle2, AlertTriangle, AlertCircle } from "lucide-react";

interface NormalRangeIndicatorProps {
  value: number | string;
  normalMin?: number | null;
  normalMax?: number | null;
  unit?: string;
  label?: string;
  size?: "sm" | "md" | "lg";
}

export const NormalRangeIndicator: React.FC<NormalRangeIndicatorProps> = ({
  value,
  normalMin,
  normalMax,
  unit = "",
  label,
  size = "md",
}) => {
  const numericValue = typeof value === "string" ? parseFloat(value) : value;

  // Determine if value is abnormal
  const isAbnormal =
    !isNaN(numericValue) &&
    ((normalMin !== null && normalMin !== undefined && numericValue < normalMin) ||
      (normalMax !== null && normalMax !== undefined && numericValue > normalMax));

  const isWarning =
    !isNaN(numericValue) &&
    normalMin !== null &&
    normalMin !== undefined &&
    normalMax !== null &&
    normalMax !== undefined &&
    (numericValue === normalMin || numericValue === normalMax);

  const sizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  const getStatusColor = () => {
    if (isAbnormal) return "text-rose-600 bg-rose-50 border-rose-200";
    if (isWarning) return "text-amber-600 bg-amber-50 border-amber-200";
    return "text-emerald-600 bg-emerald-50 border-emerald-200";
  };

  const getIcon = () => {
    if (isAbnormal) return <AlertCircle className={iconSizes[size]} />;
    if (isWarning) return <AlertTriangle className={iconSizes[size]} />;
    return <CheckCircle2 className={iconSizes[size]} />;
  };

  const getStatusText = () => {
    if (isAbnormal) return "Abnormal";
    if (isWarning) return "Borderline";
    return "Normal";
  };

  return (
    <div className="space-y-2">
      {label && <p className={`font-medium text-slate-700 ${sizeClasses[size]}`}>{label}</p>}

      <div className="flex items-center gap-3">
        {/* Value */}
        <div className={`font-bold ${isAbnormal ? "text-rose-600" : "text-slate-900"} ${size === "lg" ? "text-2xl" : size === "md" ? "text-xl" : "text-lg"}`}>
          {value} {unit}
        </div>

        {/* Status indicator */}
        <div className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${getStatusColor()}`}>
          {getIcon()}
          <span className={`font-semibold ${sizeClasses[size]}`}>{getStatusText()}</span>
        </div>
      </div>

      {/* Normal range display */}
      {(normalMin !== null || normalMax !== null) && (
        <div className={`text-slate-500 ${sizeClasses[size]}`}>
          Normal range:{" "}
          {normalMin !== null && normalMin !== undefined && (
            <span className="font-medium">
              {normalMin}
              {normalMax !== null && normalMax !== undefined ? ` - ${normalMax}` : "+"}
            </span>
          )}
          {normalMin === null && normalMax !== null && normalMax !== undefined && (
            <span className="font-medium">&lt; {normalMax}</span>
          )}
          {unit && <span> {unit}</span>}
        </div>
      )}

      {/* Visual bar indicator */}
      {normalMin !== null &&
        normalMin !== undefined &&
        normalMax !== null &&
        normalMax !== undefined &&
        !isNaN(numericValue) && (
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100">
            {/* Normal range highlight */}
            <div
              className="absolute h-full bg-emerald-200"
              style={{
                left: "0%",
                width: "100%",
              }}
            />
            {/* Current value indicator */}
            <div
              className={`absolute h-full w-1 ${isAbnormal ? "bg-rose-600" : "bg-emerald-600"}`}
              style={{
                left: `${Math.max(0, Math.min(100, ((numericValue - normalMin) / (normalMax - normalMin)) * 100))}%`,
              }}
            />
          </div>
        )}
    </div>
  );
};
