"use client";

import React from "react";
import { Check, AlertTriangle, XCircle, Clock } from "lucide-react";
import { DayCareStatus, DayCareTimelineEntry } from "@/types/dayCare";
import clsx from "clsx";

interface DayCareTimelineProps {
  timeline: DayCareTimelineEntry[];
  currentStatus: DayCareStatus;
  cancellationReason?: string | null;
}

export function DayCareTimeline({ timeline, currentStatus, cancellationReason }: DayCareTimelineProps) {
  const isTerminal = ["cancelled", "postponed", "no_show"].includes(currentStatus);

  const getStepColor = (step: DayCareTimelineEntry, index: number) => {
    if (isTerminal) {
      if (step.completed) return "bg-emerald-500 text-white border-emerald-500";
      // Highlight the failure at the end or at the current node
      if (currentStatus === "cancelled") return "bg-rose-500 text-white border-rose-500";
      if (currentStatus === "postponed") return "bg-amber-500 text-white border-amber-500";
      if (currentStatus === "no_show") return "bg-slate-500 text-white border-slate-500";
      return "bg-slate-100 text-slate-400 border-slate-200";
    }

    if (step.completed) {
      return "bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-emerald-500 shadow-sm shadow-emerald-100";
    }
    // Check if it matches the current status (active step)
    const isActive = currentStatus === step.status;
    if (isActive) {
      return "bg-sky-500 text-white border-sky-500 ring-4 ring-sky-100 animate-pulse";
    }

    return "bg-white text-slate-400 border-slate-200 hover:border-slate-300";
  };

  const getLineColor = (index: number) => {
    if (index >= timeline.length - 1) return "";
    const currentStep = timeline[index];
    const nextStep = timeline[index + 1];

    if (isTerminal) {
      if (currentStep.completed && nextStep.completed) return "bg-emerald-500";
      return "bg-slate-200";
    }

    if (currentStep.completed) {
      return "bg-gradient-to-r from-emerald-500 to-teal-500";
    }
    return "bg-slate-200";
  };

  const formatStepTime = (timestamp: string | null) => {
    if (!timestamp) return null;
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return null;
    }
  };

  // Render terminal indicator if cancelled, postponed, or no show
  const renderTerminalBanner = () => {
    if (!isTerminal) return null;

    const bannerConfig = {
      cancelled: {
        bg: "bg-rose-50 border-rose-200",
        text: "text-rose-800",
        icon: <XCircle className="h-5 w-5 text-rose-600" />,
        label: "Surgery Cancelled",
      },
      postponed: {
        bg: "bg-amber-50 border-amber-200",
        text: "text-amber-800",
        icon: <AlertTriangle className="h-5 w-5 text-amber-600" />,
        label: "Surgery Postponed",
      },
      no_show: {
        bg: "bg-slate-50 border-slate-200",
        text: "text-slate-800",
        icon: <Clock className="h-5 w-5 text-slate-600" />,
        label: "Patient No Show",
      },
    };

    const config = bannerConfig[currentStatus as "cancelled" | "postponed" | "no_show"];

    return (
      <div className={clsx("flex items-start gap-2.5 rounded-xl border p-3 mt-3 text-sm font-medium", config.bg, config.text)}>
        {config.icon}
        <div>
          <p className="font-semibold">{config.label}</p>
          {cancellationReason && (
            <p className="mt-0.5 text-xs opacity-90">Reason: {cancellationReason}</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full">
      {/* Steps Track */}
      <div className="relative flex items-center justify-between">
        {/* Connecting Lines */}
        <div className="absolute left-0 right-0 top-1/2 -z-10 h-0.5 -translate-y-1/2 bg-slate-200">
          <div className="flex h-full w-full justify-between">
            {timeline.slice(0, -1).map((_, idx) => (
              <div
                key={idx}
                className={clsx("h-full flex-1 transition-all duration-500", getLineColor(idx))}
              />
            ))}
          </div>
        </div>

        {/* Step Nodes */}
        {timeline.map((step, idx) => {
          const isActive = currentStatus === step.status;
          const formattedTime = formatStepTime(step.timestamp);

          return (
            <div key={step.step} className="flex flex-col items-center">
              {/* Outer circle for hover and layout */}
              <div className="group relative flex flex-col items-center">
                {/* Node circle */}
                <div
                  className={clsx(
                    "flex h-9 w-9 items-center justify-center rounded-full border-2 font-bold text-sm transition-all duration-300",
                    getStepColor(step, idx)
                  )}
                >
                  {step.completed ? (
                    <Check className="h-4.5 w-4.5 stroke-[3]" />
                  ) : isActive && isTerminal ? (
                    <AlertTriangle className="h-4.5 w-4.5" />
                  ) : (
                    <span>{step.step}</span>
                  )}
                </div>

                {/* Tooltip content / floating label */}
                <div className="absolute top-11 flex flex-col items-center text-center whitespace-nowrap z-10">
                  <span
                    className={clsx(
                      "text-xs font-semibold tracking-wide transition-colors",
                      isActive ? "text-sky-600 font-bold" : step.completed ? "text-slate-800" : "text-slate-400"
                    )}
                  >
                    {step.label}
                  </span>
                  {formattedTime && (
                    <span className="text-[10px] font-medium text-slate-500 mt-0.5 bg-slate-100 px-1.5 py-0.5 rounded-md border border-slate-200">
                      {formattedTime}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Terminal Reason Banner */}
      {renderTerminalBanner()}
    </div>
  );
}
