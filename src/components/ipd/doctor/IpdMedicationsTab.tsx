"use client";

import React, { useState } from "react";
import {
  Pill,
  PlusCircle,
  Clock,
  StopCircle,
  History,
  CheckCircle2,
  AlertTriangle,
  X,
} from "lucide-react";
import { IpdMedicationOrder } from "@/types/ipdDoctor";
import { ipdDoctorApi } from "@/services/ipdDoctorApi";
import { medicinesApi, Medicine } from "@/services/medicinesApi";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";

interface IpdMedicationsTabProps {
  admissionId: string;
  activeMedications: IpdMedicationOrder[];
  discontinuedMedications: IpdMedicationOrder[];
  onRefresh: () => void;
}

export function IpdMedicationsTab({
  admissionId,
  activeMedications,
  discontinuedMedications,
  onRefresh,
}: IpdMedicationsTabProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [stoppingMed, setStoppingMed] = useState<IpdMedicationOrder | null>(null);

  // Add Medication form state
  const [medicineSearch, setMedicineSearch] = useState("");
  const [medicineSearchResults, setMedicineSearchResults] = useState<Medicine[]>([]);
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);
  const [medicineName, setMedicineName] = useState("");
  const [dose, setDose] = useState("");
  const [route, setRoute] = useState("IV");
  const [frequency, setFrequency] = useState("BD");
  const [startDateTime, setStartDateTime] = useState(
    new Date().toISOString().slice(0, 16)
  );
  const [stopDateTime, setStopDateTime] = useState("");
  const [isSos, setIsSos] = useState(false);
  const [sosCondition, setSosCondition] = useState("");
  const [instructions, setInstructions] = useState("");
  const [submittingAdd, setSubmittingAdd] = useState(false);

  // Stop Medication form state
  const [stopTime, setStopTime] = useState(
    new Date().toISOString().slice(0, 16)
  );
  const [stopReason, setStopReason] = useState("Changed antibiotic");
  const [submittingStop, setSubmittingStop] = useState(false);

  // Handle medicine search
  const handleMedicineSearch = async (term: string) => {
    setMedicineSearch(term);
    setMedicineName(term);
    if (term.length >= 2) {
      try {
        const results = await medicinesApi.list({ q: term, page_size: 8 });
        setMedicineSearchResults(results.items || []);
      } catch (err) {
        console.error("Failed to search medicines", err);
      }
    } else {
      setMedicineSearchResults([]);
    }
  };

  const handleSelectMedicine = (med: Medicine) => {
    setSelectedMedicine(med);
    setMedicineName(med.name);
    setMedicineSearch(med.name);
    setMedicineSearchResults([]);
    if (med.default_dosage) setDose(med.default_dosage);
    if (med.dosage_form) {
      if (med.dosage_form.toLowerCase().includes("inj")) setRoute("IV");
      else if (med.dosage_form.toLowerCase().includes("drop")) setRoute("Eye Drop");
      else setRoute("Oral");
    }
    if (med.default_frequency) setFrequency(med.default_frequency);
    if (med.default_instructions) setInstructions(med.default_instructions);
  };

  const handleAddMedicationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medicineName.trim()) {
      toast.error("Please enter a medicine name");
      return;
    }
    if (!dose.trim()) {
      toast.error("Please specify the dose (e.g. 1 g, 40 mg, 650 mg)");
      return;
    }

    setSubmittingAdd(true);
    try {
      await ipdDoctorApi.createMedicationOrder(admissionId, {
        medicine_id: selectedMedicine?.id || null,
        medicine_name: medicineName.trim(),
        generic_name: selectedMedicine?.generic_name || null,
        dose: dose.trim(),
        route,
        frequency,
        start_date_time: new Date(startDateTime).toISOString(),
        stop_date_time: stopDateTime ? new Date(stopDateTime).toISOString() : null,
        is_sos: isSos,
        sos_condition: isSos ? sosCondition.trim() : null,
        instructions: instructions.trim() || null,
      });

      toast.success("Medication prescribed successfully");
      setShowAddModal(false);
      // Reset form
      setMedicineName("");
      setMedicineSearch("");
      setSelectedMedicine(null);
      setDose("");
      setInstructions("");
      setIsSos(false);
      setSosCondition("");
      setStopDateTime("");
      onRefresh();
    } catch (err: any) {
      toast.error(getErrorMessage(err) || "Failed to prescribe medication");
    } finally {
      setSubmittingAdd(false);
    }
  };

  const handleStopMedicationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stoppingMed) return;
    if (!stopReason.trim()) {
      toast.error("Please provide a reason for stopping this medication");
      return;
    }

    setSubmittingStop(true);
    try {
      await ipdDoctorApi.stopMedicationOrder(stoppingMed.id, {
        stop_date_time: stopTime ? new Date(stopTime).toISOString() : null,
        reason: stopReason.trim(),
      });

      toast.success(`Stopped ${stoppingMed.medicine_name}`);
      setStoppingMed(null);
      onRefresh();
    } catch (err: any) {
      toast.error(getErrorMessage(err) || "Failed to stop medication");
    } finally {
      setSubmittingStop(false);
    }
  };

  const formatDt = (dtStr?: string | null) => {
    if (!dtStr) return "Ongoing";
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
      {/* Active Medications Section */}
      <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-sm">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 shrink-0">
              <Pill className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">Active Medications</h3>
                <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5">
                  {activeMedications.length}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500">
                Currently running medication orders for this patient
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:shadow cursor-pointer"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Prescribe Medication</span>
          </button>
        </div>

        {activeMedications.length === 0 ? (
          <div className="py-10 text-center text-slate-500">
            <Pill className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-xs font-semibold">No active medications</p>
            <p className="text-[11px] text-slate-400">Click &quot;Prescribe Medication&quot; to order medication.</p>
          </div>
        ) : (
          <>
            {/* Mobile Card View (< md) */}
            <div className="mt-3 space-y-2.5 md:hidden">
              {activeMedications.map((med) => (
                <div
                  key={med.id}
                  className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 hover:bg-white transition space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{med.medicine_name}</h4>
                      {med.generic_name && (
                        <p className="text-[11px] text-slate-500">{med.generic_name}</p>
                      )}
                    </div>
                    <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-200 shrink-0">
                      {med.frequency}
                    </span>
                  </div>

                  {/* Badges strip: Dose, Route, SOS */}
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="font-semibold text-slate-800 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                      Dose: {med.dose}
                    </span>
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 font-bold text-slate-700">
                      {med.route}
                    </span>
                    {med.is_sos && (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                        SOS: {med.sos_condition || "PRN"}
                      </span>
                    )}
                  </div>

                  {med.instructions && (
                    <p className="text-[11px] text-sky-800 bg-sky-50/80 p-2 rounded-lg border border-sky-100 italic">
                      ℹ️ {med.instructions}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/60 text-[11px] text-slate-500">
                    <div>
                      <span>Started: <strong>{formatDt(med.start_date_time)}</strong></span>
                      <span className="block text-[10px] text-slate-400">
                        Given: <strong className="text-slate-700">{med.total_doses_given} doses</strong>
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        setStoppingMed(med);
                        setStopTime(new Date().toISOString().slice(0, 16));
                        setStopReason("Changed antibiotic");
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition cursor-pointer"
                    >
                      <StopCircle className="h-3.5 w-3.5" />
                      <span>Stop Med</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View (md+) */}
            <div className="mt-3 hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-600">
                    <th className="py-2.5 px-3 font-semibold">Medicine</th>
                    <th className="py-2.5 px-3 font-semibold">Dose</th>
                    <th className="py-2.5 px-3 font-semibold">Route</th>
                    <th className="py-2.5 px-3 font-semibold">Frequency</th>
                    <th className="py-2.5 px-3 font-semibold">Start</th>
                    <th className="py-2.5 px-3 font-semibold">Stop</th>
                    <th className="py-2.5 px-3 font-semibold">Doses Given</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeMedications.map((med) => (
                    <tr key={med.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3 px-3">
                        <p className="font-bold text-slate-900">{med.medicine_name}</p>
                        {med.generic_name && (
                          <p className="text-[11px] text-slate-400">{med.generic_name}</p>
                        )}
                        {med.instructions && (
                          <p className="mt-0.5 text-[11px] text-sky-700 italic">
                            ℹ️ {med.instructions}
                          </p>
                        )}
                        {med.is_sos && (
                          <span className="inline-block mt-0.5 rounded bg-amber-100 px-1.5 py-0.2 text-[10px] font-bold text-amber-800">
                            SOS: {med.sos_condition || "When required"}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-800">{med.dose}</td>
                      <td className="py-3 px-3">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 font-bold text-slate-700">
                          {med.route}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="rounded-md bg-emerald-50 px-2 py-0.5 font-bold text-emerald-800 border border-emerald-200">
                          {med.frequency}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                        {formatDt(med.start_date_time)}
                      </td>
                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                        {med.stop_date_time ? formatDt(med.stop_date_time) : (
                          <span className="text-emerald-600 font-semibold">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="font-bold text-slate-800">{med.total_doses_given}</span>
                        {med.last_administered_at && (
                          <p className="text-[10px] text-slate-400">
                            Last: {formatDt(med.last_administered_at)}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => {
                            setStoppingMed(med);
                            setStopTime(new Date().toISOString().slice(0, 16));
                            setStopReason("Changed antibiotic");
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition cursor-pointer"
                        >
                          <StopCircle className="h-3.5 w-3.5" />
                          <span>Stop</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Discontinued / Past Medications Section */}
      <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-600 shrink-0">
            <History className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">Discontinued Medications</h3>
            <p className="text-[11px] sm:text-xs text-slate-500">
              History of stopped medications and reasons during this admission
            </p>
          </div>
        </div>

        {discontinuedMedications.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No discontinued medications recorded for this stay.
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="mt-3 space-y-2.5 md:hidden">
              {discontinuedMedications.map((med) => (
                <div
                  key={med.id}
                  className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold line-through text-slate-500 text-xs sm:text-sm">{med.medicine_name}</p>
                      {med.generic_name && (
                        <p className="text-[10px] text-slate-400">{med.generic_name}</p>
                      )}
                    </div>
                    <span className="rounded bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-800 border border-rose-100">
                      {med.discontinue_reason || "Stopped"}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                    <span>{med.dose} ({med.route})</span>
                    <span>•</span>
                    <span>{med.frequency}</span>
                  </div>

                  <div className="text-[11px] text-slate-500 border-t border-slate-200/60 pt-1.5 flex justify-between">
                    <span>Started: {formatDt(med.start_date_time)}</span>
                    <span className="font-medium text-rose-700">Stopped: {formatDt(med.stop_date_time || med.discontinued_at)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="mt-3 hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-600">
                    <th className="py-2.5 px-3 font-semibold">Medicine</th>
                    <th className="py-2.5 px-3 font-semibold">Dose & Route</th>
                    <th className="py-2.5 px-3 font-semibold">Frequency</th>
                    <th className="py-2.5 px-3 font-semibold">Started</th>
                    <th className="py-2.5 px-3 font-semibold">Discontinued</th>
                    <th className="py-2.5 px-3 font-semibold">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {discontinuedMedications.map((med) => (
                    <tr key={med.id} className="text-slate-600 hover:bg-slate-50/50">
                      <td className="py-3 px-3">
                        <p className="font-semibold line-through text-slate-500">{med.medicine_name}</p>
                        {med.generic_name && (
                          <p className="text-[10px] text-slate-400">{med.generic_name}</p>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {med.dose} ({med.route})
                      </td>
                      <td className="py-3 px-3">{med.frequency}</td>
                      <td className="py-3 px-3 whitespace-nowrap">{formatDt(med.start_date_time)}</td>
                      <td className="py-3 px-3 whitespace-nowrap font-medium text-rose-700">
                        {formatDt(med.stop_date_time || med.discontinued_at)}
                      </td>
                      <td className="py-3 px-3">
                        <span className="rounded bg-rose-50 px-2 py-0.5 text-xs text-rose-800 border border-rose-100 font-medium">
                          {med.discontinue_reason || "Discontinued"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Modal: Prescribe Medication */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 sm:p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-4 sm:p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Pill className="h-5 w-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">Prescribe IPD Medication</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddMedicationSubmit} className="mt-4 space-y-3.5 sm:space-y-4 text-xs">
              {/* Medicine Name with Search */}
              <div className="relative">
                <label className="block font-semibold text-slate-700 mb-1">
                  Medicine Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Type to search (e.g. Ceftriaxone, Pantoprazole)..."
                  value={medicineSearch}
                  onChange={(e) => handleMedicineSearch(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none"
                  required
                />

                {medicineSearchResults.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full rounded-xl border border-slate-200 bg-white p-1 shadow-lg max-h-48 overflow-y-auto">
                    {medicineSearchResults.map((m) => (
                      <div
                        key={m.id}
                        onClick={() => handleSelectMedicine(m)}
                        className="cursor-pointer rounded-lg px-3 py-2 hover:bg-emerald-50 hover:text-emerald-900 transition"
                      >
                        <p className="font-bold">{m.name}</p>
                        {m.generic_name && (
                          <p className="text-[10px] text-slate-400">{m.generic_name}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Dose, Route, Frequency in Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Dose <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 1 g, 40 mg"
                    value={dose}
                    onChange={(e) => setDose(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Route <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={route}
                    onChange={(e) => setRoute(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="IV">IV (Intravenous)</option>
                    <option value="Oral">Oral</option>
                    <option value="IM">IM (Intramuscular)</option>
                    <option value="SC">SC (Subcutaneous)</option>
                    <option value="Topical">Topical</option>
                    <option value="Inhalation">Inhalation</option>
                    <option value="Eye Drop">Eye Drop</option>
                    <option value="Rectal">Rectal</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Frequency <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none font-semibold text-emerald-800"
                  >
                    <option value="OD">OD (Once daily)</option>
                    <option value="BD">BD (Twice daily)</option>
                    <option value="TDS">TDS (Thrice daily)</option>
                    <option value="QID">QID (4 times daily)</option>
                    <option value="SOS">SOS (As needed)</option>
                    <option value="STAT">STAT (Immediately once)</option>
                    <option value="Q4H">Q4H (Every 4 hours)</option>
                    <option value="Q6H">Q6H (Every 6 hours)</option>
                    <option value="Q8H">Q8H (Every 8 hours)</option>
                    <option value="HS">HS (At bedtime)</option>
                  </select>
                </div>
              </div>

              {/* Start & Stop Timestamps */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Start Date & Time <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={startDateTime}
                    onChange={(e) => setStartDateTime(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Stop Date & Time (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={stopDateTime}
                    onChange={(e) => setStopDateTime(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* SOS Checkbox */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isSos}
                    onChange={(e) => setIsSos(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="font-semibold text-slate-800">Is PRN / SOS Medication</span>
                </label>

                {isSos && (
                  <div>
                    <input
                      type="text"
                      placeholder="Condition (e.g. Give if Temp > 100°F or Severe Pain)..."
                      value={sosCondition}
                      onChange={(e) => setSosCondition(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Special Instructions */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Instructions for Nursing / Administration
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Slow IV push over 15 minutes; administer before breakfast..."
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* Action Buttons */}
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
                  disabled={submittingAdd}
                  className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:shadow disabled:opacity-50 cursor-pointer"
                >
                  {submittingAdd ? "Prescribing..." : "Prescribe Medication"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Stop Medication */}
      {stoppingMed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 sm:p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-4 sm:p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-rose-600">
                <StopCircle className="h-5 w-5" />
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">Stop Medication</h3>
              </div>
              <button
                onClick={() => setStoppingMed(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleStopMedicationSubmit} className="mt-4 space-y-4 text-xs">
              <div className="rounded-xl bg-slate-50 p-3 border border-slate-200">
                <p className="font-bold text-slate-900">{stoppingMed.medicine_name}</p>
                <p className="text-slate-600">
                  {stoppingMed.dose} • {stoppingMed.route} • {stoppingMed.frequency}
                </p>
                <p className="mt-1 text-[11px] text-slate-400">
                  Started on: {formatDt(stoppingMed.start_date_time)}
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Stop Date & Time <span className="text-rose-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={stopTime}
                  onChange={(e) => setStopTime(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-rose-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Reason for Stopping <span className="text-rose-500">*</span>
                </label>
                <select
                  value={stopReason}
                  onChange={(e) => setStopReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-rose-500 focus:outline-none mb-2"
                >
                  <option value="Changed antibiotic">Changed antibiotic</option>
                  <option value="Dose modified / adjusted">Dose modified / adjusted</option>
                  <option value="Course completed">Course completed</option>
                  <option value="Shifted to oral route">Shifted to oral route</option>
                  <option value="Adverse reaction / Side effect">Adverse reaction / Side effect</option>
                  <option value="Patient requested discontinuation">Patient requested discontinuation</option>
                  <option value="Other">Other reason</option>
                </select>

                <input
                  type="text"
                  placeholder="Or enter custom reason..."
                  value={stopReason}
                  onChange={(e) => setStopReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-rose-500 focus:outline-none"
                  required
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setStoppingMed(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingStop}
                  className="rounded-xl bg-rose-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
                >
                  {submittingStop ? "Stopping..." : "Confirm Stop"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
