"use client";

import { useState } from "react";
import { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import {
  X,
  MessageSquare,
  Clock,
  ShieldAlert,
  CheckCircle2,
  PhoneCall,
  AlertCircle,
  FileCheck,
  UserX,
  IndianRupee,
} from "lucide-react";
import { PlannedSurgery, PlannedSurgeryStatus } from "@/types";
import { counsellorApi } from "@/services/counsellorApi";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";

interface LogInteractionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  plannedSurgery: PlannedSurgery;
}

type ActionCategory = "call_log" | "set_blocker" | "clear_blocker" | "decline_lost";

export function LogInteractionModal({
  isOpen,
  onClose,
  onSuccess,
  plannedSurgery,
}: LogInteractionModalProps) {
  const [category, setCategory] = useState<ActionCategory>("call_log");

  // Call Log State
  const [callNotes, setCallNotes] = useState("");

  // Blocker State
  const [blockerType, setBlockerType] = useState<
    "pending_patient_decision" | "pending_insurance" | "pending_investigations" | "pending_fitness"
  >("pending_patient_decision");
  const [blockerNotes, setBlockerNotes] = useState("");

  // Clear Blocker State
  const [clearedType, setClearedType] = useState<"fitness_cleared" | "insurance_approved" | "reports_ready">("fitness_cleared");
  const [clearedNotes, setClearedNotes] = useState("");

  // Decline / Lost State
  const [declineType, setDeclineType] = useState<"cancelled_by_patient" | "lost_to_followup">("cancelled_by_patient");
  const [declineReason, setDeclineReason] = useState("");

  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      let interaction_type = "counselling_discussion";
      let notes = "";
      let to_status: PlannedSurgeryStatus | undefined = undefined;

      if (category === "call_log") {
        interaction_type = "call_logged";
        notes = callNotes.trim() || "Counsellor logged call/follow-up with patient.";
        // Auto-advance advised to counselling_in_progress if advised or postponed
        if (["advised", "postponed"].includes(plannedSurgery.status)) {
          to_status = "counselling_in_progress";
        }
      } else if (category === "set_blocker") {
        interaction_type = "blocker_marked";
        notes = blockerNotes.trim() || `Marked pending: ${blockerType.replace(/_/g, " ")}`;
        to_status = blockerType as PlannedSurgeryStatus;
      } else if (category === "clear_blocker") {
        interaction_type = "blocker_cleared";
        notes = clearedNotes.trim() || `Cleared blocker: ${clearedType.replace(/_/g, " ")}`;
        to_status = "counselling_in_progress";
      } else if (category === "decline_lost") {
        interaction_type = declineType === "lost_to_followup" ? "lost_to_followup" : "patient_declined";
        notes = declineReason.trim() || `Patient ${declineType.replace(/_/g, " ")}`;
        to_status = declineType as PlannedSurgeryStatus;
      }

      await counsellorApi.logInteraction(plannedSurgery.id, {
        interaction_type,
        notes,
        to_status,
      });

      toast.success("Interaction logged successfully");
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(getErrorMessage(error) || "Failed to log interaction");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                {/* Header */}
                <div className="border-b border-slate-200 bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
                  <div>
                    <Dialog.Title className="text-base font-bold flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-sky-400" />
                      Log Counsellor Action
                    </Dialog.Title>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {plannedSurgery.patient_name} — {plannedSurgery.surgery_name}
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Category Action Cards */}
                <div className="p-6 space-y-5">
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setCategory("call_log")}
                      className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                        category === "call_log"
                          ? "border-sky-500 bg-sky-50 ring-2 ring-sky-200"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <span className="flex items-center gap-1.5 text-xs font-bold text-sky-900">
                        <PhoneCall className="h-4 w-4 text-sky-600" />
                        1. Log Call / Note
                      </span>
                      <span className="text-[11px] text-slate-500 mt-1">
                        Log patient discussion or general follow-up.
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCategory("set_blocker")}
                      className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                        category === "set_blocker"
                          ? "border-amber-500 bg-amber-50 ring-2 ring-amber-200"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <span className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                        <Clock className="h-4 w-4 text-amber-600" />
                        2. Mark Pending / Blocker
                      </span>
                      <span className="text-[11px] text-slate-500 mt-1">
                        Waiting on insurance, fitness, or reports.
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCategory("clear_blocker")}
                      className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                        category === "clear_blocker"
                          ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                        <FileCheck className="h-4 w-4 text-emerald-600" />
                        3. Clear Blocker
                      </span>
                      <span className="text-[11px] text-slate-500 mt-1">
                        Fitness approved or insurance pre-auth received.
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCategory("decline_lost")}
                      className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                        category === "decline_lost"
                          ? "border-rose-500 bg-rose-50 ring-2 ring-rose-200"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <span className="flex items-center gap-1.5 text-xs font-bold text-rose-900">
                        <UserX className="h-4 w-4 text-rose-600" />
                        4. Declined / Lost
                      </span>
                      <span className="text-[11px] text-slate-500 mt-1">
                        Patient unreachable or declined surgery.
                      </span>
                    </button>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Category 1: Call Log */}
                    {category === "call_log" && (
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-700">
                          Call / Discussion Notes
                        </label>
                        <textarea
                          rows={3}
                          value={callNotes}
                          onChange={(e) => setCallNotes(e.target.value)}
                          placeholder="Summarize conversation with patient or family..."
                          className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                          required
                        />
                        {["advised", "postponed"].includes(plannedSurgery.status) && (
                          <p className="text-[11px] text-sky-700 bg-sky-50 p-2.5 rounded-lg border border-sky-200">
                            ✨ Status will automatically advance from <strong>{plannedSurgery.status}</strong> to{" "}
                            <strong>counselling_in_progress</strong>.
                          </p>
                        )}
                      </div>
                    )}

                    {/* Category 2: Set Blocker */}
                    {category === "set_blocker" && (
                      <div className="space-y-3">
                        <label className="text-xs font-semibold text-slate-700">
                          Select Pending Requirement / Blocker
                        </label>
                        <select
                          value={blockerType}
                          onChange={(e) => setBlockerType(e.target.value as any)}
                          className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm outline-none focus:border-amber-400"
                        >
                          <option value="pending_patient_decision">Pending Patient / Family Decision</option>
                          <option value="pending_insurance">Pending Insurance Pre-authorization</option>
                          <option value="pending_investigations">Pending Lab / Diagnostic Reports</option>
                          <option value="pending_fitness">Pending Physician / Cardiac Fitness</option>
                        </select>
                        <textarea
                          rows={2}
                          value={blockerNotes}
                          onChange={(e) => setBlockerNotes(e.target.value)}
                          placeholder="Details (e.g. Sent TPA pre-auth request to Star Health)..."
                          className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-amber-400"
                          required
                        />
                      </div>
                    )}

                    {/* Category 3: Clear Blocker */}
                    {category === "clear_blocker" && (
                      <div className="space-y-3">
                        <label className="text-xs font-semibold text-slate-700">
                          Select Cleared Requirement
                        </label>
                        <select
                          value={clearedType}
                          onChange={(e) => setClearedType(e.target.value as any)}
                          className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm outline-none focus:border-emerald-400"
                        >
                          <option value="fitness_cleared">Physician / Cardiac Fitness Cleared</option>
                          <option value="insurance_approved">Insurance Pre-authorization Approved</option>
                          <option value="reports_ready">All Lab / Scan Reports Normal</option>
                        </select>
                        <textarea
                          rows={2}
                          value={clearedNotes}
                          onChange={(e) => setClearedNotes(e.target.value)}
                          placeholder="Notes (e.g. Received ECG and cardiac clearance certificate)..."
                          className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-emerald-400"
                          required
                        />
                        <p className="text-[11px] text-emerald-700 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                          ✨ Status will return to <strong>counselling_in_progress</strong>, ready for surgery confirmation.
                        </p>
                      </div>
                    )}

                    {/* Category 4: Decline / Lost */}
                    {category === "decline_lost" && (
                      <div className="space-y-3">
                        <label className="text-xs font-semibold text-slate-700">Outcome</label>
                        <select
                          value={declineType}
                          onChange={(e) => setDeclineType(e.target.value as any)}
                          className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm outline-none focus:border-rose-400"
                        >
                          <option value="cancelled_by_patient">Patient Declined / Cancelled</option>
                          <option value="lost_to_followup">Lost to Follow-up (Unreachable 3+ calls)</option>
                        </select>
                        <textarea
                          rows={2}
                          value={declineReason}
                          onChange={(e) => setDeclineReason(e.target.value)}
                          placeholder="Reason (e.g. Patient getting surgery at hometown hospital)..."
                          className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-rose-400"
                          required
                        />
                      </div>
                    )}

                    {/* Submit Button */}
                    <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={saving}
                        className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50"
                      >
                        {saving ? "Saving..." : "Save Action Log"}
                      </button>
                    </div>
                  </form>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
