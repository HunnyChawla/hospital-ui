"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { clinicVisitsApi, ClinicVisitResponse } from "@/services/clinicVisitsApi";
import { formatDateTime } from "@/utils/format";
import { useAppSelector } from "@/redux/hooks";
import {
  BedDouble,
  Search,
  User,
  Stethoscope,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  FileText,
  ChevronLeft,
  ChevronRight,
  Phone,
  Sparkles,
} from "lucide-react";
import { SkeletonRow } from "@/components/shared/SkeletonRow";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";

interface OpdAdmissionAdviceTableProps {
  onAdmitPatient: (visit: ClinicVisitResponse) => void;
  onRefreshStats?: () => void;
}

export function OpdAdmissionAdviceTable({
  onAdmitPatient,
  onRefreshStats,
}: OpdAdmissionAdviceTableProps) {
  const doctors = useAppSelector((s) => s.doctors.list);

  const [loading, setLoading] = useState(true);
  const [visits, setVisits] = useState<ClinicVisitResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Filters
  const [statusFilter, setStatusFilter] = useState<"pending" | "admitted" | "all">("pending");
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchAdvisedVisits = useCallback(async () => {
    try {
      setLoading(true);
      const is_admitted =
        statusFilter === "pending" ? false : statusFilter === "admitted" ? true : undefined;

      const response = await clinicVisitsApi.getAdmissionAdvisedVisits({
        is_admitted,
        doctor_id: selectedDoctorId || undefined,
        page,
        page_size: pageSize,
      });

      setVisits(response.items || []);
      setTotal(response.total || 0);
      onRefreshStats?.();
    } catch (err) {
      toast.error(getErrorMessage(err) || "Failed to load admission-advised visits");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, selectedDoctorId, page, pageSize, onRefreshStats]);

  useEffect(() => {
    fetchAdvisedVisits();
  }, [fetchAdvisedVisits]);

  // Listen for newly created admissions to auto-refresh the list
  useEffect(() => {
    const handleAdmissionCreated = () => {
      fetchAdvisedVisits();
    };
    window.addEventListener("admission:created", handleAdmissionCreated);
    return () => {
      window.removeEventListener("admission:created", handleAdmissionCreated);
    };
  }, [fetchAdvisedVisits]);

  // Client-side search filtering (by name, mobile, UHID, visit number, advice notes)
  const filteredVisits = useMemo(() => {
    if (!searchQuery.trim()) return visits;
    const query = searchQuery.toLowerCase().trim();
    return visits.filter((v) => {
      const name = (v.patient_name || "").toLowerCase();
      const uhid = (v.patient_uhid || "").toLowerCase();
      const mobile = (v.patient_mobile || "").toLowerCase();
      const visitNum = (v.visit_number || "").toLowerCase();
      const doctor = (v.doctor_name || "").toLowerCase();
      const notes = (v.admission_advice_notes || "").toLowerCase();
      return (
        name.includes(query) ||
        uhid.includes(query) ||
        mobile.includes(query) ||
        visitNum.includes(query) ||
        doctor.includes(query) ||
        notes.includes(query)
      );
    });
  }, [visits, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Status Pill Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setStatusFilter("pending");
              setPage(1);
            }}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
              statusFilter === "pending"
                ? "bg-amber-500 text-white shadow-xs"
                : "bg-amber-50 text-amber-800 hover:bg-amber-100"
            }`}
          >
            <AlertCircle className="h-3.5 w-3.5" />
            Pending Admission
          </button>

          <button
            type="button"
            onClick={() => {
              setStatusFilter("admitted");
              setPage(1);
            }}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
              statusFilter === "admitted"
                ? "bg-teal-600 text-white shadow-xs"
                : "bg-teal-50 text-teal-800 hover:bg-teal-100"
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Admitted
          </button>

          <button
            type="button"
            onClick={() => {
              setStatusFilter("all");
              setPage(1);
            }}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
              statusFilter === "all"
                ? "bg-slate-700 text-white shadow-xs"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            All Advised
          </button>
        </div>

        {/* Search, Doctor Filter, and Refresh */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search patient, UHID, doctor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:outline-hidden focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <select
            value={selectedDoctorId}
            onChange={(e) => {
              setSelectedDoctorId(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-sky-500 focus:outline-hidden"
          >
            <option value="">All Doctors</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.user_name || d.name || "Doctor"}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={fetchAdvisedVisits}
            disabled={loading}
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white p-1.5 text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50"
            title="Refresh"
          >
            <RotateCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="flex items-center gap-2 rounded-xl bg-amber-50/70 border border-amber-200/80 px-3.5 py-2.5 text-xs text-amber-900">
        <Sparkles className="h-4 w-4 shrink-0 text-amber-600" />
        <span>
          Showing OPD patients advised for IPD admission by attending doctors. Click{" "}
          <strong>Admit Patient</strong> to convert the OPD visit into an IPD admission with all details
          pre-filled.
        </span>
      </div>

      {/* Table (Desktop) */}
      <div className="hidden md:block overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
        <table className="w-full text-left text-xs text-slate-600">
          <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3">Patient</th>
              <th className="px-4 py-3">Visit Info</th>
              <th className="px-4 py-3">Advising Doctor</th>
              <th className="px-4 py-3">Clinical Advice / Notes</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="p-4">
                  <SkeletonRow rows={5} />
                </td>
              </tr>
            ) : filteredVisits.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <BedDouble className="h-8 w-8 text-slate-300" />
                    <p className="text-sm font-medium text-slate-600">No advised patients found</p>
                    <p className="text-xs text-slate-400">
                      {statusFilter === "pending"
                        ? "There are no pending admission advices from OPD doctors right now."
                        : "No admission records match the current filters."}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredVisits.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                  {/* Patient Info */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700 font-semibold">
                        {item.patient_name ? item.patient_name.charAt(0).toUpperCase() : <User className="h-4 w-4" />}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">{item.patient_name}</div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          {item.patient_uhid && (
                            <span className="font-mono bg-slate-100 px-1 rounded text-slate-700">
                              {item.patient_uhid}
                            </span>
                          )}
                          {item.patient_mobile && (
                            <span className="flex items-center gap-0.5">
                              <Phone className="h-3 w-3 text-slate-400" />
                              {item.patient_mobile}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Visit Info */}
                  <td className="px-4 py-3">
                    <div className="space-y-0.5">
                      <div className="font-mono text-xs font-medium text-slate-800">
                        {item.visit_number}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-500">
                        <Clock className="h-3 w-3 text-slate-400" />
                        <span>
                          {item.admission_advised_at
                            ? formatDateTime(item.admission_advised_at)
                            : formatDateTime(item.created_at)}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Advising Doctor */}
                  <td className="px-4 py-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 font-medium text-slate-900">
                        <Stethoscope className="h-3.5 w-3.5 text-teal-600" />
                        <span>{item.doctor_name || "Doctor"}</span>
                      </div>
                      {item.doctor_cabin && (
                        <span className="text-[11px] text-slate-500">
                          Cabin: {item.doctor_cabin}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Clinical Advice / Notes */}
                  <td className="px-4 py-3 max-w-xs">
                    {item.admission_advice_notes ? (
                      <div className="rounded-lg bg-amber-50/60 border border-amber-200/60 p-2 text-xs text-amber-950">
                        <div className="line-clamp-2 leading-relaxed">
                          {item.admission_advice_notes}
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic text-xs">No clinical notes provided</span>
                    )}
                  </td>

                  {/* Status Badge */}
                  <td className="px-4 py-3 text-center">
                    {item.is_admitted ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-semibold text-teal-700 border border-teal-200">
                        <CheckCircle2 className="h-3 w-3 text-teal-600" />
                        Admitted
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 border border-amber-200">
                        <AlertCircle className="h-3 w-3 text-amber-600" />
                        Pending Admission
                      </span>
                    )}
                  </td>

                  {/* Action */}
                  <td className="px-4 py-3 text-right">
                    {!item.is_admitted ? (
                      <button
                        type="button"
                        onClick={() => onAdmitPatient(item)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs transition hover:shadow hover:opacity-95"
                      >
                        <BedDouble className="h-3.5 w-3.5" />
                        Admit Patient
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400 font-medium">Completed</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Cards (Mobile) */}
      <div className="block md:hidden space-y-3">
        {loading ? (
          <div className="p-4 text-center text-xs text-slate-400">Loading advised visits...</div>
        ) : filteredVisits.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-400">
            <BedDouble className="h-8 w-8 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-medium text-slate-600">No advised patients found</p>
          </div>
        ) : (
          filteredVisits.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 shadow-2xs"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-semibold text-slate-900 text-sm">{item.patient_name}</h4>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    {item.patient_uhid && (
                      <span className="font-mono bg-slate-100 px-1 rounded text-slate-700">
                        {item.patient_uhid}
                      </span>
                    )}
                    <span>{item.visit_number}</span>
                  </div>
                </div>
                {item.is_admitted ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-700 border border-teal-200">
                    <CheckCircle2 className="h-3 w-3" />
                    Admitted
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200">
                    <AlertCircle className="h-3 w-3" />
                    Pending
                  </span>
                )}
              </div>

              <div className="text-xs text-slate-600 space-y-1">
                <div className="flex items-center gap-1 text-slate-700">
                  <Stethoscope className="h-3.5 w-3.5 text-teal-600" />
                  <span>Advised by {item.doctor_name || "Doctor"}</span>
                </div>
                {item.admission_advice_notes && (
                  <div className="rounded bg-amber-50/70 border border-amber-200/60 p-2 text-amber-900 mt-1">
                    {item.admission_advice_notes}
                  </div>
                )}
              </div>

              {!item.is_admitted && (
                <button
                  type="button"
                  onClick={() => onAdmitPatient(item)}
                  className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 py-2 text-xs font-semibold text-white shadow-2xs"
                >
                  <BedDouble className="h-3.5 w-3.5" />
                  Admit Patient
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-600">
          <div>
            Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} items
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-medium text-slate-700 disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Prev
            </button>
            <span className="font-semibold text-slate-800">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-medium text-slate-700 disabled:opacity-40"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
