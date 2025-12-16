"use client";

import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { fetchQueue, updateQueueStatus } from "@/redux/queueSlice";
import { fetchDoctors } from "@/redux/doctorsSlice";
import { SkeletonRow } from "../shared/SkeletonRow";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { opdVisitsApi, VisitStatus } from "@/services/opdVisitsApi";

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

  const handleStatusUpdate = async (visitId: string, currentStatus: string) => {
    let nextStatus: VisitStatus;
    
    if (currentStatus === "Waiting" || currentStatus === "checked_in") {
      nextStatus = "in_consultation";
    } else if (currentStatus === "In Consultation" || currentStatus === "in_consultation") {
      nextStatus = "completed";
    } else {
      return; // Already completed
    }

    try {
      await dispatch(updateQueueStatus({ visitId, newStatus: nextStatus })).unwrap();
      toast.success(`Moved to ${nextStatus}`);
      // Refetch queue to get updated data
      if (selectedDoctorId) {
        dispatch(fetchQueue({ doctorId: selectedDoctorId }));
      }
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage);
    }
  };

  if (loading && entries.length === 0) {
    return <SkeletonRow rows={3} />;
  }

  return (
    <div className="space-y-4">
      {doctors.length > 0 && (
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Select Doctor
          </label>
          <select
            value={selectedDoctorId}
            onChange={(e) => setSelectedDoctorId(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
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
      )}
      
      {entries.length === 0 && !loading ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center">
          <p className="text-slate-500">No patients in queue</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {entries.map((entry, index) => {
            // Only show status update button for visits (not appointments)
            const canUpdateStatus = entry.visitId && entry.status !== "Completed";
            
            return (
              <div
                key={entry.visitId || entry.appointmentId || `entry-${index}`}
                className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Token {entry.token}
                  </p>
                  <span className="pill bg-slate-100 text-slate-700">{entry.status}</span>
                </div>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {entry.patientName}
                </p>
                <p className="text-xs text-slate-500">
                  ETA {entry.etaMinutes} min • Auto check-in
                </p>
                {canUpdateStatus && (
                  <button
                    onClick={() => handleStatusUpdate(entry.visitId!, entry.status)}
                    className="mt-3 flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-sky-200 hover:text-sky-700"
                  >
                    Move forward
                    <ArrowRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

