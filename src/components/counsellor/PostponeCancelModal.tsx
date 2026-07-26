"use client";

import { useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { X, Loader2, AlertTriangle, Calendar } from "lucide-react";
import { PlannedSurgery } from "@/types";
import { counsellorApi } from "@/services/counsellorApi";
import { toast } from "sonner";

interface PostponeCancelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  plannedSurgery: PlannedSurgery;
  mode: "postpone" | "cancel";
}

export function PostponeCancelModal({
  isOpen,
  onClose,
  onSuccess,
  plannedSurgery,
  mode,
}: PostponeCancelModalProps) {
  const isCancel = mode === "cancel";
  const [reason, setReason] = useState("");
  const [cancelledBy, setCancelledBy] = useState<"patient" | "hospital">("patient");
  const [newPlannedDate, setNewPlannedDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.error(`Please provide a reason for ${isCancel ? "cancellation" : "postponement"}`);
      return;
    }

    setSaving(true);
    try {
      if (isCancel) {
        await counsellorApi.cancel(plannedSurgery.id, {
          cancelled_by: cancelledBy,
          cancellation_reason: reason.trim(),
          notes: notes.trim() || undefined,
        });
        toast.success("Surgery cancelled");
      } else {
        await counsellorApi.postpone(plannedSurgery.id, {
          postponement_reason: reason.trim(),
          new_planned_date: newPlannedDate || undefined,
          notes: notes.trim() || undefined,
        });
        toast.success("Surgery postponed");
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || `Failed to ${mode} surgery`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all">
                {/* Header */}
                <div
                  className={`flex items-center justify-between border-b px-6 py-4 ${
                    isCancel
                      ? "border-rose-100 bg-rose-50/70 text-rose-950"
                      : "border-amber-100 bg-amber-50/70 text-amber-950"
                  }`}
                >
                  <div>
                    <Dialog.Title className="text-lg font-semibold flex items-center gap-2">
                      <AlertTriangle
                        className={`h-5 w-5 ${isCancel ? "text-rose-600" : "text-amber-600"}`}
                      />
                      {isCancel ? "Cancel Surgery Advice" : "Postpone Surgery Advice"}
                    </Dialog.Title>
                    <p className="text-xs opacity-80">
                      {plannedSurgery.patient_name} — {plannedSurgery.surgery_name}
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                  {/* Cancelled By (Cancel mode only) */}
                  {isCancel && (
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-slate-700">
                        Cancelled By <span className="text-rose-500">*</span>
                      </label>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setCancelledBy("patient")}
                          className={`flex-1 rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                            cancelledBy === "patient"
                              ? "bg-rose-500 text-white shadow-sm"
                              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                          }`}
                        >
                          Patient Side
                        </button>
                        <button
                          type="button"
                          onClick={() => setCancelledBy("hospital")}
                          className={`flex-1 rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                            cancelledBy === "hospital"
                              ? "bg-rose-500 text-white shadow-sm"
                              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                          }`}
                        >
                          Hospital Side
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Reason */}
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">
                      {isCancel ? "Cancellation Reason" : "Postponement Reason"}{" "}
                      <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder={
                        isCancel
                          ? "State why the surgery is being cancelled (e.g. financial reasons, sought second opinion elsewhere)..."
                          : "State why the surgery is postponed (e.g. uncontrolled BP, awaiting cardiologist clearance, personal conflict)..."
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-sky-400 focus:ring-2 focus:ring-sky-100 resize-none"
                    />
                  </div>

                  {/* New Date (Postpone mode only) */}
                  {!isCancel && (
                    <div className="space-y-1">
                      <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        Tentative Rescheduled Date (Optional)
                      </label>
                      <input
                        type="date"
                        value={newPlannedDate}
                        onChange={(e) => setNewPlannedDate(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                      />
                    </div>
                  )}

                  {/* Additional Notes */}
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">
                      Additional Remarks (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Any additional instructions or follow-up notes..."
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-sky-400 focus:ring-2 focus:ring-sky-100 resize-none"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={onClose}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      Close
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className={`inline-flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all disabled:opacity-50 ${
                        isCancel
                          ? "bg-rose-600 hover:bg-rose-700"
                          : "bg-amber-600 hover:bg-amber-700"
                      }`}
                    >
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : isCancel ? (
                        "Cancel Surgery"
                      ) : (
                        "Postpone Surgery"
                      )}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
