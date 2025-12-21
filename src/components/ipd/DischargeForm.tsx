"use client";

import { useState, useEffect } from "react";
import { DischargeRequest, DischargeType, admissionsApi } from "@/services/admissionsApi";
import { invoicesApi, Invoice } from "@/services/invoicesApi";
import { paymentsApi, CreatePaymentRequest } from "@/services/paymentsApi";
import { currency } from "@/utils/format";
import { getTenantIdForApi } from "@/utils/auth";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { Calendar, CreditCard, AlertCircle } from "lucide-react";

interface DischargeFormProps {
  onSuccess?: () => void;
  onSubmit: (data: DischargeRequest) => Promise<void>;
  admissionId?: string;
  admissionStatus?: string;
}

export function DischargeForm({ onSuccess, onSubmit, admissionId, admissionStatus }: DischargeFormProps) {
  const [dischargeDate, setDischargeDate] = useState("");
  const [dischargeType, setDischargeType] = useState<DischargeType>("normal");
  const [dischargeSummary, setDischargeSummary] = useState("");
  const [dischargeInstructions, setDischargeInstructions] = useState("");
  const [finalDiagnosis, setFinalDiagnosis] = useState("");
  const [createInvoice, setCreateInvoice] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [paymentReference, setPaymentReference] = useState("");
  const [taxRate, setTaxRate] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // For discharge_initiated status
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loadingInvoice, setLoadingInvoice] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentNotes, setPaymentNotes] = useState<string>("");
  const isDischargeInitiated = admissionStatus === "discharge_initiated";

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setDischargeDate(today);
  }, []);

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
            
            // Set default payment amount to balance due
            const balanceDue = invoiceData.balance_amount !== undefined 
              ? invoiceData.balance_amount 
              : (invoiceData.total_amount - invoiceData.paid_amount);
            setPaymentAmount(balanceDue);
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

    if (!dischargeDate || !dischargeType) {
      return;
    }

    setIsSubmitting(true);
    try {
      // For discharge_initiated: collect payment first, then discharge
      if (isDischargeInitiated && invoice) {
        // Validate payment
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

        // Validate payment amount
        const balanceDue = invoice.balance_amount !== undefined 
          ? invoice.balance_amount 
          : (invoice.total_amount - invoice.paid_amount);
        
        if (paymentAmount <= 0 || paymentAmount > balanceDue) {
          toast.error(`Payment amount must be between 0 and ${currency(balanceDue)}`);
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

        // Then discharge without creating invoice
        const dischargeData: DischargeRequest = {
          discharge_date: dischargeDate,
          discharge_type: dischargeType,
          discharge_summary: dischargeSummary.trim() || null,
          discharge_instructions: dischargeInstructions.trim() || null,
          final_diagnosis: finalDiagnosis.trim() || null,
          create_invoice: false,
        };

        await onSubmit(dischargeData);
        onSuccess?.();
      } else {
        // For admitted status: existing flow
        // Validate payment reference if payment method is upi
        if (createInvoice && paymentMethod === "upi" && !paymentReference.trim()) {
          toast.error("Payment reference is required when payment method is UPI");
          setIsSubmitting(false);
          return;
        }

        const dischargeData: DischargeRequest = {
          discharge_date: dischargeDate,
          discharge_type: dischargeType,
          discharge_summary: dischargeSummary.trim() || null,
          discharge_instructions: dischargeInstructions.trim() || null,
          final_diagnosis: finalDiagnosis.trim() || null,
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
                  <p className="text-sm font-bold text-slate-900">{currency(invoice.total_amount)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Paid Amount</p>
                  <p className="text-sm font-bold text-emerald-600">{currency(invoice.paid_amount)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Balance Due</p>
                  <p className="text-lg font-bold text-purple-600">{currency(balanceDue)}</p>
                </div>
              </div>

              <div className="space-y-3">
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

                {(paymentMethod === "upi" || paymentMethod === "card" || paymentMethod === "cheque") && (
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
                    Payment Amount <span className="text-rose-500">*</span>
                  </span>
                  <input
                    type="number"
                    min="0"
                    max={balanceDue}
                    step="0.01"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
                    required
                  />
                  <p className="text-xs text-slate-500">Maximum: {currency(balanceDue)}</p>
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

      <label className="space-y-1">
        <span className="text-slate-600 flex items-center gap-1">
          <Calendar className="h-4 w-4" />
          Discharge Date <span className="text-rose-500">*</span>
        </span>
        <input
          type="date"
          value={dischargeDate}
          onChange={(e) => setDischargeDate(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
          required
        />
      </label>

      <label className="space-y-1">
        <span className="text-slate-600">
          Discharge Type <span className="text-rose-500">*</span>
        </span>
        <select
          value={dischargeType}
          onChange={(e) => setDischargeType(e.target.value as DischargeType)}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
          required
        >
          <option value="normal">Normal</option>
          <option value="ama">AMA (Against Medical Advice)</option>
          <option value="transfer">Transfer</option>
          <option value="deceased">Deceased</option>
          <option value="lama">LAMA (Leave Against Medical Advice)</option>
        </select>
      </label>

      <label className="md:col-span-2 space-y-1">
        <span className="text-slate-600">Discharge Summary</span>
        <textarea
          value={dischargeSummary}
          onChange={(e) => setDischargeSummary(e.target.value)}
          rows={3}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
          placeholder="Enter discharge summary"
        />
      </label>

      <label className="md:col-span-2 space-y-1">
        <span className="text-slate-600">Discharge Instructions</span>
        <textarea
          value={dischargeInstructions}
          onChange={(e) => setDischargeInstructions(e.target.value)}
          rows={3}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
          placeholder="Enter discharge instructions for the patient"
        />
      </label>

      <label className="md:col-span-2 space-y-1">
        <span className="text-slate-600">Final Diagnosis</span>
        <textarea
          value={finalDiagnosis}
          onChange={(e) => setFinalDiagnosis(e.target.value)}
          rows={2}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
          placeholder="Enter final diagnosis"
        />
      </label>

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

