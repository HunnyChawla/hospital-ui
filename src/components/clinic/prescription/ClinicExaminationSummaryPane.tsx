"use client";

import React, { useEffect, useState } from "react";
import clsx from "clsx";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  FileHeart,
  HeartPulse,
  MessageSquare,
  Pencil,
} from "lucide-react";
import { useClinicalRecords } from "@/hooks/useClinicalRecords";
import { vitalSignsApi } from "@/services/vitalSignsApi";
import type { VitalSigns } from "@/types";

interface ClinicExaminationSummaryPaneProps {
  patientId: string;
  visitId: string | null;
  /** Jump to Examine mode on this section — nothing here is a dead end. */
  onEditSection?: (componentKey: string) => void;
}

function Section({
  title,
  icon: Icon,
  tone = "slate",
  defaultOpen = true,
  onEdit,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "slate" | "rose";
  defaultOpen?: boolean;
  onEdit?: () => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      className={clsx(
        "overflow-hidden rounded-lg border",
        tone === "rose" ? "border-rose-200 bg-rose-50/50" : "border-slate-200 bg-white"
      )}
    >
      <div
        className={clsx(
          "flex cursor-pointer items-center justify-between px-3 py-2",
          tone === "rose" ? "bg-rose-100/70" : "bg-slate-50"
        )}
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-1.5">
          {open ? (
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
          )}
          <Icon
            className={clsx("h-3.5 w-3.5", tone === "rose" ? "text-rose-600" : "text-slate-500")}
          />
          <span
            className={clsx(
              "text-xs font-semibold",
              tone === "rose" ? "text-rose-800" : "text-slate-700"
            )}
          >
            {title}
          </span>
        </div>
        {onEdit && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="rounded p-1 text-slate-400 hover:bg-white hover:text-sky-600"
            title="Edit in Examine mode"
          >
            <Pencil className="h-3 w-3" />
          </button>
        )}
      </div>
      {open && <div className="px-3 py-2 text-xs text-slate-700">{children}</div>}
    </div>
  );
}

const formatDuration = (d: string | null) => {
  if (!d) return "—";
  switch (d) {
    case "less_than_1": return "< 1 Yr";
    case "1_to_5": return "1-5 Yrs";
    case "5_to_10": return "5-10 Yrs";
    case "more_than_10": return "> 10 Yrs";
    default: return d.replace(/_/g, " ");
  }
};

/**
 * Read-only accordion of what the examiner recorded — the doctor's left pane
 * while prescribing. Allergies render with a red tone and are never collapsed
 * by default.
 */
export function ClinicExaminationSummaryPane({
  patientId,
  visitId,
}: ClinicExaminationSummaryPaneProps) {
  const { complaints, medicalConditions, drugAllergies, loading } = useClinicalRecords(
    patientId,
    visitId
  );
  const [vitals, setVitals] = useState<VitalSigns | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!patientId) return;
      try {
        // Prefer the visit's reading; fall back to the latest patient reading
        if (visitId) {
          const byVisit = await vitalSignsApi.list({
            patient_id: patientId,
            visit_id: visitId,
            page: 1,
            page_size: 1,
          });
          if (!cancelled && byVisit.items.length > 0) {
            setVitals(byVisit.items[0]);
            return;
          }
        }
        const latest = await vitalSignsApi.list({
          patient_id: patientId,
          page: 1,
          page_size: 1,
        });
        if (!cancelled) setVitals(latest.items[0] ?? null);
      } catch {
        if (!cancelled) setVitals(null);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [patientId, visitId]);

  return (
    <div className="flex h-full flex-col gap-2 overflow-y-auto p-2">
      {/* Allergies first, red, expanded — the one thing a prescriber must see */}
      <Section
        title={`Drug Allergies${drugAllergies.length ? ` (${drugAllergies.length})` : ""}`}
        icon={AlertTriangle}
        tone={drugAllergies.length > 0 ? "rose" : "slate"}
      >
        {drugAllergies.length === 0 ? (
          <span className="text-slate-400">No known drug allergies recorded</span>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-rose-200 text-[10px] font-semibold uppercase tracking-wider text-rose-800">
                  <th className="pb-1.5 font-bold text-left">Drug Name</th>
                  <th className="pb-1.5 font-bold text-left">Reaction</th>
                  <th className="pb-1.5 font-bold text-right">Severity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rose-100">
                {drugAllergies.map((allergy) => (
                  <tr key={allergy.id} className="hover:bg-rose-50/30">
                    <td className="py-1.5 font-semibold text-rose-700 text-left">{allergy.drug_name}</td>
                    <td className="py-1.5 text-slate-600 text-left">{allergy.reaction || "—"}</td>
                    <td className="py-1.5 text-right">
                      {allergy.severity ? (
                        <span className={clsx(
                          "rounded px-1.5 py-0.5 text-[9px] font-bold uppercase",
                          allergy.severity.toLowerCase() === "severe" ? "bg-rose-100 text-rose-700 border border-rose-200" :
                          allergy.severity.toLowerCase() === "moderate" ? "bg-amber-100 text-amber-700 border border-amber-200" :
                          "bg-slate-100 text-slate-700 border border-slate-200"
                        )}>
                          {allergy.severity}
                        </span>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section
        title="Vitals"
        icon={HeartPulse}
      >
        {vitals ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  <th className="pb-1.5 font-bold text-left">Vital Sign</th>
                  <th className="pb-1.5 font-bold text-right">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vitals.systolic_bp != null && vitals.diastolic_bp != null && (
                  <tr className="hover:bg-slate-50/50">
                    <td className="py-1.5 text-slate-500 font-medium text-left">Blood Pressure</td>
                    <td className="py-1.5 text-right font-bold text-slate-800">
                      {vitals.systolic_bp}/{vitals.diastolic_bp} <span className="text-[10px] font-normal text-slate-400">mmHg</span>
                    </td>
                  </tr>
                )}
                {vitals.pulse_rate != null && (
                  <tr className="hover:bg-slate-50/50">
                    <td className="py-1.5 text-slate-500 font-medium text-left">Pulse Rate</td>
                    <td className="py-1.5 text-right font-bold text-slate-800">
                      {vitals.pulse_rate} <span className="text-[10px] font-normal text-slate-400">bpm</span>
                    </td>
                  </tr>
                )}
                {vitals.temperature != null && (
                  <tr className="hover:bg-slate-50/50">
                    <td className="py-1.5 text-slate-500 font-medium text-left">Temperature</td>
                    <td className="py-1.5 text-right font-bold text-slate-800">
                      {vitals.temperature} <span className="text-[10px] font-normal text-slate-400">°F</span>
                    </td>
                  </tr>
                )}
                {vitals.spo2 != null && (
                  <tr className="hover:bg-slate-50/50">
                    <td className="py-1.5 text-slate-500 font-medium text-left">SpO₂</td>
                    <td className="py-1.5 text-right font-bold text-slate-800">
                      {vitals.spo2} <span className="text-[10px] font-normal text-slate-400">%</span>
                    </td>
                  </tr>
                )}
                {vitals.respiratory_rate != null && (
                  <tr className="hover:bg-slate-50/50">
                    <td className="py-1.5 text-slate-500 font-medium text-left">Respiratory Rate</td>
                    <td className="py-1.5 text-right font-bold text-slate-800">
                      {vitals.respiratory_rate} <span className="text-[10px] font-normal text-slate-400">/min</span>
                    </td>
                  </tr>
                )}
                {vitals.weight != null && (
                  <tr className="hover:bg-slate-50/50">
                    <td className="py-1.5 text-slate-500 font-medium text-left">Weight</td>
                    <td className="py-1.5 text-right font-bold text-slate-800">
                      {vitals.weight} <span className="text-[10px] font-normal text-slate-400">kg</span>
                    </td>
                  </tr>
                )}
                {vitals.height != null && (
                  <tr className="hover:bg-slate-50/50">
                    <td className="py-1.5 text-slate-500 font-medium text-left">Height</td>
                    <td className="py-1.5 text-right font-bold text-slate-800">
                      {vitals.height} <span className="text-[10px] font-normal text-slate-400">cm</span>
                    </td>
                  </tr>
                )}
                {vitals.bmi != null && (
                  <tr className="hover:bg-slate-50/50">
                    <td className="py-1.5 text-slate-500 font-medium text-left">BMI</td>
                    <td className="py-1.5 text-right font-bold text-slate-800">{vitals.bmi}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <span className="text-slate-400">No vitals recorded</span>
        )}
      </Section>

      <Section
        title={`Chief Complaints${complaints.length ? ` (${complaints.length})` : ""}`}
        icon={MessageSquare}
      >
        {complaints.length === 0 ? (
          <span className="text-slate-400">No complaints recorded</span>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  <th className="pb-1.5 font-bold text-left">Complaint</th>
                  <th className="pb-1.5 font-bold text-center">Severity</th>
                  <th className="pb-1.5 font-bold text-right">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {complaints.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50">
                    <td className="py-1.5 text-left">
                      <span className="font-semibold text-slate-800">{c.complaint}</span>
                      {c.notes && <p className="text-[10px] text-slate-400 mt-0.5">{c.notes}</p>}
                    </td>
                    <td className="py-1.5 text-center">
                      {c.severity ? (
                        <span className={clsx(
                          "rounded px-1.5 py-0.5 text-[9px] font-bold uppercase",
                          c.severity.toLowerCase() === "severe" ? "bg-rose-50 text-rose-600 border border-rose-100" :
                          c.severity.toLowerCase() === "moderate" ? "bg-amber-50 text-amber-600 border border-amber-100" :
                          "bg-slate-50 text-slate-600 border border-slate-100"
                        )}>
                          {c.severity}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="py-1.5 text-right text-slate-500 font-medium">{c.duration || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section
        title={`Medical History${medicalConditions.length ? ` (${medicalConditions.length})` : ""}`}
        icon={FileHeart}
      >
        {medicalConditions.length === 0 ? (
          <span className="text-slate-400">No conditions recorded</span>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  <th className="pb-1.5 font-bold text-left">Condition</th>
                  <th className="pb-1.5 font-bold text-center">Meds</th>
                  <th className="pb-1.5 font-bold text-center">Controlled</th>
                  <th className="pb-1.5 font-bold text-right">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {medicalConditions.map((condition) => (
                  <tr key={condition.id} className="hover:bg-slate-50/50">
                    <td className="py-1.5 font-semibold text-slate-800 text-left">
                      {condition.condition_name.replace(/_/g, " ")}
                    </td>
                    <td className="py-1.5 text-center">
                      {condition.on_medication !== null && condition.on_medication !== undefined ? (
                        <span className={clsx(
                          "rounded px-1.5 py-0.5 text-[9px] font-semibold",
                          condition.on_medication ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-slate-50 text-slate-500"
                        )}>
                          {condition.on_medication ? "Yes" : "No"}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="py-1.5 text-center">
                      {condition.is_controlled !== null && condition.is_controlled !== undefined ? (
                        <span className={clsx(
                          "rounded px-1.5 py-0.5 text-[9px] font-semibold",
                          condition.is_controlled ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-amber-50 text-amber-700 border border-amber-100"
                        )}>
                          {condition.is_controlled ? "Yes" : "No"}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="py-1.5 text-right text-slate-500 font-medium">
                      {formatDuration(condition.duration)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {loading && <p className="py-1 text-center text-[10px] text-slate-400">Refreshing…</p>}
    </div>
  );
}
