"use client";

import { useState, useEffect } from "react";
import { DischargeRequest, DischargeType, admissionsApi } from "@/services/admissionsApi";
import { invoicesApi, Invoice } from "@/services/invoicesApi";
import { paymentsApi, CreatePaymentRequest } from "@/services/paymentsApi";
import { currency } from "@/utils/format";
import { getTenantIdForApi } from "@/utils/auth";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { CreditCard, AlertCircle } from "lucide-react";

interface DischargeFormProps {
  onSuccess?: () => void;
  onSubmit: (data: DischargeRequest) => Promise<void>;
  admissionId?: string;
  admissionStatus?: string;
}

export function DischargeForm({ onSuccess, onSubmit, admissionId, admissionStatus }: DischargeFormProps) {
  const [createInvoice, setCreateInvoice] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [paymentReference, setPaymentReference] = useState<string>("");
  const [taxRate, setTaxRate] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // For discharge_initiated status
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loadingInvoice, setLoadingInvoice] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentNotes, setPaymentNotes] = useState<string>("");
  const isDischargeInitiated = admissionStatus === "discharge_initiated";

  // Fetch invoice for discharge_initiated admissions
  useEffect(() => {
    if (isDischargeInitiated && admissionId) {
      const fetchInvoice = async () => {
        setLoadingInvoice(true);
        try {
          // We need to get admission details first to get invoice_id
          const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
          const admission = await admissionsApi.getById(admissionId, tenantId || undefined);
          
          if (admission.invoice_id) {
            const apiTenantId = getTenantIdForApi(tenantId || undefined);
            const invoiceData = await invoicesApi.getById(admission.invoice_id, apiTenantId);
            setInvoice(invoiceData);
            
            // Set default payment amount to balance due, or 0 if negative
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSubmitting(true);
    try {
      // For discharge_initiated: collect payment first, then discharge
      if (isDischargeInitiated && invoice) {
        // Validate payment amount
        const balanceDue = invoice.balance_amount !== undefined 
          ? invoice.balance_amount 
          : (invoice.total_amount - invoice.paid_amount);
        
        // If balance is negative, skip payment collection (refund scenario)
        if (balanceDue < 0) {
          // Payment amount should be 0, skip payment creation
          if (paymentAmount !== 0) {
            toast.error("Payment amount must be 0 when balance is negative (refund scenario)");
            setIsSubmitting(false);
            return;
          }
          // Skip payment creation for refund scenario
        } else {
          // Normal validation for positive balance
          if (!paymentMethod) {
            toast.error("Please select a payment method");
            setIsSubmitting(false);
            return;
          }

          // Validate payment reference for methods that require it
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

          // Create payment only if amount > 0
          if (paymentAmount > 0) {
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
        }

        // Then discharge without creating invoice - discharge fields already set during initiate discharge
        const today = new Date().toISOString().split("T")[0];
        const isNegativeTotal = invoice.total_amount < 0;
        
        // Build discharge data - exclude payment details if total amount is negative
        const dischargeData: DischargeRequest = {
          discharge_date: today, // Use today's date as fallback
          discharge_type: "normal", // Use default as fallback
          discharge_summary: null,
          discharge_instructions: null,
          final_diagnosis: null,
          create_invoice: false,
        };
        
        // Only include payment fields if total amount is not negative
        if (!isNegativeTotal) {
          dischargeData.payment_method = null;
          dischargeData.payment_reference = null;
          dischargeData.tax_rate = null;
          dischargeData.discount = null;
        }

        await onSubmit(dischargeData);
        onSuccess?.();
      } else {
        // For admitted status: existing flow (shouldn't happen if we always initiate discharge first)
        // Validate payment reference if payment method is upi
        if (createInvoice && paymentMethod === "upi" && !paymentReference.trim()) {
          toast.error("Payment reference is required when payment method is UPI");
          setIsSubmitting(false);
          return;
        }

        const today = new Date().toISOString().split("T")[0];
        const dischargeData: DischargeRequest = {
          discharge_date: today, // Use today's date as fallback
          discharge_type: "normal", // Use default as fallback
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
      // Error handling is done in parent component
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate balance due for discharge_initiated
  const balanceDue = invoice 
    ? (invoice.balance_amount !== undefined 
        ? invoice.balance_amount 
        : (invoice.total_amount - invoice.paid_amount))
    : 0;

  // Check if total amount is negative (refund scenario)
  const isNegativeAmount = invoice && invoice.total_amount < 0;

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {/* Payment Section for discharge_initiated */}
      {isDischargeInitiated && (
        <div className="md:col-span-2 space-y-4 rounded-lg border-2 border-purple-200 bg-purple-50/50 p-4">
          <div className="flex items-center gap-2 border-b border-purple-200 pb-2">
            <CreditCard className="h-5 w-5 text-purple-600" />
            <h3 className="text-lg font-bold text-purple-900">Payment Collection</h3>
          </div>

          {loadingInvoice ? (
            <div className="py-4 text-center text-sm text-slate-600">Loading invoice details...</div>
          ) : invoice ? (
            <>
              <div className="grid grid-cols-2 gap-4 rounded-lg bg-white p-3">
                <div>
                  <p className="text-xs font-medium text-slate-500">Invoice Number</p>
                  <p className="text-sm font-bold text-slate-900">{invoice.invoice_number}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Total Amount</p>
                  <p className={`text-sm font-bold ${isNegativeAmount ? 'text-rose-600' : 'text-slate-900'}`}>
                    {currency(invoice.total_amount)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Paid Amount</p>
                  <p className="text-sm font-bold text-emerald-600">{currency(invoice.paid_amount)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Balance Due</p>
                  <p className={`text-lg font-bold ${balanceDue < 0 ? 'text-rose-600' : 'text-purple-600'}`}>
                    {currency(balanceDue)}
                  </p>
                </div>
              </div>

              {(isNegativeAmount || balanceDue < 0) && (
                <div className="flex items-start gap-2 rounded-lg border-2 border-amber-200 bg-amber-50 p-3">
                  <AlertCircle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-amber-900">Refund Notice</p>
                    <p className="text-xs text-amber-700 mt-1">
                      {isNegativeAmount 
                        ? "The total amount is negative. This transaction will be marked as "
                        : "The balance due is negative. This transaction will be marked as "
                      }
                      <span className="font-bold">refunded</span> in the system.
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {balanceDue >= 0 && (
                  <label className="space-y-1">
                    <span className="text-slate-600">
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
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
                      required
                    >
                      <option value="">Select payment method</option>
                      <option value="cash">Cash</option>
                      <option value="upi">UPI</option>
                      <option value="card">Card</option>
                      <option value="cheque">Cheque</option>
                    </select>
                  </label>
                )}

                {balanceDue >= 0 && (paymentMethod === "upi" || paymentMethod === "card" || paymentMethod === "cheque") && (
                  <label className="space-y-1">
                    <span className="text-slate-600">
                      Payment Reference <span className="text-rose-500">*</span>
                    </span>
                    <input
                      type="text"
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
                      placeholder={paymentMethod === "upi" ? "UPI transaction ID" : paymentMethod === "card" ? "Card last 4 digits" : "Cheque number"}
                      required
                    />
                  </label>
                )}

                <label className="space-y-1">
                  <span className="text-slate-600">
                    Payment Amount {balanceDue >= 0 && <span className="text-rose-500">*</span>}
                  </span>
                  <input
                    type="number"
                    min={balanceDue < 0 ? "0" : "0.01"}
                    max={balanceDue < 0 ? 0 : balanceDue}
                    step="0.01"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
                    required={balanceDue >= 0}
                    disabled={balanceDue < 0}
                  />
                  {balanceDue < 0 ? (
                    <p className="text-xs text-amber-600 font-medium">Payment amount is set to 0 for refund scenario</p>
                  ) : (
                    <p className="text-xs text-slate-500">Minimum: ₹0.01 | Maximum: {currency(balanceDue)}</p>
                  )}
                </label>

                <label className="space-y-1 md:col-span-2">
                  <span className="text-slate-600">Payment Notes</span>
                  <textarea
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    rows={2}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
                    placeholder="Optional payment notes"
                  />
                </label>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
              <AlertCircle className="h-4 w-4" />
              <span>No invoice found for this admission</span>
            </div>
          )}
        </div>
      )}

      {!isDischargeInitiated && (
        <>
          <label className="md:col-span-2 flex items-center gap-2">
            <input
              type="checkbox"
              checked={createInvoice}
              onChange={(e) => setCreateInvoice(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
            />
            <span className="text-slate-600">Create invoice automatically on discharge</span>
          </label>

          {createInvoice && (
        <>
          <label className="space-y-1">
            <span className="text-slate-600">Payment Method</span>
            <select
              value={paymentMethod}
              onChange={(e) => {
                setPaymentMethod(e.target.value);
                if (e.target.value !== "upi") {
                  setPaymentReference("");
                }
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
            >
              <option value="">Select payment method</option>
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
            </select>
          </label>

          {paymentMethod === "upi" && (
            <label className="space-y-1">
              <span className="text-slate-600">
                Payment Reference <span className="text-rose-500">*</span>
              </span>
              <input
                type="text"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
                placeholder="UPI transaction ID"
                required={paymentMethod === "upi"}
              />
            </label>
          )}

          <label className="space-y-1">
            <span className="text-slate-600">Tax Rate (%)</span>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={taxRate}
              onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
              placeholder="0"
            />
          </label>

          <label className="space-y-1">
            <span className="text-slate-600">Discount (₹)</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={discount}
              onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
              placeholder="0.00"
            />
          </label>
        </>
        )}
        </>
      )}

      <div className="md:col-span-2 flex justify-end gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 font-semibold text-white shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Discharging..." : "Discharge Patient"}
        </button>
      </div>
    </form>
  );
}

