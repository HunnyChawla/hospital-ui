"use client";

import { Patient } from "@/types";
import { useTenant } from "@/hooks/useTenant";
import { PrintHeader } from "@/components/common/PrintHeader";
import React from "react";


interface OpdSlipPrintProps {
  patient: Patient;
  doctor: string;
  symptoms: string;
  opdNumber: string;
  tokenNumber: number;
  prescription?: {
    prescription_number: string;
    diagnosis: string | null;
    items: Array<{
      medicine_name: string;
      generic_name?: string | null;
      dosage: string | null;
      frequency: string | null;
      duration: string | null;
      instructions: string | null;
    }>;
    doctor_name: string;
  };
}

export function OpdSlipPrint({
  patient,
  doctor,
  symptoms,
  opdNumber,
  tokenNumber,
  prescription,
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

      {/* Prescription Section - Only if finalized prescription exists */}
      {prescription && (
        <div className="mb-4 space-y-2">
          <div className="flex items-center justify-between border-b border-slate-300 pb-1">
            <h2 className="text-sm font-bold text-slate-900">Prescription</h2>
            <p className="text-xs text-slate-600">
              Rx No: <span className="font-semibold text-slate-900">{prescription.prescription_number}</span>
            </p>
          </div>

          {/* Diagnosis */}
          {prescription.diagnosis && (
            <div className="mb-2">
              <p className="text-[10px] text-slate-600">Diagnosis</p>
              <p className="text-xs font-semibold text-slate-900">{prescription.diagnosis}</p>
            </div>
          )}

          {/* Medicines Table */}
          <div className="overflow-hidden rounded border border-slate-300">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border-b border-slate-300 px-2 py-1 text-left text-[10px] font-semibold text-slate-700">#</th>
                  <th className="border-b border-slate-300 px-2 py-1 text-left text-[10px] font-semibold text-slate-700">Medicine</th>
                  <th className="border-b border-slate-300 px-2 py-1 text-left text-[10px] font-semibold text-slate-700">Dosage</th>
                  <th className="border-b border-slate-300 px-2 py-1 text-left text-[10px] font-semibold text-slate-700">Frequency</th>
                  <th className="border-b border-slate-300 px-2 py-1 text-left text-[10px] font-semibold text-slate-700">Duration</th>
                  <th className="border-b border-slate-300 px-2 py-1 text-left text-[10px] font-semibold text-slate-700">Instructions</th>
                </tr>
              </thead>
              <tbody>
                {prescription.items.map((item, index) => (
                  <React.Fragment key={`item-${index}`}>
                    <tr className={index % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                      <td className="border-b border-slate-200 px-2 py-1.5 text-slate-600">
                        {index + 1}
                      </td>
                      <td className="border-b border-slate-200 px-2 py-1.5">
                        <p className="font-semibold text-slate-900">{item.medicine_name}</p>
                        {item.generic_name && (
                          <p className="text-[10px] italic text-slate-600">
                            ({item.generic_name})
                          </p>
                        )}
                      </td>
                      <td className="border-b border-slate-200 px-2 py-1.5 text-slate-700">
                        {item.dosage || "-"}
                      </td>
                      <td className="border-b border-slate-200 px-2 py-1.5 text-slate-700">
                        {item.frequency || "-"}
                      </td>
                      <td className="border-b border-slate-200 px-2 py-1.5 text-slate-700">
                        {item.duration || "-"}
                      </td>
                      <td className="border-b border-slate-200 px-2 py-1.5 text-slate-700">
                        {item.instructions || "-"}
                      </td>
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* Doctor Signature */}
          <div className="mt-3 flex justify-end">
            <div className="text-right">
              <div className="mt-8 border-t border-slate-900 pt-1">
                <p className="text-xs font-semibold text-slate-900">{prescription.doctor_name}</p>
                <p className="text-[10px] text-slate-600">Doctor&apos;s Signature</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 border-t border-slate-300 pt-2 text-center text-[10px] text-slate-600">
        <p>This is a computer-generated slip. No signature required.</p>
        <p className="mt-1">Generated on {new Date().toLocaleString("en-IN")}</p>
      </div>
    </div>
  );
}

