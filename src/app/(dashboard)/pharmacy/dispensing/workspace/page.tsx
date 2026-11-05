"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  User,
  BedDouble,
  Activity,
  AlertTriangle,
  Pill,
  Sparkles,
  Receipt,
  RotateCcw,
} from "lucide-react";
import { PharmacyNav } from "@/components/pharmacy/PharmacyNav";
import {
  pharmacyApi,
  PrescriptionDispenseDetail,
  ConfirmDispensingData,
  MedicineBatch,
} from "@/services/pharmacyApi";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";

interface LineDispenseState {
  prescription_item_id: string;
  medicine_id: string;
  medicine_name: string;
  selected_batch_id: string;
  fefo_batch_id: string;
  quantity: number;
  unit_price: number;
  discount: number;
  tax_rate: number;
  override_reason: string;
  should_dispense: boolean;
}

function WorkspaceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prescriptionId = searchParams.get("prescription_id") || "";

  const [detail, setDetail] = useState<PrescriptionDispenseDetail | null>(null);
  const [lineStates, setLineStates] = useState<Record<string, LineDispenseState>>({});
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadPrescription = async () => {
    if (!prescriptionId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await pharmacyApi.getPrescriptionDispenseDetail(prescriptionId);
      setDetail(res);

      // Initialize line states
      const initialStates: Record<string, LineDispenseState> = {};
      res.medicines.forEach((med) => {
        const availableBatches = med.available_batches || (med as any).suggested_batches || [];
        const fefoBatch = med.fefo_batch || availableBatches[0];
        const remQty = Number(med.remaining_quantity);
        const availStock = Number(med.total_available_stock ?? (med as any).available_stock ?? 0);
        const hasStock = availStock > 0 && fefoBatch;
        const bId = fefoBatch?.id || (fefoBatch as any)?.batch_id || "";

        initialStates[med.prescription_item_id] = {
          prescription_item_id: med.prescription_item_id,
          medicine_id: med.medicine_id,
          medicine_name: med.medicine_name,
          selected_batch_id: bId,
          fefo_batch_id: bId,
          quantity: hasStock ? Math.min(remQty, Number(fefoBatch.qty_available)) : 0,
          unit_price: Number(fefoBatch?.selling_price || fefoBatch?.mrp || 0),
          discount: 0,
          tax_rate: 12,
          override_reason: "",
          should_dispense: remQty > 0 && !!hasStock,
        };
      });
      setLineStates(initialStates);
    } catch (err: any) {
      console.error(err);
      toast.error(getErrorMessage(err) || "Failed to load prescription dispensing details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPrescription();
  }, [prescriptionId]);

  const handleBatchChange = (
    prescriptionItemId: string,
    batchId: string,
    availableBatches: any[]
  ) => {
    const batch = (availableBatches || []).find((b: any) => (b.id || b.batch_id) === batchId);
    if (!batch) return;

    setLineStates((prev) => {
      const cur = prev[prescriptionItemId];
      const isOverride = batchId !== cur.fefo_batch_id;
      return {
        ...prev,
        [prescriptionItemId]: {
          ...cur,
          selected_batch_id: batchId,
          unit_price: Number(batch.selling_price || batch.mrp || 0),
          quantity: Math.min(cur.quantity || 1, Number(batch.qty_available)),
          override_reason: isOverride ? cur.override_reason : "",
        },
      };
    });
  };

  const handleQtyChange = (prescriptionItemId: string, qty: number, maxStock: number) => {
    setLineStates((prev) => ({
      ...prev,
      [prescriptionItemId]: {
        ...prev[prescriptionItemId],
        quantity: Math.max(0, Math.min(qty, maxStock)),
      },
    }));
  };

  const handleToggleDispense = (prescriptionItemId: string) => {
    setLineStates((prev) => ({
      ...prev,
      [prescriptionItemId]: {
        ...prev[prescriptionItemId],
        should_dispense: !prev[prescriptionItemId].should_dispense,
      },
    }));
  };

  const handleOverrideReasonChange = (prescriptionItemId: string, reason: string) => {
    setLineStates((prev) => ({
      ...prev,
      [prescriptionItemId]: {
        ...prev[prescriptionItemId],
        override_reason: reason,
      },
    }));
  };

  // Summary calculations
  const calculateTotals = () => {
    let subtotal = 0;
    let totalTax = 0;

    Object.values(lineStates).forEach((item) => {
      if (!item.should_dispense || item.quantity <= 0) return;
      const lineGross = item.quantity * item.unit_price;
      const lineNet = Math.max(0, lineGross - item.discount);
      const lineTax = (lineNet * item.tax_rate) / 100;
      subtotal += lineNet;
      totalTax += lineTax;
    });

    const grandTotal = subtotal + totalTax;
    return { subtotal, totalTax, grandTotal };
  };

  const totals = calculateTotals();

  const handleConfirmDispensing = async () => {
    if (!detail) return;

    const itemsToDispense = Object.values(lineStates).filter(
      (it) => it.should_dispense && it.quantity > 0
    );

    if (itemsToDispense.length === 0) {
      toast.error("Please select at least one medicine with quantity > 0 to dispense");
      return;
    }

    // Verify FEFO override reason if non-FEFO batch chosen
    for (const item of itemsToDispense) {
      if (
        item.fefo_batch_id &&
        item.selected_batch_id !== item.fefo_batch_id &&
        !item.override_reason.trim()
      ) {
        toast.error(
          `Please provide a batch override reason for ${item.medicine_name} since a different batch was selected.`
        );
        return;
      }
    }

    try {
      setSubmitting(true);
      const payload: ConfirmDispensingData = {
        prescription_id: detail.prescription_id,
        patient_id: detail.patient_id,
        visit_id: detail.visit_id,
        admission_id: detail.admission_id,
        notes: notes || undefined,
        idempotency_key: `disp-${detail.prescription_id}-${Date.now()}`,
        items: itemsToDispense.map((it) => ({
          prescription_item_id: it.prescription_item_id,
          medicine_id: it.medicine_id,
          batch_id: it.selected_batch_id,
          quantity: it.quantity,
          unit_price: it.unit_price,
          discount: it.discount,
          tax_rate: it.tax_rate,
          batch_override_reason: it.override_reason || undefined,
        })),
      };

      const result = await pharmacyApi.confirmDispensing(payload);

      if (detail.encounter_type === "IPD") {
        toast.success(
          `Medicines dispensed! Charges of ₹${result.total_amount.toFixed(2)} posted directly to IPD admission account.`
        );
      } else {
        toast.success(
          `Medicines dispensed! Invoice ${result.invoice_number || ""} generated successfully.`
        );
      }

      router.push("/pharmacy/dispensing");
    } catch (err: any) {
      console.error(err);
      toast.error(getErrorMessage(err) || "Failed to confirm dispensing");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <PharmacyNav />
        <div className="py-20 text-center text-slate-400">Loading prescription workspace...</div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="space-y-4">
        <PharmacyNav />
        <div className="py-20 text-center text-slate-400">Prescription not found or invalid prescription ID.</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/pharmacy/dispensing"
            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50 transition"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">Dispense Prescription</h1>
              <span className="font-mono text-sm text-slate-500 font-medium">
                {detail.prescription_number}
              </span>
            </div>
            <p className="text-sm text-slate-500">
              Prescribed by {detail.doctor_name || "Doctor"} on {new Date(detail.prescription_date).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Encounter Badge */}
        <div>
          {detail.encounter_type === "IPD" ? (
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-purple-100 px-3 py-1.5 text-xs font-semibold text-purple-800">
              <BedDouble className="h-4 w-4" />
              IPD Inpatient
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-sky-100 px-3 py-1.5 text-xs font-semibold text-sky-800">
              <Activity className="h-4 w-4" />
              OPD Outpatient
            </span>
          )}
        </div>
      </div>

      <PharmacyNav />

      {/* Patient Profile Card & Encounter Notice */}
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-400 block">Patient Name</span>
            <span className="font-semibold text-slate-900 text-sm">{detail.patient_name}</span>
          </div>
          <div>
            <span className="text-slate-400 block">UHID</span>
            <span className="font-mono font-medium text-slate-800">{detail.patient_uhid}</span>
          </div>
          <div>
            <span className="text-slate-400 block">Age & Gender</span>
            <span className="text-slate-700">
              {detail.patient_age ? `${detail.patient_age} yrs` : "-"} / {detail.patient_gender || "-"}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block">Contact Phone</span>
            <span className="text-slate-700">{detail.patient_phone || "-"}</span>
          </div>
        </div>

        {/* Diagnosis if available */}
        {detail.diagnosis && (
          <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            <span className="font-semibold text-slate-700">Diagnosis:</span> {detail.diagnosis}
          </div>
        )}

        {/* Billing Workflow Notice */}
        {detail.encounter_type === "IPD" ? (
          <div className="flex items-center gap-2 rounded-xl bg-purple-50 p-3 text-xs text-purple-800 border border-purple-200/60">
            <BedDouble className="h-4 w-4 text-purple-600 shrink-0" />
            <span>
              <strong>IPD Integrated Billing:</strong> Dispensing confirmation will automatically post medicine charges to Admission account. Cash collection at the pharmacy counter is bypassed.
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-xl bg-sky-50 p-3 text-xs text-sky-800 border border-sky-200/60">
            <Receipt className="h-4 w-4 text-sky-600 shrink-0" />
            <span>
              <strong>OPD Billing:</strong> Pharmacy sales invoice will be automatically generated upon dispensing confirmation.
            </span>
          </div>
        )}
      </div>

      {/* Prescribed Medicines & FEFO Selection */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">Prescribed Medicines ({detail.medicines.length})</h2>

        <div className="space-y-3">
          {detail.medicines.map((item) => {
            const state = lineStates[item.prescription_item_id];
            if (!state) return null;

            const remQty = Number(item.remaining_quantity);
            const isFullyDispensed = remQty <= 0;
            const availableBatches = item.available_batches || (item as any).suggested_batches || [];
            const availStock = Number(item.total_available_stock ?? (item as any).available_stock ?? 0);
            const hasStock = availStock > 0;
            const selectedBatch = availableBatches.find(
              (b: any) => (b.id || b.batch_id) === state.selected_batch_id
            );
            const isOverridden = state.fefo_batch_id && state.selected_batch_id !== state.fefo_batch_id;

            return (
              <div
                key={item.prescription_item_id}
                className={`rounded-2xl border p-4 transition ${
                  isFullyDispensed
                    ? "bg-slate-50/50 border-slate-200/60 opacity-60"
                    : state.should_dispense
                    ? "bg-white border-sky-200 shadow-xs"
                    : "bg-white border-slate-200"
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: Prescribed Details */}
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      disabled={isFullyDispensed || !hasStock}
                      checked={state.should_dispense}
                      onChange={() => handleToggleDispense(item.prescription_item_id)}
                      className="mt-1 h-4 w-4 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 text-sm">{item.medicine_name}</span>
                        {item.generic_name && (
                          <span className="text-xs text-slate-400">({item.generic_name})</span>
                        )}
                        {isFullyDispensed && (
                          <span className="inline-flex items-center rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                            Fully Dispensed
                          </span>
                        )}
                      </div>

                      {/* Dosage, Frequency, Instructions */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1">
                        {item.dosage && <span>Dose: <strong>{item.dosage}</strong></span>}
                        {item.frequency && <span>Freq: <strong>{item.frequency}</strong></span>}
                        {item.duration && <span>Duration: <strong>{item.duration}</strong></span>}
                        {item.instructions && <span>• {item.instructions}</span>}
                      </div>

                      {/* Prescribed vs Dispensed Metrics */}
                      <div className="flex items-center gap-4 text-xs mt-2">
                        <span className="text-slate-600">
                          Prescribed: <strong>{item.prescribed_quantity}</strong>
                        </span>
                        <span className="text-slate-600">
                          Dispensed: <strong>{item.dispensed_quantity}</strong>
                        </span>
                        <span className="text-sky-700 font-semibold">
                          Remaining: {remQty}
                        </span>
                        <span className="text-slate-400">|</span>
                        <span
                          className={`font-medium ${
                            hasStock ? "text-emerald-600" : "text-rose-600"
                          }`}
                        >
                          Stock Available: {item.total_available_stock}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Batch Selection (FEFO) & Quantity */}
                  {!isFullyDispensed && hasStock && state.should_dispense && (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                      {/* Batch Selector */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-medium text-slate-600">
                            Batch (FEFO Ordered)
                          </label>
                          {state.selected_batch_id === state.fefo_batch_id && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-teal-700">
                              <Sparkles className="h-3 w-3" />
                              FEFO
                            </span>
                          )}
                        </div>
                        <select
                          value={state.selected_batch_id}
                          onChange={(e) =>
                            handleBatchChange(
                              item.prescription_item_id,
                              e.target.value,
                              availableBatches
                            )
                          }
                          className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs focus:border-sky-500 focus:outline-hidden"
                        >
                          {availableBatches.map((b: any) => {
                            const bId = b.id || b.batch_id;
                            return (
                              <option key={bId} value={bId}>
                                {b.batch_number} (Exp: {b.expiry_date}, Avail: {b.qty_available}, MRP: ₹{b.mrp})
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      {/* Dispense Qty Input */}
                      <div>
                        <label className="text-[11px] font-medium text-slate-600 block mb-1">
                          Qty to Dispense
                        </label>
                        <input
                          type="number"
                          min="1"
                          max={Math.min(remQty, Number(selectedBatch?.qty_available || remQty))}
                          value={state.quantity}
                          onChange={(e) =>
                            handleQtyChange(
                              item.prescription_item_id,
                              Number(e.target.value),
                              Number(selectedBatch?.qty_available || remQty)
                            )
                          }
                          className="w-20 rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-xs text-center font-bold text-slate-900 focus:border-sky-500 focus:outline-hidden"
                        />
                      </div>

                      {/* Line Total */}
                      <div className="text-right sm:min-w-[80px]">
                        <span className="text-[11px] text-slate-400 block">Total</span>
                        <span className="text-xs font-bold text-slate-900">
                          ₹{(state.quantity * state.unit_price).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}

                  {!hasStock && !isFullyDispensed && (
                    <div className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 border border-rose-200">
                      Out of Stock! Cannot dispense.
                    </div>
                  )}
                </div>

                {/* Batch Override Reason Input (if non-FEFO batch chosen) */}
                {isOverridden && state.should_dispense && (
                  <div className="mt-3 pt-3 border-t border-amber-200/60 bg-amber-50/50 p-2.5 rounded-xl">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 mb-1">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      FEFO Batch Override Detected
                    </div>
                    <input
                      type="text"
                      required
                      value={state.override_reason}
                      onChange={(e) =>
                        handleOverrideReasonChange(item.prescription_item_id, e.target.value)
                      }
                      placeholder="Enter pharmacist override reason (e.g. Doctor specifically requested this batch / emergency dispense)"
                      className="w-full rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-xs focus:border-amber-500 focus:outline-hidden"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Confirmation & Summary Footer */}
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="sm:w-1/2">
            <label className="block text-xs font-medium text-slate-700">Pharmacist Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Patient advised to take after meals; explained dosage precautions"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-hidden"
            />
          </div>

          <div className="space-y-1 text-xs text-slate-600 sm:w-64">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="font-medium text-slate-800">₹{totals.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Applicable Tax:</span>
              <span className="font-medium text-slate-800">₹{totals.totalTax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-900">
              <span>Grand Total:</span>
              <span className="text-sky-600">₹{totals.grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end pt-3 border-t border-slate-100">
          <button
            type="button"
            disabled={submitting || totals.grandTotal <= 0}
            onClick={handleConfirmDispensing}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:shadow-md transition disabled:opacity-50 cursor-pointer"
          >
            <CheckCircle2 className="h-4 w-4" />
            {submitting ? "Processing Dispensing..." : "Confirm Dispensing & Update Stock"}
          </button>
        </div>
      </div>

      {/* Past Dispensing History for this Prescription */}
      {detail.past_dispensings && detail.past_dispensings.length > 0 && (
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs space-y-3">
          <h3 className="text-sm font-semibold text-slate-900">Past Dispensing Sessions on this Prescription</h3>
          <div className="divide-y divide-slate-100">
            {detail.past_dispensings.map((disp) => (
              <div key={disp.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <div className="font-medium text-slate-800">
                    Dispensed by <span className="font-semibold">{disp.dispensed_by}</span> on{" "}
                    {new Date(disp.dispensed_at).toLocaleString()}
                  </div>
                  <div className="text-slate-500 mt-1">
                    {disp.items.map((it) => `${it.medicine_name} (${it.quantity} units, Batch ${it.batch_number})`).join(", ")}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-slate-900">₹{disp.total_amount.toFixed(2)}</div>
                  {disp.invoice_number && (
                    <span className="text-[11px] font-mono text-sky-600">Inv: {disp.invoice_number}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DispensingWorkspacePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading dispensing workspace...</div>}>
      <WorkspaceContent />
    </Suspense>
  );
}
