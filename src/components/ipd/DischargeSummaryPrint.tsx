"use client";

import { Admission } from "@/services/admissionsApi";
import { PatientApiResponse } from "@/services/patientsApi";
import { useTenant } from "@/hooks/useTenant";
import { formatDate } from "@/utils/format";
import { PrintHeader } from "@/components/common/PrintHeader";

interface DischargeSummaryPrintProps {
  admission: Admission;
  patient: PatientApiResponse;
}

export function DischargeSummaryPrint({ admission, patient }: DischargeSummaryPrintProps) {
  const { tenant } = useTenant();

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

  // Format address
  const formatAddress = () => {
    const parts = [
      patient.address,
      patient.city,
      patient.state,
      patient.pincode,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : null;
  };

  const address = formatAddress();

  return (
    <div className="mx-auto max-w-2xl bg-white p-4 print:p-2">
      {/* Header */}
      <PrintHeader tenant={tenant} documentType="Discharge Summary" />

      {/* Admission Number & Dates */}
      <div className="mb-3">
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div>
            <p className="text-[10px] text-slate-600">Admission Number</p>
            <p className="text-sm font-bold text-slate-900">{admission.admission_number}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-600">Admission Date</p>
            <p className="text-xs font-bold text-slate-900">{formatDateTime(admission.admission_time || `${admission.admission_date}T00:00:00`)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-600">Discharge Date</p>
            <p className="text-xs font-bold text-slate-900">{formatDateTime(admission.discharge_time || admission.discharge_date || null)}</p>
          </div>
        </div>
      </div>

      {/* Patient Details */}
      <div className="mb-3 space-y-1">
        <h2 className="border-b border-slate-300 pb-1 text-sm font-bold text-slate-900">
          Patient Information
        </h2>
        <div className="grid grid-cols-4 gap-2 text-xs">
          <div>
            <p className="text-[10px] text-slate-600">Patient Name</p>
            <p className="font-semibold text-slate-900">{fullName}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-600">UHID</p>
            <p className="font-semibold text-slate-900">{patient.uhid}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-600">Age</p>
            <p className="font-semibold text-slate-900">{calculateAge(patient.date_of_birth)} years</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-600">Gender</p>
            <p className="font-semibold text-slate-900 capitalize">{patient.gender}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-600">Mobile</p>
            <p className="font-semibold text-slate-900">{patient.mobile}</p>
          </div>
          {patient.email && (
            <div>
              <p className="text-[10px] text-slate-600">Email</p>
              <p className="font-semibold text-slate-900">{patient.email}</p>
            </div>
          )}
          {address && (
            <div className="col-span-4">
              <p className="text-[10px] text-slate-600">Address</p>
              <p className="font-semibold text-slate-900">{address}</p>
            </div>
          )}
        </div>
      </div>

      {/* Admission Details */}
      <div className="mb-3 space-y-1">
        <h2 className="border-b border-slate-300 pb-1 text-sm font-bold text-slate-900">
          Admission Details
        </h2>
        <div className="grid grid-cols-4 gap-2 text-xs">
          <div>
            <p className="text-[10px] text-slate-600">Doctor</p>
            <p className="font-semibold text-slate-900">{admission.doctor_name || "N/A"}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-600">Ward / Bed</p>
            <p className="font-semibold text-slate-900">
              {admission.ward_name && admission.bed_number
                ? `${admission.ward_name} / ${admission.bed_number}`
                : admission.ward_name || admission.bed_number || "N/A"}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-slate-600">Admission Type</p>
            <p className="font-semibold text-slate-900 capitalize">
              {admission.admission_type.replace("_", " ")}
            </p>
          </div>
          {admission.discharge_type && (
            <div>
              <p className="text-[10px] text-slate-600">Discharge Type</p>
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
        <div className="mb-3 space-y-1">
          <h2 className="border-b border-slate-300 pb-1 text-sm font-bold text-slate-900">
            Final Diagnosis
          </h2>
          <div className="rounded border border-slate-200 bg-slate-50 p-2">
            <p className="text-xs leading-relaxed text-slate-900 whitespace-pre-wrap">
              {admission.final_diagnosis}
            </p>
          </div>
        </div>
      )}

      {/* Discharge Summary */}
      {admission.discharge_summary && (
        <div className="mb-3 space-y-1">
          <h2 className="border-b border-slate-300 pb-1 text-sm font-bold text-slate-900">
            Discharge Summary
          </h2>
          <div className="rounded border border-slate-200 bg-slate-50 p-2">
            <p className="text-xs leading-relaxed text-slate-900 whitespace-pre-wrap">
              {admission.discharge_summary}
            </p>
          </div>
        </div>
      )}

      {/* Discharge Instructions */}
      {admission.discharge_instructions && (
        <div className="mb-3 space-y-1">
          <h2 className="border-b border-slate-300 pb-1 text-sm font-bold text-slate-900">
            Discharge Instructions
          </h2>
          <div className="rounded border border-slate-200 bg-slate-50 p-2">
            <p className="text-xs leading-relaxed text-slate-900 whitespace-pre-wrap">
              {admission.discharge_instructions}
            </p>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 border-t border-slate-300 pt-2 text-center text-[10px] text-slate-600">
        <p>This is a computer-generated discharge summary. No signature required.</p>
        <p className="mt-1">Generated on {new Date().toLocaleString("en-IN")}</p>
      </div>
    </div>
  );
}

