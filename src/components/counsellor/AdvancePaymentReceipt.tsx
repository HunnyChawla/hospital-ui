"use client";

import React from "react";
import { PrintHeader } from "@/components/common/PrintHeader";
import { useTenant } from "@/hooks/useTenant";
import { CounsellorInteraction, PlannedSurgery } from "@/types";

interface AdvancePaymentReceiptProps {
  interaction: CounsellorInteraction;
  plannedSurgery: PlannedSurgery;
  totalAdvancePaid?: number;
}

export const AdvancePaymentReceipt = React.forwardRef<
  HTMLDivElement,
  AdvancePaymentReceiptProps
>(({ interaction, plannedSurgery, totalAdvancePaid }, ref) => {
  const { tenant } = useTenant();

  const receiptDate = interaction.interaction_at ? new Date(interaction.interaction_at) : new Date();
  const formattedDate = receiptDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const formattedTime = receiptDate.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  // Use the real PAY-XXXXXX payment number if available, otherwise fall back to interaction-based ID
  const receiptNumber = interaction.payment_number || `RCT-${interaction.id.slice(0, 8).toUpperCase()}`;
  const amountInWords = numberToWords(
    Math.floor(Number(interaction.payment_amount || 0))
  );

  return (
    <div
      ref={ref}
      className="advance-receipt-container bg-white text-black font-sans mx-auto text-sm print:m-0 print:p-0"
      style={{ width: "100%", maxWidth: "750px", padding: "1.5rem" }}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @media print {
            @page {
              size: A4;
              margin: 0;
            }
            .advance-receipt-container {
              width: 210mm !important;
              padding: 15mm 20mm !important;
              margin: 0 !important;
              max-width: none !important;
              overflow: visible !important;
              display: block !important;
            }
            .no-print { display: none !important; }
          }
        `,
        }}
      />

      {/* Hospital Header */}
      <div className="mb-4">
        <PrintHeader tenant={tenant} documentType="" />
      </div>

      {/* Receipt Title */}
      <div className="border-2 border-black">
        <div className="text-center font-bold text-base border-b-2 border-black py-2 tracking-widest uppercase bg-slate-50">
          ADVANCE PAYMENT RECEIPT
        </div>

        {/* Receipt No. + Date Row */}
        <div className="flex justify-between items-start px-4 py-3 border-b border-black text-xs">
          <div className="space-y-1">
            <div className="flex gap-2">
              <span className="font-bold w-32">Receipt No.:</span>
              <span className="font-semibold tracking-wider">{receiptNumber}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-bold w-32">Date &amp; Time:</span>
              <span className="font-semibold">
                {formattedDate} at {formattedTime}
              </span>
            </div>
          </div>
          <div className="text-right space-y-1">
            <div className="flex gap-2 justify-end">
              <span className="font-bold">Surgery Advice ID:</span>
              <span className="font-mono text-[10px] font-semibold">
                {plannedSurgery.id.slice(0, 12).toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Patient Details */}
        <div className="px-4 py-3 border-b border-black">
          <div className="font-bold text-xs uppercase mb-2 text-slate-600 tracking-wider">
            Patient &amp; Surgery Details
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-xs">
            <div className="flex gap-2">
              <span className="font-bold w-28 shrink-0">Patient Name:</span>
              <span className="font-semibold uppercase">
                {plannedSurgery.patient_name || "—"}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="font-bold w-28 shrink-0">UHID No.:</span>
              <span className="font-semibold">
                {plannedSurgery.patient_uhid || "—"}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="font-bold w-28 shrink-0">Mobile:</span>
              <span className="font-semibold">
                {plannedSurgery.patient_mobile || "—"}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="font-bold w-28 shrink-0">Surgery:</span>
              <span className="font-semibold uppercase">
                {plannedSurgery.surgery_name || "—"}
              </span>
            </div>
            {plannedSurgery.anatomy_site_name && (
              <div className="flex gap-2">
                <span className="font-bold w-28 shrink-0">Site / Eye:</span>
                <span className="font-semibold">
                  {plannedSurgery.anatomy_site_name}
                </span>
              </div>
            )}
            {plannedSurgery.package_name && (
              <div className="flex gap-2">
                <span className="font-bold w-28 shrink-0">Package:</span>
                <span className="font-semibold">{plannedSurgery.package_name}</span>
              </div>
            )}
            {plannedSurgery.surgeon_name && (
              <div className="flex gap-2">
                <span className="font-bold w-28 shrink-0">Surgeon:</span>
                <span className="font-semibold">{plannedSurgery.surgeon_name}</span>
              </div>
            )}
            {interaction.counsellor_name && (
              <div className="flex gap-2">
                <span className="font-bold w-28 shrink-0">Received By:</span>
                <span className="font-semibold">{interaction.counsellor_name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Payment Details */}
        <div className="px-4 py-4 border-b border-black bg-slate-50/50">
          <div className="font-bold text-xs uppercase mb-3 text-slate-600 tracking-wider">
            Payment Details
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center py-1.5 border-b border-dashed border-slate-300">
              <span className="font-bold">Advance Amount Received</span>
              <span className="font-bold text-lg text-emerald-800">
                ₹{Number(interaction.payment_amount || 0).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="font-bold w-36 shrink-0">Amount in Words:</span>
              <span className="font-semibold capitalize italic">
                {amountInWords} Rupees Only
              </span>
            </div>
            {interaction.payment_reference && (
              <div className="flex gap-2">
                <span className="font-bold w-36 shrink-0">Payment Ref. / Mode:</span>
                <span className="font-semibold">{interaction.payment_reference}</span>
              </div>
            )}
            {plannedSurgery.agreed_price && (
              <div className="flex gap-2 pt-1 border-t border-dashed border-slate-300">
                <span className="font-bold w-36 shrink-0">Total Package Price:</span>
                <span className="font-semibold">
                  ₹{Number(plannedSurgery.agreed_price).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
            )}
            {plannedSurgery.agreed_price && (totalAdvancePaid ?? Number(interaction.payment_amount ?? 0)) > 0 && (
              <div className="flex gap-2">
                <span className="font-bold w-36 shrink-0">Total Advance Paid:</span>
                <span className="font-semibold text-emerald-700">
                  ₹{(totalAdvancePaid ?? Number(interaction.payment_amount ?? 0)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
            {plannedSurgery.agreed_price && (
              <div className="flex gap-2">
                <span className="font-bold w-36 shrink-0">Balance Payable:</span>
                <span className="font-semibold text-rose-700">
                  ₹
                  {Math.max(
                    0,
                    Number(plannedSurgery.agreed_price) -
                      (totalAdvancePaid ?? Number(interaction.payment_amount ?? 0))
                  ).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Disclaimer + Signature */}
        <div className="px-4 py-4">
          <p className="text-[10px] text-slate-500 italic mb-6">
            * This is a provisional advance payment receipt only. It is not a final tax
            invoice. The balance amount will be collected at the time of surgery. This
            advance amount will be adjusted against the final surgery invoice.
          </p>

          <div className="flex justify-between items-end mt-4">
            <div className="text-[10px] text-slate-400 space-y-1">
              <p>Patient / Attendant Signature</p>
              <div className="border-b border-dashed border-slate-400 w-40 mt-6" />
            </div>
            <div className="text-center text-[10px] font-semibold space-y-1">
              <div className="border-b border-dashed border-slate-400 w-40 mb-1 mx-auto" />
              <p>Authorised Signatory</p>
              <p className="text-slate-700 font-bold uppercase text-xs">
                {tenant?.name || "Hospital"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer note */}
      <div className="mt-3 text-center text-[10px] text-slate-400">
        Generated on {formattedDate} at {formattedTime} &nbsp;|&nbsp; Receipt No:{" "}
        {receiptNumber}
      </div>
    </div>
  );
});

AdvancePaymentReceipt.displayName = "AdvancePaymentReceipt";

// ─── Number to Words helper ───────────────────────────────────────────────────
function numberToWords(num: number): string {
  if (num === 0) return "zero";
  if (num < 0) return "minus " + numberToWords(-num);

  const ones = [
    "", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
    "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen",
    "seventeen", "eighteen", "nineteen",
  ];
  const tens = [
    "", "", "twenty", "thirty", "forty", "fifty",
    "sixty", "seventy", "eighty", "ninety",
  ];

  function below100(n: number): string {
    if (n < 20) return ones[n];
    return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + ones[n % 10] : "");
  }

  function below1000(n: number): string {
    if (n < 100) return below100(n);
    return (
      ones[Math.floor(n / 100)] +
      " hundred" +
      (n % 100 !== 0 ? " " + below100(n % 100) : "")
    );
  }

  const parts: string[] = [];
  const crore = Math.floor(num / 10000000);
  if (crore > 0) { parts.push(below1000(crore) + " crore"); num %= 10000000; }
  const lakh = Math.floor(num / 100000);
  if (lakh > 0) { parts.push(below100(lakh) + " lakh"); num %= 100000; }
  const thousand = Math.floor(num / 1000);
  if (thousand > 0) { parts.push(below1000(thousand) + " thousand"); num %= 1000; }
  if (num > 0) { parts.push(below1000(num)); }

  return parts.join(" ");
}
