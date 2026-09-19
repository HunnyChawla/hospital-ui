"use client";

import React, { forwardRef } from "react";
import { IpdPaymentItem } from "@/services/serviceChargesApi";
import { formatCurrency, formatDateTime } from "@/utils/format";

interface IpdPaymentReceiptPrintProps {
  payment: IpdPaymentItem;
  patientName?: string | null;
  patientUhid?: string | null;
  admissionNumber?: string | null;
  bedNumber?: string | null;
  wardName?: string | null;
  invoiceNumber?: string | null;
  hospitalName?: string;
  hospitalAddress?: string;
  hospitalPhone?: string;
}

export const IpdPaymentReceiptPrint = forwardRef<HTMLDivElement, IpdPaymentReceiptPrintProps>(
  (
    {
      payment,
      patientName = "Patient",
      patientUhid = "-",
      admissionNumber = "-",
      bedNumber = "-",
      wardName = "-",
      invoiceNumber = null,
      hospitalName = "Cura Hospital",
      hospitalAddress = "Healthcare Avenue, Medical City",
      hospitalPhone = "+91 98765 43210",
    },
    ref
  ) => {
    const isRefund = payment.amount < 0 || payment.status.toLowerCase() === "refunded";
    const displayAmount = Math.abs(payment.amount);

    return (
      <div ref={ref} className="p-8 max-w-2xl mx-auto bg-white text-slate-900 font-sans text-sm">
        {/* Header */}
        <div className="border-b-2 border-slate-900 pb-4 mb-6 text-center">
          <h1 className="text-2xl font-bold uppercase tracking-wider text-slate-900">
            {hospitalName}
          </h1>
          <p className="text-xs text-slate-600 mt-1">{hospitalAddress}</p>
          <p className="text-xs text-slate-600">Contact: {hospitalPhone}</p>
          <div className="mt-3 inline-block px-4 py-1 rounded bg-slate-900 text-white font-bold text-xs uppercase tracking-widest">
            {isRefund
              ? "IPD Refund Voucher"
              : invoiceNumber
              ? "IPD Bill Payment Receipt"
              : "IPD Advance / Payment Receipt"}
          </div>
        </div>

        {/* Receipt & Patient Details Grid */}
        <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-200 text-xs">
          <div>
            <p className="text-slate-500 font-medium">Receipt No:</p>
            <p className="font-bold text-slate-900 text-sm">{payment.payment_number}</p>
            <p className="text-slate-500 font-medium mt-2">Date & Time:</p>
            <p className="font-semibold text-slate-900">{formatDateTime(payment.payment_date)}</p>
          </div>
          <div className="text-right">
            <p className="text-slate-500 font-medium">IPD Admission No:</p>
            <p className="font-bold text-slate-900 text-sm">{admissionNumber}</p>
            {invoiceNumber && (
              <>
                <p className="text-slate-500 font-medium mt-1">Invoice Reference:</p>
                <p className="font-bold text-sky-800">{invoiceNumber}</p>
              </>
            )}
            <p className="text-slate-500 font-medium mt-2">Bed / Ward:</p>
            <p className="font-semibold text-slate-900">
              {wardName} - Bed {bedNumber}
            </p>
          </div>
        </div>

        {/* Patient Information */}
        <div className="py-4 border-b border-slate-200">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-500">Patient Name: </span>
              <span className="font-bold text-slate-900">{patientName}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-500">UHID: </span>
              <span className="font-bold text-slate-900">{patientUhid}</span>
            </div>
          </div>
        </div>

        {/* Payment Transaction Details Table */}
        <div className="my-6">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b-2 border-slate-300 text-slate-600">
                <th className="text-left py-2">Description</th>
                <th className="text-center py-2">Payment Mode</th>
                <th className="text-center py-2">Reference No</th>
                <th className="text-right py-2">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="py-3 font-medium text-slate-900">
                  {isRefund
                    ? "Refund of Advance Deposit"
                    : invoiceNumber
                    ? "Inpatient Final Bill Payment"
                    : "Inpatient Advance Payment / Deposit"}
                  {payment.notes && <div className="text-[11px] text-slate-500 mt-0.5">{payment.notes}</div>}
                </td>
                <td className="py-3 text-center uppercase font-semibold text-slate-700">
                  {payment.payment_method}
                </td>
                <td className="py-3 text-center text-slate-600 font-mono">
                  {payment.payment_reference || "-"}
                </td>
                <td className="py-3 text-right font-bold text-sm text-slate-900">
                  {formatCurrency(displayAmount)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Total Highlight */}
        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 flex justify-between items-center mb-8">
          <div>
            <p className="text-xs text-slate-500 font-medium">Total Amount Received / Settled:</p>
            <p className="text-[11px] text-slate-600 italic">Official Computer Generated Slip</p>
          </div>
          <div className="text-right">
            <span className="text-xl font-extrabold text-slate-900">
              {formatCurrency(displayAmount)}
            </span>
          </div>
        </div>

        {/* Signatures Footer */}
        <div className="pt-12 grid grid-cols-2 gap-8 text-xs text-slate-600 border-t border-slate-200">
          <div>
            <div className="border-t border-dashed border-slate-400 pt-1 w-44">
              <p className="font-semibold">Patient / Attendant Signature</p>
            </div>
          </div>
          <div className="text-right flex flex-col items-end">
            <div className="border-t border-dashed border-slate-400 pt-1 w-44 text-right">
              <p className="font-semibold">Authorized Cashier</p>
              <p className="text-[10px] text-slate-400">{payment.created_by || "Accounts Dept"}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

IpdPaymentReceiptPrint.displayName = "IpdPaymentReceiptPrint";
