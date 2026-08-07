"use client";

import { PrescriptionResponse } from "@/services/prescriptionsApi";
import { useTenant } from "@/hooks/useTenant";
import { formatDate } from "@/utils/format";
import { PrintHeader } from "@/components/common/PrintHeader";
import { usePrintLayout } from "@/hooks/queries/usePrintLayout";
import { normalizePrintLayout } from "@/types/printLayout";

interface PrescriptionPrintProps {
  prescription: PrescriptionResponse;
}

export function PrescriptionPrint({ prescription }: PrescriptionPrintProps) {
  const { tenant } = useTenant();

  // The hospital's own letterhead configuration — the same row the server
  // renderer reads, and the same one the eye prescription has always honoured.
  //
  // This component ignored it entirely, so an admin who set up their
  // letterhead saw it applied to eye prints and silently not to general ones.
  // `tenant_print_layouts` is the shared contract; a print component that does
  // not read it is not sharing anything.
  const { data: savedLayout } = usePrintLayout("prescription");
  const layout = normalizePrintLayout(savedLayout?.config);

  return (
    <div className="mx-auto max-w-2xl bg-white p-4 print:p-2">
      {/* Header */}
      {layout.header_enabled && (
        <PrintHeader
          tenant={tenant}
          documentType="Prescription"
          variant={layout.header_position === "top" ? "horizontal" : "vertical"}
          side={layout.header_position === "top" ? undefined : layout.header_position}
          align={layout.header_align}
          // `reserved` means the hospital prints onto pre-printed stationery:
          // leave the band, draw nothing in it.
          showLogo={layout.header_mode === "rendered" && layout.show_logo}
          showAddress={layout.header_mode === "rendered" && layout.show_address}
          showContact={layout.header_mode === "rendered" && layout.show_contact}
          showDivider={layout.show_divider}
        />
      )}

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
                  <p className="font-semibold text-slate-900 flex flex-wrap items-baseline gap-1.5">
                    {index + 1}. {item.medicine_name}
                    {item.generic_name && (
                      <span className="text-[10px] italic font-normal text-slate-500">
                        ({item.generic_name})
                      </span>
                    )}
                  </p>
                </div>
              </div>
              {item.tapering_steps && item.tapering_steps.length > 0 ? (
                <div className="mt-2.5 border-t border-slate-200/60 pt-2">
                  <p className="text-[10px] font-bold text-purple-800 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                    <span>📉</span> Tapering Dose Regimen Schedule:
                  </p>
                  <div className="space-y-1.5 pl-3 border-l-2 border-purple-200">
                    {item.tapering_steps.map((step, stepIdx) => (
                      <div key={stepIdx} className="text-xs text-slate-800">
                        <span className="font-semibold text-purple-950">Step {stepIdx + 1}: </span>
                        <span>{step.dosage || item.dosage || ""}</span>
                        {step.frequency && <span className="mx-1">• {step.frequency}</span>}
                        {step.duration && <span className="mx-1">• {step.duration}</span>}
                        {step.instructions && <span className="text-slate-500 italic"> ({step.instructions})</span>}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
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
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Tests advised, then advice.
          Separate blocks, and in this order, to match the server renderer's
          section vocabulary (`tests` then `advice`) — the two renderers print
          the same document and must not disagree about what is on it. */}
      {prescription.advice_items?.some((a) => a.advice_type === "test") && (
        <div className="mb-4">
          <h3 className="mb-1 text-sm font-bold text-slate-900">Tests Advised</h3>
          <ul className="space-y-0.5 text-sm text-slate-700">
            {prescription.advice_items
              .filter((a) => a.advice_type === "test")
              .map((a) => (
                <li key={a.id}>• {a.description}</li>
              ))}
          </ul>
        </div>
      )}

      {prescription.advice_items?.some((a) => a.advice_type !== "test") && (
        <div className="mb-4">
          <h3 className="mb-1 text-sm font-bold text-slate-900">Advice</h3>
          <ul className="space-y-0.5 text-sm text-slate-700">
            {prescription.advice_items
              .filter((a) => a.advice_type !== "test")
              .map((a) => (
                <li key={a.id}>• {a.description}</li>
              ))}
          </ul>
        </div>
      )}

      {/* Notes */}
      {
        prescription.notes && (
          <div className="mb-4">
            <h3 className="mb-1 text-sm font-bold text-slate-900">Notes</h3>
            <p className="text-sm text-slate-700">{prescription.notes}</p>
          </div>
        )
      }

      {/* Follow-up. Printed last and prominently: it is the one instruction on
          the slip the patient has to act on after they leave. */}
      {prescription.followup_date && (
        <div className="mb-4 rounded border border-slate-300 bg-slate-50 px-3 py-2">
          <span className="text-xs text-slate-600">Review on </span>
          <span className="text-sm font-bold text-slate-900">
            {formatDate(prescription.followup_date)}
          </span>
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
      {
        prescription.status && (
          <div className="mb-4 text-center">
            <span
              className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${prescription.status === "finalized"
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
        )
      }

      {/* Footer */}
      <div className="mt-4 border-t border-slate-300 pt-2 text-center text-[10px] text-slate-600">
        <p>This is a computer-generated prescription. Please follow the dosage instructions carefully.</p>
        <p className="mt-1">Generated on {new Date().toLocaleString("en-IN")}</p>
      </div>
    </div >
  );
}
