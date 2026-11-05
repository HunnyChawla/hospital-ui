"use client";

import { useState } from "react";
import { Modal } from "@/components/common/Modal";
import {
  pharmacyApi,
  CreateReturnData,
} from "@/services/pharmacyApi";
import { toast } from "sonner";
import { Search, RotateCcw } from "lucide-react";
import { getErrorMessage } from "@/utils/errorHandler";

interface ProcessReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ProcessReturnModal({
  isOpen,
  onClose,
  onSuccess,
}: ProcessReturnModalProps) {
  const [dispensingIdInput, setDispensingIdInput] = useState("");
  const [dispensingData, setDispensingData] = useState<any | null>(null);
  const [searching, setSearching] = useState(false);
  const [returnReason, setReturnReason] = useState("Prescription modified by doctor");
  const [returnRows, setReturnRows] = useState<
    Array<{
      dispensing_item_id: string;
      medicine_name: string;
      batch_number: string;
      dispensed_qty: number;
      unit_price: number;
      return_qty: number;
      condition: "saleable" | "damaged" | "expired";
      restock_eligible: boolean;
    }>
  >([]);
  const [saving, setSaving] = useState(false);

  const handleLookupDispensing = async () => {
    if (!dispensingIdInput.trim()) {
      toast.error("Please enter a Dispensing ID or Prescription ID");
      return;
    }

    try {
      setSearching(true);
      // Dispensing response query
      const res = await pharmacyApi.getPrescriptionDispenseDetail(dispensingIdInput.trim());
      if (res && res.past_dispensings && res.past_dispensings.length > 0) {
        const latestDisp = res.past_dispensings[0];
        setDispensingData(latestDisp);
        setReturnRows(
          latestDisp.items.map((it: any) => ({
            dispensing_item_id: it.id,
            medicine_name: it.medicine_name,
            batch_number: it.batch_number,
            dispensed_qty: Number(it.quantity),
            unit_price: Number(it.unit_price),
            return_qty: 0,
            condition: "saleable",
            restock_eligible: true,
          }))
        );
      } else {
        toast.error("No confirmed dispensing found for this prescription ID.");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(getErrorMessage(err) || "Failed to locate dispensing transaction.");
    } finally {
      setSearching(false);
    }
  };

  const handleRowChange = (index: number, field: string, value: any) => {
    const updated = [...returnRows];
    updated[index] = { ...updated[index], [field]: value };
    // If condition is changed to damaged or expired, uncheck restock_eligible
    if (field === "condition" && value !== "saleable") {
      updated[index].restock_eligible = false;
    }
    setReturnRows(updated);
  };

  const calculateTotalRefund = () => {
    return returnRows.reduce((acc, row) => acc + row.return_qty * row.unit_price, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispensingData) {
      toast.error("Please lookup a valid dispensing transaction first");
      return;
    }

    const itemsToReturn = returnRows.filter((r) => r.return_qty > 0);
    if (itemsToReturn.length === 0) {
      toast.error("Please enter a return quantity > 0 for at least one medicine");
      return;
    }

    for (const r of itemsToReturn) {
      if (r.return_qty > r.dispensed_qty) {
        toast.error(
          `Return quantity (${r.return_qty}) for ${r.medicine_name} exceeds dispensed quantity (${r.dispensed_qty})`
        );
        return;
      }
    }

    try {
      setSaving(true);
      const payload: CreateReturnData = {
        dispensing_id: dispensingData.id,
        return_reason: returnReason,
        items: itemsToReturn.map((r) => ({
          dispensing_item_id: r.dispensing_item_id,
          return_qty: r.return_qty,
          condition: r.condition,
          restock_eligible: r.restock_eligible,
        })),
      };

      const ret = await pharmacyApi.createReturn(payload);
      toast.success(
        `Return ${ret.return_number} approved! Refund of ₹${Number(ret.total_refund).toFixed(2)} recorded.`
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(getErrorMessage(err) || "Failed to process medicine return");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Process Patient Medicine Return" size="xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Dispensing Lookup */}
        <div className="rounded-xl bg-slate-50 p-4 border border-slate-200/60 space-y-3">
          <label className="block text-xs font-semibold text-slate-800">
            Step 1: Lookup Prescription ID
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={dispensingIdInput}
              onChange={(e) => setDispensingIdInput(e.target.value)}
              placeholder="Enter Prescription UUID..."
              className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-hidden"
            />
            <button
              type="button"
              disabled={searching}
              onClick={handleLookupDispensing}
              className="flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 transition cursor-pointer disabled:opacity-50"
            >
              <Search className="h-4 w-4" />
              {searching ? "Searching..." : "Lookup"}
            </button>
          </div>

          {dispensingData && (
            <div className="pt-2 border-t border-slate-200/60 text-xs flex justify-between text-slate-700">
              <span>
                Dispensing ID: <span className="font-mono">{dispensingData.id}</span>
              </span>
              <span>
                Dispensed on: {new Date(dispensingData.dispensed_at).toLocaleDateString()}
              </span>
              <span className="font-bold text-sky-700">
                Invoice: {dispensingData.invoice_number || "IPD Account"}
              </span>
            </div>
          )}
        </div>

        {/* Step 2: Select Return Items */}
        {dispensingData && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-800">
                Step 2: Select Items and Return Condition
              </label>
              <span className="text-xs text-slate-500">
                Saleable items will return strictly to the original batch stock.
              </span>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Medicine</th>
                    <th className="py-2.5 px-3">Batch</th>
                    <th className="py-2.5 px-3 text-right">Dispensed</th>
                    <th className="py-2.5 px-3 text-right">Unit Price</th>
                    <th className="py-2.5 px-3 text-right w-24">Return Qty</th>
                    <th className="py-2.5 px-3">Condition</th>
                    <th className="py-2.5 px-3 text-center">Restock to Batch</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {returnRows.map((row, idx) => (
                    <tr key={row.dispensing_item_id} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-medium text-slate-800">{row.medicine_name}</td>
                      <td className="py-2 px-3 font-mono text-slate-600">{row.batch_number}</td>
                      <td className="py-2 px-3 text-right text-slate-600">{row.dispensed_qty}</td>
                      <td className="py-2 px-3 text-right text-slate-600">₹{row.unit_price.toFixed(2)}</td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          min="0"
                          max={row.dispensed_qty}
                          value={row.return_qty}
                          onChange={(e) =>
                            handleRowChange(idx, "return_qty", Number(e.target.value))
                          }
                          className="w-full rounded-lg border border-slate-200 px-2 py-1 text-center font-bold text-slate-900 focus:border-sky-500 focus:outline-hidden"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <select
                          value={row.condition}
                          onChange={(e) => handleRowChange(idx, "condition", e.target.value)}
                          className="rounded-lg border border-slate-200 px-2 py-1 text-xs focus:border-sky-500 focus:outline-hidden"
                        >
                          <option value="saleable">Saleable (Good)</option>
                          <option value="damaged">Damaged</option>
                          <option value="expired">Expired</option>
                        </select>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <input
                          type="checkbox"
                          disabled={row.condition !== "saleable"}
                          checked={row.restock_eligible}
                          onChange={(e) =>
                            handleRowChange(idx, "restock_eligible", e.target.checked)
                          }
                          className="h-4 w-4 rounded text-sky-600 focus:ring-sky-500"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Return Reason */}
            <div>
              <label className="block text-xs font-medium text-slate-700">Reason for Return</label>
              <input
                type="text"
                required
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                placeholder="e.g. Doctor changed prescription / extra tablets / allergic reaction"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-hidden"
              />
            </div>

            {/* Refund Total */}
            <div className="flex justify-between items-center bg-teal-50 p-3 rounded-xl border border-teal-200 text-xs">
              <span className="font-medium text-teal-800">Total Refund Calculated:</span>
              <span className="text-base font-bold text-teal-900">
                ₹{calculateTotalRefund().toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {/* Modal Actions */}
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
            disabled={saving || !dispensingData || calculateTotalRefund() <= 0}
            className="flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-500 transition disabled:opacity-50 cursor-pointer"
          >
            <RotateCcw className="h-4 w-4" />
            {saving ? "Processing Return..." : "Approve Return & Refund"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
