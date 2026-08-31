"use client";

import React, { useState } from "react";
import {
  Activity,
  Heart,
  Thermometer,
  Wind,
  PlusCircle,
  Clock,
  TrendingUp,
  X,
  AlertTriangle,
} from "lucide-react";
import { vitalSignsApi } from "@/services/vitalSignsApi";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";

interface IpdVitalsTabProps {
  patientId: string;
  admissionId: string;
  vitals: any[];
  onRefresh: () => void;
}

export function IpdVitalsTab({
  patientId,
  admissionId,
  vitals,
  onRefresh,
}: IpdVitalsTabProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [pulse, setPulse] = useState("");
  const [temp, setTemp] = useState("");
  const [spo2, setSpo2] = useState("");
  const [respRate, setRespRate] = useState("");
  const [weight, setWeight] = useState("");
  const [notes, setNotes] = useState("");
  const [recordedAt, setRecordedAt] = useState(
    new Date().toISOString().slice(0, 16)
  );
  const [submitting, setSubmitting] = useState(false);

  const handleRecordVitalsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setSubmitting(true);
    try {
      await vitalSignsApi.create({
        patient_id: patientId,
        systolic_bp: systolic ? parseFloat(systolic) : null,
        diastolic_bp: diastolic ? parseFloat(diastolic) : null,
        pulse_rate: pulse ? parseFloat(pulse) : null,
        temperature: temp ? parseFloat(temp) : null,
        spo2: spo2 ? parseFloat(spo2) : null,
        respiratory_rate: respRate ? parseFloat(respRate) : null,
        weight: weight ? parseFloat(weight) : null,
        notes: notes.trim() || null,
        recorded_at: new Date(recordedAt).toISOString(),
      });

      toast.success("Vitals recorded successfully");
      setShowAddModal(false);
      setSystolic("");
      setDiastolic("");
      setPulse("");
      setTemp("");
      setSpo2("");
      setRespRate("");
      setWeight("");
      setNotes("");
      onRefresh();
    } catch (err: any) {
      toast.error(getErrorMessage(err) || "Failed to record vitals");
    } finally {
      setSubmitting(false);
    }
  };

  const latest = vitals.length > 0 ? vitals[0] : null;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Latest Vitals Summary Cards */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 sm:grid-cols-4">
        {/* Blood Pressure */}
        <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] sm:text-xs font-semibold">Blood Pressure</span>
            <Activity className="h-4 w-4 text-rose-500 shrink-0" />
          </div>
          <p className="mt-1.5 sm:mt-2 text-lg sm:text-xl font-bold text-slate-900">
            {latest?.systolic_bp && latest?.diastolic_bp
              ? `${latest.systolic_bp}/${latest.diastolic_bp}`
              : "—"}{" "}
            <span className="text-[11px] sm:text-xs font-normal text-slate-500">mmHg</span>
          </p>
          <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-[11px] text-slate-400">Normal: 120/80</p>
        </div>

        {/* Pulse Rate */}
        <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] sm:text-xs font-semibold">Pulse Rate</span>
            <Heart className="h-4 w-4 text-rose-600 shrink-0" />
          </div>
          <p className="mt-1.5 sm:mt-2 text-lg sm:text-xl font-bold text-slate-900">
            {latest?.pulse_rate || "—"}{" "}
            <span className="text-[11px] sm:text-xs font-normal text-slate-500">bpm</span>
          </p>
          <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-[11px] text-slate-400">Normal: 60-100</p>
        </div>

        {/* Temperature */}
        <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] sm:text-xs font-semibold">Temperature</span>
            <Thermometer className="h-4 w-4 text-amber-500 shrink-0" />
          </div>
          <p className="mt-1.5 sm:mt-2 text-lg sm:text-xl font-bold text-slate-900">
            {latest?.temperature || "—"}{" "}
            <span className="text-[11px] sm:text-xs font-normal text-slate-500">°F</span>
          </p>
          <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-[11px] text-slate-400">Normal: 98.6°F</p>
        </div>

        {/* Oxygen Saturation */}
        <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] sm:text-xs font-semibold">SpO₂</span>
            <Wind className="h-4 w-4 text-sky-500 shrink-0" />
          </div>
          <p className="mt-1.5 sm:mt-2 text-lg sm:text-xl font-bold text-slate-900">
            {latest?.spo2 || "—"}{" "}
            <span className="text-[11px] sm:text-xs font-normal text-slate-500">%</span>
          </p>
          <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-[11px] text-slate-400">Normal: 95-100%</p>
        </div>
      </div>

      {/* Vitals History Table with Add Action */}
      <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-sm">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-100 text-rose-700 shrink-0">
              <Activity className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">Vitals Recorded During Admission</h3>
                <span className="rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5">
                  {vitals.length}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500">
                Staff & Examiner captured vital signs timeline
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setRecordedAt(new Date().toISOString().slice(0, 16));
              setShowAddModal(true);
            }}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:shadow cursor-pointer"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Record Vitals</span>
          </button>
        </div>

        {vitals.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            <Activity className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-xs font-semibold">No vitals captured during this stay</p>
            <p className="text-[11px] text-slate-400">
              Click &quot;Record Vitals&quot; to log patient readings.
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Card View (< md) */}
            <div className="mt-3.5 space-y-2.5 md:hidden">
              {vitals.map((v, idx) => {
                const isAbnormalBp =
                  v.systolic_bp > 140 || v.systolic_bp < 90 || v.diastolic_bp > 90;
                const isAbnormalSpo2 = v.spo2 && v.spo2 < 95;
                const isFever = v.temperature && v.temperature > 99.5;

                return (
                  <div
                    key={v.id || idx}
                    className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs border-b border-slate-200/60 pb-1.5">
                      <span className="font-semibold text-slate-700">
                        ⏱️{" "}
                        {new Date(v.recorded_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {v.recorded_by && (
                        <span className="text-[10px] text-slate-500">By: {v.recorded_by}</span>
                      )}
                    </div>

                    {/* Vitals Badges Grid */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-white p-2 rounded-lg border border-slate-100">
                        <span className="text-[10px] text-slate-400 block">BP</span>
                        <span className={`font-bold ${isAbnormalBp ? "text-rose-600 font-extrabold" : "text-slate-900"}`}>
                          {v.systolic_bp && v.diastolic_bp ? `${v.systolic_bp}/${v.diastolic_bp} mmHg` : "—"}
                        </span>
                      </div>

                      <div className="bg-white p-2 rounded-lg border border-slate-100">
                        <span className="text-[10px] text-slate-400 block">Pulse</span>
                        <span className="font-bold text-slate-800">
                          {v.pulse_rate ? `${v.pulse_rate} bpm` : "—"}
                        </span>
                      </div>

                      <div className="bg-white p-2 rounded-lg border border-slate-100">
                        <span className="text-[10px] text-slate-400 block">Temp</span>
                        <span className={`font-bold ${isFever ? "text-amber-600 font-bold" : "text-slate-800"}`}>
                          {v.temperature ? `${v.temperature} °F` : "—"}
                        </span>
                      </div>

                      <div className="bg-white p-2 rounded-lg border border-slate-100">
                        <span className="text-[10px] text-slate-400 block">SpO₂</span>
                        <span className={`font-bold ${isAbnormalSpo2 ? "text-rose-600 font-extrabold" : "text-sky-700"}`}>
                          {v.spo2 ? `${v.spo2} %` : "—"}
                        </span>
                      </div>
                    </div>

                    {(v.respiratory_rate || v.weight || v.notes) && (
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-600 border-t border-slate-200/60 pt-1.5">
                        {v.respiratory_rate && <span>RR: <strong>{v.respiratory_rate}/min</strong></span>}
                        {v.weight && <span>Weight: <strong>{v.weight} kg</strong></span>}
                        {v.notes && <span className="w-full text-slate-500 italic">📝 {v.notes}</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View (md+) */}
            <div className="mt-4 hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-600">
                    <th className="py-2.5 px-3 font-semibold">Recorded Date/Time</th>
                    <th className="py-2.5 px-3 font-semibold">BP (mmHg)</th>
                    <th className="py-2.5 px-3 font-semibold">Pulse</th>
                    <th className="py-2.5 px-3 font-semibold">Temp (°F)</th>
                    <th className="py-2.5 px-3 font-semibold">SpO₂</th>
                    <th className="py-2.5 px-3 font-semibold">Resp Rate</th>
                    <th className="py-2.5 px-3 font-semibold">Weight</th>
                    <th className="py-2.5 px-3 font-semibold">Notes / Staff</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vitals.map((v, idx) => {
                    const isAbnormalBp =
                      v.systolic_bp > 140 || v.systolic_bp < 90 || v.diastolic_bp > 90;
                    const isAbnormalSpo2 = v.spo2 && v.spo2 < 95;
                    const isFever = v.temperature && v.temperature > 99.5;

                    return (
                      <tr key={v.id || idx} className="hover:bg-slate-50/50">
                        <td className="py-3 px-3 whitespace-nowrap font-medium text-slate-700">
                          ⏱️{" "}
                          {new Date(v.recorded_at).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span
                            className={`font-bold ${
                              isAbnormalBp ? "text-rose-600 font-extrabold" : "text-slate-900"
                            }`}
                          >
                            {v.systolic_bp && v.diastolic_bp
                              ? `${v.systolic_bp}/${v.diastolic_bp}`
                              : "—"}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-800">
                          {v.pulse_rate ? `${v.pulse_rate} bpm` : "—"}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span
                            className={`font-semibold ${
                              isFever ? "text-amber-600 font-bold" : "text-slate-800"
                            }`}
                          >
                            {v.temperature ? `${v.temperature} °F` : "—"}
                          </span>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span
                            className={`rounded px-1.5 py-0.5 text-xs font-bold ${
                              isAbnormalSpo2
                                ? "bg-rose-100 text-rose-800"
                                : "bg-sky-50 text-sky-800"
                            }`}
                          >
                            {v.spo2 ? `${v.spo2} %` : "—"}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-700">
                          {v.respiratory_rate ? `${v.respiratory_rate}/min` : "—"}
                        </td>
                        <td className="py-3 px-3 text-slate-700">
                          {v.weight ? `${v.weight} kg` : "—"}
                        </td>
                        <td className="py-3 px-3 text-slate-500">
                          {v.notes && <p className="text-xs text-slate-700">{v.notes}</p>}
                          {v.recorded_by && (
                            <p className="text-[10px] text-slate-400">By: {v.recorded_by}</p>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Modal: Record Vitals */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 sm:p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-4 sm:p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-rose-600" />
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">Record Patient Vitals</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleRecordVitalsSubmit} className="mt-4 space-y-3.5 sm:space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Recorded Timestamp <span className="text-rose-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={recordedAt}
                  onChange={(e) => setRecordedAt(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-rose-500 focus:outline-none"
                  required
                />
              </div>

              {/* BP Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Systolic BP (mmHg)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 120"
                    value={systolic}
                    onChange={(e) => setSystolic(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-rose-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Diastolic BP (mmHg)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 80"
                    value={diastolic}
                    onChange={(e) => setDiastolic(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-rose-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Pulse & Temp */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Pulse / Heart Rate (bpm)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 72"
                    value={pulse}
                    onChange={(e) => setPulse(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-rose-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Temperature (°F)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 98.6"
                    value={temp}
                    onChange={(e) => setTemp(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-rose-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* SpO2, Resp Rate, Weight */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    SpO₂ (%)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 98"
                    value={spo2}
                    onChange={(e) => setSpo2(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-rose-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Resp Rate (/min)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 18"
                    value={respRate}
                    onChange={(e) => setRespRate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-rose-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 68.5"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-rose-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Vitals Notes / Patient State
                </label>
                <input
                  type="text"
                  placeholder="e.g. Patient resting comfortably, no respiratory distress..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-rose-500 focus:outline-none"
                />
              </div>

              {/* Actions */}
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:shadow disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? "Saving..." : "Save Vitals"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
