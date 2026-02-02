"use client";

import { useState, useEffect } from "react";
import { InitiateDischargeRequest, DischargeType } from "@/services/admissionsApi";
import { getTodayDateLocal } from "@/utils/format";
import { Calendar } from "lucide-react";

interface InitiateDischargeFormProps {
  onSuccess?: () => void;
  onSubmit: (data: InitiateDischargeRequest) => Promise<void>;
}

export function InitiateDischargeForm({ onSuccess, onSubmit }: InitiateDischargeFormProps) {
  const [dischargeDate, setDischargeDate] = useState("");
  const [dischargeType, setDischargeType] = useState<DischargeType>("normal");
  const [dischargeSummary, setDischargeSummary] = useState("");
  const [dischargeInstructions, setDischargeInstructions] = useState("");
  const [finalDiagnosis, setFinalDiagnosis] = useState("");
  const [notes, setNotes] = useState<string>("Invoice for admission charges");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const today = getTodayDateLocal();
    setDischargeDate(today);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!dischargeDate || !dischargeType) {
      return;
    }

    setIsSubmitting(true);
    try {
      const initiateData: InitiateDischargeRequest = {
        notes: notes.trim() || undefined,
        discharge_date: dischargeDate,
        discharge_type: dischargeType,
        discharge_summary: dischargeSummary.trim() || null,
        discharge_instructions: dischargeInstructions.trim() || null,
        final_diagnosis: finalDiagnosis.trim() || null,
      };

      await onSubmit(initiateData);
      onSuccess?.();
    } catch (error) {
      // Error handling is done in parent component
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <label className="space-y-1">
        <span className="text-slate-600 flex items-center gap-1">
          <Calendar className="h-4 w-4" />
          Discharge Date <span className="text-rose-500">*</span>
        </span>
        <input
          type="date"
          value={dischargeDate}
          onChange={(e) => setDischargeDate(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
          required
        />
      </label>

      <label className="space-y-1">
        <span className="text-slate-600">
          Discharge Type <span className="text-rose-500">*</span>
        </span>
        <select
          value={dischargeType}
          onChange={(e) => setDischargeType(e.target.value as DischargeType)}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
          required
        >
          <option value="normal">Normal</option>
          <option value="ama">AMA (Against Medical Advice)</option>
          <option value="transfer">Transfer</option>
          <option value="deceased">Deceased</option>
          <option value="lama">LAMA (Leave Against Medical Advice)</option>
        </select>
      </label>

      <label className="space-y-1 md:col-span-2">
        <span className="text-slate-600">Notes</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
          placeholder="Invoice notes"
        />
      </label>

      <label className="md:col-span-2 space-y-1">
        <span className="text-slate-600">Discharge Summary</span>
        <textarea
          value={dischargeSummary}
          onChange={(e) => setDischargeSummary(e.target.value)}
          rows={3}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
          placeholder="Enter discharge summary"
        />
      </label>

      <label className="md:col-span-2 space-y-1">
        <span className="text-slate-600">Discharge Instructions</span>
        <textarea
          value={dischargeInstructions}
          onChange={(e) => setDischargeInstructions(e.target.value)}
          rows={3}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
          placeholder="Enter discharge instructions for the patient"
        />
      </label>

      <label className="md:col-span-2 space-y-1">
        <span className="text-slate-600">Final Diagnosis</span>
        <textarea
          value={finalDiagnosis}
          onChange={(e) => setFinalDiagnosis(e.target.value)}
          rows={2}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
          placeholder="Enter final diagnosis"
        />
      </label>

      <div className="md:col-span-2 flex justify-end gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 font-semibold text-white shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Initiating..." : "Initiate Discharge"}
        </button>
      </div>
    </form>
  );
}
