"use client";

import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { fetchQueue, updateQueueStatus } from "@/redux/queueSlice";
import { SkeletonRow } from "../shared/SkeletonRow";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";

export function QueueBoard() {
  const dispatch = useAppDispatch();
  const { entries, loading } = useAppSelector((s) => s.queue);

  useEffect(() => {
    dispatch(fetchQueue());
  }, [dispatch]);

  if (loading) {
    return <SkeletonRow rows={3} />;
  }

  return (
    <div className="grid grid-cols-3 gap-3">
      {entries.map((entry) => (
        <div
          key={entry.token}
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
          <button
            onClick={() => {
              const nextStatus =
                entry.status === "Waiting"
                  ? "In Consultation"
                  : entry.status === "In Consultation"
                  ? "Completed"
                  : "Completed";
              dispatch(updateQueueStatus({ token: entry.token, status: nextStatus }));
              toast.success(`Moved to ${nextStatus}`);
            }}
            className="mt-3 flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-sky-200 hover:text-sky-700"
          >
            Move forward
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

