"use client";

import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { fetchTests, updateTestStatus } from "@/redux/testsSlice";
import { SkeletonRow } from "../shared/SkeletonRow";
import { toast } from "sonner";

export function TestPanel() {
  const dispatch = useAppDispatch();
  const { list, loading } = useAppSelector((s) => s.tests);

  useEffect(() => {
    dispatch(fetchTests());
  }, [dispatch]);

  if (loading) {
    return <SkeletonRow rows={4} />;
  }

  return (
    <div className="space-y-3">
      {list.map((test) => (
        <div
          key={test.id}
          className="flex items-center justify-between rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm"
        >
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {test.testName}
            </p>
            <p className="text-xs text-slate-500">
              {test.patientName} • {test.orderedBy}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="pill bg-slate-100 text-slate-700">{test.status}</span>
            <select
              value={test.status}
              onChange={(e) => {
                dispatch(
                  updateTestStatus({
                    id: test.id,
                    status: e.target.value as typeof test.status,
                  })
                );
                toast.success("Lab status updated");
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
            >
              <option>Pending</option>
              <option>In Progress</option>
              <option>Completed</option>
            </select>
          </div>
        </div>
      ))}
    </div>
  );
}

