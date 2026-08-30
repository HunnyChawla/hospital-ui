"use client";

import React from "react";
import { useTenant } from "@/hooks/useTenant";
import { PrintHeader } from "@/components/common/PrintHeader";
import { AutoFillDischargeSummary, DischargeMedicationItem } from "@/types/ipdDoctor";

interface IpdDischargeSummaryPrintProps {
  summary: AutoFillDischargeSummary;
}

export function IpdDischargeSummaryPrint({ summary }: IpdDischargeSummaryPrintProps) {
  const { tenant } = useTenant();

  const formatDate = (dStr?: string | null) => {
    if (!dStr) return "N/A";
    try {
      const d = new Date(dStr);
      return d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dStr;
    }
  };

  const formatDateTime = (dtStr?: string | null) => {
    if (!dtStr) return "N/A";
    try {
      const d = new Date(dtStr);
      return d.toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dtStr;
    }
  };

  return (
    <div className="mx-auto max-w-4xl bg-white p-6 text-slate-900 print:p-2 text-xs leading-relaxed font-sans">
      {/* Header */}
      <PrintHeader tenant={tenant} documentType="INPATIENT DISCHARGE SUMMARY" />

      {/* Primary Stay & Admission Metadata Bar */}
      <div className="mt-3 rounded-lg border border-slate-300 bg-slate-50 p-2.5">
        <div className="grid grid-cols-4 gap-2 text-[11px]">
          <div>
            <span className="text-slate-500 block text-[10px]">Admission No</span>
            <strong className="text-slate-900 font-bold">{summary.admission_number}</strong>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px]">Admission Date & Time</span>
            <strong className="text-slate-800">
              {formatDateTime(summary.admission_time || `${summary.admission_date}T00:00:00`)}
            </strong>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px]">Discharge Date & Time</span>
            <strong className="text-slate-800">
              {formatDateTime(summary.discharge_time || `${summary.discharge_date}T00:00:00`)}
            </strong>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px]">Stay Duration</span>
            <strong className="text-sky-800">
              {summary.length_of_stay_days} {summary.length_of_stay_days === 1 ? "Day" : "Days"}
            </strong>
          </div>
        </div>
      </div>

      {/* Patient Demographic Information */}
      <div className="mt-3 border-b border-slate-300 pb-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-1">
          Patient Demographics
        </h3>
        <div className="grid grid-cols-4 gap-2 text-[11px]">
          <div>
            <span className="text-slate-500">Patient Name:</span>{" "}
            <strong className="text-slate-900">{summary.patient_name}</strong>
          </div>
          <div>
            <span className="text-slate-500">UHID:</span>{" "}
            <strong>{summary.uhid}</strong>
          </div>
          <div>
            <span className="text-slate-500">Age / Gender:</span>{" "}
            <strong>
              {summary.age ? `${summary.age} yrs` : "N/A"} / {summary.gender || "N/A"}
            </strong>
          </div>
          <div>
            <span className="text-slate-500">Mobile:</span>{" "}
            <strong>{summary.mobile || "N/A"}</strong>
          </div>
          <div>
            <span className="text-slate-500">Ward / Bed:</span>{" "}
            <strong>
              {summary.ward_name && summary.bed_number
                ? `${summary.ward_name} / Bed ${summary.bed_number}`
                : summary.ward_name || summary.bed_number || "N/A"}
            </strong>
          </div>
          <div>
            <span className="text-slate-500">Attending Consultant:</span>{" "}
            <strong className="text-sky-900">{summary.doctor_name}</strong>
          </div>
          <div>
            <span className="text-slate-500">Discharge Type:</span>{" "}
            <strong className="capitalize">{summary.discharge_type}</strong>
          </div>
          <div>
            <span className="text-slate-500">Condition at Discharge:</span>{" "}
            <strong className="text-emerald-800">{summary.condition_at_discharge}</strong>
          </div>
        </div>
      </div>

      {/* Diagnosis Section */}
      <div className="mt-3 border-b border-slate-300 pb-2.5">
        <div className="grid grid-cols-2 gap-4 text-xs">
          {summary.provisional_diagnosis && (
            <div>
              <p className="font-bold text-slate-700 text-[11px] uppercase tracking-wide">
                Provisional / Initial Diagnosis
              </p>
              <p className="mt-0.5 text-slate-800">{summary.provisional_diagnosis}</p>
            </div>
          )}
          <div>
            <p className="font-bold text-slate-900 text-[11px] uppercase tracking-wide">
              Final Diagnosis
            </p>
            <p className="mt-0.5 font-bold text-slate-900">{summary.final_diagnosis}</p>
          </div>
        </div>
      </div>

      {/* Reason for Admission & Clinical Course */}
      <div className="mt-3 border-b border-slate-300 pb-2.5 space-y-2">
        {summary.chief_complaints && (
          <div>
            <p className="font-bold text-slate-800 text-[11px] uppercase tracking-wide">
              Chief Complaints & Reason for Admission
            </p>
            <p className="mt-0.5 text-slate-700">{summary.chief_complaints}</p>
          </div>
        )}

        <div>
          <p className="font-bold text-slate-800 text-[11px] uppercase tracking-wide">
            Course in Hospital & Progress
          </p>
          <p className="mt-0.5 text-slate-700 whitespace-pre-wrap leading-relaxed bg-slate-50 p-2 rounded border border-slate-200">
            {summary.clinical_course}
          </p>
        </div>
      </div>

      {/* Vitals: Admission vs Discharge */}
      <div className="mt-3 border-b border-slate-300 pb-2.5">
        <p className="font-bold text-slate-800 text-[11px] uppercase tracking-wide mb-1">
          Vital Signs Comparison
        </p>
        <div className="grid grid-cols-2 gap-3 text-[11px]">
          <div className="rounded border border-slate-200 p-2 bg-slate-50">
            <span className="font-bold text-slate-600 block text-[10px]">Vitals on Admission:</span>
            <p className="text-slate-800">{summary.admission_vitals_summary || "N/A"}</p>
          </div>
          <div className="rounded border border-slate-200 p-2 bg-emerald-50/50">
            <span className="font-bold text-emerald-800 block text-[10px]">Vitals at Discharge:</span>
            <p className="text-slate-800">{summary.discharge_vitals_summary || "N/A"}</p>
          </div>
        </div>
      </div>

      {/* Key Investigations & Hospital Treatment */}
      <div className="mt-3 border-b border-slate-300 pb-2.5 grid grid-cols-2 gap-4">
        <div>
          <p className="font-bold text-slate-800 text-[11px] uppercase tracking-wide mb-1">
            Investigations Summary
          </p>
          <p className="text-slate-700 whitespace-pre-wrap text-[11px]">
            {summary.investigations_summary || "Routine investigations completed."}
          </p>
        </div>

        <div>
          <p className="font-bold text-slate-800 text-[11px] uppercase tracking-wide mb-1">
            Hospital Treatment Given (MAR Summary)
          </p>
          <p className="text-slate-700 whitespace-pre-wrap text-[11px]">
            {summary.hospital_treatment_summary || "IV Antibiotics, analgesics, fluids, supportive therapy."}
          </p>
        </div>
      </div>

      {/* Discharge Medications (Rx on Discharge) */}
      <div className="mt-3 border-b border-slate-300 pb-2.5">
        <p className="font-bold text-slate-900 text-xs uppercase tracking-wide mb-1.5 flex items-center gap-1">
          <span>💊</span> Discharge Medications (Rx on Discharge)
        </p>
        {summary.discharge_medications && summary.discharge_medications.length > 0 ? (
          <table className="w-full text-left text-[11px] border border-slate-300">
            <thead className="bg-slate-100 border-b border-slate-300 text-slate-700">
              <tr>
                <th className="py-1 px-2 font-bold">#</th>
                <th className="py-1 px-2 font-bold">Medicine</th>
                <th className="py-1 px-2 font-bold">Dose & Route</th>
                <th className="py-1 px-2 font-bold">Frequency & Timing</th>
                <th className="py-1 px-2 font-bold">Duration</th>
                <th className="py-1 px-2 font-bold">Instructions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {summary.discharge_medications.map((med, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="py-1 px-2 font-semibold">{idx + 1}</td>
                  <td className="py-1 px-2 font-bold text-slate-900">
                    {med.medicine_name}
                    {med.generic_name && (
                      <span className="block text-[10px] text-slate-500 font-normal">
                        {med.generic_name}
                      </span>
                    )}
                  </td>
                  <td className="py-1 px-2">{med.dose} ({med.route})</td>
                  <td className="py-1 px-2">
                    <span className="font-semibold">{med.frequency}</span>
                    {med.timing && <span className="text-slate-500"> - {med.timing}</span>}
                  </td>
                  <td className="py-1 px-2 font-semibold">{med.duration}</td>
                  <td className="py-1 px-2 text-slate-600">{med.instructions || "As directed"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-slate-500 italic">No discharge medications prescribed.</p>
        )}
      </div>

      {/* Discharge Advice & Instructions */}
      <div className="mt-3 border-b border-slate-300 pb-2.5 space-y-2 text-[11px]">
        <div className="grid grid-cols-3 gap-3">
          {summary.diet_advice && (
            <div className="rounded border border-slate-200 p-2 bg-slate-50">
              <strong className="text-slate-800 block text-[10px]">Dietary Advice:</strong>
              <p className="text-slate-700">{summary.diet_advice}</p>
            </div>
          )}

          {summary.activity_advice && (
            <div className="rounded border border-slate-200 p-2 bg-slate-50">
              <strong className="text-slate-800 block text-[10px]">Physical Activity:</strong>
              <p className="text-slate-700">{summary.activity_advice}</p>
            </div>
          )}

          {summary.discharge_advice && (
            <div className="rounded border border-slate-200 p-2 bg-slate-50">
              <strong className="text-slate-800 block text-[10px]">General Advice:</strong>
              <p className="text-slate-700">{summary.discharge_advice}</p>
            </div>
          )}
        </div>

        {summary.emergency_warning_signs && (
          <div className="rounded border border-rose-200 bg-rose-50/70 p-2 text-rose-900">
            <strong className="block text-[10px] text-rose-800">⚠️ When to seek immediate emergency care:</strong>
            <p>{summary.emergency_warning_signs}</p>
          </div>
        )}
      </div>

      {/* Follow-up Section & Doctor Signature */}
      <div className="mt-4 flex items-end justify-between pt-2">
        <div className="max-w-md">
          <p className="text-xs font-bold text-slate-900 uppercase">
            📅 Follow-up Appointment:
          </p>
          <p className="mt-0.5 text-xs text-sky-900 font-semibold">
            {summary.followup_instructions || `Review in OPD on ${formatDate(summary.followup_date)}`}
          </p>
        </div>

        <div className="text-right space-y-1">
          <div className="h-12" />
          <p className="text-xs font-bold text-slate-900">{summary.doctor_name}</p>
          <p className="text-[10px] text-slate-500">Attending Consultant / Sign</p>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 border-t border-slate-300 pt-2 text-center text-[9px] text-slate-500">
        <p>This is a computer-generated Inpatient Discharge Summary.</p>
      </div>
    </div>
  );
}
