"use client";

import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { fetchQueue, completeAndAdvanceVisit } from "@/redux/queueSlice";
import { fetchDoctors } from "@/redux/doctorsSlice";
import { SkeletonRow } from "../shared/SkeletonRow";
import { ArrowRight, CheckCircle, Clock, UserCheck, CheckCircle2, Stethoscope, Users, Activity, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { updateQueueStatus } from "@/redux/queueSlice";

export function QueueBoard() {
  const dispatch = useAppDispatch();
  const { entries, loading, doctorId } = useAppSelector((s) => s.queue);
  const doctors = useAppSelector((s) => s.doctors.list);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");

  useEffect(() => {
    dispatch(fetchDoctors());
  }, [dispatch]);

  useEffect(() => {
    if (doctors.length > 0 && !selectedDoctorId) {
      setSelectedDoctorId(doctors[0].id);
    }
  }, [doctors, selectedDoctorId]);

  useEffect(() => {
    if (selectedDoctorId) {
      dispatch(fetchQueue({ doctorId: selectedDoctorId }));
    }
  }, [dispatch, selectedDoctorId]);

  const handleMoveForward = async (visitId: string) => {
    try {
      const response = await dispatch(completeAndAdvanceVisit({ visitId })).unwrap();
      toast.success(response.message || "Visit moved to consultation");
      
      if (selectedDoctorId) {
        dispatch(fetchQueue({ doctorId: selectedDoctorId }));
      }
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage);
    }
  };

  const handleMarkCompleted = async (visitId: string) => {
    try {
      await dispatch(updateQueueStatus({ visitId, newStatus: "completed" })).unwrap();
      toast.success("Visit marked as completed");
      
      if (selectedDoctorId) {
        dispatch(fetchQueue({ doctorId: selectedDoctorId }));
      }
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage);
    }
  };

  // Find the next token number (first waiting patient)
  const nextToken = entries
    .filter((entry) => entry.status === "Waiting" && entry.visitId)
    .sort((a, b) => a.token - b.token)[0]?.token;

  if (loading && entries.length === 0) {
    return <SkeletonRow rows={3} />;
  }

  // Get status counts for summary
  const statusCounts = {
    waiting: entries.filter((e) => e.status === "Waiting" && e.visitId).length,
    inConsultation: entries.filter((e) => e.status === "In Consultation" && e.visitId).length,
    completed: entries.filter((e) => e.status === "Completed").length,
    total: entries.filter((e) => e.visitId).length,
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case "Waiting":
        return {
          bg: "bg-gradient-to-br from-amber-50 via-amber-50/50 to-white",
          border: "border-amber-300/50",
          text: "text-amber-700",
          badge: "bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/20",
          icon: Clock,
          glow: "shadow-amber-500/10",
        };
      case "In Consultation":
        return {
          bg: "bg-gradient-to-br from-blue-50 via-blue-50/50 to-white",
          border: "border-blue-300/50",
          text: "text-blue-700",
          badge: "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/20",
          icon: UserCheck,
          glow: "shadow-blue-500/10",
        };
      case "Completed":
        return {
          bg: "bg-gradient-to-br from-emerald-50 via-emerald-50/50 to-white",
          border: "border-emerald-300/50",
          text: "text-emerald-700",
          badge: "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/20",
          icon: CheckCircle2,
          glow: "shadow-emerald-500/10",
        };
      default:
        return {
          bg: "bg-gradient-to-br from-slate-50 to-white",
          border: "border-slate-300/50",
          text: "text-slate-700",
          badge: "bg-gradient-to-br from-slate-500 to-slate-600 text-white shadow-lg shadow-slate-500/20",
          icon: Clock,
          glow: "shadow-slate-500/10",
        };
    }
  };

  return (
    <div className="space-y-5">
      {/* Enhanced Header Section */}
      <div className="card relative overflow-hidden">
        <div className="absolute right-0 top-0 h-28 w-28 rounded-full bg-gradient-to-br from-sky-200/30 to-transparent blur-2xl" />
        <div className="relative p-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            {/* Doctor Selector */}
            {doctors.length > 0 && (
              <div className="flex-1 max-w-md">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Select Doctor
                </label>
                <div className="relative group">
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-sky-500/0 via-sky-500/5 to-teal-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl" />
                  <Stethoscope className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-hover:text-sky-500" />
                  <select
                    value={selectedDoctorId}
                    onChange={(e) => setSelectedDoctorId(e.target.value)}
                    className="relative w-full appearance-none rounded-xl border border-slate-200 bg-white/80 backdrop-blur-sm pl-11 pr-4 py-2.5 text-sm font-semibold text-slate-700 outline-none transition-all duration-200 hover:border-sky-300 hover:bg-white focus:border-sky-400 focus:ring-2 focus:ring-sky-100 shadow-sm hover:shadow-md"
                  >
                    {doctors.map((doc) => {
                      const doctorName = doc.name || `Dr. ${doc.specialization}`;
                      return (
                        <option key={doc.id} value={doc.id}>
                          {doctorName} - {doc.specialization}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
            )}

            {/* Stats Summary Cards */}
            {entries.length > 0 && (
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Total Patients */}
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white/80 backdrop-blur-sm px-3.5 py-2 shadow-sm hover:shadow-md transition-all duration-200">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-slate-100 to-slate-50">
                    <Users className="h-3.5 w-3.5 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-slate-500">Total</p>
                    <p className="text-sm font-bold text-slate-900">{statusCounts.total}</p>
                  </div>
                </div>

                {/* Waiting Count */}
                <div className="flex items-center gap-2 rounded-xl border border-amber-200/50 bg-gradient-to-br from-amber-50/80 to-white/80 backdrop-blur-sm px-3.5 py-2 shadow-sm hover:shadow-md transition-all duration-200">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg shadow-amber-500/25">
                    <Clock className="h-3.5 w-3.5 text-white" />
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-amber-600">Waiting</p>
                    <p className="text-sm font-bold text-amber-700">{statusCounts.waiting}</p>
                  </div>
                </div>

                {/* In Consultation Count */}
                <div className="flex items-center gap-2 rounded-xl border border-blue-200/50 bg-gradient-to-br from-blue-50/80 to-white/80 backdrop-blur-sm px-3.5 py-2 shadow-sm hover:shadow-md transition-all duration-200">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/25">
                    <UserCheck className="h-3.5 w-3.5 text-white" />
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-blue-600">Consulting</p>
                    <p className="text-sm font-bold text-blue-700">{statusCounts.inConsultation}</p>
                  </div>
                </div>

                {/* Next Token Badge */}
                {nextToken !== undefined && (
                  <div className="relative group">
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-sky-400 to-teal-500 opacity-20 blur-xl group-hover:opacity-30 transition-opacity duration-300" />
                    <div className="relative flex flex-col items-center rounded-xl border-2 border-sky-200 bg-gradient-to-br from-sky-500 via-sky-500 to-teal-500 px-4 py-2.5 shadow-xl shadow-sky-500/25 ring-2 ring-sky-100/50 transition-all duration-200 hover:scale-105 hover:shadow-2xl hover:shadow-sky-500/35">
                      <div className="flex items-center gap-1 mb-0.5">
                        <Sparkles className="h-3 w-3 text-white/90" />
                        <span className="text-[9px] font-bold uppercase tracking-wider text-white/90">Next</span>
                      </div>
                      <span className="text-xl font-extrabold text-white drop-shadow-lg">{nextToken}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Queue Grid */}
      {entries.length === 0 && !loading ? (
        <div className="card relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-50" />
          <div className="relative p-14 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 shadow-lg">
              <Stethoscope className="h-8 w-8 text-slate-400" />
            </div>
            <p className="text-lg font-bold text-slate-900">No patients in queue</p>
            <p className="mt-1.5 text-sm text-slate-500">Patients will appear here when they check in</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-3">
          {entries.map((entry, index) => {
            const isVisit = entry.visitId && entry.status !== "Completed";
            const isWaiting = entry.status === "Waiting";
            const isInConsultation = entry.status === "In Consultation";
            const statusStyles = getStatusStyles(entry.status);
            const StatusIcon = statusStyles.icon;
            const isNextToken = nextToken !== undefined && entry.token === nextToken && isWaiting;

            return (
              <div
                key={entry.visitId || entry.appointmentId || `entry-${index}`}
                className={`group relative overflow-hidden rounded-2xl border-2 transition-all duration-300 ${
                  isNextToken
                    ? "border-sky-400 bg-gradient-to-br from-sky-50 via-teal-50/50 to-white shadow-xl shadow-sky-500/20 ring-4 ring-sky-100/50 scale-[1.02]"
                    : `${statusStyles.border} ${statusStyles.bg} shadow-md hover:shadow-xl hover:scale-[1.01] ${statusStyles.glow}`
                }`}
              >
                {/* Animated background glow */}
                <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${
                  isNextToken 
                    ? "bg-gradient-to-br from-sky-400/5 via-teal-400/5 to-transparent" 
                    : statusStyles.bg
                }`} />

                {/* Next Token Badge */}
                {isNextToken && (
                  <div className="absolute right-2.5 top-2.5 z-10 animate-pulse">
                    <div className="flex items-center gap-1 rounded-full bg-gradient-to-r from-sky-500 to-teal-500 px-2.5 py-1 shadow-lg shadow-sky-500/30 ring-2 ring-white/50">
                      <Sparkles className="h-2.5 w-2.5 text-white" />
                      <span className="text-[9px] font-bold uppercase tracking-wider text-white">Next</span>
                    </div>
                  </div>
                )}

                <div className="relative p-5">
                  {/* Header with Token */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3.5">
                      <div className={`relative flex h-14 w-14 items-center justify-center rounded-xl ${statusStyles.badge} font-extrabold text-lg transition-transform duration-200 group-hover:scale-110 group-hover:rotate-3`}>
                        <span className="drop-shadow-sm">{entry.token}</span>
                        {isNextToken && (
                          <div className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[9px] font-bold text-sky-600 shadow-lg">
                            !
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Token Number</p>
                        <p className="mt-0.5 text-base font-bold text-slate-900">#{entry.token}</p>
                      </div>
                    </div>
                    <div className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1 ${statusStyles.badge} shadow-md`}>
                      <StatusIcon className="h-3.5 w-3.5" />
                      <span className="text-[11px] font-bold">{entry.status}</span>
                    </div>
                  </div>

                  {/* Patient Info */}
                  <div className="mb-5 border-t border-slate-200/50 pt-4">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-50">
                        <Activity className="h-4 w-4 text-slate-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-bold text-slate-900 truncate">{entry.patientName}</p>
                        {entry.etaMinutes > 0 && (
                          <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                            <Clock className="h-3 w-3" />
                            Estimated time: {entry.etaMinutes} min
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  {isVisit && isWaiting && (
                    <button
                      onClick={() => handleMoveForward(entry.visitId!)}
                      className="group/btn w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 via-sky-500 to-teal-500 px-3.5 py-2.5 text-sm font-bold text-white shadow-lg shadow-sky-500/25 transition-all duration-200 hover:from-sky-600 hover:via-sky-600 hover:to-teal-600 hover:shadow-xl hover:shadow-sky-500/35 hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <span>Move to Consultation</span>
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/btn:translate-x-1" />
                    </button>
                  )}
                  {isVisit && isInConsultation && (
                    <button
                      onClick={() => handleMarkCompleted(entry.visitId!)}
                      className="group/btn w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 via-emerald-500 to-green-500 px-3.5 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 transition-all duration-200 hover:from-emerald-600 hover:via-emerald-600 hover:to-green-600 hover:shadow-xl hover:shadow-emerald-500/35 hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <CheckCircle className="h-3.5 w-3.5 transition-transform group-hover/btn:scale-110" />
                      <span>Mark as Completed</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

