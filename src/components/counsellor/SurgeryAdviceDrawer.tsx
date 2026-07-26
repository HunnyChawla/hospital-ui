"use client";

import { useState, useEffect } from "react";
import { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import {
  X,
  User,
  Calendar,
  Clock,
  Building2,
  Stethoscope,
  IndianRupee,
  MessageSquare,
  History,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Tag,
  MapPin,
  Flame,
  ChevronRight,
  Phone,
  Hash,
} from "lucide-react";
import { CounsellorInteraction, PlannedSurgery, SurgeryAdviceHistory } from "@/types";
import { counsellorApi } from "@/services/counsellorApi";
import { plannedSurgeriesApi } from "@/services/plannedSurgeriesApi";
import { useAppSelector } from "@/redux/hooks";
import { toast } from "sonner";
import { LogInteractionModal } from "./LogInteractionModal";
import { ConfirmSurgeryModal } from "./ConfirmSurgeryModal";
import { PostponeCancelModal } from "./PostponeCancelModal";
import { formatDateDisplay } from "@/utils/format";

interface SurgeryAdviceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  plannedSurgery: PlannedSurgery | null;
  onRefresh: () => void;
}

const URGENCY_BADGES = {
  elective: "bg-emerald-50 text-emerald-700 border-emerald-200",
  urgent: "bg-amber-50 text-amber-700 border-amber-200",
  emergency: "bg-rose-50 text-rose-700 border-rose-200 animate-pulse",
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  advised: { label: "Advised", bg: "bg-sky-50 border-sky-200", text: "text-sky-700" },
  counselling_in_progress: { label: "Counselling in Progress", bg: "bg-indigo-50 border-indigo-200", text: "text-indigo-700" },
  pending_patient_decision: { label: "Pending Patient Decision", bg: "bg-amber-50 border-amber-200", text: "text-amber-700" },
  pending_insurance: { label: "Pending Insurance", bg: "bg-purple-50 border-purple-200", text: "text-purple-700" },
  pending_investigations: { label: "Pending Reports", bg: "bg-cyan-50 border-cyan-200", text: "text-cyan-700" },
  pending_fitness: { label: "Pending Fitness Clearance", bg: "bg-teal-50 border-teal-200", text: "text-teal-700" },
  confirmed: { label: "Confirmed", bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700" },
  in_ot_preparation: { label: "In OT Prep", bg: "bg-blue-50 border-blue-200", text: "text-blue-700" },
  surgery_completed: { label: "Completed", bg: "bg-slate-100 border-slate-300", text: "text-slate-700" },
  completed: { label: "Completed", bg: "bg-slate-100 border-slate-300", text: "text-slate-700" },
  postponed: { label: "Postponed", bg: "bg-amber-50 border-amber-300", text: "text-amber-800" },
  cancelled_by_patient: { label: "Cancelled (Patient)", bg: "bg-rose-50 border-rose-200", text: "text-rose-700" },
  cancelled_by_hospital: { label: "Cancelled (Hospital)", bg: "bg-rose-50 border-rose-200", text: "text-rose-700" },
  cancelled: { label: "Cancelled", bg: "bg-rose-50 border-rose-200", text: "text-rose-700" },
  lost_to_followup: { label: "Lost to Follow-up", bg: "bg-slate-50 border-slate-200", text: "text-slate-500" },
};

export function SurgeryAdviceDrawer({
  isOpen,
  onClose,
  plannedSurgery,
  onRefresh,
}: SurgeryAdviceDrawerProps) {
  const authState = useAppSelector((state) => state.auth);
  const currentUserId = authState.user?.user_id;
  const currentUserName = authState.userDetails?.full_name || "counsellor";
  const [claiming, setClaiming] = useState(false);
  const [completing, setCompleting] = useState(false);

  const [interactions, setInteractions] = useState<CounsellorInteraction[]>([]);
  const [history, setHistory] = useState<SurgeryAdviceHistory[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  const handleClaimCase = async () => {
    if (!plannedSurgery || !currentUserId) {
      toast.error("Logged in user details unavailable");
      return;
    }
    setClaiming(true);
    try {
      await plannedSurgeriesApi.update(plannedSurgery.id, {
        counsellor_id: currentUserId,
      });
      await counsellorApi.logInteraction(plannedSurgery.id, {
        interaction_type: "case_claimed",
        notes: `Case claimed by ${currentUserName}`,
      });
      toast.success("Case assigned to you!");
      onRefresh();
    } catch (err) {
      toast.error("Failed to claim case");
    } finally {
      setClaiming(false);
    }
  };

  const handleMarkCompleted = async () => {
    if (!plannedSurgery) return;
    setCompleting(true);
    try {
      await plannedSurgeriesApi.update(plannedSurgery.id, {
        status: "surgery_completed" as any,
      });
      await counsellorApi.logInteraction(plannedSurgery.id, {
        interaction_type: "surgery_completed",
        notes: `Surgery marked completed by ${currentUserName}`,
      });
      toast.success("Surgery marked as successfully completed!");
      onRefresh();
    } catch (err) {
      toast.error("Failed to mark surgery completed");
    } finally {
      setCompleting(false);
    }
  };

  const [logModalOpen, setLogModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [postponeModalOpen, setPostponeModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"interactions" | "history">("interactions");

  useEffect(() => {
    if (isOpen && plannedSurgery) {
      setLoadingData(true);
      Promise.all([
        counsellorApi.getInteractions(plannedSurgery.id),
        counsellorApi.getHistory(plannedSurgery.id),
      ])
        .then(([intRows, histRows]) => {
          setInteractions(intRows);
          setHistory(histRows);
        })
        .catch(console.error)
        .finally(() => setLoadingData(false));
    }
  }, [isOpen, plannedSurgery]);

  if (!plannedSurgery) return null;

  const statusInfo = STATUS_CONFIG[plannedSurgery.status] || {
    label: plannedSurgery.status,
    bg: "bg-slate-50 border-slate-200",
    text: "text-slate-700",
  };

  const isTerminal = [
    "surgery_completed",
    "completed",
    "cancelled_by_patient",
    "cancelled_by_hospital",
    "cancelled",
    "lost_to_followup",
  ].includes(plannedSurgery.status);

  return (
    <>
      <Transition.Root show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-40" onClose={onClose}>
          <Transition.Child
            as={Fragment}
            enter="ease-in-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in-out duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-hidden">
            <div className="absolute inset-0 overflow-hidden">
              <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
                <Transition.Child
                  as={Fragment}
                  enter="transform transition ease-in-out duration-300 sm:duration-400"
                  enterFrom="translate-x-full"
                  enterTo="translate-x-0"
                  leave="transform transition ease-in-out duration-300 sm:duration-400"
                  leaveFrom="translate-x-0"
                  leaveTo="translate-x-full"
                >
                  <Dialog.Panel className="pointer-events-auto w-screen max-w-2xl bg-white shadow-2xl flex flex-col">
                    {/* Top Header */}
                    <div className="border-b border-slate-200 bg-slate-900 text-white px-6 py-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                                URGENCY_BADGES[plannedSurgery.urgency || "elective"]
                              }`}
                            >
                              <Flame className="h-3 w-3" />
                              {(plannedSurgery.urgency || "elective").toUpperCase()}
                            </span>
                            <span
                              className={`inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full border ${statusInfo.bg} ${statusInfo.text}`}
                            >
                              {statusInfo.label}
                            </span>
                          </div>
                          <h2 className="text-xl font-bold text-white mt-1 flex items-center gap-2">
                            {plannedSurgery.patient_name || "Patient Advice"}
                          </h2>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300 mt-1">
                            {plannedSurgery.patient_uhid && (
                              <span className="bg-slate-800 text-sky-300 px-2 py-0.5 rounded font-mono font-semibold border border-slate-700">
                                UHID: {plannedSurgery.patient_uhid}
                              </span>
                            )}
                            {plannedSurgery.patient_mobile && (
                              <span className="text-slate-300 flex items-center gap-1">
                                <Phone className="h-3 w-3 text-sky-400" />
                                {plannedSurgery.patient_mobile}
                              </span>
                            )}
                            <span className="text-slate-400">
                              • Advised: {formatDateDisplay(plannedSurgery.advised_date || plannedSurgery.created_at)}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={onClose}
                          className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>

                      {/* Primary Quick Actions Bar */}
                      {!isTerminal && (
                        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-800">
                          <button
                            onClick={() => setLogModalOpen(true)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-sky-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow hover:bg-sky-600 transition"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                            Log Interaction
                          </button>
                          <button
                            onClick={() => setConfirmModalOpen(true)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow hover:bg-emerald-600 transition"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Confirm Surgery
                          </button>
                          {["confirmed", "in_ot_preparation"].includes(plannedSurgery.status) && (
                            <button
                              onClick={handleMarkCompleted}
                              disabled={completing}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow hover:bg-teal-700 transition"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              {completing ? "Updating..." : "Mark Completed"}
                            </button>
                          )}
                          <button
                            onClick={() => setPostponeModalOpen(true)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 transition"
                          >
                            Postpone
                          </button>
                          <button
                            onClick={() => setCancelModalOpen(true)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600/80 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-600 transition"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Scrollable Content Body */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                      {/* Key Details Grid */}
                      <div className="grid grid-cols-2 gap-4 rounded-2xl bg-slate-50 p-4 border border-slate-200 text-sm">
                        <div className="space-y-1">
                          <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                            <FileText className="h-3.5 w-3.5" /> Surgery Procedure
                          </span>
                          <p className="font-semibold text-slate-900">{plannedSurgery.surgery_name}</p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" /> Anatomy Site / Eye
                          </span>
                          <p className="font-semibold text-slate-900">
                            {plannedSurgery.anatomy_site_name || plannedSurgery.eye || "Not specified"}
                            {plannedSurgery.anatomy_site_short_code && ` (${plannedSurgery.anatomy_site_short_code})`}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                            <Stethoscope className="h-3.5 w-3.5" /> Surgeon Recommended
                          </span>
                          <p className="font-medium text-slate-800">{plannedSurgery.surgeon_name || "Unassigned"}</p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                            <User className="h-3.5 w-3.5" /> Counsellor Assigned
                          </span>
                          {plannedSurgery.counsellor_name ? (
                            <p className="font-semibold text-slate-800">{plannedSurgery.counsellor_name}</p>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-amber-700 text-xs font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                Unassigned
                              </span>
                              <button
                                type="button"
                                onClick={handleClaimCase}
                                disabled={claiming}
                                className="rounded-lg bg-sky-500 text-white text-[11px] font-bold px-2.5 py-1 shadow hover:bg-sky-600 transition"
                              >
                                {claiming ? "Claiming..." : "⚡ Claim Case"}
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="space-y-1">
                          <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                            <Tag className="h-3.5 w-3.5" /> Selected Package
                          </span>
                          <p className="font-semibold text-teal-700">{plannedSurgery.package_name || "Default Package"}</p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                            <IndianRupee className="h-3.5 w-3.5" /> Agreed Price
                          </span>
                          <p className="font-bold text-slate-900">
                            {plannedSurgery.agreed_price ? `₹${plannedSurgery.agreed_price.toLocaleString("en-IN")}` : "Not agreed yet"}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" /> Planned Date & Time
                          </span>
                          <p className="font-medium text-slate-800">
                            {plannedSurgery.planned_date ? formatDateDisplay(plannedSurgery.planned_date) : "TBD"}
                            {plannedSurgery.planned_time && ` at ${plannedSurgery.planned_time.slice(0, 5)}`}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                            <Building2 className="h-3.5 w-3.5" /> Hospital Facility
                          </span>
                          <p className="font-medium text-slate-800">{plannedSurgery.hospital_name || "Main Campus"}</p>
                        </div>
                      </div>

                      {/* Doctor Notes */}
                      {plannedSurgery.notes && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
                          <h4 className="text-xs font-semibold text-amber-900 uppercase tracking-wider mb-1">
                            Doctor Advice Notes
                          </h4>
                          <p className="text-sm text-amber-950 whitespace-pre-line">{plannedSurgery.notes}</p>
                        </div>
                      )}

                      {/* Reason Badges if postponed or cancelled */}
                      {plannedSurgery.postponement_reason && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                          <h4 className="text-xs font-semibold text-amber-900 uppercase tracking-wider mb-1">
                            Postponement Reason
                          </h4>
                          <p className="text-sm text-amber-950">{plannedSurgery.postponement_reason}</p>
                        </div>
                      )}
                      {plannedSurgery.cancellation_reason && (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                          <h4 className="text-xs font-semibold text-rose-900 uppercase tracking-wider mb-1">
                            Cancellation Reason
                          </h4>
                          <p className="text-sm text-rose-950">{plannedSurgery.cancellation_reason}</p>
                        </div>
                      )}

                      {/* Tabbed Audit Logs & Interactions */}
                      <div className="space-y-3">
                        <div className="flex border-b border-slate-200 gap-6">
                          <button
                            onClick={() => setActiveTab("interactions")}
                            className={`pb-2.5 text-sm font-medium transition-colors relative ${
                              activeTab === "interactions"
                                ? "text-sky-600 font-semibold"
                                : "text-slate-500 hover:text-slate-700"
                            }`}
                          >
                            Counsellor Interactions ({interactions.length})
                            {activeTab === "interactions" && (
                              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-500 rounded-full" />
                            )}
                          </button>
                          <button
                            onClick={() => setActiveTab("history")}
                            className={`pb-2.5 text-sm font-medium transition-colors relative ${
                              activeTab === "history"
                                ? "text-sky-600 font-semibold"
                                : "text-slate-500 hover:text-slate-700"
                            }`}
                          >
                            Audit Trail History ({history.length})
                            {activeTab === "history" && (
                              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-500 rounded-full" />
                            )}
                          </button>
                        </div>

                        {/* Interactions Tab Content */}
                        {activeTab === "interactions" && (
                          <div className="space-y-3">
                            {interactions.length === 0 ? (
                              <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400">
                                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No counsellor interactions logged yet.</p>
                                {!isTerminal && (
                                  <button
                                    onClick={() => setLogModalOpen(true)}
                                    className="mt-2 text-xs font-semibold text-sky-600 hover:underline"
                                  >
                                    Log first interaction
                                  </button>
                                )}
                              </div>
                            ) : (
                              <div className="relative pl-4 border-l-2 border-slate-200 space-y-4">
                                {interactions.map((item) => (
                                  <div key={item.id} className="relative group">
                                    <div className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-sky-500 ring-4 ring-white" />
                                    <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm space-y-1.5">
                                      <div className="flex items-center justify-between text-xs text-slate-500">
                                        <span className="font-semibold text-slate-800">
                                          {item.counsellor_name || "Counsellor"} —{" "}
                                          <span className="capitalize text-sky-700">
                                            {item.interaction_type.replace(/_/g, " ")}
                                          </span>
                                        </span>
                                        <span>{new Date(item.interaction_at).toLocaleString()}</span>
                                      </div>
                                      <p className="text-sm text-slate-800 whitespace-pre-line font-normal">
                                        {item.notes}
                                      </p>
                                      {(item.package_name || item.payment_amount || item.to_status) && (
                                        <div className="flex flex-wrap gap-2 text-xs pt-1">
                                          {item.package_name && (
                                            <span className="bg-teal-50 text-teal-700 px-2 py-0.5 rounded border border-teal-200 font-medium">
                                              Pkg: {item.package_name}
                                            </span>
                                          )}
                                          {item.payment_amount && (
                                            <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
                                              Advance: ₹{item.payment_amount.toLocaleString("en-IN")}
                                            </span>
                                          )}
                                          {item.to_status && (
                                            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                                              Status → {item.to_status}
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* History Tab Content */}
                        {activeTab === "history" && (
                          <div className="space-y-2">
                            {history.length === 0 ? (
                              <p className="text-xs text-slate-400 text-center py-6">No audit history records found.</p>
                            ) : (
                              history.map((h) => (
                                <div
                                  key={h.id}
                                  className="flex items-start justify-between text-xs p-3 rounded-xl bg-slate-50 border border-slate-200"
                                >
                                  <div>
                                    <span className="font-semibold text-slate-900 capitalize">
                                      {h.action_type.replace(/_/g, " ")}
                                    </span>
                                    {h.changed_by_name && (
                                      <span className="text-slate-500 ml-1">by {h.changed_by_name}</span>
                                    )}
                                    {h.old_value && h.new_value && (
                                      <p className="text-slate-600 font-mono mt-0.5">
                                        {h.old_value} → {h.new_value}
                                      </p>
                                    )}
                                    {h.reason && <p className="text-slate-500 italic mt-0.5">Reason: {h.reason}</p>}
                                  </div>
                                  <span className="text-slate-400 shrink-0 ml-2">
                                    {new Date(h.changed_at).toLocaleString()}
                                  </span>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Modals */}
      {logModalOpen && (
        <LogInteractionModal
          isOpen={logModalOpen}
          onClose={() => setLogModalOpen(false)}
          onSuccess={onRefresh}
          plannedSurgery={plannedSurgery}
        />
      )}
      {confirmModalOpen && (
        <ConfirmSurgeryModal
          isOpen={confirmModalOpen}
          onClose={() => setConfirmModalOpen(false)}
          onSuccess={onRefresh}
          plannedSurgery={plannedSurgery}
        />
      )}
      {(postponeModalOpen || cancelModalOpen) && (
        <PostponeCancelModal
          isOpen={postponeModalOpen || cancelModalOpen}
          onClose={() => {
            setPostponeModalOpen(false);
            setCancelModalOpen(false);
          }}
          onSuccess={onRefresh}
          plannedSurgery={plannedSurgery}
          mode={postponeModalOpen ? "postpone" : "cancel"}
        />
      )}
    </>
  );
}
