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
        <span className="text-slate-600 flex items-center gap-1 text-xs font-semibold">
          <Calendar className="h-4 w-4 text-sky-600" />
          Discharge Date <span className="text-rose-500">*</span>
        </span>
        <input
          type="date"
          value={dischargeDate}
          onChange={(e) => setDischargeDate(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono outline-none focus:border-sky-400"
          required
        />
      </label>

      <label className="space-y-1">
        <span className="text-slate-600 text-xs font-semibold">
          Discharge Type <span className="text-rose-500">*</span>
        </span>
        <select
          value={dischargeType}
          onChange={(e) => setDischargeType(e.target.value as DischargeType)}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-sky-400"
          required
        >
          <option value="normal">Normal Medical Discharge</option>
          <option value="ama">AMA (Against Medical Advice)</option>
          <option value="transfer">Transfer to Higher Facility</option>
          <option value="deceased">Deceased / Expired</option>
          <option value="lama">LAMA (Leave Against Medical Advice)</option>
        </select>
      </label>

      <label className="space-y-1 md:col-span-2">
        <span className="text-slate-600 text-xs font-semibold">Invoice & Billing Remarks</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-sky-400"
          placeholder="Invoice remarks / settlement notes"
        />
      </label>

      <div className="md:col-span-2 flex justify-end gap-3 pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isSubmitting ? "Initiating..." : "Initiate Discharge Billing"}
        </button>
      </div>
    </form>
  );
}
