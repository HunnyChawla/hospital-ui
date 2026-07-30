"use client";

import React from "react";
import { PrintHeader } from "@/components/common/PrintHeader";
import { useTenant } from "@/hooks/useTenant";
import type { DayCareVisit } from "@/types/dayCare";
import { formatDate } from "@/utils/format";

interface ConsentFormPrintProps {
  visit: DayCareVisit;
}

export const ConsentFormPrint = ({ visit }: ConsentFormPrintProps) => {
  const { tenant } = useTenant();

  return (
    <div
      className="consent-print-container bg-white text-black font-sans mx-auto text-sm print:m-0 print:p-0"
      style={{
        width: "100%",
        maxWidth: "850px",
        padding: "1.5rem",
      }}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page {
                size: A4;
                margin: 0;
              }
              .consent-print-container {
                width: 210mm !important;
                min-height: 297mm !important;
                padding: 15mm !important;
                margin: 0 !important;
                max-width: none !important;
                height: auto !important;
                overflow: visible !important;
                display: block !important;
              }
              .break-inside-avoid {
                break-inside: avoid !important;
                page-break-inside: avoid !important;
              }
            }
          `,
        }}
      />

      <div className="mb-2">
        <PrintHeader tenant={tenant} documentType="" />
      </div>

      <div className="border border-black mt-2">
        <div className="text-center font-bold text-sm border-b border-black py-1.5 tracking-wider uppercase bg-slate-50">
          Informed Consent for Surgery & Anaesthesia
        </div>

        {/* Patient Details Section */}
        <div className="grid grid-cols-2 text-xs border-b border-black divide-x divide-black">
          <div className="p-3 space-y-2">
            <div className="grid grid-cols-[130px_1fr]">
              <span className="font-bold">Patient Name</span>
              <span className="font-semibold">: {visit.patient_name || "-"}</span>
            </div>
            <div className="grid grid-cols-[130px_1fr]">
              <span className="font-bold">Age / Gender</span>
              <span className="font-semibold">
                : {visit.patient_age ? `${visit.patient_age} yrs` : "-"} / {visit.patient_gender || "-"}
              </span>
            </div>
            <div className="grid grid-cols-[130px_1fr]">
              <span className="font-bold">Planned Surgery</span>
              <span className="font-semibold text-sky-900">: {visit.surgery_name || "-"}</span>
            </div>
            {visit.anatomy_site_name && (
              <div className="grid grid-cols-[130px_1fr]">
                <span className="font-bold">Site / Anatomy</span>
                <span className="font-semibold text-slate-800">: {visit.anatomy_site_name} {visit.eye ? `(${visit.eye})` : ""}</span>
              </div>
            )}
          </div>
          <div className="p-3 space-y-2">
            <div className="grid grid-cols-[110px_1fr]">
              <span className="font-bold">UHID No.</span>
              <span className="font-semibold">: {visit.patient_uhid || "-"}</span>
            </div>
            <div className="grid grid-cols-[110px_1fr]">
              <span className="font-bold">Contact No.</span>
              <span className="font-semibold">: {visit.patient_mobile || "-"}</span>
            </div>
            <div className="grid grid-cols-[110px_1fr]">
              <span className="font-bold">Surgeon Name</span>
              <span className="font-semibold">: {visit.surgeon_name || "-"}</span>
            </div>
          </div>
        </div>

        {/* Consent Form Body */}
        <div className="p-6 text-xs space-y-4 leading-relaxed text-justify">
          <p className="font-semibold">
            Please read this form carefully. If you have any questions, please ask your doctor before signing.
          </p>

          <ol className="list-decimal pl-4 space-y-3">
            <li>
              I hereby authorize and consent to the performance of the surgical procedure:{" "}
              <strong>{visit.surgery_name}</strong> upon myself / my patient by the operating surgeon{" "}
              <strong>{visit.surgeon_name}</strong> and such assistants as may be designated by him/her.
            </li>
            <li>
              The doctor has explained to me the nature of the condition requiring surgery, the purpose and
              nature of the proposed procedure, the alternative methods of treatment, and the likelihood of
              success.
            </li>
            <li>
              I have also been informed about the potential risks and complications associated with the
              procedure, including but not limited to: infection, bleeding, damage to surrounding structures,
              loss of function, or any unexpected complications. I understand that medicine is not an exact
              science and that no guarantee can be given about the final result.
            </li>
            <li>
              I consent to the administration of local, regional, general or topical anaesthesia, and/or
              sedation as deemed necessary by the anaesthesiist or operating team. The risks and benefits of
              the anaesthetic options have been explained to me.
            </li>
            <li>
              I understand that during the course of the surgical procedure, unforeseen conditions may arise that
              require a change in plan, additional procedures, or transfer to an inpatient facility. I authorize
              the medical team to perform such procedures and take such actions as are necessary in their
              professional judgment for my well-being.
            </li>
            <li>
              I certify that I have read this form (or had it read to me), fully understand its contents, and
              have had all my questions answered to my satisfaction. I voluntarily sign this consent.
            </li>
          </ol>
        </div>
      </div>

      {/* Signature Section */}
      <div className="mt-20 grid grid-cols-2 gap-12 px-6 break-inside-avoid text-xs font-semibold text-slate-800">
        <div className="space-y-16">
          <div className="border-t border-slate-400 pt-2 text-center">
            <p className="font-bold">Patient Signature / Thumb Impression</p>
            <p className="text-slate-500 font-normal">Name: ________________________</p>
            <p className="text-slate-500 font-normal">Date & Time: __________________</p>
          </div>

          <div className="border-t border-slate-400 pt-2 text-center">
            <p className="font-bold">Witness Signature</p>
            <p className="text-slate-500 font-normal">Name: ________________________</p>
            <p className="text-slate-500 font-normal">Date & Time: __________________</p>
          </div>
        </div>

        <div className="space-y-16">
          <div className="border-t border-slate-400 pt-2 text-center">
            <p className="font-bold">Attendant / Guardian Signature</p>
            <p className="text-slate-500 font-normal">Relation to Patient: ____________</p>
            <p className="text-slate-500 font-normal">Date & Time: __________________</p>
          </div>

          <div className="border-t border-slate-400 pt-2 text-center">
            <p className="font-bold">Doctor / Surgeon Signature</p>
            <p className="text-slate-500 font-normal">Name: {visit.surgeon_name || "__________________"}</p>
            <p className="text-slate-500 font-normal">Date & Time: __________________</p>
          </div>
        </div>
      </div>
    </div>
  );
};
