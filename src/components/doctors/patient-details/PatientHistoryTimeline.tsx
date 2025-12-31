"use client";

import React, { useState } from "react";
import { Filter, RefreshCw } from "lucide-react";
import { TimelineItem } from "../shared/TimelineItem";
import { PatientHistoryTimeline as PatientHistoryType } from "@/types";

interface PatientHistoryTimelineProps {
  history: PatientHistoryType | null;
  loading?: boolean;
  onRefresh: () => void;
}

type FilterType = "all" | "visits" | "labs" | "prescriptions" | "admissions" | "vitals";

export const PatientHistoryTimeline: React.FC<PatientHistoryTimelineProps> = ({
  history,
  loading = false,
  onRefresh,
}) => {
  const [filter, setFilter] = useState<FilterType>("all");

  const filterOptions: { value: FilterType; label: string }[] = [
    { value: "all", label: "All Events" },
    { value: "visits", label: "OPD Visits" },
    { value: "labs", label: "Lab Tests" },
    { value: "prescriptions", label: "Prescriptions" },
    { value: "admissions", label: "Admissions" },
    { value: "vitals", label: "Vital Signs" },
  ];

  // Filter events based on selected filter
  const filteredEvents = history?.events.filter((event) => {
    if (filter === "all") return true;

    const typeMap: Record<string, FilterType> = {
      opd_visit: "visits",
      lab_booking: "labs",
      prescription: "prescriptions",
      admission: "admissions",
      vital_signs: "vitals",
    };

    return typeMap[event.event_type] === filter;
  }) || [];

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-10 w-32 animate-pulse rounded-lg bg-slate-200" />
          <div className="h-10 w-24 animate-pulse rounded-lg bg-slate-200" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      </div>
    );
  }

  if (!history || history.events.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
          <Filter className="h-8 w-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900">No History Found</h3>
        <p className="mt-2 text-sm text-slate-600">
          This patient has no recorded medical history yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with filters */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-slate-400" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as FilterType)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 focus:border-sky-400 focus:outline-none"
          >
            {filterOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
            {filteredEvents.length} {filteredEvents.length === 1 ? "event" : "events"}
          </span>
        </div>

        <button
          onClick={onRefresh}
          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Timeline */}
      {filteredEvents.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-sm text-slate-600">
            No events found for the selected filter.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          {filteredEvents.map((event) => (
            <TimelineItem
              key={event.event_id}
              eventType={event.event_type}
              title={event.title}
              date={event.event_date}
              summary={event.summary}
              details={
                event.data && (
                  <div className="space-y-2 text-sm">
                    {Object.entries(event.data).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="font-medium text-slate-700">
                          {key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}:
                        </span>
                        <span className="text-slate-600">
                          {typeof value === "object" ? JSON.stringify(value) : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                )
              }
            />
          ))}
        </div>
      )}

      {/* Pagination info */}
      {history.total_pages > 1 && (
        <div className="text-center text-sm text-slate-600">
          Showing page {history.page} of {history.total_pages} ({history.total} total events)
        </div>
      )}
    </div>
  );
};
