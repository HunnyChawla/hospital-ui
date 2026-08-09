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

/**
 * Read-only accordion of what the examiner recorded — the doctor's left pane
 * while prescribing. Allergies render with a red tone and are never collapsed
 * by default.
 */
export function ClinicExaminationSummaryPane({
  patientId,
  visitId,
  onEditSection,
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
        onEdit={onEditSection ? () => onEditSection("drug_allergies") : undefined}
      >
        {drugAllergies.length === 0 ? (
          <span className="text-slate-400">No known drug allergies recorded</span>
        ) : (
          <ul className="space-y-1">
            {drugAllergies.map((allergy) => (
              <li key={allergy.id} className="flex items-baseline gap-1.5">
                <span className="font-semibold text-rose-700">{allergy.drug_name}</span>
                {allergy.reaction && <span className="text-rose-600">— {allergy.reaction}</span>}
                {allergy.severity && (
                  <span className="rounded bg-rose-100 px-1 text-[10px] uppercase text-rose-700">
                    {allergy.severity}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section
        title="Vitals"
        icon={HeartPulse}
        onEdit={onEditSection ? () => onEditSection("vitals") : undefined}
      >
        {vitals ? (
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            {vitals.systolic_bp != null && vitals.diastolic_bp != null && (
              <span>
                BP:{" "}
                <b>
                  {vitals.systolic_bp}/{vitals.diastolic_bp}
                </b>{" "}
                mmHg
              </span>
            )}
            {vitals.pulse_rate != null && (
              <span>
                Pulse: <b>{vitals.pulse_rate}</b> bpm
              </span>
            )}
            {vitals.temperature != null && (
              <span>
                Temp: <b>{vitals.temperature}</b> °F
              </span>
            )}
            {vitals.spo2 != null && (
              <span>
                SpO₂: <b>{vitals.spo2}</b>%
              </span>
            )}
            {vitals.respiratory_rate != null && (
              <span>
                RR: <b>{vitals.respiratory_rate}</b>/min
              </span>
            )}
            {vitals.weight != null && (
              <span>
                Wt: <b>{vitals.weight}</b> kg
              </span>
            )}
            {vitals.bmi != null && (
              <span>
                BMI: <b>{vitals.bmi}</b>
              </span>
            )}
          </div>
        ) : (
          <span className="text-slate-400">No vitals recorded</span>
        )}
      </Section>

      <Section
        title={`Complaints${complaints.length ? ` (${complaints.length})` : ""}`}
        icon={MessageSquare}
        onEdit={onEditSection ? () => onEditSection("chief_complaint") : undefined}
      >
        {complaints.length === 0 ? (
          <span className="text-slate-400">No complaints recorded</span>
        ) : (
          <ul className="space-y-1">
            {complaints.map((complaint) => (
              <li key={complaint.id}>
                <span className="font-medium">{complaint.complaint}</span>
                {complaint.duration && (
                  <span className="text-slate-500"> · {complaint.duration}</span>
                )}
                {complaint.severity && (
                  <span className="ml-1 rounded bg-slate-100 px-1 text-[10px] uppercase text-slate-600">
                    {complaint.severity}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section
        title={`Medical History${medicalConditions.length ? ` (${medicalConditions.length})` : ""}`}
        icon={FileHeart}
        onEdit={onEditSection ? () => onEditSection("medical_history") : undefined}
      >
        {medicalConditions.length === 0 ? (
          <span className="text-slate-400">No conditions recorded</span>
        ) : (
          <ul className="space-y-1">
            {medicalConditions.map((condition) => (
              <li key={condition.id}>
                <span className="font-medium">{condition.condition_name}</span>
                {condition.duration && (
                  <span className="text-slate-500"> · {condition.duration}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {loading && <p className="py-1 text-center text-[10px] text-slate-400">Refreshing…</p>}
    </div>
  );
}
