"use client";

import React, { useState } from "react";
import {
  FileText,
  Pill,
  FlaskConical,
  BedDouble,
  Activity,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface TimelineItemProps {
  eventType: "visit" | "vital_sign" | "lab_test" | "admission" | "prescription";
  title: string;
  timestamp: string;
  description: string | null;
  details?: React.ReactNode;
  onViewDetails?: () => void;
}

const eventConfig = {
  visit: {
    icon: FileText,
    color: "bg-sky-100 text-sky-700",
    dotColor: "bg-sky-500",
    borderColor: "border-sky-200",
  },
  prescription: {
    icon: Pill,
    color: "bg-purple-100 text-purple-700",
    dotColor: "bg-purple-500",
    borderColor: "border-purple-200",
  },
  lab_test: {
    icon: FlaskConical,
    color: "bg-emerald-100 text-emerald-700",
    dotColor: "bg-emerald-500",
    borderColor: "border-emerald-200",
  },
  admission: {
    icon: BedDouble,
    color: "bg-rose-100 text-rose-700",
    dotColor: "bg-rose-500",
    borderColor: "border-rose-200",
  },
  vital_sign: {
    icon: Activity,
    color: "bg-amber-100 text-amber-700",
    dotColor: "bg-amber-500",
    borderColor: "border-amber-200",
  },
};

export const TimelineItem: React.FC<TimelineItemProps> = ({
  eventType,
  title,
  timestamp,
  description,
  details,
  onViewDetails,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Add fallback for unknown event types
  const config = eventConfig[eventType] || {
    icon: FileText, // Default icon
    color: "bg-slate-100 text-slate-700",
    dotColor: "bg-slate-500",
    borderColor: "border-slate-200",
  };
  
  const Icon = config.icon;

  const formattedDate = new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="relative flex gap-4 pb-6 last:pb-0">
      {/* Timeline line */}
      <div className="absolute left-4 top-10 h-full w-0.5 bg-slate-200 last:hidden" />

      {/* Icon dot */}
      <div className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${config.dotColor}`}>
        <Icon className="h-4 w-4 text-white" />
      </div>

      {/* Content */}
      <div className="flex-1">
        <div
          className={`overflow-hidden rounded-xl border ${config.borderColor} bg-white shadow-sm transition hover:shadow-md`}
        >
          <div className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${config.color}`}>
                    {eventType.replace("_", " ").toUpperCase()}
                  </span>
                  <span className="text-xs text-slate-500">{formattedDate}</span>
                </div>
                <h4 className="mt-2 font-semibold text-slate-900">{title}</h4>
                {description && <p className="mt-1 text-sm text-slate-600">{description}</p>}
              </div>

              {(details || onViewDetails) && (
                <button
                  onClick={() => {
                    if (details) {
                      setIsExpanded(!isExpanded);
                    } else if (onViewDetails) {
                      onViewDetails();
                    }
                  }}
                  className="ml-4 rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                >
                  {details ? (
                    isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                </button>
              )}
            </div>

            {/* Expanded details */}
            {isExpanded && details && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                {details}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
