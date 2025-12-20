"use client";

import { useMemo } from "react";
import { Admission } from "@/services/admissionsApi";
import { formatDate } from "@/utils/format";
import { BedDouble, User, Calendar, Stethoscope, Eye, ArrowRightLeft, Clock } from "lucide-react";

interface RecentAdmissionsListProps {
  admissions: Admission[];
  onAdmissionClick?: (admissionId: string) => void;
  onViewAll?: () => void;
}

export function RecentAdmissionsList({ admissions, onAdmissionClick, onViewAll }: RecentAdmissionsListProps) {
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
    switch (type) {
      case "emergency":
        return "bg-rose-50 text-rose-700";
      case "planned":
        return "bg-sky-50 text-sky-700";
      default:
        return "bg-slate-50 text-slate-700";
    }
  };

  const calculateLengthOfStay = (admissionDate: string) => {
    if (!admissionDate) return "N/A";
    const admission = new Date(admissionDate);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - admission.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "1 day";
    return `${diffDays} days`;
  };

  const recentAdmissions = useMemo(() => {
    return [...admissions]
      .sort((a, b) => (b.admission_date || "").localeCompare(a.admission_date || ""))
      .slice(0, 5);
  }, [admissions]);

  if (recentAdmissions.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
        <BedDouble className="mx-auto h-12 w-12 text-slate-400" />
        <p className="mt-4 text-sm text-slate-500">No recent admissions</p>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="mt-4 text-sm font-semibold text-sky-600 hover:text-sky-700"
          >
            View all admissions →
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {recentAdmissions.map((adm) => (
        <div
          key={adm.id}
          onClick={() => onAdmissionClick?.(adm.id)}
          className="group relative cursor-pointer rounded-lg border border-slate-200 bg-white p-3 transition-all hover:border-sky-300 hover:shadow-md"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
                  <BedDouble className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-slate-900 truncate">
                      {adm.patient_name || "Patient"}
                    </p>
                    <span className={`pill px-2 py-0.5 text-xs font-medium capitalize border ${getStatusColor(adm.status)}`}>
                      {adm.status}
                    </span>
                    {adm.admission_type && (
                      <span className={`pill px-1.5 py-0.5 text-[10px] font-medium capitalize ${getAdmissionTypeColor(adm.admission_type)}`}>
                        {adm.admission_type}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 mb-1.5">
                    <span className="flex items-center gap-1">
                      <span className="font-mono text-slate-500">#{adm.admission_number}</span>
                    </span>
                    {adm.ward_name && adm.bed_number && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <BedDouble className="h-3 w-3" />
                          <span>{adm.ward_name} • Bed {adm.bed_number}</span>
                        </span>
                      </>
                    )}
                    {adm.doctor_name && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Stethoscope className="h-3 w-3" />
                          <span className="truncate">{adm.doctor_name}</span>
                        </span>
                      </>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    {adm.admission_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(adm.admission_date)}</span>
                      </span>
                    )}
                    {adm.admission_date && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{calculateLengthOfStay(adm.admission_date)}</span>
                        </span>
                      </>
                    )}
                    {adm.diagnosis && (
                      <>
                        <span>•</span>
                        <span className="truncate max-w-[200px]" title={adm.diagnosis}>
                          {adm.diagnosis}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAdmissionClick?.(adm.id);
                }}
                className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
                title="View Details"
              >
                <Eye className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ))}

      {onViewAll && (
        <button
          onClick={onViewAll}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
        >
          View all admissions →
        </button>
      )}
    </div>
  );
}

