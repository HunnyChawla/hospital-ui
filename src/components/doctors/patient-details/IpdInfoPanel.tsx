"use client";

import React from "react";
import { BedDouble, Calendar, User, FileText, AlertCircle } from "lucide-react";

interface Admission {
  id: string;
  admission_number: string;
  admission_date: string;
  ward_name?: string;
  bed_number?: string;
  doctor_name?: string;
  admission_type?: string;
  diagnosis?: string;
  reason_for_admission?: string;
  status: string;
}

interface IpdInfoPanelProps {
  patientId: string;
  admission: Admission | null;
  loading?: boolean;
  onViewDetails?: (admissionId: string) => void;
  onDischargePlanning?: (admissionId: string) => void;
}

export const IpdInfoPanel: React.FC<IpdInfoPanelProps> = ({
  patientId,
  admission,
  loading = false,
  onViewDetails,
  onDischargePlanning,
}) => {
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-full animate-pulse rounded-lg bg-slate-200" />
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      </div>
    );
  }

  if (!admission || admission.status.toLowerCase() !== "admitted") {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
        <BedDouble className="mx-auto h-16 w-16 text-slate-300" />
        <h3 className="mt-4 text-lg font-semibold text-slate-900">
          Not Currently Admitted
        </h3>
        <p className="mt-2 text-sm text-slate-600">
          This patient is not currently admitted to the hospital.
        </p>
      </div>
    );
  }

  // Calculate days since admission
  const admissionDate = new Date(admission.admission_date);
  const today = new Date();
  const daysSinceAdmission = Math.floor(
    (today.getTime() - admissionDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-900">IPD Information</h3>
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">
          Currently Admitted
        </span>
      </div>

      {/* Admission alert */}
      <div className="rounded-lg border-2 border-sky-200 bg-gradient-to-r from-sky-50 to-teal-50 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-100">
            <BedDouble className="h-5 w-5 text-sky-700" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-sky-900">
              Admission #{admission.admission_number}
            </p>
            <p className="mt-1 text-sm text-sky-700">
              Admitted {daysSinceAdmission} {daysSinceAdmission === 1 ? "day" : "days"} ago
            </p>
          </div>
        </div>
      </div>

      {/* Admission details grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Ward */}
        {admission.ward_name && (
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium text-slate-500">Ward</p>
            <p className="mt-1 text-lg font-bold text-slate-900">
              {admission.ward_name}
            </p>
          </div>
        )}

        {/* Bed */}
        {admission.bed_number && (
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium text-slate-500">Bed Number</p>
            <p className="mt-1 text-lg font-bold text-slate-900">
              {admission.bed_number}
            </p>
          </div>
        )}

        {/* Admission Date */}
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Admission Date</p>
          <div className="mt-1 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-400" />
            <p className="font-bold text-slate-900">
              {admissionDate.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
        </div>

        {/* Duration */}
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Duration</p>
          <p className="mt-1 text-lg font-bold text-slate-900">
            {daysSinceAdmission} {daysSinceAdmission === 1 ? "Day" : "Days"}
          </p>
        </div>

        {/* Attending Doctor */}
        {admission.doctor_name && (
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium text-slate-500">Attending Doctor</p>
            <div className="mt-1 flex items-center gap-2">
              <User className="h-4 w-4 text-slate-400" />
              <p className="font-bold text-slate-900">{admission.doctor_name}</p>
            </div>
          </div>
        )}

        {/* Admission Type */}
        {admission.admission_type && (
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium text-slate-500">Admission Type</p>
            <p className="mt-1 text-lg font-bold capitalize text-slate-900">
              {admission.admission_type.replace(/_/g, " ")}
            </p>
          </div>
        )}
      </div>

      {/* Diagnosis */}
      {admission.diagnosis && (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-slate-400" />
            <p className="font-semibold text-slate-900">Diagnosis</p>
          </div>
          <p className="mt-3 text-slate-700">{admission.diagnosis}</p>
        </div>
      )}

      {/* Reason for Admission */}
      {admission.reason_for_admission && (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-slate-400" />
            <p className="font-semibold text-slate-900">Reason for Admission</p>
          </div>
          <p className="mt-3 text-slate-700">{admission.reason_for_admission}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => onViewDetails?.(admission.id)}
          className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
        >
          View Full Admission Details
        </button>
        <button
          onClick={() => onDischargePlanning?.(admission.id)}
          className="flex-1 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100"
        >
          Discharge Planning
        </button>
      </div>
    </div>
  );
};
