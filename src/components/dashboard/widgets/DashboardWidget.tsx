"use client";

import React, { ReactNode } from "react";
import { LucideIcon, GripVertical, X } from "lucide-react";
import clsx from "clsx";

export interface DashboardWidgetProps {
  id: string;
  title?: string;
  icon?: LucideIcon;
  tone?: "sky" | "emerald" | "amber" | "purple" | "rose" | "slate";
  badge?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  loading?: boolean;
  isEmpty?: boolean;
  emptyState?: ReactNode;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  hideHeader?: boolean;
  colSpan?: number; // 1, 2, 3, or 4
  rowSpan?: number; // 1, 2, 3, or 4
  isEditing?: boolean;
  onRemove?: () => void;
  dragHandleProps?: Record<string, any>;
}

const toneStyles = {
  sky: "bg-sky-50 text-sky-600 border-sky-100",
  emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
  amber: "bg-amber-50 text-amber-600 border-amber-100",
  purple: "bg-purple-50 text-purple-600 border-purple-100",
  rose: "bg-rose-50 text-rose-600 border-rose-100",
  slate: "bg-slate-50 text-slate-600 border-slate-100",
};

export function DashboardWidget({
  id,
  title,
  icon: Icon,
  tone = "sky",
  badge,
  action,
  children,
  loading = false,
  isEmpty = false,
  emptyState,
  className,
  headerClassName,
  bodyClassName,
  hideHeader = false,
  colSpan,
  rowSpan = 1,
  isEditing = false,
  onRemove,
  dragHandleProps,
}: DashboardWidgetProps) {
  const iconStyle = toneStyles[tone] || toneStyles.sky;
  const isCompact = rowSpan === 1;

  const heightClass =
    rowSpan === 4
      ? "h-full min-h-[628px]"
      : rowSpan === 3
      ? "h-full min-h-[467px]"
      : rowSpan === 2
      ? "h-full min-h-[306px]"
      : "h-full min-h-[145px]";

  return (
    <div
      data-widget-id={id}
      className={clsx(
        "card group relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs transition-all duration-200 hover:shadow-md hover:border-slate-300",
        heightClass,
        isEditing && "ring-2 ring-sky-400 ring-offset-2",
        className
      )}
    >
      {/* Edit Mode Overlay Header */}
      {isEditing && (
        <div className="flex items-center justify-between border-b border-sky-100 bg-sky-50/70 px-3 py-1.5 text-xs text-sky-800">
          <div
            {...dragHandleProps}
            className="flex items-center gap-1.5 cursor-grab active:cursor-grabbing font-medium select-none"
          >
            <GripVertical className="h-4 w-4 text-sky-600" />
            <span>Drag to Reorder</span>
          </div>

          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="rounded-md p-1 text-slate-400 hover:bg-rose-100 hover:text-rose-600 transition-colors"
              title="Remove widget"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Widget Header */}
      {!hideHeader && (title || Icon || action) && (
        <div
          className={clsx(
            "flex items-center justify-between gap-2.5 border-b border-slate-100 shrink-0",
            isCompact ? "px-3.5 py-2" : "px-4 py-3 sm:px-5",
            headerClassName
          )}
        >
          <div className="flex items-center gap-2 min-w-0">
            {Icon && (
              <div
                className={clsx(
                  "flex shrink-0 items-center justify-center border shadow-2xs",
                  isCompact ? "h-6 w-6 rounded-lg" : "h-8 w-8 rounded-xl",
                  iconStyle
                )}
              >
                <Icon className={isCompact ? "h-3.5 w-3.5" : "h-4 w-4"} />
              </div>
            )}
            {title && (
              <h2
                className={clsx(
                  "font-semibold tracking-tight text-slate-900 truncate",
                  isCompact ? "text-xs" : "text-sm"
                )}
              >
                {title}
              </h2>
            )}
            {badge}
          </div>

          {action && <div className="flex items-center gap-1.5 shrink-0">{action}</div>}
        </div>
      )}

      {/* Content Area */}
      <div
        className={clsx(
          "flex-1 flex flex-col overflow-y-auto min-h-0",
          isCompact ? "p-3" : "p-4 sm:p-5",
          isEmpty && "items-center justify-center",
          bodyClassName
        )}
      >
        {loading ? (
          <div className="space-y-3 py-2 animate-pulse w-full">
            <div className="h-4 bg-slate-200/80 rounded-md w-3/4"></div>
            <div className="h-10 bg-slate-100 rounded-xl w-full"></div>
            <div className="h-4 bg-slate-100 rounded-md w-1/2"></div>
          </div>
        ) : isEmpty ? (
          <div className="w-full my-auto">
            {emptyState || (
              <div className="py-8 text-center text-xs text-slate-400">
                No data available
              </div>
            )}
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
