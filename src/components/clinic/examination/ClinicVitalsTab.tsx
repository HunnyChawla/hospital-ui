"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { HeartPulse, RefreshCw, Save } from "lucide-react";
import { toast } from "sonner";
import { useAppDispatch } from "@/redux/hooks";
import { addVitalSigns } from "@/redux/vitalSignsSlice";
import { vitalSignsApi } from "@/services/vitalSignsApi";
import { VitalSignsChart } from "@/components/doctors/patient-details/VitalSignsChart";
import { MiniChart } from "@/components/doctors/shared/MiniChart";
import type { VitalSigns, VitalSignsTrend } from "@/types";

interface VitalsFormData {
  systolic_bp: string;
  diastolic_bp: string;
  pulse_rate: string;
  temperature: string;
  spo2: string;
  respiratory_rate: string;
  weight: string;
  height: string;
  notes: string;
}

interface ClinicVitalsTabProps {
  patientId: string;
  visitId?: string | null;
  readOnly?: boolean;
}

/**
 * Vitals entry + trend — the examiner's primary screen.
 *
 * The form is INLINE (unlike the doctor panel's modal): an examiner records
 * vitals on every patient, and a modal on every patient is friction. Each
 * reading is stamped with the visit it was taken during, which is what lets
 * the consultation document and the health record attribute it to the
 * encounter.
 */
export function ClinicVitalsTab({ patientId, visitId, readOnly = false }: ClinicVitalsTabProps) {
  const dispatch = useAppDispatch();
  const [vitals, setVitals] = useState<VitalSigns[]>([]);
  const [trends, setTrends] = useState<VitalSignsTrend[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, reset, watch } = useForm<VitalsFormData>({
    defaultValues: {
      systolic_bp: "",
      diastolic_bp: "",
      pulse_rate: "",
      temperature: "",
      spo2: "",
      respiratory_rate: "",
      weight: "",
      height: "",
      notes: "",
    },
  });

  const weight = watch("weight");
  const height = watch("height");
  const bmi = useMemo(() => {
    const w = parseFloat(weight);
    const h = parseFloat(height);
    if (!w || !h || w <= 0 || h <= 0) return null;
    return Math.round((w / Math.pow(h / 100, 2)) * 100) / 100;
  }, [weight, height]);

  const loadVitals = React.useCallback(async () => {
    if (!patientId) return;
    setLoading(true);
    try {
      const [list, trendData] = await Promise.all([
        vitalSignsApi.list({ patient_id: patientId, page: 1, page_size: 20 }),
        vitalSignsApi.getTrends({ patient_id: patientId, days: 30 }).catch(() => null),
      ]);
      setVitals(list.items);
      if (trendData) {
        // Flatten the per-metric trend response into chart rows by date
        const byDate: Record<string, VitalSignsTrend> = {};
        const metrics = ["systolic_bp", "diastolic_bp", "pulse_rate", "temperature", "spo2"];
        const raw = trendData as unknown as Record<string, unknown>;
        metrics.forEach((metric) => {
          const points = raw[metric];
          if (Array.isArray(points)) {
            points.forEach((point: { date: string; avg: number | null }) => {
              byDate[point.date] = byDate[point.date] || { date: point.date };
              (byDate[point.date] as unknown as Record<string, unknown>)[metric] =
                point.avg ?? undefined;
            });
          }
        });
        setTrends(Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date)));
      }
    } catch {
      // Non-fatal: the entry form still works without history
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    loadVitals();
  }, [loadVitals]);

  const onSubmit = async (data: VitalsFormData) => {
    const num = (v: string): number | null => (v === "" ? null : parseFloat(v));
    const payload = {
      patient_id: patientId,
      visit_id: visitId || null,
      systolic_bp: num(data.systolic_bp),
      diastolic_bp: num(data.diastolic_bp),
      pulse_rate: num(data.pulse_rate),
      temperature: num(data.temperature),
      spo2: num(data.spo2),
      respiratory_rate: num(data.respiratory_rate),
      weight: num(data.weight),
      height: num(data.height),
      bmi,
      notes: data.notes || null,
    };

    const hasReading = Object.entries(payload).some(
      ([key, value]) =>
        !["patient_id", "visit_id", "notes"].includes(key) && value !== null
    );
    if (!hasReading) {
      toast.error("Enter at least one measurement");
      return;
    }

    setIsSubmitting(true);
    try {
      await dispatch(addVitalSigns(payload)).unwrap();
      toast.success("Vitals recorded");
      reset();
      await loadVitals();
    } catch (error) {
      toast.error((error as Error)?.message || "Failed to record vitals");
    } finally {
      setIsSubmitting(false);
    }
  };

  const latest = vitals[0] || null;

  const fields: Array<{
    name: keyof VitalsFormData;
    label: string;
    unit: string;
    placeholder: string;
  }> = [
    { name: "systolic_bp", label: "Systolic BP", unit: "mmHg", placeholder: "120" },
    { name: "diastolic_bp", label: "Diastolic BP", unit: "mmHg", placeholder: "80" },
    { name: "pulse_rate", label: "Pulse", unit: "bpm", placeholder: "72" },
    { name: "temperature", label: "Temperature", unit: "°F", placeholder: "98.6" },
    { name: "spo2", label: "SpO₂", unit: "%", placeholder: "98" },
    { name: "respiratory_rate", label: "Resp. Rate", unit: "/min", placeholder: "16" },
    { name: "weight", label: "Weight", unit: "kg", placeholder: "70" },
    { name: "height", label: "Height", unit: "cm", placeholder: "170" },
  ];

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      {!readOnly && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800">
              <HeartPulse className="h-4 w-4 text-rose-500" />
              Record Vitals
            </h3>
            {bmi !== null && (
              <span className="rounded-md bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-700">
                BMI: {bmi}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {fields.map((field) => (
              <div key={field.name}>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  {field.label}
                  <span className="ml-1 text-slate-400">({field.unit})</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder={field.placeholder}
                  {...register(field.name)}
                  className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-200"
                />
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-end gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-slate-600">Notes</label>
              <input
                type="text"
                placeholder="Optional notes"
                {...register("notes")}
                className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-200"
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-sky-600 to-blue-600 px-4 py-1.5 text-sm font-medium text-white shadow-sm transition hover:from-sky-700 hover:to-blue-700 disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              {isSubmitting ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      )}

      {/* Latest reading tiles */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800">Latest Reading</h3>
          <button
            onClick={loadVitals}
            className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
        {latest ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MiniChart
              label="Blood Pressure"
              currentValue={
                latest.systolic_bp && latest.diastolic_bp
                  ? `${latest.systolic_bp}/${latest.diastolic_bp}`
                  : "—"
              }
              unit="mmHg"
              data={vitals
                .slice(0, 10)
                .reverse()
                .map((v) => v.systolic_bp ?? 0)}
            />
            <MiniChart
              label="Pulse"
              currentValue={latest.pulse_rate != null ? String(latest.pulse_rate) : "—"}
              unit="bpm"
              data={vitals
                .slice(0, 10)
                .reverse()
                .map((v) => v.pulse_rate ?? 0)}
            />
            <MiniChart
              label="Temperature"
              currentValue={latest.temperature != null ? String(latest.temperature) : "—"}
              unit="°F"
              data={vitals
                .slice(0, 10)
                .reverse()
                .map((v) => v.temperature ?? 0)}
            />
            <MiniChart
              label="SpO₂"
              currentValue={latest.spo2 != null ? String(latest.spo2) : "—"}
              unit="%"
              data={vitals
                .slice(0, 10)
                .reverse()
                .map((v) => v.spo2 ?? 0)}
            />
          </div>
        ) : (
          <p className="py-4 text-center text-sm text-slate-500">
            No vitals recorded yet for this patient
          </p>
        )}
      </div>

      {/* Trend chart */}
      {trends.length > 1 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-bold text-slate-800">30-Day Trend</h3>
          <VitalSignsChart trends={trends} />
        </div>
      )}
    </div>
  );
}
