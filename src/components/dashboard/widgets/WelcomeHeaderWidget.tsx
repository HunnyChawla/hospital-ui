"use client";

import React, { useMemo } from "react";
import { useAppSelector } from "@/redux/hooks";

interface WelcomeHeaderWidgetProps {
  onCustomizeClick?: () => void;
  onRefreshClick?: () => void;
  isRefreshing?: boolean;
}

export function WelcomeHeaderWidget({
  onCustomizeClick,
  onRefreshClick,
  isRefreshing,
}: WelcomeHeaderWidgetProps) {
  const { userDetails } = useAppSelector((s) => s.auth);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const userName = userDetails?.full_name || "Admin";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-r from-white via-sky-50/20 to-white px-5 py-3.5 shadow-xs">
      <div className="relative flex items-center justify-between gap-4">
        {/* Left: Clean Greeting Only */}
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          {greeting}, <span className="text-sky-600">{userName}</span>
        </h1>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {onRefreshClick && (
            <button
              type="button"
              onClick={onRefreshClick}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 disabled:opacity-50 shadow-2xs cursor-pointer"
              title="Refresh Dashboard Data"
            >
              <svg
                className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-sky-600" : "text-slate-500"}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span>{isRefreshing ? "Syncing..." : "Refresh"}</span>
            </button>
          )}

          {onCustomizeClick && (
            <button
              type="button"
              onClick={onCustomizeClick}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 shadow-2xs cursor-pointer"
            >
              <svg
                className="h-3.5 w-3.5 text-slate-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                />
              </svg>
              <span>Customize</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
