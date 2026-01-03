"use client";

import { PrescriptionResponse } from "@/services/prescriptionsApi";
import { useTenant } from "@/hooks/useTenant";
import { formatDate } from "@/utils/format";
import { PrintHeader } from "@/components/common/PrintHeader";

interface PrescriptionPrintProps {
  prescription: PrescriptionResponse;
}

export function PrescriptionPrint({ prescription }: PrescriptionPrintProps) {
  const { tenant } = useTenant();

  // Calculate age from date of birth (if we had DOB, but API returns patient_name)
  // For now, we'll just display patient_name from prescription

  return (
    <div className="mx-auto max-w-2xl bg-white p-4 print:p-2">
      {/* Header */}
      <PrintHeader tenant={tenant} documentType="Prescription" />

      {/* Prescription Number */}
      <div className="mb-4 flex items-center justify-between border-b border-slate-300 pb-2">
        <div>
          <p className="text-xs text-slate-600">Prescription No.</p>
          <p className="font-semibold text-slate-900">{prescription.prescription_number}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-600">Date</p>
          <p className="font-semibold text-slate-900">{formatDate(prescription.created_at)}</p>
        </div>
      </div>

      {/* Patient Details */}
      <div className="mb-4 space-y-1">
        <h2 className="border-b border-slate-300 pb-1 text-sm font-bold text-slate-900">
          Patient Information
        </h2>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <p className="text-[10px] text-slate-600">Patient Name</p>
            <p className="font-semibold text-slate-900">{prescription.patient_name}</p>
          </div>
          {prescription.visit_number && (
            <div>
              <p className="text-[10px] text-slate-600">Visit No.</p>
              <p className="font-semibold text-slate-900">{prescription.visit_number}</p>
            </div>
          )}
        </div>
      </div>

      {/* Diagnosis */}
      {prescription.diagnosis && (
        <div className="mb-4">
          <h3 className="mb-1 text-sm font-bold text-slate-900">Diagnosis</h3>
          <p className="text-sm text-slate-700">{prescription.diagnosis}</p>
        </div>
      )}

      {/* Medicines */}
      <div className="mb-4">
        <h3 className="mb-2 border-b border-slate-300 pb-1 text-sm font-bold text-slate-900">
          Prescribed Medicines
        </h3>
        <div className="space-y-3">
          {prescription.items.map((item, index) => (
            <div key={item.id || index} className="rounded border border-slate-200 bg-slate-50 p-3">
              <div className="mb-2 flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-semibold text-slate-900">
                    {index + 1}. {item.medicine_name}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {item.dosage && (
                  <div>
                    <span className="text-slate-600">Dosage: </span>
                    <span className="font-semibold text-slate-900">{item.dosage}</span>
                  </div>
                )}
                {item.frequency && (
                  <div>
                    <span className="text-slate-600">Frequency: </span>
                    <span className="font-semibold text-slate-900">{item.frequency}</span>
                  </div>
                )}
                {item.duration && (
                  <div>
                    <span className="text-slate-600">Duration: </span>
                    <span className="font-semibold text-slate-900">{item.duration}</span>
                  </div>
                )}
                {item.instructions && (
                  <div className="col-span-2">
                    <span className="text-slate-600">Instructions: </span>
                    <span className="font-semibold text-slate-900">{item.instructions}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notes */}
      {prescription.notes && (
        <div className="mb-4">
          <h3 className="mb-1 text-sm font-bold text-slate-900">Notes</h3>
          <p className="text-sm text-slate-700">{prescription.notes}</p>
        </div>
      )}

      {/* Doctor Information */}
      <div className="mb-4 border-t border-slate-300 pt-4">
        <div className="flex justify-between">
          <div>
            <p className="text-xs text-slate-600">Prescribed by</p>
            <p className="text-sm font-semibold text-slate-900">
              {prescription.doctor_name}
            </p>
          </div>
          <div className="text-right">
            <div className="mt-8">
              <div className="border-t border-slate-900 pt-1">
                <p className="text-xs font-semibold text-slate-900">Doctor&apos;s Signature</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Badge */}
      {prescription.status && (
        <div className="mb-4 text-center">
          <span
            className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
              prescription.status === "finalized"
                ? "bg-green-100 text-green-700"
                : prescription.status === "dispensed"
                ? "bg-blue-100 text-blue-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {prescription.status.charAt(0).toUpperCase() + prescription.status.slice(1)}
          </span>
          {prescription.finalized_at && (
            <p className="mt-1 text-[10px] text-slate-500">
              Finalized on {formatDate(prescription.finalized_at)}
            </p>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 border-t border-slate-300 pt-2 text-center text-[10px] text-slate-600">
        <p>This is a computer-generated prescription. Please follow the dosage instructions carefully.</p>
        <p className="mt-1">Generated on {new Date().toLocaleString("en-IN")}</p>
      </div>
    </div>
  );
}
