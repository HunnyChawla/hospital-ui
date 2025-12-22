"use client";

import { Payment } from "@/services/paymentsApi";
import { useTenant } from "@/hooks/useTenant";
import { formatDate, currency } from "@/utils/format";
import { PrintHeader } from "@/components/common/PrintHeader";

interface PaymentReceiptPrintProps {
  payment: Payment;
  patientName: string;
  patientMobile?: string;
  invoiceNumber?: string;
}

export function PaymentReceiptPrint({ payment, patientName, patientMobile, invoiceNumber }: PaymentReceiptPrintProps) {
  const { tenant } = useTenant();

  const getPaymentMethodLabel = (method: string) => {
    return method.charAt(0).toUpperCase() + method.slice(1);
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <div className="mx-auto max-w-2xl bg-white p-8 print:p-4">
      {/* Header */}
      <PrintHeader tenant={tenant} documentType="Payment Receipt" />

      {/* Payment Number & Date */}
      <div className="mb-6 rounded-lg border-2 border-emerald-500 bg-emerald-50 p-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-slate-600">Payment Number</p>
            <p className="text-xl font-bold text-slate-900">{payment.payment_number}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-600">Payment Date</p>
            <p className="text-xl font-bold text-emerald-600">{formatDate(payment.payment_date)}</p>
          </div>
        </div>
      </div>

      {/* Patient Details */}
      <div className="mb-6 space-y-4">
        <h2 className="border-b border-slate-300 pb-2 text-lg font-bold text-slate-900">
          Patient Details
        </h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-slate-600">Patient Name</p>
            <p className="font-semibold text-slate-900">{patientName}</p>
          </div>
          {patientMobile && (
            <div>
              <p className="text-xs text-slate-600">Mobile Number</p>
              <p className="font-semibold text-slate-900">{patientMobile}</p>
            </div>
          )}
        </div>
      </div>

      {/* Payment Details */}
      <div className="mb-6 space-y-4">
        <h2 className="border-b border-slate-300 pb-2 text-lg font-bold text-slate-900">
          Payment Details
        </h2>
        <div className="space-y-3">
          {invoiceNumber && (
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-sm text-slate-600">Invoice Number</span>
              <span className="text-sm font-semibold text-slate-900">{invoiceNumber}</span>
            </div>
          )}
          <div className="flex justify-between border-b border-slate-200 pb-2">
            <span className="text-sm text-slate-600">Payment Method</span>
            <span className="text-sm font-semibold text-slate-900">{getPaymentMethodLabel(payment.payment_method)}</span>
          </div>
          {payment.payment_reference && (
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-sm text-slate-600">Payment Reference</span>
              <span className="text-sm font-semibold text-slate-900">{payment.payment_reference}</span>
            </div>
          )}
          <div className="flex justify-between border-b border-slate-200 pb-2">
            <span className="text-sm text-slate-600">Payment Status</span>
            <span className="text-sm font-semibold text-slate-900">{getStatusLabel(payment.status)}</span>
          </div>
          <div className="flex justify-between rounded-lg border-2 border-emerald-500 bg-emerald-50 p-4">
            <span className="text-lg font-bold text-slate-900">Amount Paid</span>
            <span className="text-2xl font-bold text-emerald-600">{currency(payment.amount)}</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      {payment.notes && (
        <div className="mb-6 space-y-2">
          <h3 className="text-sm font-semibold text-slate-900">Notes</h3>
          <p className="text-sm text-slate-700">{payment.notes}</p>
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 border-t border-slate-300 pt-4 text-center text-xs text-slate-500">
        <p>This is a computer-generated receipt.</p>
        <p className="mt-1">Generated on {formatDate(new Date().toISOString())}</p>
      </div>
    </div>
  );
}
