"use client";

import { Patient } from "@/types";
import { useTenant } from "@/hooks/useTenant";
import { PrintHeader } from "@/components/common/PrintHeader";

interface OpdSlipPrintProps {
  patient: Patient;
  doctor: string;
  symptoms: string;
  opdNumber: string;
  tokenNumber: number;
}

export function OpdSlipPrint({
  patient,
  doctor,
  symptoms,
  opdNumber,
  tokenNumber,
}: OpdSlipPrintProps) {
  const { tenant } = useTenant();

  return (
    <div className="mx-auto max-w-2xl bg-white p-8 print:p-4">
      {/* Header */}
      <PrintHeader tenant={tenant} documentType="OPD Slip" />

      {/* OPD Number & Token */}
      <div className="mb-6 flex items-center justify-between rounded-lg border-2 border-sky-500 bg-sky-50 p-4">
        <div>
          <p className="text-xs text-slate-600">OPD Number</p>
          <p className="text-xl font-bold text-slate-900">{opdNumber}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-600">Token Number</p>
          <p className="text-xl font-bold text-sky-600">#{tokenNumber}</p>
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
            <p className="font-semibold text-slate-900">{patient.name}</p>
          </div>
          <div>
            <p className="text-slate-600">Patient ID</p>
            <p className="font-semibold text-slate-900">{patient.id}</p>
          </div>
          <div>
            <p className="text-slate-600">Health ID</p>
            <p className="font-semibold text-slate-900">{patient.healthId}</p>
          </div>
          <div>
            <p className="text-slate-600">Mobile</p>
            <p className="font-semibold text-slate-900">{patient.mobile}</p>
          </div>
          <div>
            <p className="text-slate-600">Age / Gender</p>
            <p className="font-semibold text-slate-900">
              {patient.age} years • {patient.gender}
            </p>
          </div>
          <div>
            <p className="text-slate-600">Date</p>
            <p className="font-semibold text-slate-900">
              {new Date().toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Visit Details */}
      <div className="mb-6 space-y-4">
        <h2 className="border-b border-slate-300 pb-2 text-lg font-bold text-slate-900">
          Visit Details
        </h2>
        <div className="space-y-3 text-sm">
          <div>
            <p className="text-slate-600">Consulting Doctor</p>
            <p className="font-semibold text-slate-900">{doctor}</p>
          </div>
          <div>
            <p className="text-slate-600">Symptoms / Reason for Visit</p>
            <p className="mt-1 rounded-lg border border-slate-200 bg-slate-50 p-3 font-semibold text-slate-900">
              {symptoms}
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 border-t-2 border-slate-300 pt-4 text-center text-xs text-slate-600">
        <p>This is a computer-generated slip. No signature required.</p>
        <p className="mt-1">Generated on {new Date().toLocaleString("en-IN")}</p>
      </div>
    </div>
  );
}

