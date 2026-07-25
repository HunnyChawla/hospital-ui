"use client";

import { useEffect, useState } from "react";
import { Payment, paymentsApi } from "@/services/paymentsApi";
import { Invoice, invoicesApi } from "@/services/invoicesApi";
import { useTenant } from "@/hooks/useTenant";
import { formatDate, currency } from "@/utils/format";
import { PrintHeader } from "@/components/common/PrintHeader";
import { getTenantIdForApi } from "@/utils/auth";
import { PatientApiResponse, patientsApi } from "@/services/patientsApi";

interface InvoicePaymentReceiptPrintProps {
  invoiceId: string;
  onReady?: () => void;
}

export function InvoicePaymentReceiptPrint({ invoiceId, onReady }: InvoicePaymentReceiptPrintProps) {
  const { tenant } = useTenant();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [patient, setPatient] = useState<PatientApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
        const apiTenantId = getTenantIdForApi(tenantId || undefined);
        
        // Fetch payments and invoice in parallel
        const [paymentsData, invoiceData] = await Promise.all([
          paymentsApi.getByInvoiceId(invoiceId, apiTenantId),
          invoicesApi.getById(invoiceId, apiTenantId),
        ]);
        
        setPayments(paymentsData);
        setInvoice(invoiceData);

        if (invoiceData?.patient_id) {
          try {
            const patientData = await patientsApi.getById(invoiceData.patient_id, apiTenantId);
            setPatient(patientData);
          } catch (patErr) {
            console.error("Failed to fetch patient details:", patErr);
          }
        }
      } catch (err: any) {
        console.error("Failed to fetch payment receipt data:", err);
        setError(err?.response?.data?.detail || err?.message || "Failed to fetch payment receipt");
      } finally {
        setLoading(false);
        setTimeout(() => {
          onReady?.();
        }, 150);
      }
    };

    if (invoiceId) {
      fetchData();
    }
  }, [invoiceId, onReady]);


  if (loading) {
    return (
      <div className="mx-auto max-w-2xl bg-white p-4 print:p-2">
        <div className="text-center py-8">
          <p className="text-slate-600">Loading payment receipt...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl bg-white p-4 print:p-2">
        <div className="text-center py-8">
          <p className="text-red-600">Error: {error}</p>
        </div>
      </div>
    );
  }

  if (!payments || payments.length === 0) {
    return (
      <div className="mx-auto max-w-2xl bg-white p-4 print:p-2">
        <PrintHeader 
          tenant={tenant} 
          documentType="Payment Receipt"
          invoiceNumber={invoice?.invoice_number}
          invoiceDate={invoice ? formatDate(invoice.invoice_date) : undefined}
        />
        <div className="text-center py-8">
          <p className="text-slate-600">No payments found for this invoice.</p>
        </div>
      </div>
    );
  }

  // Get patient details from first payment (all payments should have same patient)
  const firstPayment = payments[0];
  const patientName = firstPayment.patient_name || "Unknown";
  const patientMobile = firstPayment.patient_mobile;

  // Calculate totals
  const totalPaid = payments
    .filter(p => p.amount > 0)
    .reduce((sum, p) => sum + p.amount, 0);
  
  const totalRefunded = Math.abs(
    payments
      .filter(p => p.amount < 0)
      .reduce((sum, p) => sum + p.amount, 0)
  );
  
  const netAmount = totalPaid - totalRefunded;

  // Sort payments by date (oldest first)
  const sortedPayments = [...payments].sort(
    (a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime()
  );

  const getPaymentMethodLabel = (method: string) => {
    return method.charAt(0).toUpperCase() + method.slice(1);
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <div className="mx-auto max-w-2xl bg-white p-4 print:p-2">
      {/* Header */}
      <PrintHeader 
        tenant={tenant} 
        documentType="Payment Receipt"
        invoiceNumber={invoice?.invoice_number}
        invoiceDate={invoice ? formatDate(invoice.invoice_date) : undefined}
      />

      {/* Invoice & Date Info */}
      {invoice && (
        <div className="mb-3 rounded border border-emerald-500 bg-emerald-50 p-2">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-[10px] text-slate-600">Invoice Number</p>
              <p className="text-sm font-bold text-slate-900">{invoice.invoice_number}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-600">Invoice Date</p>
              <p className="text-sm font-bold text-emerald-600">{formatDate(invoice.invoice_date)}</p>
            </div>
          </div>
        </div>
      )}

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

      {/* Payment Transactions */}
      <div className="mb-3 space-y-1">
        <h2 className="border-b border-slate-300 pb-1 text-sm font-bold text-slate-900">
          Payment Transactions
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-300">
                <th className="pb-1 pt-1 text-left font-semibold text-slate-900">Date</th>
                <th className="pb-1 pt-1 text-left font-semibold text-slate-900">Payment #</th>
                <th className="pb-1 pt-1 text-left font-semibold text-slate-900">Method</th>
                <th className="pb-1 pt-1 text-left font-semibold text-slate-900">Status</th>
                <th className="pb-1 pt-1 text-right font-semibold text-slate-900">Amount</th>
              </tr>
            </thead>
            <tbody>
              {sortedPayments.map((payment, index) => {
                const isRefund = payment.amount < 0;
                const isRefunded = payment.status === "refunded";
                return (
                  <tr 
                    key={payment.id || index} 
                    className={`border-b border-slate-100 ${isRefund || isRefunded ? 'bg-red-50' : ''}`}
                  >
                    <td className="py-1 text-slate-900">{formatDate(payment.payment_date)}</td>
                    <td className="py-1 text-slate-900">{payment.payment_number}</td>
                    <td className="py-1 text-slate-900">{getPaymentMethodLabel(payment.payment_method)}</td>
                    <td className="py-1 text-slate-900">
                      <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] ${
                        isRefunded 
                          ? 'bg-red-100 text-red-700' 
                          : payment.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {getStatusLabel(payment.status)}
                      </span>
                    </td>
                    <td className={`py-1 text-right font-semibold ${
                      isRefund || isRefunded 
                        ? 'text-red-600' 
                        : 'text-emerald-600'
                    }`}>
                      {isRefund || isRefunded ? '-' : ''}{currency(Math.abs(payment.amount))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Summary */}
      <div className="mb-3 space-y-1">
        <h2 className="border-b border-slate-300 pb-1 text-sm font-bold text-slate-900">
          Payment Summary
        </h2>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between border-b border-slate-200 pb-1">
            <span className="text-slate-600">Total Paid</span>
            <span className="font-semibold text-emerald-600">{currency(totalPaid)}</span>
          </div>
          {totalRefunded > 0 && (
            <div className="flex justify-between border-b border-slate-200 pb-1">
              <span className="text-slate-600">Total Refunded</span>
              <span className="font-semibold text-red-600">-{currency(totalRefunded)}</span>
            </div>
          )}
          <div className="flex justify-between rounded border border-emerald-500 bg-emerald-50 p-2 mt-2">
            <span className="text-sm font-bold text-slate-900">Net Amount</span>
            <span className={`text-lg font-bold ${
              netAmount >= 0 ? 'text-emerald-600' : 'text-red-600'
            }`}>
              {currency(netAmount)}
            </span>
          </div>
        </div>
      </div>

      {/* Notes Section - Show notes from payments if available */}
      {sortedPayments.some(p => p.notes) && (
        <div className="mb-3 space-y-1">
          <h3 className="text-xs font-semibold text-slate-900 border-b border-slate-300 pb-1">
            Payment Notes
          </h3>
          <div className="space-y-1">
            {sortedPayments
              .filter(p => p.notes)
              .map((payment, index) => (
                <div key={payment.id || index} className="text-xs text-slate-700">
                  <p className="font-semibold text-slate-900">{payment.payment_number}:</p>
                  <p className="ml-2">{payment.notes}</p>
                </div>
              ))}
          </div>
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

