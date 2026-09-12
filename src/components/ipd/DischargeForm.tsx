"use client";

import { useState, useEffect } from "react";
import { DischargeRequest, DischargeType, admissionsApi } from "@/services/admissionsApi";
import { invoicesApi, Invoice } from "@/services/invoicesApi";
import { paymentsApi, CreatePaymentRequest } from "@/services/paymentsApi";
import { currency, getTodayDateLocal } from "@/utils/format";
import { getTenantIdForApi } from "@/utils/auth";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { CreditCard, AlertCircle, CheckCircle2, BedDouble } from "lucide-react";

interface DischargeFormProps {
  onSuccess?: () => void;
  onSubmit: (data: DischargeRequest) => Promise<void>;
  admissionId?: string;
  admissionStatus?: string;
}

export function DischargeForm({ onSuccess, onSubmit, admissionId, admissionStatus }: DischargeFormProps) {
  const [createInvoice, setCreateInvoice] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [paymentReference, setPaymentReference] = useState<string>("");
  const [taxRate, setTaxRate] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // For discharge_initiated status
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loadingInvoice, setLoadingInvoice] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentNotes, setPaymentNotes] = useState<string>("");
  
  const statusStr = (admissionStatus || "").toLowerCase();
  const isDischargeInitiated = statusStr === "discharge_initiated" || statusStr === "dischargeinitiated";

  // Fetch invoice for discharge_initiated admissions
  useEffect(() => {
    if (isDischargeInitiated && admissionId) {
      const fetchInvoice = async () => {
        setLoadingInvoice(true);
        try {
          const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
          const admission = await admissionsApi.getById(admissionId, tenantId || undefined);
          
          if (admission.invoice_id) {
            const apiTenantId = getTenantIdForApi(tenantId || undefined);
            const invoiceData = await invoicesApi.getById(admission.invoice_id, apiTenantId);
            setInvoice(invoiceData);
            
            const balanceDue = invoiceData.balance_amount !== undefined 
              ? invoiceData.balance_amount 
              : (invoiceData.total_amount - invoiceData.paid_amount);
            setPaymentAmount(balanceDue < 0 ? 0 : balanceDue);
          }
        } catch (error) {
          console.error("Failed to fetch invoice:", error);
          toast.error("Failed to load invoice details");
        } finally {
          setLoadingInvoice(false);
        }
      };
      
      fetchInvoice();
    }
  }, [isDischargeInitiated, admissionId]);

  const balanceDue = invoice 
    ? (invoice.balance_amount !== undefined 
        ? invoice.balance_amount 
        : (invoice.total_amount - invoice.paid_amount))
    : 0;

  const isFullyPaid = invoice ? (invoice.status === "paid" || balanceDue <= 0) : false;
  const isNegativeAmount = invoice ? invoice.total_amount < 0 : false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSubmitting(true);
    try {
      if (isDischargeInitiated && invoice) {
        // Only collect payment if balance is positive and not already paid
        if (!isFullyPaid && balanceDue > 0) {
          if (!paymentMethod) {
            toast.error("Please select a payment method");
            setIsSubmitting(false);
            return;
          }

          if ((paymentMethod === "upi" || paymentMethod === "card" || paymentMethod === "cheque") && !paymentReference.trim()) {
            toast.error("Payment reference is required for " + paymentMethod);
            setIsSubmitting(false);
            return;
          }

          if (paymentAmount <= 0 || paymentAmount > balanceDue) {
            toast.error(`Payment amount must be greater than 0 and up to ${currency(balanceDue)}`);
            setIsSubmitting(false);
            return;
          }

          // Create payment
          try {
            const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
            const paymentData: CreatePaymentRequest = {
              invoice_id: invoice.id,
              amount: paymentAmount,
              payment_method: paymentMethod as any,
              payment_reference: paymentReference.trim() || undefined,
              notes: paymentNotes.trim() || undefined,
            };
            
            await paymentsApi.create(paymentData, tenantId || undefined);
            toast.success("Payment collected successfully");
          } catch (error) {
            const errorMessage = getErrorMessage(error);
            toast.error(errorMessage || "Failed to collect payment");
            setIsSubmitting(false);
            return;
          }
        }

        // Finalize discharge in IPD
        const today = getTodayDateLocal();
        const dischargeData: DischargeRequest = {
          discharge_date: today,
          discharge_type: "normal",
          discharge_summary: null,
          discharge_instructions: null,
          final_diagnosis: null,
          create_invoice: false,
          payment_method: null,
          payment_reference: null,
          tax_rate: null,
          discount: null,
        };

        await onSubmit(dischargeData);
        onSuccess?.();
      } else {
        // Direct discharge flow
        if (createInvoice && paymentMethod === "upi" && !paymentReference.trim()) {
          toast.error("Payment reference is required when payment method is UPI");
          setIsSubmitting(false);
          return;
        }

        const today = getTodayDateLocal();
        const dischargeData: DischargeRequest = {
          discharge_date: today,
          discharge_type: "normal",
          discharge_summary: null,
          discharge_instructions: null,
          final_diagnosis: null,
          create_invoice: createInvoice,
          payment_method: paymentMethod || null,
          payment_reference: paymentReference.trim() || null,
          tax_rate: taxRate > 0 ? taxRate : null,
          discount: discount > 0 ? discount : null,
        };

        await onSubmit(dischargeData);
        onSuccess?.();
      }
    } catch (error) {
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {/* Payment Section for discharge_initiated */}
      {isDischargeInitiated && (
        <div className="md:col-span-2 space-y-4 rounded-xl border border-purple-200 bg-purple-50/50 p-4">
          <div className="flex items-center gap-2 border-b border-purple-200 pb-2">
            <CreditCard className="h-5 w-5 text-purple-600" />
            <h3 className="text-base font-bold text-purple-900">Discharge Clearance & Payment Status</h3>
          </div>

          {loadingInvoice ? (
            <div className="py-4 text-center text-xs text-slate-600">Loading invoice details...</div>
          ) : invoice ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-lg bg-white p-3 border border-purple-100 shadow-2xs">
                <div>
                  <p className="text-[11px] font-medium text-slate-500">Invoice Number</p>
                  <p className="text-xs font-bold font-mono text-slate-900">{invoice.invoice_number}</p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-500">Total Inpatient Bill</p>
                  <p className={`text-xs font-bold font-mono ${isNegativeAmount ? 'text-rose-600' : 'text-slate-900'}`}>
                    {currency(invoice.total_amount)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-500">Paid / Credited</p>
                  <p className="text-xs font-bold font-mono text-emerald-600">{currency(invoice.paid_amount)}</p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-500">Balance Due</p>
                  <p className={`text-sm font-bold font-mono ${balanceDue <= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {currency(Math.max(0, balanceDue))}
                  </p>
                </div>
              </div>

              {/* Already Paid Notice */}
              {isFullyPaid && (
                <div className="flex items-center gap-3 rounded-xl border border-emerald-300 bg-emerald-50 p-3.5 text-emerald-950">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-emerald-900">Invoice is Fully Paid & Settled</p>
                    <p className="text-[11px] text-emerald-700 mt-0.5">
                      All inpatient charges have been settled ({currency(invoice.paid_amount)} paid). Click below to complete final discharge and release bed.
                    </p>
                  </div>
                </div>
              )}

              {/* Refund Notice if balance due is negative */}
              {(isNegativeAmount || balanceDue < 0) && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3">
                  <AlertCircle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-amber-900">Refund Due to Patient</p>
                    <p className="text-[11px] text-amber-700 mt-1">
                      Excess advance deposits of <span className="font-bold">{currency(Math.abs(balanceDue))}</span> have been recorded as refund due.
                    </p>
                  </div>
                </div>
              )}

              {/* Payment inputs only if balance > 0 and not fully paid */}
              {!isFullyPaid && balanceDue > 0 && (
                <div className="space-y-3 pt-1">
                  <div className="grid grid-cols-2 gap-3">
                    <label className="space-y-1">
                      <span className="text-xs font-semibold text-slate-700">
                        Payment Method <span className="text-rose-500">*</span>
                      </span>
                      <select
                        value={paymentMethod}
                        onChange={(e) => {
                          setPaymentMethod(e.target.value);
                          if (e.target.value !== "upi" && e.target.value !== "card" && e.target.value !== "cheque") {
                            setPaymentReference("");
                          }
                        }}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs outline-none focus:border-sky-500"
                        required
                      >
                        <option value="cash">Cash</option>
                        <option value="upi">UPI</option>
                        <option value="card">Card</option>
                        <option value="cheque">Cheque</option>
                      </select>
                    </label>

                    {(paymentMethod === "upi" || paymentMethod === "card" || paymentMethod === "cheque") && (
                      <label className="space-y-1">
                        <span className="text-xs font-semibold text-slate-700">
                          Payment Reference <span className="text-rose-500">*</span>
                        </span>
                        <input
                          type="text"
                          value={paymentReference}
                          onChange={(e) => setPaymentReference(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs outline-none focus:border-sky-500"
                          placeholder={paymentMethod === "upi" ? "UPI Ref / Transaction ID" : paymentMethod === "card" ? "Last 4 digits" : "Cheque number"}
                          required
                        />
                      </label>
                    )}

                    <label className="space-y-1">
                      <span className="text-xs font-semibold text-slate-700">
                        Payment Amount <span className="text-rose-500">*</span>
                      </span>
                      <input
                        type="number"
                        min="0.01"
                        max={balanceDue}
                        step="0.01"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-mono font-bold outline-none focus:border-sky-500"
                        required
                      />
                    </label>

                    <label className="space-y-1">
                      <span className="text-xs font-semibold text-slate-700">Payment Notes</span>
                      <input
                        type="text"
                        value={paymentNotes}
                        onChange={(e) => setPaymentNotes(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs outline-none focus:border-sky-500"
                        placeholder="Optional payment remarks"
                      />
                    </label>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="py-4 text-center text-xs text-slate-500">Invoice not found for this admission.</div>
          )}
        </div>
      )}

      {/* Submit Button */}
      <div className="md:col-span-2 flex justify-end gap-3 pt-2">
        <button
          type="submit"
          disabled={isSubmitting || (isDischargeInitiated && loadingInvoice)}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:from-rose-700 hover:to-rose-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <BedDouble className="h-4 w-4" />
          {isSubmitting ? "Finalizing Discharge..." : isFullyPaid ? "Complete Discharge & Release Bed" : "Collect Payment & Complete Discharge"}
        </button>
      </div>
    </form>
  );
}
