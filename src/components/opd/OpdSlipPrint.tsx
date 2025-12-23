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
    <div className="mx-auto max-w-2xl bg-white p-4 print:p-2">
      {/* Header */}
      <PrintHeader tenant={tenant} documentType="OPD Slip" />

      {/* OPD Number & Token */}
      <div className="mb-3 flex items-center justify-between rounded border border-sky-500 bg-sky-50 p-2">
        <div>
          <p className="text-[10px] text-slate-600">OPD Number</p>
          <p className="text-sm font-bold text-slate-900">{opdNumber}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-slate-600">Token Number</p>
          <p className="text-sm font-bold text-sky-600">#{tokenNumber}</p>
        </div>
      </div>

      {/* Patient Details */}
      <div className="mb-3 space-y-1">
        <h2 className="border-b border-slate-300 pb-1 text-sm font-bold text-slate-900">
          Patient Information
        </h2>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <p className="text-[10px] text-slate-600">Patient Name</p>
            <p className="font-semibold text-slate-900">{patient.name}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-600">Health ID</p>
            <p className="font-semibold text-slate-900">{patient.healthId}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-600">Mobile</p>
            <p className="font-semibold text-slate-900">{patient.mobile}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-600">Age / Gender</p>
            <p className="font-semibold text-slate-900">
              {patient.age} years • {patient.gender}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-slate-600">Date</p>
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
      <div className="mb-3 space-y-1">
        <h2 className="border-b border-slate-300 pb-1 text-sm font-bold text-slate-900">
          Visit Details
        </h2>
        <div className="space-y-1 text-xs">
          <div>
            <p className="text-[10px] text-slate-600">Consulting Doctor</p>
            <p className="font-semibold text-slate-900">{doctor}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-600">Symptoms / Reason for Visit</p>
            <p className="mt-1 rounded border border-slate-200 bg-slate-50 p-2 font-semibold text-slate-900">
              {symptoms}
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 border-t border-slate-300 pt-2 text-center text-[10px] text-slate-600">
        <p>This is a computer-generated slip. No signature required.</p>
        <p className="mt-1">Generated on {new Date().toLocaleString("en-IN")}</p>
      </div>
    </div>
  );
}

