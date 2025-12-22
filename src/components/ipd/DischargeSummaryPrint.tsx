"use client";

import { Admission } from "@/services/admissionsApi";
import { PatientApiResponse } from "@/services/patientsApi";
import { useTenant } from "@/hooks/useTenant";
import { formatDate } from "@/utils/format";

interface DischargeSummaryPrintProps {
  admission: Admission;
  patient: PatientApiResponse;
}

export function DischargeSummaryPrint({ admission, patient }: DischargeSummaryPrintProps) {
  const { hospitalName } = useTenant();

  const fullName = `${patient.first_name} ${patient.last_name || ""}`.trim();
  const calculateAge = (dateOfBirth: string): number => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const formatDateTime = (dateTime: string | null) => {
    if (!dateTime) return "N/A";
    try {
      const date = new Date(dateTime);
      return date.toLocaleString("en-IN", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateTime;
    }
  };

  return (
    <div className="mx-auto max-w-2xl bg-white p-8 print:p-4">
      {/* Header */}
      <div className="mb-6 border-b-2 border-slate-800 pb-4 text-center">
        <h1 className="text-3xl font-bold text-slate-900">{hospitalName.toUpperCase()}</h1>
        <p className="mt-1 text-sm text-slate-600">Discharge Summary</p>
      </div>

      {/* Admission Number & Dates */}
      <div className="mb-6 rounded-lg border-2 border-sky-500 bg-sky-50 p-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-slate-600">Admission Number</p>
            <p className="text-xl font-bold text-slate-900">{admission.admission_number}</p>
          </div>
          <div>
            <p className="text-xs text-slate-600">Admission Date</p>
            <p className="text-sm font-bold text-slate-900">{formatDateTime(admission.admission_time || `${admission.admission_date}T00:00:00`)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-600">Discharge Date</p>
            <p className="text-sm font-bold text-sky-600">{formatDateTime(admission.discharge_time || admission.discharge_date || null)}</p>
          </div>
        </div>
      </div>

      {/* Patient Details */}
      <div className="mb-6 space-y-4">
        <h2 className="border-b border-slate-300 pb-2 text-lg font-bold text-slate-900">
          Patient Information
        </h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-600">Patient Name</p>
            <p className="font-semibold text-slate-900">{fullName}</p>
          </div>
          <div>
            <p className="text-slate-600">UHID</p>
            <p className="font-semibold text-slate-900">{patient.uhid}</p>
          </div>
          <div>
            <p className="text-slate-600">Age</p>
            <p className="font-semibold text-slate-900">{calculateAge(patient.date_of_birth)} years</p>
          </div>
          <div>
            <p className="text-slate-600">Gender</p>
            <p className="font-semibold text-slate-900 capitalize">{patient.gender}</p>
          </div>
          <div>
            <p className="text-slate-600">Mobile</p>
            <p className="font-semibold text-slate-900">{patient.mobile}</p>
          </div>
          {patient.email && (
            <div>
              <p className="text-slate-600">Email</p>
              <p className="font-semibold text-slate-900">{patient.email}</p>
            </div>
          )}
          {(patient.address || patient.city || patient.state || patient.pincode) && (
            <div className="col-span-2">
              <p className="text-slate-600">Address</p>
              <p className="font-semibold text-slate-900">
                {[patient.address, patient.city, patient.state, patient.pincode]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Admission Details */}
      <div className="mb-6 space-y-4">
        <h2 className="border-b border-slate-300 pb-2 text-lg font-bold text-slate-900">
          Admission Details
        </h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-600">Doctor</p>
            <p className="font-semibold text-slate-900">{admission.doctor_name || "N/A"}</p>
          </div>
          <div>
            <p className="text-slate-600">Ward / Bed</p>
            <p className="font-semibold text-slate-900">
              {admission.ward_name && admission.bed_number
                ? `${admission.ward_name} / ${admission.bed_number}`
                : admission.ward_name || admission.bed_number || "N/A"}
            </p>
          </div>
          <div>
            <p className="text-slate-600">Admission Type</p>
            <p className="font-semibold text-slate-900 capitalize">
              {admission.admission_type.replace("_", " ")}
            </p>
          </div>
          {admission.discharge_type && (
            <div>
              <p className="text-slate-600">Discharge Type</p>
              <p className="font-semibold text-slate-900 capitalize">
                {admission.discharge_type === "ama"
                  ? "AMA (Against Medical Advice)"
                  : admission.discharge_type === "lama"
                  ? "LAMA (Leave Against Medical Advice)"
                  : admission.discharge_type}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Final Diagnosis */}
      {admission.final_diagnosis && (
        <div className="mb-6 space-y-4">
          <h2 className="border-b border-slate-300 pb-2 text-lg font-bold text-slate-900">
            Final Diagnosis
          </h2>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm leading-relaxed text-slate-900 whitespace-pre-wrap">
              {admission.final_diagnosis}
            </p>
          </div>
        </div>
      )}

      {/* Discharge Summary */}
      {admission.discharge_summary && (
        <div className="mb-6 space-y-4">
          <h2 className="border-b border-slate-300 pb-2 text-lg font-bold text-slate-900">
            Discharge Summary
          </h2>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm leading-relaxed text-slate-900 whitespace-pre-wrap">
              {admission.discharge_summary}
            </p>
          </div>
        </div>
      )}

      {/* Discharge Instructions */}
      {admission.discharge_instructions && (
        <div className="mb-6 space-y-4">
          <h2 className="border-b border-slate-300 pb-2 text-lg font-bold text-slate-900">
            Discharge Instructions
          </h2>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm leading-relaxed text-slate-900 whitespace-pre-wrap">
              {admission.discharge_instructions}
            </p>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 border-t-2 border-slate-300 pt-4 text-center text-xs text-slate-600">
        <p>This is a computer-generated discharge summary. No signature required.</p>
        <p className="mt-1">Generated on {new Date().toLocaleString("en-IN")}</p>
      </div>
    </div>
  );
}

