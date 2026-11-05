"use client";

import React from "react";
import { LucideIcon } from "lucide-react";
import clsx from "clsx";

interface EmptyStateCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  tone?: "sky" | "emerald" | "amber" | "purple" | "rose" | "slate";
  size?: "sm" | "md" | "lg";
  className?: string;
}

const toneStyles = {
  sky: {
    bg: "bg-sky-50",
    text: "text-sky-600",
    border: "border-sky-100",
    button: "bg-sky-500 hover:bg-sky-600 text-white shadow-sky-100",
  },
  emerald: {
    bg: "bg-emerald-50",
    text: "text-emerald-600",
    border: "border-emerald-100",
    button: "bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-100",
  },
  amber: {
    bg: "bg-amber-50",
    text: "text-amber-600",
    border: "border-amber-100",
    button: "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-100",
  },
  purple: {
    bg: "bg-purple-50",
    text: "text-purple-600",
    border: "border-purple-100",
    button: "bg-purple-500 hover:bg-purple-600 text-white shadow-purple-100",
  },
  rose: {
    bg: "bg-rose-50",
    text: "text-rose-600",
    border: "border-rose-100",
    button: "bg-rose-500 hover:bg-rose-600 text-white shadow-rose-100",
  },
  slate: {
    bg: "bg-slate-50",
    text: "text-slate-500",
    border: "border-slate-100",
    button: "bg-slate-800 hover:bg-slate-900 text-white shadow-slate-100",
  },
};

export function EmptyStateCard({
  icon: Icon,
  title,
  description,
  action,
  tone = "sky",
  size = "md",
  className,
}: EmptyStateCardProps) {
  const styles = toneStyles[tone] || toneStyles.sky;

  const sizeClasses = {
    sm: "py-6 px-4",
    md: "py-8 px-6",
    lg: "py-12 px-8",
  }[size];

  const iconSizes = {
    sm: { box: "h-11 w-11", icon: "h-5 w-5" },
    md: { box: "h-14 w-14", icon: "h-7 w-7" },
    lg: { box: "h-18 w-18", icon: "h-9 w-9" },
  }[size];

  const ActionIcon = action?.icon;

  return (
    <div
      className={clsx(
        "flex flex-col items-center justify-center text-center rounded-2xl border border-dashed border-slate-200/90 bg-slate-50/40 transition-colors",
        sizeClasses,
        className
      )}
    >
      <div
        className={clsx(
          "flex items-center justify-center rounded-2xl shadow-xs transition-transform duration-300 hover:scale-105",
          iconSizes.box,
          styles.bg,
          styles.text,
          styles.border,
          "border"
        )}
      >
        <Icon className={iconSizes.icon} />
      </div>

      <h3 className="mt-3.5 text-sm sm:text-base font-semibold text-slate-800">
        {title}
      </h3>

      <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-sm leading-relaxed">
        {description}
      </p>

      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className={clsx(
            "mt-4 inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold transition-all duration-200 shadow-md hover:shadow-lg active:scale-95 cursor-pointer",
            styles.button
          )}
        >
          {ActionIcon && <ActionIcon className="h-4 w-4" />}
          <span>{action.label}</span>
        </button>
      )}
    </div>
  );
}
