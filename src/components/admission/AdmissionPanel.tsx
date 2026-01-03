"use client";

import { useState } from "react";
import { admitPatient } from "@/redux/admissionsSlice";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { Admission } from "@/types";
import { CreateAdmissionRequest, AdmissionType } from "@/services/admissionsApi";
import { toast } from "sonner";
import { currency } from "@/utils/format";
import { CreditCard } from "lucide-react";

export function AdmissionPanel() {
  const patients = useAppSelector((s) => s.patients.list);
  const doctors = useAppSelector((s) => s.doctors.list);
  const dispatch = useAppDispatch();
  const [form, setForm] = useState({
    patientId: patients[0]?.id ?? "",
    doctorId: doctors[0]?.id ?? "",
    bedId: "",
    reason: "Observation",
    admissionType: "planned" as AdmissionType,
  });
  const [enableAdvancePayment, setEnableAdvancePayment] = useState(false);
  const [advancePaymentAmount, setAdvancePaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentReference, setPaymentReference] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patientId || !form.doctorId || !form.bedId) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Validate advance payment if enabled
    if (enableAdvancePayment) {
      if (!advancePaymentAmount || parseFloat(advancePaymentAmount) <= 0) {
        toast.error("Please enter a valid advance payment amount");
        return;
      }
      if (!paymentMethod) {
        toast.error("Please select a payment method");
        return;
      }
      if ((paymentMethod === "upi" || paymentMethod === "card") && !paymentReference.trim()) {
        toast.error("Payment reference is required for UPI and Card payments");
        return;
      }
    }

    const payload: CreateAdmissionRequest = {
      patient_id: form.patientId,
      doctor_id: form.doctorId,
      bed_id: form.bedId,
      admission_date: new Date().toISOString().split("T")[0],
      admission_type: form.admissionType,
      reason_for_admission: form.reason,
      advance_payment_amount: enableAdvancePayment && advancePaymentAmount ? parseFloat(advancePaymentAmount) : null,
      payment_method: enableAdvancePayment && paymentMethod ? paymentMethod : null,
      payment_reference: enableAdvancePayment && paymentReference.trim() ? paymentReference.trim() : null,
    };
    await dispatch(admitPatient(payload));
    toast.success("Patient admitted");
  };

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-2 gap-3 text-sm">
      <label className="space-y-1">
        <span className="text-slate-600">Patient</span>
        <select
          value={form.patientId}
          onChange={(e) => setForm({ ...form, patientId: e.target.value })}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
        >
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} • {p.healthId}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1">
        <span className="text-slate-600">Doctor</span>
        <select
          value={form.doctorId}
          onChange={(e) => setForm({ ...form, doctorId: e.target.value })}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
        >
          {doctors.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name || `Doctor ${d.id}`}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1">
        <span className="text-slate-600">Admission Type</span>
        <select
          value={form.admissionType}
          onChange={(e) => setForm({ ...form, admissionType: e.target.value as AdmissionType })}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
        >
          <option value="planned">Planned</option>
          <option value="emergency">Emergency</option>
          <option value="transfer">Transfer</option>
          <option value="day_care">Day Care</option>
        </select>
      </label>
      <label className="space-y-1">
        <span className="text-slate-600">Reason</span>
        <input
          value={form.reason}
          onChange={(e) => setForm({ ...form, reason: e.target.value })}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
        />
      </label>
      <label className="space-y-1">
        <span className="text-slate-600">Bed ID</span>
        <input
          value={form.bedId}
          onChange={(e) => setForm({ ...form, bedId: e.target.value })}
          placeholder="Enter bed ID"
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
        />
      </label>

      {/* Advance Payment Section */}
      <div className="col-span-2 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={enableAdvancePayment}
            onChange={(e) => {
              setEnableAdvancePayment(e.target.checked);
              if (!e.target.checked) {
                setAdvancePaymentAmount("");
                setPaymentMethod("");
                setPaymentReference("");
              }
            }}
            className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
          />
          <span className="text-slate-700 flex items-center gap-1 text-sm">
            <CreditCard className="h-3 w-3" />
            Collect Advance Payment (Optional)
          </span>
        </label>

        {enableAdvancePayment && (
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className="text-slate-600 text-xs">
                Advance Payment Amount <span className="text-rose-500">*</span>
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={advancePaymentAmount}
                onChange={(e) => setAdvancePaymentAmount(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
                placeholder="0.00"
                required={enableAdvancePayment}
              />
              {advancePaymentAmount && parseFloat(advancePaymentAmount) > 0 && (
                <p className="text-xs text-slate-500">{currency(parseFloat(advancePaymentAmount))}</p>
              )}
            </label>

            <label className="space-y-1">
              <span className="text-slate-600 text-xs">
                Payment Method <span className="text-rose-500">*</span>
              </span>
              <select
                value={paymentMethod}
                onChange={(e) => {
                  setPaymentMethod(e.target.value);
                  if (e.target.value !== "upi" && e.target.value !== "card") {
                    setPaymentReference("");
                  }
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
                required={enableAdvancePayment}
              >
                <option value="">Select method</option>
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
                <option value="cheque">Cheque</option>
              </select>
            </label>

            {(paymentMethod === "upi" || paymentMethod === "card") && (
              <label className="col-span-2 space-y-1">
                <span className="text-slate-600 text-xs">
                  Payment Reference <span className="text-rose-500">*</span>
                </span>
                <input
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
                  placeholder={paymentMethod === "upi" ? "UPI transaction ID" : "Card transaction ID"}
                  required={paymentMethod === "upi" || paymentMethod === "card"}
                />
              </label>
            )}
          </div>
        )}
      </div>

      <div className="col-span-2 flex justify-end">
        <button
          type="submit"
          className="rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 font-semibold text-white shadow-sm hover:shadow"
        >
          Admit patient
        </button>
      </div>
    </form>
  );
}

