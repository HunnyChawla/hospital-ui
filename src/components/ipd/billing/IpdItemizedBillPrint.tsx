"use client";

import React, { forwardRef } from "react";
import { IpdBillingAccountResponse } from "@/services/serviceChargesApi";
import { formatCurrency, formatDate, formatDateTime } from "@/utils/format";

interface IpdItemizedBillPrintProps {
  account: IpdBillingAccountResponse;
  hospitalName?: string;
  hospitalAddress?: string;
  hospitalPhone?: string;
}

export const IpdItemizedBillPrint = forwardRef<HTMLDivElement, IpdItemizedBillPrintProps>(
  (
    {
      account,
      hospitalName = "Cura Hospital",
      hospitalAddress = "Healthcare Avenue, Medical City",
      hospitalPhone = "+91 98765 43210",
    },
    ref
  ) => {
    const { summary, charges, payments, categories } = account;

    return (
      <div ref={ref} className="p-8 max-w-4xl mx-auto bg-white text-slate-900 font-sans text-xs">
        {/* Hospital Header */}
        <div className="border-b-2 border-slate-900 pb-4 mb-4 text-center">
          <h1 className="text-2xl font-bold uppercase tracking-wider text-slate-900">
            {hospitalName}
          </h1>
          <p className="text-slate-600 mt-0.5">{hospitalAddress}</p>
          <p className="text-slate-600">Tel: {hospitalPhone}</p>
          <div className="mt-2 inline-block px-4 py-1 rounded bg-slate-900 text-white font-bold text-xs uppercase tracking-widest">
            Detailed Inpatient Billing Statement
          </div>
        </div>

        {/* Patient & Stay Info */}
        <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg mb-4 text-xs">
          <div>
            <p className="text-slate-500">Patient Name:</p>
            <p className="font-bold text-slate-900 text-sm">{account.patient_name || "-"}</p>
            <p className="text-slate-500 mt-1">UHID / MRN:</p>
            <p className="font-semibold text-slate-900">{account.patient_uhid || "-"}</p>
          </div>
          <div>
            <p className="text-slate-500">IPD Number:</p>
            <p className="font-bold text-slate-900 text-sm">{account.admission_number}</p>
            <p className="text-slate-500 mt-1">Ward / Bed:</p>
            <p className="font-semibold text-slate-900">
              {account.ward_name || "-"} (Bed {account.bed_number || "-"})
            </p>
          </div>
          <div className="text-right">
            <p className="text-slate-500">Admission Date:</p>
            <p className="font-semibold text-slate-900">{formatDate(account.admission_date)}</p>
            <p className="text-slate-500 mt-1">Admitting Doctor:</p>
            <p className="font-semibold text-slate-900">{account.doctor_name || "-"}</p>
          </div>
        </div>

        {/* Category Summary Breakdown */}
        <div className="mb-4">
          <h2 className="font-bold text-xs uppercase tracking-wider text-slate-700 border-b border-slate-300 pb-1 mb-2">
            Charges Summary by Department
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {categories.map((cat) => (
              <div
                key={cat.charge_type}
                className="p-2 border border-slate-200 rounded bg-slate-50/50 flex justify-between items-center"
              >
                <div>
                  <p className="font-semibold text-slate-800 text-[11px]">{cat.category_name}</p>
                  <p className="text-[10px] text-slate-500">{cat.item_count} item(s)</p>
                </div>
                <p className="font-bold text-slate-900 text-xs">
                  {formatCurrency(Number(cat.net_amount))}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Itemized Charge Ledger */}
        <div className="mb-6">
          <h2 className="font-bold text-xs uppercase tracking-wider text-slate-700 border-b border-slate-300 pb-1 mb-2">
            Itemized Charge Transactions
          </h2>
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-slate-300 text-slate-600 font-semibold">
                <th className="text-left py-1.5 w-24">Date</th>
                <th className="text-left py-1.5">Description</th>
                <th className="text-center py-1.5 w-16">Category</th>
                <th className="text-center py-1.5 w-12">Qty</th>
                <th className="text-right py-1.5 w-20">Rate</th>
                <th className="text-right py-1.5 w-16">Disc</th>
                <th className="text-right py-1.5 w-20">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {charges
                .filter((c) => c.status === "ACTIVE")
                .map((ch, idx) => (
                  <tr key={ch.charge_id || idx} className="hover:bg-slate-50/50">
                    <td className="py-1.5 text-slate-600 font-mono text-[10px]">
                      {formatDate(ch.performed_at)}
                    </td>
                    <td className="py-1.5 font-medium text-slate-900">
                      {ch.service_name}
                      {ch.notes && <span className="text-[10px] text-slate-400 block">{ch.notes}</span>}
                    </td>
                    <td className="py-1.5 text-center text-[10px] text-slate-600">
                      {ch.service_category || ch.charge_type}
                    </td>
                    <td className="py-1.5 text-center text-slate-700">{ch.quantity}</td>
                    <td className="py-1.5 text-right text-slate-700 font-mono">
                      {formatCurrency(Number(ch.unit_price))}
                    </td>
                    <td className="py-1.5 text-right text-slate-600 font-mono">
                      {Number(ch.discount) > 0 ? formatCurrency(Number(ch.discount)) : "-"}
                    </td>
                    <td className="py-1.5 text-right font-semibold text-slate-900 font-mono">
                      {formatCurrency(Number(ch.net_amount))}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Advance Payments & Receipts Table */}
        {payments && payments.length > 0 && (
          <div className="mb-6">
            <h2 className="font-bold text-xs uppercase tracking-wider text-slate-700 border-b border-slate-300 pb-1 mb-2">
              Payments & Advances Credited
            </h2>
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-slate-300 text-slate-600">
                  <th className="text-left py-1">Receipt No</th>
                  <th className="text-left py-1">Date</th>
                  <th className="text-center py-1">Mode</th>
                  <th className="text-center py-1">Ref / Notes</th>
                  <th className="text-right py-1">Amount Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((pmt, idx) => (
                  <tr key={pmt.id || idx}>
                    <td className="py-1.5 font-mono font-semibold text-slate-900">
                      {pmt.payment_number}
                    </td>
                    <td className="py-1.5 text-slate-600">{formatDate(pmt.payment_date)}</td>
                    <td className="py-1.5 text-center uppercase font-medium text-slate-700">
                      {pmt.payment_method}
                    </td>
                    <td className="py-1.5 text-center text-slate-500 font-mono text-[10px]">
                      {pmt.payment_reference || pmt.notes || "-"}
                    </td>
                    <td className="py-1.5 text-right font-bold text-emerald-700 font-mono">
                      {formatCurrency(Number(pmt.amount))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Final Financial Settlement Summary Card */}
        <div className="border border-slate-300 rounded-lg p-4 bg-slate-50 my-4">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1 text-xs text-slate-600">
              <p>
                <span className="font-medium">Total Billable Events:</span> {charges.length}
              </p>
              <p>
                <span className="font-medium">Account Status:</span>{" "}
                <span className="font-bold uppercase text-slate-900">
                  {summary.billing_account_status}
                </span>
              </p>
              {account.tpa && (
                <p>
                  <span className="font-medium">TPA / Insurance:</span> {account.tpa.tpa_provider} (
                  Pre-Auth: {formatCurrency(Number(account.tpa.tpa_approved_amount || 0))})
                </p>
              )}
            </div>
            <div className="space-y-1.5 text-xs text-right">
              <div className="flex justify-between">
                <span className="text-slate-600">Gross Total Charges:</span>
                <span className="font-semibold font-mono text-slate-900">
                  {formatCurrency(Number(summary.gross_charges))}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Total Discounts:</span>
                <span className="font-semibold font-mono text-amber-700">
                  - {formatCurrency(Number(summary.total_discounts))}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1 font-bold">
                <span className="text-slate-800">Net Bill Amount:</span>
                <span className="font-mono text-slate-900">
                  {formatCurrency(Number(summary.net_charges))}
                </span>
              </div>
              <div className="flex justify-between text-emerald-700">
                <span>Total Advances Paid:</span>
                <span className="font-semibold font-mono">
                  - {formatCurrency(Number(summary.total_paid))}
                </span>
              </div>
              <div className="flex justify-between border-t-2 border-slate-900 pt-1.5 text-sm font-extrabold">
                <span className="text-slate-900">
                  {summary.is_refund_due ? "Refund Balance Due:" : "Net Outstanding Balance:"}
                </span>
                <span
                  className={`font-mono ${
                    summary.is_refund_due ? "text-emerald-700" : "text-rose-700"
                  }`}
                >
                  {formatCurrency(
                    summary.is_refund_due
                      ? Number(summary.refund_due_amount)
                      : Number(summary.outstanding_balance)
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer & Signatures */}
        <div className="pt-8 grid grid-cols-2 gap-8 text-xs text-slate-600 border-t border-slate-200">
          <div>
            <div className="border-t border-dashed border-slate-400 pt-1 w-44">
              <p className="font-semibold">Patient / Attendant Signature</p>
            </div>
          </div>
          <div className="text-right flex flex-col items-end">
            <div className="border-t border-dashed border-slate-400 pt-1 w-44 text-right">
              <p className="font-semibold">Authorized Billing Officer</p>
              <p className="text-[10px] text-slate-400">{formatDateTime(new Date().toISOString())}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

IpdItemizedBillPrint.displayName = "IpdItemizedBillPrint";
