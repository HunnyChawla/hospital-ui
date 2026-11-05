"use client";

import { useState } from "react";
import { Modal } from "@/components/common/Modal";
import { MedicineBatch, pharmacyApi } from "@/services/pharmacyApi";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";

interface StockAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  batch: MedicineBatch | null;
  onSuccess: () => void;
}

const ADJUSTMENT_REASONS = [
  "Physical count reconciliation / audit",
  "Damaged packaging / spillage write-off",
  "Expired stock disposal",
  "Correction of data entry error",
  "Quality check sample deduction",
  "Internal hospital department requisition",
];

export function StockAdjustmentModal({
  isOpen,
  onClose,
  batch,
  onSuccess,
}: StockAdjustmentModalProps) {
  const [adjustmentType, setAdjustmentType] = useState<"ADD" | "DEDUCT">("DEDUCT");
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState(ADJUSTMENT_REASONS[0]);
  const [customReason, setCustomReason] = useState("");
  const [saving, setSaving] = useState(false);

  if (!batch) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity <= 0) {
      toast.error("Adjustment quantity must be greater than zero");
      return;
    }

    if (adjustmentType === "DEDUCT" && quantity > Number(batch.qty_available)) {
      toast.error(
        `Cannot deduct ${quantity} units. Available stock is only ${batch.qty_available}`
      );
      return;
    }

    const finalReason = customReason.trim() ? `${reason}: ${customReason}` : reason;

    try {
      setSaving(true);
      await pharmacyApi.adjustStock({
        medicine_id: batch.medicine_id,
        batch_id: batch.id,
        quantity,
        adjustment_type: adjustmentType,
        reason: finalReason,
      });
      toast.success("Stock adjusted successfully and ledger updated");
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(getErrorMessage(err) || "Failed to adjust stock");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manual Stock Adjustment" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Batch Info Card */}
        <div className="rounded-xl bg-slate-50 p-3 text-xs border border-slate-200/60 space-y-1">
          <div className="flex justify-between font-medium text-slate-800">
            <span>Medicine:</span>
            <span>{batch.medicine_name}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Batch Number:</span>
            <span className="font-mono font-medium">{batch.batch_number}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Expiry Date:</span>
            <span>{batch.expiry_date}</span>
          </div>
          <div className="flex justify-between text-slate-600 border-t border-slate-200/60 pt-1 font-semibold text-sky-700">
            <span>Currently Available:</span>
            <span>{batch.qty_available} units</span>
          </div>
        </div>

        {/* Adjustment Type Toggle */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Adjustment Type
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setAdjustmentType("DEDUCT")}
              className={`rounded-xl py-2 text-xs font-semibold border transition cursor-pointer ${
                adjustmentType === "DEDUCT"
                  ? "bg-rose-50 border-rose-300 text-rose-700"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              - Deduct Stock (Write-off)
            </button>
            <button
              type="button"
              onClick={() => setAdjustmentType("ADD")}
              className={`rounded-xl py-2 text-xs font-semibold border transition cursor-pointer ${
                adjustmentType === "ADD"
                  ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              + Add Stock (Correction)
            </button>
          </div>
        </div>

        {/* Quantity */}
        <div>
          <label className="block text-xs font-medium text-slate-700">
            Quantity to {adjustmentType === "ADD" ? "Add" : "Deduct"}
          </label>
          <input
            type="number"
            min="1"
            max={adjustmentType === "DEDUCT" ? Number(batch.qty_available) : 999999}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-hidden"
          />
        </div>

        {/* Reason Select */}
        <div>
          <label className="block text-xs font-medium text-slate-700">Reason Category</label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-hidden"
          >
            {ADJUSTMENT_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        {/* Custom Reason Notes */}
        <div>
          <label className="block text-xs font-medium text-slate-700">Detailed Notes</label>
          <input
            type="text"
            value={customReason}
            onChange={(e) => setCustomReason(e.target.value)}
            placeholder="e.g. Auditor voucher ref #7721"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-hidden"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className={`rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm transition disabled:opacity-50 cursor-pointer ${
              adjustmentType === "DEDUCT"
                ? "bg-rose-600 hover:bg-rose-500"
                : "bg-emerald-600 hover:bg-emerald-500"
            }`}
          >
            {saving ? "Adjusting..." : `Confirm ${adjustmentType === "ADD" ? "Addition" : "Deduction"}`}
          </button>
        </div>
      </form>
    </Modal>
  );
}
