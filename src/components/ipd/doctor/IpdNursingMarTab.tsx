"use client";

import React, { useState } from "react";
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Pill,
  Calendar,
  XCircle,
  FileEdit,
  UserCheck,
  X,
  Filter,
} from "lucide-react";
import {
  IpdMedicationOrder,
  MedicationAdministration,
} from "@/types/ipdDoctor";
import { ipdDoctorApi } from "@/services/ipdDoctorApi";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";

interface IpdNursingMarTabProps {
  admissionId: string;
  activeMedications: IpdMedicationOrder[];
  marTimeline: MedicationAdministration[];
  onRefresh: () => void;
}

export function IpdNursingMarTab({
  admissionId,
  activeMedications,
  marTimeline,
  onRefresh,
}: IpdNursingMarTabProps) {
  const [administerMed, setAdministerMed] = useState<IpdMedicationOrder | null>(null);
  const [doseGiven, setDoseGiven] = useState("");
  const [status, setStatus] = useState("given");
  const [adminTime, setAdminTime] = useState(
    new Date().toISOString().slice(0, 16)
  );
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [filterDate, setFilterDate] = useState("");

  const handleOpenAdministerModal = (med: IpdMedicationOrder) => {
    setAdministerMed(med);
    setDoseGiven(`${med.dose} ${med.route}`);
    setStatus("given");
    setAdminTime(new Date().toISOString().slice(0, 16));
    setNotes("");
  };

  const handleAdministerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!administerMed) return;
    if (!doseGiven.trim()) {
      toast.error("Please specify the dose given");
      return;
    }

    setSubmitting(true);
    try {
      await ipdDoctorApi.recordMarAdministration(admissionId, {
        medication_order_id: administerMed.id,
        dose_given: doseGiven.trim(),
        status,
        administered_at: new Date(adminTime).toISOString(),
        notes: notes.trim() || null,
      });

      toast.success(`Dose recorded for ${administerMed.medicine_name}`);
      setAdministerMed(null);
      onRefresh();
    } catch (err: any) {
      toast.error(getErrorMessage(err) || "Failed to log administration");
    } finally {
      setSubmitting(false);
    }
  };

  // Filter MAR items by date if selected
  const filteredMar = marTimeline.filter((item) => {
    if (!filterDate) return true;
    const itemDate = new Date(item.administered_at).toISOString().slice(0, 10);
    return itemDate === filterDate;
  });

  const formatDt = (dtStr: string) => {
    try {
      const d = new Date(dtStr);
      return d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dtStr;
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 1. Quick Dose Administration (Ward / Nursing Station) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-100 text-teal-700 shrink-0">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                Medication Administration (Nursing Station)
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500">
                Record doses administered to patient as prescribed by doctor
              </p>
            </div>
          </div>
        </div>

        {activeMedications.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No active medication orders to administer.
          </div>
        ) : (
          <div className="mt-3.5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {activeMedications.map((med) => (
              <div
                key={med.id}
                className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-3 hover:border-teal-300 hover:bg-white transition"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-slate-900 text-xs sm:text-sm">{med.medicine_name}</span>
                    <span className="rounded bg-teal-100 px-1.5 py-0.5 text-[10px] font-bold text-teal-800 shrink-0">
                      {med.route}
                    </span>
                  </div>

                  <p className="mt-0.5 text-xs font-semibold text-slate-700">
                    {med.dose} • {med.frequency}
                  </p>

                  {med.instructions && (
                    <p className="mt-1 text-[11px] text-slate-500 italic">
                      ℹ️ {med.instructions}
                    </p>
                  )}

                  {med.is_sos && (
                    <span className="inline-block mt-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                      SOS: {med.sos_condition || "PRN"}
                    </span>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-slate-200/60 pt-2 text-[11px]">
                  <span className="text-slate-500">
                    Given: <strong className="text-slate-800">{med.total_doses_given}</strong>
                  </span>

                  <button
                    onClick={() => handleOpenAdministerModal(med)}
                    className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-teal-700 transition cursor-pointer"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Administer</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. Chronological MAR Administration Timeline */}
      <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-sm">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-100 text-sky-700 shrink-0">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">MAR Timeline</h3>
              <p className="text-[11px] sm:text-xs text-slate-500">
                Detailed record of all doses given, time, and administering nurse/examiner
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-xs text-slate-500 font-medium">Filter Date:</label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs focus:bg-white focus:outline-none"
            />
            {filterDate && (
              <button
                onClick={() => setFilterDate("")}
                className="text-xs text-sky-600 hover:underline font-medium cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {filteredMar.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            <Clock className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-xs font-semibold">No administration logs found</p>
            <p className="text-[11px] text-slate-400">
              When doses are administered, they will appear here chronologically.
            </p>
          </div>
        ) : (
          <div className="mt-3.5 space-y-2.5">
            {filteredMar.map((log) => {
              const isGiven = log.status === "given";
              const isHeld = log.status === "held";
              const isMissed = log.status === "missed";

              return (
                <div
                  key={log.id}
                  className="flex items-start gap-2.5 sm:gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3 hover:bg-white transition"
                >
                  <div
                    className={`mt-0.5 flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-xl ${
                      isGiven
                        ? "bg-emerald-100 text-emerald-700"
                        : isHeld
                        ? "bg-amber-100 text-amber-700"
                        : "bg-rose-100 text-rose-700"
                    }`}
                  >
                    {isGiven ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : isHeld ? (
                      <AlertCircle className="h-4 w-4" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <p className="font-bold text-slate-900 text-xs sm:text-sm">
                        {log.medicine_name} — {log.dose_given}
                      </p>
                      <span className="text-[11px] text-slate-500">
                        ⏱️ {formatDt(log.administered_at)}
                      </span>
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                      <span className="flex items-center gap-1">
                        <UserCheck className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>Administered by: <strong>{log.administered_by_name}</strong></span>
                      </span>

                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${
                          isGiven
                            ? "bg-emerald-100 text-emerald-800"
                            : isHeld
                            ? "bg-amber-100 text-amber-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {log.status}
                      </span>
                    </div>

                    {log.notes && (
                      <p className="mt-1.5 text-xs text-slate-500 bg-white p-2 rounded-lg border border-slate-100">
                        📝 {log.notes}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Administer Medication */}
      {administerMed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 sm:p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-4 sm:p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-teal-700">
                <CheckCircle2 className="h-5 w-5" />
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">Record Dose Administration</h3>
              </div>
              <button
                onClick={() => setAdministerMed(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAdministerSubmit} className="mt-4 space-y-3.5 sm:space-y-4 text-xs">
              <div className="rounded-xl bg-slate-50 p-3 border border-slate-200">
                <p className="font-bold text-slate-900">{administerMed.medicine_name}</p>
                <p className="text-slate-600">
                  Prescribed: {administerMed.dose} • {administerMed.route} • {administerMed.frequency}
                </p>
                {administerMed.instructions && (
                  <p className="mt-1 text-[11px] text-teal-700 italic">
                    Instructions: {administerMed.instructions}
                  </p>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Status <span className="text-rose-500">*</span>
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-teal-500 focus:outline-none font-semibold"
                >
                  <option value="given">Given / Administered</option>
                  <option value="held">Held (e.g. NPO / patient asleep)</option>
                  <option value="missed">Missed</option>
                  <option value="refused">Refused by patient</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Dose Given <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={doseGiven}
                  onChange={(e) => setDoseGiven(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-teal-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Administered Timestamp <span className="text-rose-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={adminTime}
                  onChange={(e) => setAdminTime(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-teal-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Remarks / Observations
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Tolerated well on right IV cannula, no adverse signs..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setAdministerMed(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-teal-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-teal-700 disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? "Recording..." : "Save Administration"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
