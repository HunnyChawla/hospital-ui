"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Admission } from "@/services/admissionsApi";
import { formatDate } from "@/utils/format";
import {
  BedDouble,
  Calendar,
  Stethoscope,
  Eye,
  Clock,
  ArrowUpRight,
  Activity,
  User,
  AlertCircle,
} from "lucide-react";
import { EmptyStateCard } from "@/components/common/EmptyStateCard";
import clsx from "clsx";

interface RecentAdmissionsListProps {
  admissions: Admission[];
  colSpan?: number;
  onAdmissionClick?: (admissionId: string) => void;
  onViewAll?: () => void;
  maxItems?: number;
}

export function RecentAdmissionsList({
  admissions,
  colSpan = 1,
  onAdmissionClick,
  onViewAll,
  maxItems = 3,
}: RecentAdmissionsListProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "admitted":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "discharged":
        return "bg-slate-50 text-slate-700 border-slate-200";
      case "transferred":
        return "bg-blue-50 text-blue-700 border-blue-200";
      default:
        return "bg-sky-50 text-sky-700 border-sky-200";
    }
  };

  const getAdmissionTypeColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case "emergency":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "planned":
        return "bg-sky-50 text-sky-700 border-sky-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  const calculateLengthOfStay = (admissionDate: string) => {
    if (!admissionDate) return "N/A";
    const admission = new Date(admissionDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    admission.setHours(0, 0, 0, 0);
    const diffTime = Math.abs(today.getTime() - admission.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Admitted today";
    if (diffDays === 1) return "1 day stay";
    return `${diffDays} days stay`;
  };

  const formatDoctorName = (name?: string | null): string => {
    if (!name) return "";
    const trimmed = name.trim();
    const withoutDr = trimmed.replace(/^(dr\.?\s*)+/i, "").trim();
    return withoutDr ? `Dr. ${withoutDr}` : "";
  };

  const recentAdmissions = useMemo(() => {
    return [...admissions]
      .sort((a, b) => (b.admission_date || "").localeCompare(a.admission_date || ""))
      .slice(0, maxItems);
  }, [admissions, maxItems]);

  const router = useRouter();

  if (recentAdmissions.length === 0) {
    return (
      <EmptyStateCard
        icon={BedDouble}
        title="No recent admissions"
        description="Patients admitted to IPD wards will appear here with bed number, doctor, and stay duration."
        action={{
          label: "Admit Patient",
          onClick: () => router.push("/admissions?action=add&tab=admissions"),
        }}
        tone="emerald"
        size="sm"
      />
    );
  }

  /* Dedicated 1x Height Compact View (Guaranteed No Scrollbar) */
  if (maxItems === 1) {
    const adm = recentAdmissions[0];
    const isEmergency = adm.admission_type?.toLowerCase() === "emergency";

    return (
      <div
        onClick={() => onAdmissionClick?.(adm.id)}
        className="flex h-full flex-col justify-center cursor-pointer"
      >
        <div
          className={clsx(
            "group rounded-xl border border-slate-200/90 bg-gradient-to-r from-emerald-50/20 via-white to-white p-2.5 transition-all hover:border-emerald-300 hover:shadow-2xs border-l-4",
            isEmergency ? "border-l-rose-500" : "border-l-emerald-500"
          )}
        >
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={clsx(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg shadow-2xs font-bold text-xs",
                  isEmergency
                    ? "bg-rose-100 text-rose-700"
                    : "bg-emerald-100 text-emerald-800"
                )}
              >
                <BedDouble className="h-4 w-4" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-bold text-slate-900 truncate group-hover:text-emerald-700 transition-colors">
                    {adm.patient_name || "Patient"}
                  </p>
                  {adm.admission_type && (
                    <span
                      className={clsx(
                        "rounded px-1.5 py-0.2 text-[9px] font-semibold uppercase tracking-wider border",
                        getAdmissionTypeColor(adm.admission_type)
                      )}
                    >
                      {adm.admission_type}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 truncate mt-0.5">
                  <span className="font-semibold text-slate-700">
                    {adm.ward_name ? `${adm.ward_name} • Bed ${adm.bed_number || "-"}` : `#${adm.admission_number}`}
                  </span>
                  {adm.doctor_name && (
                    <>
                      <span className="text-slate-300">•</span>
                      <span className="truncate">{formatDoctorName(adm.doctor_name)}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="inline-flex items-center gap-1 rounded-md bg-slate-50 border border-slate-200 px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-600">
                <Clock className="h-3 w-3 text-slate-400" />
                <span>{calculateLengthOfStay(adm.admission_date)}</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* Multi-row 2x, 3x, 4x Mode with Clinical Ward Badges */
  return (
    <div className="flex h-full flex-col justify-between space-y-2">
      <div className="space-y-2 overflow-y-auto flex-1 min-h-0">
        {recentAdmissions.map((adm) => {
          const isEmergency = adm.admission_type?.toLowerCase() === "emergency";
          const patientInitials = (adm.patient_name || "P")
            .split(" ")
            .map((n) => n[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();
          const isNarrow = (colSpan || 1) === 1;

          return (
            <div
              key={adm.id}
              onClick={() => onAdmissionClick?.(adm.id)}
              className={clsx(
                "group relative cursor-pointer rounded-xl border border-slate-200/90 bg-white p-3 transition-all duration-200 hover:border-emerald-300 hover:shadow-xs border-l-4",
                isEmergency ? "border-l-rose-500" : "border-l-emerald-500"
              )}
            >
              <div
                className={clsx(
                  "flex justify-between gap-2.5",
                  isNarrow ? "flex-col" : "flex-col sm:flex-row sm:items-center"
                )}
              >
                {/* Left: Patient and Location */}
                <div className="flex items-start gap-3 min-w-0">
                  {/* Avatar Initials Badge */}
                  <div
                    className={clsx(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-xs font-bold shadow-2xs transition-transform group-hover:scale-105",
                      isEmergency
                        ? "bg-rose-50 text-rose-700 border-rose-100"
                        : "bg-emerald-50 text-emerald-800 border-emerald-100"
                    )}
                  >
                    <span>{patientInitials}</span>
                  </div>

                  <div className="min-w-0 flex-1">
                    {/* Line 1: Patient Name, Type badge, Admission # */}
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-slate-900 text-sm group-hover:text-emerald-700 transition-colors truncate">
                        {adm.patient_name || "Patient"}
                      </p>

                      {adm.admission_type && (
                        <span
                          className={clsx(
                            "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider border",
                            getAdmissionTypeColor(adm.admission_type)
                          )}
                        >
                          {isEmergency && (
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                          )}
                          <span>{adm.admission_type}</span>
                        </span>
                      )}

                      <span className="font-mono text-slate-400 text-xs">
                        #{adm.admission_number}
                      </span>
                    </div>

                    {/* Line 2: Ward & Bed Location Badge + Doctor */}
                    <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-slate-600">
                      {/* Clinical Bed Pill */}
                      <div className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100/80 border border-slate-200/80 px-2 py-0.5 font-semibold text-slate-800 text-[11px]">
                        <BedDouble className="h-3.5 w-3.5 text-emerald-600" />
                        <span>{adm.ward_name || "General Ward"}</span>
                        {adm.bed_number && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span className="text-emerald-700 font-mono font-bold">
                              Bed {adm.bed_number}
                            </span>
                          </>
                        )}
                      </div>

                      {adm.doctor_name && (
                        <div className="inline-flex items-center gap-1 text-slate-600 font-medium text-xs">
                          <Stethoscope className="h-3.5 w-3.5 text-sky-600" />
                          <span className="truncate max-w-[150px]">{formatDoctorName(adm.doctor_name)}</span>
                        </div>
                      )}
                    </div>

                    {/* Line 3: Diagnosis (if present) */}
                    {adm.diagnosis && (
                      <p className="text-[11px] text-slate-500 mt-1 truncate max-w-sm italic">
                        <span className="font-semibold not-italic text-slate-600">Dx: </span>
                        {adm.diagnosis}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Stay Duration & Details Button */}
                <div
                  className={clsx(
                    "flex items-center justify-between gap-2.5 shrink-0",
                    isNarrow ? "pt-2 border-t border-slate-100" : "sm:justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100"
                  )}
                >
                  <div className={clsx(isNarrow ? "text-left" : "text-left sm:text-right")}>
                    <div className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                      <Clock className="h-3 w-3 text-emerald-600" />
                      <span>{calculateLengthOfStay(adm.admission_date)}</span>
                    </div>
                    {adm.admission_date && (
                      <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                        Since {formatDate(adm.admission_date)}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAdmissionClick?.(adm.id);
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 hover:border-emerald-200 shadow-2xs transition-all cursor-pointer"
                      title="View Admission Details"
                    >
                      <ArrowUpRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {onViewAll && (
        <button
          onClick={onViewAll}
          className="w-full mt-auto rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 shrink-0 cursor-pointer"
        >
          View all admissions →
        </button>
      )}
    </div>
  );
}

