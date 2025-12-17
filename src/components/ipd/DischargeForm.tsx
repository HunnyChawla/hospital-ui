"use client";

import { useState, useEffect } from "react";
import { DischargeRequest, DischargeType } from "@/services/admissionsApi";
import { Calendar } from "lucide-react";

interface DischargeFormProps {
  onSuccess?: () => void;
  onSubmit: (data: DischargeRequest) => Promise<void>;
}

export function DischargeForm({ onSuccess, onSubmit }: DischargeFormProps) {
  const [dischargeDate, setDischargeDate] = useState("");
  const [dischargeType, setDischargeType] = useState<DischargeType>("normal");
  const [dischargeSummary, setDischargeSummary] = useState("");
  const [dischargeInstructions, setDischargeInstructions] = useState("");
  const [finalDiagnosis, setFinalDiagnosis] = useState("");
  const [createInvoice, setCreateInvoice] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [paymentReference, setPaymentReference] = useState("");
  const [taxRate, setTaxRate] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setDischargeDate(today);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!dischargeDate || !dischargeType) {
      return;
    }

    // Validate payment reference if payment method is upi
    if (paymentMethod === "upi" && !paymentReference.trim()) {
      alert("Payment reference is required when payment method is UPI");
      return;
    }

    setIsSubmitting(true);
    try {
      const dischargeData: DischargeRequest = {
        discharge_date: dischargeDate,
        discharge_type: dischargeType,
        discharge_summary: dischargeSummary.trim() || null,
        discharge_instructions: dischargeInstructions.trim() || null,
        final_diagnosis: finalDiagnosis.trim() || null,
        create_invoice: createInvoice,
        payment_method: paymentMethod || null,
        payment_reference: paymentReference.trim() || null,
        tax_rate: taxRate > 0 ? taxRate : null,
        discount: discount > 0 ? discount : null,
      };

      await onSubmit(dischargeData);
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

      <label className="md:col-span-2 flex items-center gap-2">
        <input
          type="checkbox"
          checked={createInvoice}
          onChange={(e) => setCreateInvoice(e.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
        />
        <span className="text-slate-600">Create invoice automatically on discharge</span>
      </label>

      {createInvoice && (
        <>
          <label className="space-y-1">
            <span className="text-slate-600">Payment Method</span>
            <select
              value={paymentMethod}
              onChange={(e) => {
                setPaymentMethod(e.target.value);
                if (e.target.value !== "upi") {
                  setPaymentReference("");
                }
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
            >
              <option value="">Select payment method</option>
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
            </select>
          </label>

          {paymentMethod === "upi" && (
            <label className="space-y-1">
              <span className="text-slate-600">
                Payment Reference <span className="text-rose-500">*</span>
              </span>
              <input
                type="text"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
                placeholder="UPI transaction ID"
                required={paymentMethod === "upi"}
              />
            </label>
          )}

          <label className="space-y-1">
            <span className="text-slate-600">Tax Rate (%)</span>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={taxRate}
              onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
              placeholder="0"
            />
          </label>

          <label className="space-y-1">
            <span className="text-slate-600">Discount (₹)</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={discount}
              onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
              placeholder="0.00"
            />
          </label>
        </>
      )}

      <div className="md:col-span-2 flex justify-end gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 font-semibold text-white shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Discharging..." : "Discharge Patient"}
        </button>
      </div>
    </form>
  );
}

