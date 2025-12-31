"use client";

import React, { useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { VitalSignsChart } from "./VitalSignsChart";
import { VitalSignsFormModal } from "./VitalSignsFormModal";
import { MiniChart } from "../shared/MiniChart";
import { VitalSigns, VitalSignsTrend } from "@/types";
import { useAppDispatch } from "@/redux/hooks";
import { addVitalSigns } from "@/redux/vitalSignsSlice";
import { toast } from "sonner";

interface VitalSignsPanelProps {
  patientId: string;
  vitalSigns: VitalSigns[];
  trends: VitalSignsTrend[];
  loading?: boolean;
  onRefresh: () => void;
}

export const VitalSignsPanel: React.FC<VitalSignsPanelProps> = ({
  patientId,
  vitalSigns,
  trends,
  loading = false,
  onRefresh,
}) => {
  const dispatch = useAppDispatch();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const latestVitals = vitalSigns[0] || null;

  const handleSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      await dispatch(
        addVitalSigns({
          patient_id: patientId,
          ...data,
        })
      ).unwrap();

      toast.success("Vital signs recorded successfully");
      setIsFormOpen(false);
      onRefresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to record vital signs");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-full animate-pulse rounded-lg bg-slate-200" />
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-xl bg-slate-100" />
      </div>
    );
  }

  // Calculate trends for mini charts
  const getTrendData = (metric: keyof VitalSignsTrend) => {
    return trends
      .map((t) => t[metric])
      .filter((v) => v !== undefined && v !== null) as number[];
  };

  const getTrend = (current: number | null, data: number[]): "up" | "down" | "stable" => {
    if (!current || data.length < 2) return "stable";
    const previous = data[data.length - 2];
    if (current > previous) return "up";
    if (current < previous) return "down";
    return "stable";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-900">Vital Signs</h3>
        <div className="flex gap-2">
          <button
            onClick={onRefresh}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button
            onClick={() => setIsFormOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow-md"
          >
            <Plus className="h-4 w-4" />
            Record Vitals
          </button>
        </div>
      </div>

      {/* Current Vitals - Mini Charts */}
      {latestVitals ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {latestVitals.systolic_bp !== null && latestVitals.diastolic_bp !== null && (
            <MiniChart
              data={getTrendData("systolic_bp")}
              label="Blood Pressure"
              currentValue={`${latestVitals.systolic_bp}/${latestVitals.diastolic_bp}`}
              unit="mmHg"
              trend={getTrend(latestVitals.systolic_bp, getTrendData("systolic_bp"))}
              isAbnormal={
                latestVitals.systolic_bp < 90 ||
                latestVitals.systolic_bp > 140 ||
                latestVitals.diastolic_bp < 60 ||
                latestVitals.diastolic_bp > 90
              }
            />
          )}

          {latestVitals.pulse_rate !== null && (
            <MiniChart
              data={getTrendData("pulse_rate")}
              label="Pulse Rate"
              currentValue={latestVitals.pulse_rate}
              unit="bpm"
              trend={getTrend(latestVitals.pulse_rate, getTrendData("pulse_rate"))}
              isAbnormal={
                latestVitals.pulse_rate < 60 || latestVitals.pulse_rate > 100
              }
            />
          )}

          {latestVitals.temperature !== null && (
            <MiniChart
              data={getTrendData("temperature")}
              label="Temperature"
              currentValue={latestVitals.temperature.toFixed(1)}
              unit="°F"
              trend={getTrend(latestVitals.temperature, getTrendData("temperature"))}
              isAbnormal={
                latestVitals.temperature < 97 || latestVitals.temperature > 99
              }
            />
          )}

          {latestVitals.spo2 !== null && (
            <MiniChart
              data={getTrendData("spo2")}
              label="SpO2"
              currentValue={latestVitals.spo2}
              unit="%"
              trend={getTrend(latestVitals.spo2, getTrendData("spo2"))}
              isAbnormal={latestVitals.spo2 < 95}
            />
          )}

          {latestVitals.weight !== null && (
            <MiniChart
              data={getTrendData("weight")}
              label="Weight"
              currentValue={latestVitals.weight.toFixed(1)}
              unit="kg"
              trend={getTrend(latestVitals.weight, getTrendData("weight"))}
            />
          )}

          {latestVitals.bmi !== null && (
            <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-white p-3 shadow-sm">
              <div className="flex-1">
                <p className="text-xs font-medium text-slate-500">BMI</p>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-lg font-bold text-slate-900">
                    {latestVitals.bmi.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-sm text-slate-600">
            No vital signs recorded yet. Click "Record Vitals" to add the first entry.
          </p>
        </div>
      )}

      {/* Trend Chart */}
      {trends.length > 0 && <VitalSignsChart trends={trends} loading={false} />}

      {/* Last recorded info */}
      {latestVitals && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          <p>
            <span className="font-medium">Last recorded:</span>{" "}
            {new Date(latestVitals.recorded_at).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
          {latestVitals.notes && (
            <p className="mt-2">
              <span className="font-medium">Notes:</span> {latestVitals.notes}
            </p>
          )}
        </div>
      )}

      {/* Form Modal */}
      <VitalSignsFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleSubmit}
        loading={isSubmitting}
      />
    </div>
  );
};
