"use client";

import { LucideIcon } from "lucide-react";


type EnhancedStatCardProps = {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  tone?: "sky" | "emerald" | "amber" | "fuchsia";
  insights?: {
    label: string;
    value: string | number;
    trend?: "up" | "down" | "neutral";
  }[];
  loading?: boolean;
};

const tones: Record<
  NonNullable<EnhancedStatCardProps["tone"]>,
  { bg: string; text: string }
> = {
  sky: { bg: "bg-sky-50", text: "text-sky-600" },
  emerald: { bg: "bg-emerald-50", text: "text-emerald-600" },
  amber: { bg: "bg-amber-50", text: "text-amber-600" },
  fuchsia: { bg: "bg-fuchsia-50", text: "text-fuchsia-600" },
};

export function EnhancedStatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "sky",
  insights = [],
  loading = false,
}: EnhancedStatCardProps) {
  const toneClasses = tones[tone];

  return (
    <div className="card group relative overflow-hidden">
      <div className="absolute right-4 top-4 h-20 w-20 rounded-full bg-gradient-to-br from-sky-100 to-white blur-3xl transition-all group-hover:scale-110" />
      <div className="relative flex items-start justify-between p-4">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            {label}
          </p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
          {hint ? <p className="mt-1.5 text-xs text-slate-500">{hint}</p> : null}

          {/* Insights Section */}
          {insights.length > 0 && (
            <div className="mt-3 space-y-1.5 pt-3 border-t border-slate-100">
              {loading ? (
                <div className="space-y-2">
                  <div className="h-4 animate-pulse rounded bg-slate-100"></div>
                  <div className="h-4 animate-pulse rounded bg-slate-100"></div>
                </div>
              ) : (
                insights.map((insight, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">{insight.label}</span>
                    <div className="flex items-center gap-1.5">
                      {insight.trend === "up" && (
                        <span className="text-emerald-600">↑</span>
                      )}
                      {insight.trend === "down" && (
                        <span className="text-rose-600">↓</span>
                      )}
                      <span className="font-semibold text-slate-900">{insight.value}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
        <div className={`rounded-2xl p-2.5 ${toneClasses.bg} ${toneClasses.text}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

