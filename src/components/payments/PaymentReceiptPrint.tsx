"use client";

import { useState, useEffect } from "react";
import { Payment } from "@/services/paymentsApi";
import { useTenant } from "@/hooks/useTenant";
import { formatDate, currency } from "@/utils/format";
import { PrintHeader } from "@/components/common/PrintHeader";
import { PatientApiResponse, patientsApi } from "@/services/patientsApi";
import { getTenantIdForApi } from "@/utils/auth";

interface PaymentReceiptPrintProps {
  payment: Payment;
  patientName: string;
  patientMobile?: string;
  invoiceNumber?: string;
}

export function PaymentReceiptPrint({ payment, patientName, patientMobile, invoiceNumber }: PaymentReceiptPrintProps) {
  const { tenant } = useTenant();
  const [patient, setPatient] = useState<PatientApiResponse | null>(null);

  useEffect(() => {
    const fetchPatient = async () => {
      if (!payment.patient_id) return;
      try {
        const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
        const apiTenantId = getTenantIdForApi(tenantId || undefined);
        const data = await patientsApi.getById(payment.patient_id, apiTenantId);
        setPatient(data);
      } catch (err) {
        console.error("Failed to fetch patient:", err);
      }
    };
    fetchPatient();
  }, [payment.patient_id]);

  const getPaymentMethodLabel = (method: string) => {
    return method.charAt(0).toUpperCase() + method.slice(1);
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };


  return (
    <div className="mx-auto max-w-2xl bg-white p-4 print:p-2">
      {/* Header */}
      <PrintHeader tenant={tenant} documentType="Payment Receipt" />

      {/* Payment Number & Date */}
      <div className="mb-3 rounded border border-emerald-500 bg-emerald-50 p-2">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <p className="text-[10px] text-slate-600">Payment Number</p>
            <p className="text-sm font-bold text-slate-900">{payment.payment_number}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-600">Payment Date</p>
            <p className="text-sm font-bold text-emerald-600">{formatDate(payment.payment_date)}</p>
          </div>
        </div>
      </div>

      {/* Patient Details */}
      <div className="mb-3 space-y-1">
        <h2 className="border-b border-slate-300 pb-1 text-sm font-bold text-slate-900">
          Patient Details
        </h2>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <p className="text-[10px] text-slate-600">Patient Name</p>
            <p className="font-semibold text-slate-900">{patientName}</p>
          </div>
          {patientMobile && (
            <div>
              <p className="text-[10px] text-slate-600">Mobile Number</p>
              <p className="font-semibold text-slate-900">{patientMobile}</p>
            </div>
          )}
          {patient?.category && (
            <div>
              <p className="text-[10px] text-slate-600">Category</p>
              <p className="font-semibold text-slate-900 capitalize">{patient.category}</p>
            </div>
          )}
        </div>

      </div>

      {/* Payment Details */}
      <div className="mb-3 space-y-1">
        <h2 className="border-b border-slate-300 pb-1 text-sm font-bold text-slate-900">
          Payment Details
        </h2>
        <div className="space-y-1 text-xs">
          {invoiceNumber && (
            <div className="flex justify-between border-b border-slate-200 pb-1">
              <span className="text-slate-600">Invoice Number</span>
              <span className="font-semibold text-slate-900">{invoiceNumber}</span>
            </div>
          )}
          <div className="flex justify-between border-b border-slate-200 pb-1">
            <span className="text-slate-600">Payment Method</span>
            <span className="font-semibold text-slate-900">{getPaymentMethodLabel(payment.payment_method)}</span>
          </div>
          {payment.payment_reference && (
            <div className="flex justify-between border-b border-slate-200 pb-1">
              <span className="text-slate-600">Payment Reference</span>
              <span className="font-semibold text-slate-900">{payment.payment_reference}</span>
            </div>
          )}
          <div className="flex justify-between border-b border-slate-200 pb-1">
            <span className="text-slate-600">Payment Status</span>
            <span className="font-semibold text-slate-900">{getStatusLabel(payment.status)}</span>
          </div>
          <div className="flex justify-between rounded border border-emerald-500 bg-emerald-50 p-2 mt-2">
            <span className="text-sm font-bold text-slate-900">Amount Paid</span>
            <span className="text-lg font-bold text-emerald-600">{currency(payment.amount)}</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      {payment.notes && (
        <div className="mb-3 space-y-1">
          <h3 className="text-xs font-semibold text-slate-900">Notes</h3>
          <p className="text-xs text-slate-700">{payment.notes}</p>
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 border-t border-slate-300 pt-2 text-center text-[10px] text-slate-500">
        <p>This is a computer-generated receipt.</p>
        <p className="mt-1">Generated on {formatDate(new Date().toISOString())}</p>
      </div>
    </div>
  );
}
