"use client";

import { ReactNode } from "react";
import { ChevronDown, ChevronUp, Check, AlertCircle } from "lucide-react";
import clsx from "clsx";

export type SectionStatus = "empty" | "partial" | "complete";

interface SingleViewSectionProps {
  id: string;
  title: string;
  icon: ReactNode;
  status: SectionStatus;
  statusText?: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: ReactNode;
  colorScheme?: "sky" | "emerald" | "amber" | "purple" | "rose" | "blue" | "green" | "violet";
}

const colorSchemes = {
  sky: {
    header: "from-sky-50 to-sky-100/50",
    border: "border-sky-200",
    icon: "text-sky-600",
    title: "text-sky-900",
  },
  blue: {
    header: "from-blue-50 to-blue-100/50",
    border: "border-blue-200",
    icon: "text-blue-600",
    title: "text-blue-900",
  },
  emerald: {
    header: "from-emerald-50 to-emerald-100/50",
    border: "border-emerald-200",
    icon: "text-emerald-600",
    title: "text-emerald-900",
  },
  green: {
    header: "from-green-50 to-green-100/50",
    border: "border-green-200",
    icon: "text-green-600",
    title: "text-green-900",
  },
  amber: {
    header: "from-amber-50 to-amber-100/50",
    border: "border-amber-200",
    icon: "text-amber-600",
    title: "text-amber-900",
  },
  purple: {
    header: "from-purple-50 to-purple-100/50",
    border: "border-purple-200",
    icon: "text-purple-600",
    title: "text-purple-900",
  },
  rose: {
    header: "from-rose-50 to-rose-100/50",
    border: "border-rose-200",
    icon: "text-rose-600",
    title: "text-rose-900",
  },
  violet: {
    header: "from-violet-50 to-violet-100/50",
    border: "border-violet-200",
    icon: "text-violet-600",
    title: "text-violet-900",
  },
};

const statusConfig = {
  empty: {
    dot: "bg-slate-300",
    badge: "bg-slate-100 text-slate-600",
    text: "Empty",
  },
  partial: {
    dot: "bg-amber-400",
    badge: "bg-amber-100 text-amber-700",
    text: "Partial",
  },
  complete: {
    dot: "bg-emerald-500",
    badge: "bg-emerald-100 text-emerald-700",
    text: "Complete",
  },
};

export function SingleViewSection({
  id,
  title,
  icon,
  status,
  statusText,
  isExpanded,
  onToggle,
  children,
  colorScheme = "sky",
}: SingleViewSectionProps) {
  const colors = colorSchemes[colorScheme];
  const statusStyle = statusConfig[status];

  return (
    <div
      id={id}
      className={clsx(
        "rounded-xl border bg-white shadow-sm overflow-hidden transition-all duration-300",
        colors.border,
        isExpanded ? "shadow-md" : "hover:shadow-md"
      )}
    >
      {/* Collapsible Header */}
      <button
        type="button"
        onClick={onToggle}
        className={clsx(
          "w-full flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4",
          "bg-gradient-to-r transition-colors",
          colors.header,
          "hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-sky-500/20"
        )}
      >
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div className={clsx("flex-shrink-0", colors.icon)}>
            {icon}
          </div>

          {/* Title */}
          <h3 className={clsx("text-sm sm:text-base font-semibold", colors.title)}>
            {title}
          </h3>
        </div>

        <div className="flex items-center gap-3">
          {/* Status Badge */}
          <div
            className={clsx(
              "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
              statusStyle.badge
            )}
          >
            {status === "complete" ? (
              <Check className="h-3 w-3" />
            ) : status === "partial" ? (
              <AlertCircle className="h-3 w-3" />
            ) : (
              <div className={clsx("h-2 w-2 rounded-full", statusStyle.dot)} />
            )}
            <span>{statusText || statusStyle.text}</span>
          </div>

          {/* Expand/Collapse Icon */}
          <div className="text-slate-400">
            {isExpanded ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </div>
        </div>
      </button>

      {/* Content */}
      <div
        className={clsx(
          "transition-all duration-300 ease-in-out overflow-hidden",
          isExpanded ? "max-h-[5000px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="p-4 sm:p-6 border-t border-slate-100">
          {children}
        </div>
      </div>
    </div>
  );
}

// Helper functions to calculate section status
export function getComplaintsStatus(complaints: any[]): SectionStatus {
  if (!complaints || complaints.length === 0) return "empty";
  return "complete";
}

export function getVisionStatus(visionRecords: any[], visitId: string): SectionStatus {
  const currentVisitRecord = visionRecords.find((r) => r.visit_id === visitId);
  if (!currentVisitRecord) return "empty";
  // Check if key fields are filled
  const hasDistance = currentVisitRecord.od_ucva_distance || currentVisitRecord.os_ucva_distance;
  const hasBCVA = currentVisitRecord.od_bcva_distance || currentVisitRecord.os_bcva_distance;
  if (hasDistance && hasBCVA) return "complete";
  if (hasDistance || hasBCVA) return "partial";
  return "empty";
}

export function getMedicalHistoryStatus(medicalConditions: any[]): SectionStatus {
  if (!medicalConditions || medicalConditions.length === 0) return "empty";
  return "complete";
}

export function getOphthalmicHistoryStatus(surgeries: any[]): SectionStatus {
  if (!surgeries || surgeries.length === 0) return "empty";
  return "complete";
}

export function getDrugAllergyStatus(allergies: any[]): SectionStatus {
  if (!allergies || allergies.length === 0) return "empty";
  return "complete";
}

export function getARDataStatus(arDataRecords: any[], visitId: string): SectionStatus {
  const hasVisitData = arDataRecords.some(
    (r) => r.visit_id === visitId && (r.od_sphere != null || r.os_sphere != null)
  );
  if (!hasVisitData) return "empty";
  return "complete";
}

export function getRefractionStatus(refractionRecords: any[], visitId: string): SectionStatus {
  const hasVisitData = refractionRecords.some((r) => {
    if (r.visit_id !== visitId) return false;
    // Check for combined record or per-eye records
    const hasOD = r.od?.sphere != null || r.od_sphere != null;
    const hasOS = r.os?.sphere != null || r.os_sphere != null;
    return hasOD || hasOS;
  });
  if (!hasVisitData) return "empty";
  return "complete";
}

export function getIOPStatus(iopRecords: any[], visitId: string): SectionStatus {
  const hasVisitData = iopRecords.some(
    (r) => r.visit_id === visitId && (r.od_pressure != null || r.os_pressure != null)
  );
  if (!hasVisitData) return "empty";
  return "complete";
}

export function getCurrentSpecsStatus(currentSpecsRecords: any[], visitId: string): SectionStatus {
  const hasVisitData = currentSpecsRecords.some((r) => {
    if (r.visit_id !== visitId) return false;
    const hasOD = r.od_sph != null || r.od_cyl != null;
    const hasOS = r.os_sph != null || r.os_cyl != null;
    return hasOD || hasOS;
  });
  if (!hasVisitData) return "empty";
  return "complete";
}
