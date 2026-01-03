"use client";

import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MiniChartProps {
  data: number[];
  label: string;
  currentValue: number | string;
  unit?: string;
  trend?: "up" | "down" | "stable";
  isAbnormal?: boolean;
}

export const MiniChart: React.FC<MiniChartProps> = ({
  data,
  label,
  currentValue,
  unit = "",
  trend,
  isAbnormal = false,
}) => {
  // Calculate min/max for scaling
  const min = Math.min(...data.filter((v) => v !== null && !isNaN(v)));
  const max = Math.max(...data.filter((v) => v !== null && !isNaN(v)));
  const range = max - min || 1;

  // Generate SVG path for sparkline
  const width = 80;
  const height = 24;
  const points = data
    .map((value, index) => {
      if (value === null || isNaN(value)) return null;
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    })
    .filter(Boolean);

  const pathData = points.length > 0 ? `M ${points.join(" L ")}` : "";

  // Determine trend icon and color
  const getTrendIcon = () => {
    if (trend === "up") return <TrendingUp className="h-3 w-3" />;
    if (trend === "down") return <TrendingDown className="h-3 w-3" />;
    return <Minus className="h-3 w-3" />;
  };

  const getTrendColor = () => {
    if (isAbnormal) return "text-rose-600";
    if (trend === "up") return "text-emerald-600";
    if (trend === "down") return "text-rose-600";
    return "text-slate-600";
  };

  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-white p-3 shadow-sm">
      <div className="flex-1">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <div className="mt-1 flex items-baseline gap-1">
          <span className={`text-lg font-bold ${isAbnormal ? "text-rose-600" : "text-slate-900"}`}>
            {currentValue}
          </span>
          {unit && <span className="text-xs text-slate-500">{unit}</span>}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Sparkline */}
        {pathData && (
          <svg width={width} height={height} className="opacity-60">
            <path
              d={pathData}
              fill="none"
              stroke={isAbnormal ? "#dc2626" : "#0ea5e9"}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}

        {/* Trend indicator */}
        {trend && (
          <div className={`flex items-center ${getTrendColor()}`}>
            {getTrendIcon()}
          </div>
        )}
      </div>
    </div>
  );
};
