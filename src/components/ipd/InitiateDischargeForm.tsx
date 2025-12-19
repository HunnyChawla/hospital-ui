"use client";

import { useState, useEffect } from "react";
import { InitiateDischargeRequest } from "@/services/admissionsApi";

interface InitiateDischargeFormProps {
  onSuccess?: () => void;
  onSubmit: (data: InitiateDischargeRequest) => Promise<void>;
}

export function InitiateDischargeForm({ onSuccess, onSubmit }: InitiateDischargeFormProps) {
  const [taxRate, setTaxRate] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [gstNumber, setGstNumber] = useState<string>("");
  const [notes, setNotes] = useState<string>("Invoice for admission charges");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (taxRate < 0 || taxRate > 100) {
      return;
    }

    if (discount < 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      const initiateData: InitiateDischargeRequest = {
        tax_rate: taxRate,
        discount: discount,
        gst_number: gstNumber.trim() || null,
        notes: notes.trim() || null,
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
        <span className="text-slate-600">
          Tax Rate (%) <span className="text-rose-500">*</span>
        </span>
        <input
          type="number"
          min="0"
          max="100"
          step="0.01"
          value={taxRate}
          onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
          required
        />
      </label>

      <label className="space-y-1">
        <span className="text-slate-600">
          Discount <span className="text-rose-500">*</span>
        </span>
        <input
          type="number"
          min="0"
          step="0.01"
          value={discount}
          onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
          required
        />
      </label>

      <label className="space-y-1 md:col-span-2">
        <span className="text-slate-600">GST Number</span>
        <input
          type="text"
          value={gstNumber}
          onChange={(e) => setGstNumber(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
          placeholder="Enter GST number (optional)"
        />
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
