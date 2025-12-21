"use client";

import { useEffect, useState, useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { Modal } from "@/components/common/Modal";
import { admissionsApi, Admission, AmountDueResponse } from "@/services/admissionsApi";
import { invoicesApi, Invoice } from "@/services/invoicesApi";
import { paymentsApi, Payment } from "@/services/paymentsApi";
import { currency } from "@/utils/format";
import { formatDate } from "@/utils/format";
import { 
  User, 
  Stethoscope, 
  BedDouble, 
  FileText, 
  CreditCard,
  Phone,
  Building2,
  ClipboardList,
  Printer
} from "lucide-react";
import { SkeletonRow } from "@/components/shared/SkeletonRow";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { InvoicePrint } from "@/components/invoices/InvoicePrint";
import { PaymentReceiptPrint } from "@/components/payments/PaymentReceiptPrint";
import { getTenantIdForApi } from "@/utils/auth";
import { ServiceChargesModal } from "./ServiceChargesModal";
import { InitiateDischargeFormModal } from "./InitiateDischargeFormModal";

interface AdmissionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  admissionId: string;
}

export function AdmissionDetailModal({ isOpen, onClose, admissionId }: AdmissionDetailModalProps) {
  const [admission, setAdmission] = useState<Admission | null>(null);
  const [loading, setLoading] = useState(false);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loadingInvoice, setLoadingInvoice] = useState(false);
  const [amountDue, setAmountDue] = useState<AmountDueResponse | null>(null);
  const [loadingAmountDue, setLoadingAmountDue] = useState(false);
  const [printInvoiceData, setPrintInvoiceData] = useState<{ invoice: Invoice; patientName: string; patientMobile?: string } | null>(null);
  const [shouldPrint, setShouldPrint] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<Payment | null>(null);
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [showServiceChargesModal, setShowServiceChargesModal] = useState(false);
  const [showInitiateDischargeModal, setShowInitiateDischargeModal] = useState(false);
  const [printPaymentData, setPrintPaymentData] = useState<{ payment: Payment; patientName: string; patientMobile?: string; invoiceNumber?: string } | null>(null);
  const [shouldPrintPayment, setShouldPrintPayment] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const printPaymentRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: printInvoiceData ? `Invoice_${printInvoiceData.invoice.invoice_number}` : "Invoice",
  });

  const handlePrintPayment = useReactToPrint({
    contentRef: printPaymentRef,
    documentTitle: printPaymentData ? `PaymentReceipt_${printPaymentData.payment.payment_number}` : "Payment Receipt",
  });

  useEffect(() => {
    if (isOpen && admissionId) {
      fetchAdmissionDetails();
    } else {
      setAdmission(null);
      setPaymentDetails(null);
      setInvoice(null);
      setAmountDue(null);
    }
  }, [isOpen, admissionId]);

  useEffect(() => {
    if (admission?.payment_id) {
      fetchPaymentDetails(admission.payment_id);
    } else {
      setPaymentDetails(null);
    }
  }, [admission?.payment_id]);

  useEffect(() => {
    if (admission?.invoice_id) {
      fetchInvoiceDetails(admission.invoice_id);
    } else {
      setInvoice(null);
    }
  }, [admission?.invoice_id]);

  useEffect(() => {
    if (admission?.status === "admitted" && !admission.invoice_id) {
      fetchAmountDue();
    } else {
      setAmountDue(null);
    }
  }, [admission?.status, admission?.invoice_id, admissionId]);

  const fetchAdmissionDetails = async () => {
    setLoading(true);
    try {
      const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
      const details = await admissionsApi.getById(admissionId, tenantId || undefined);
      setAdmission(details);
    } catch (error) {
      console.error("Failed to fetch admission details:", error);
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentDetails = async (paymentId: string) => {
    setLoadingPayment(true);
    try {
      const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
      const apiTenantId = getTenantIdForApi(tenantId || undefined);
      const payment = await paymentsApi.getById(paymentId, apiTenantId);
      setPaymentDetails(payment);
    } catch (error) {
      console.error("Failed to fetch payment details:", error);
      // Don't show error toast, just don't display payment details
      setPaymentDetails(null);
    } finally {
      setLoadingPayment(false);
    }
  };

  const fetchInvoiceDetails = async (invoiceId: string) => {
    setLoadingInvoice(true);
    try {
      const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
      const apiTenantId = getTenantIdForApi(tenantId || undefined);
      const invoiceData = await invoicesApi.getById(invoiceId, apiTenantId);
      setInvoice(invoiceData);
    } catch (error) {
      console.error("Failed to fetch invoice details:", error);
      setInvoice(null);
    } finally {
      setLoadingInvoice(false);
    }
  };

  const fetchAmountDue = async () => {
    if (!admissionId) return;
    setLoadingAmountDue(true);
    try {
      const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
      const data = await admissionsApi.getAmountDue(admissionId, tenantId || undefined);
      setAmountDue(data);
    } catch (error) {
      console.error("Failed to fetch amount due:", error);
      setAmountDue(null);
    } finally {
      setLoadingAmountDue(false);
    }
  };

  const handlePrintInvoice = async (invoiceId: string) => {
    try {
      const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
      const apiTenantId = getTenantIdForApi(tenantId || undefined);
      const invoice = await invoicesApi.getById(invoiceId, apiTenantId);
      
      if (admission) {
        setPrintInvoiceData({
          invoice,
          patientName: admission.patient_name || "Unknown",
          patientMobile: undefined, // Patient mobile not in admission response
        });
        setShouldPrint(true);
      }
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage || "Failed to fetch invoice");
    }
  };

  const handlePrintPaymentReceipt = async (paymentId: string) => {
    try {
      const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
      const apiTenantId = getTenantIdForApi(tenantId || undefined);
      const payment = await paymentsApi.getById(paymentId, apiTenantId);
      
      // Get invoice number if available
      let invoiceNumber: string | undefined;
      if (payment.invoice_id) {
        try {
          const invoice = await invoicesApi.getById(payment.invoice_id, apiTenantId);
          invoiceNumber = invoice.invoice_number;
        } catch (error) {
          console.error("Failed to fetch invoice for receipt:", error);
        }
      }
      
      // Use patient name from admission if available
      const patientName = admission?.patient_name || "Unknown";
      const patientMobile = undefined; // Could fetch from patient if needed
      
      setPrintPaymentData({
        payment,
        patientName,
        patientMobile,
        invoiceNumber,
      });
      setShouldPrintPayment(true);
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage || "Failed to fetch payment details");
    }
  };

  // Trigger print when printInvoiceData is set and shouldPrint is true
  useEffect(() => {
    if (printInvoiceData && shouldPrint && printRef.current) {
      // Small delay to ensure DOM is updated
      const timeoutId = setTimeout(() => {
        handlePrint();
        setShouldPrint(false); // Reset flag after printing
      }, 200);
      return () => clearTimeout(timeoutId);
    }
  }, [printInvoiceData, shouldPrint, handlePrint]);

  useEffect(() => {
    if (shouldPrintPayment && printPaymentRef.current) {
      const timeoutId = setTimeout(() => {
        handlePrintPayment();
        setShouldPrintPayment(false);
      }, 200);
      return () => clearTimeout(timeoutId);
    }
  }, [shouldPrintPayment, handlePrintPayment]);

  const formatDateTime = (dateTime: string | null) => {
    if (!dateTime) return "N/A";
    try {
      const date = new Date(dateTime);
      return date.toLocaleString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateTime;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "admitted":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "discharge_initiated":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "discharged":
        return "bg-slate-50 text-slate-700 border-slate-200";
      case "transferred":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "deceased":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "cancelled":
        return "bg-slate-50 text-slate-700 border-slate-200";
      case "paid":
      case "completed":
        return "bg-emerald-50 text-emerald-700";
      case "partial":
        return "bg-amber-50 text-amber-700";
      case "pending":
        return "bg-amber-50 text-amber-700";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  const getAdmissionTypeLabel = (type: string) => {
    switch (type) {
      case "emergency":
        return "Emergency";
      case "planned":
        return "Planned";
      case "transfer":
        return "Transfer";
      case "day_care":
        return "Day Care";
      default:
        return type;
    }
  };

  const getDischargeTypeLabel = (type: string | null) => {
    if (!type) return "N/A";
    switch (type) {
      case "normal":
        return "Normal";
      case "ama":
        return "AMA (Against Medical Advice)";
      case "transfer":
        return "Transfer";
      case "deceased":
        return "Deceased";
      case "lama":
        return "LAMA (Leave Against Medical Advice)";
      default:
        return type;
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case "cash":
        return "Cash";
      case "upi":
        return "UPI";
      case "card":
        return "Card";
      case "cheque":
        return "Cheque";
      default:
        return method;
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "pending":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "failed":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "refunded":
        return "bg-slate-50 text-slate-700 border-slate-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  if (loading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Admission Details" size="xl">
        <SkeletonRow rows={10} />
      </Modal>
    );
  }

  if (!admission) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Admission Details" size="xl">
      <div className="space-y-4 -mx-6 -mb-6 px-6 pb-6">
        {/* Patient & Admission Information */}
        <div className="rounded-lg border border-slate-200 bg-gradient-to-br from-sky-50 via-sky-50/80 to-teal-50/50 p-3 shadow-sm">
          <div className="mb-2 flex items-center justify-between border-b border-slate-200/50 pb-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-teal-500 text-white shadow-md">
                <User className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">Patient</p>
                <p className="mt-0.5 text-sm font-bold text-slate-900">{admission.patient_name || "N/A"}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">Doctor</p>
              <p className="mt-0.5 text-sm font-bold text-slate-900">{admission.doctor_name || "N/A"}</p>
            </div>
          </div>
          <div className={`grid grid-cols-2 gap-2.5 ${
            (admission.payment_id ? 1 : 0) + (admission.discharge_time ? 1 : 0) === 0
              ? 'md:grid-cols-4'
              : (admission.payment_id ? 1 : 0) + (admission.discharge_time ? 1 : 0) === 1
              ? 'md:grid-cols-5'
              : 'md:grid-cols-6'
          }`}>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-0.5">Admission #</p>
              <p className="text-xs font-bold text-slate-900 truncate">{admission.admission_number}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-0.5">Admitted at</p>
              <p className="text-xs font-bold text-slate-900">{formatDateTime(admission.admission_time || `${admission.admission_date}T00:00:00`)}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-0.5">Status</p>
              <p className="text-xs font-bold text-slate-900">{admission.status.split("_").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ")}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-0.5">Ward / Bed</p>
              <p className="text-xs font-bold text-slate-900">{admission.ward_name && admission.bed_number ? `${admission.ward_name} / ${admission.bed_number}` : admission.ward_name || admission.bed_number || "N/A"}</p>
            </div>
            {admission.discharge_time && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-0.5">Discharged at</p>
                <p className="text-xs font-bold text-slate-900">{formatDateTime(admission.discharge_time)}</p>
              </div>
            )}
            {admission.payment_id && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-0.5">Payment #</p>
                {loadingPayment ? (
                  <p className="text-xs font-bold text-slate-900">Loading...</p>
                ) : paymentDetails ? (
                  <p className="text-xs font-bold text-slate-900">{paymentDetails.payment_number}</p>
                ) : (
                  <p className="text-xs font-bold text-slate-900">N/A</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Invoice Details */}
        {admission.invoice_id && (
          <div className="space-y-2.5">
            {loadingInvoice ? (
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <SkeletonRow rows={3} />
              </div>
            ) : invoice ? (
              <>
                {/* Line Items Table - Compact */}
                {invoice.line_items && invoice.line_items.length > 0 && (
                  <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="overflow-x-auto max-h-48 overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-slate-700">Description</th>
                            <th className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-wide text-slate-700 w-16">Qty</th>
                            <th className="px-2 py-2 text-right text-[10px] font-bold uppercase tracking-wide text-slate-700 w-20">Unit Price</th>
                            <th className="px-2 py-2 text-right text-[10px] font-bold uppercase tracking-wide text-slate-700 w-20">Discount</th>
                            <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wide text-slate-700 w-24">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {invoice.line_items.map((item, index) => {
                            const quantity = typeof item.quantity === "string" ? parseFloat(item.quantity) : item.quantity;
                            const unitPrice = typeof item.unit_price === "string" ? parseFloat(item.unit_price) : item.unit_price;
                            const discount = item.discount !== undefined
                              ? (typeof item.discount === "string" ? parseFloat(item.discount) : item.discount)
                              : 0;
                            const total = item.total_price !== undefined
                              ? (typeof item.total_price === "string" ? parseFloat(item.total_price) : item.total_price)
                              : (item.total || quantity * unitPrice);
                            return (
                              <tr key={item.id || index} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-3 py-2 text-xs text-slate-900 font-medium">{item.description}</td>
                                <td className="px-2 py-2 text-center text-xs text-slate-700">{quantity}</td>
                                <td className="px-2 py-2 text-right text-xs text-slate-700">{currency(unitPrice)}</td>
                                <td className="px-2 py-2 text-right text-xs text-slate-700">{discount > 0 ? currency(discount) : "-"}</td>
                                <td className="px-3 py-2 text-right text-xs font-bold text-slate-900">{currency(total)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Financial Summary - Compact */}
                {invoice.subtotal !== undefined && (
                  <div className="rounded-lg border-2 border-slate-200 bg-gradient-to-br from-white to-slate-50/30 p-3 shadow-sm">
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-slate-600">Subtotal</span>
                        <span className="text-xs font-semibold text-slate-900">{currency(invoice.subtotal)}</span>
                      </div>
                      {invoice.tax_rate > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-medium text-slate-600">Tax ({invoice.tax_rate}%)</span>
                          <span className="text-xs font-semibold text-slate-900">{currency(invoice.tax_amount)}</span>
                        </div>
                      )}
                      {invoice.discount > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-medium text-slate-600">Discount</span>
                          <span className="text-xs font-bold text-emerald-600">-{currency(invoice.discount)}</span>
                        </div>
                      )}
                      <div className="border-t border-slate-300 pt-1.5 mt-1">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-slate-900">Total Amount</span>
                          <span className="text-base font-bold text-slate-900">{currency(invoice.total_amount)}</span>
                        </div>
                      </div>
                      {invoice.paid_amount > 0 && (
                        <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                          <span className="text-xs font-medium text-slate-600">Paid</span>
                          <span className="text-xs font-bold text-emerald-600">{currency(invoice.paid_amount)}</span>
                        </div>
                      )}
                      {invoice.balance_amount !== undefined && invoice.balance_amount > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-medium text-slate-600">Balance</span>
                          <span className="text-xs font-bold text-amber-600">{currency(invoice.balance_amount)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </div>
        )}

        {/* Amount Due Details - for admitted admissions */}
        {admission.status === "admitted" && !admission.invoice_id && (
          <div className="space-y-2.5">
            {loadingAmountDue ? (
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <SkeletonRow rows={3} />
              </div>
            ) : amountDue ? (
              <>
                {/* Line Items Table - Compact */}
                {amountDue.charges && amountDue.charges.length > 0 && (
                  <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="overflow-x-auto max-h-48 overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-slate-700">Description</th>
                            <th className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-wide text-slate-700 w-16">Qty</th>
                            <th className="px-2 py-2 text-right text-[10px] font-bold uppercase tracking-wide text-slate-700 w-20">Unit Price</th>
                            <th className="px-2 py-2 text-right text-[10px] font-bold uppercase tracking-wide text-slate-700 w-20">Discount</th>
                            <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wide text-slate-700 w-24">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {amountDue.charges.map((charge, index) => {
                            const quantity = typeof charge.quantity === "string" ? parseFloat(charge.quantity) : charge.quantity;
                            const unitPrice = typeof charge.unit_price === "string" ? parseFloat(charge.unit_price) : charge.unit_price;
                            const discount = typeof charge.discount === "string" ? parseFloat(charge.discount) : parseFloat(charge.discount || "0");
                            const total = typeof charge.total_amount === "string" ? parseFloat(charge.total_amount) : charge.total_amount;
                            return (
                              <tr key={charge.charge_id || index} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-3 py-2 text-xs text-slate-900 font-medium">{charge.service_name}</td>
                                <td className="px-2 py-2 text-center text-xs text-slate-700">{quantity}</td>
                                <td className="px-2 py-2 text-right text-xs text-slate-700">{currency(unitPrice)}</td>
                                <td className="px-2 py-2 text-right text-xs text-slate-700">{discount > 0 ? currency(discount) : "-"}</td>
                                <td className="px-3 py-2 text-right text-xs font-bold text-slate-900">{currency(total)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Financial Summary - Compact */}
                {amountDue.subtotal !== undefined && (
                  <div className="rounded-lg border-2 border-slate-200 bg-gradient-to-br from-white to-slate-50/30 p-3 shadow-sm">
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-slate-600">Subtotal</span>
                        <span className="text-xs font-semibold text-slate-900">{currency(parseFloat(amountDue.subtotal))}</span>
                      </div>
                      {parseFloat(amountDue.total_discounts) > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-medium text-slate-600">Total Discounts</span>
                          <span className="text-xs font-bold text-emerald-600">-{currency(parseFloat(amountDue.total_discounts))}</span>
                        </div>
                      )}
                      <div className="border-t border-slate-300 pt-1.5 mt-1">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-slate-900">Amount Due</span>
                          <span className="text-base font-bold text-slate-900">{currency(parseFloat(amountDue.amount_due))}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </div>
        )}

        {/* Admission Details Grid */}
        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
          {(admission.next_of_kin_name || admission.next_of_kin_relation || admission.next_of_kin_contact) && (
            <div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm">
              <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500 mb-0.5">Next of Kin</p>
              <p className="text-sm font-bold text-slate-900">{admission.next_of_kin_name || "N/A"}</p>
              {admission.next_of_kin_relation && (
                <p className="text-xs text-slate-500 mt-0.5">{admission.next_of_kin_relation}</p>
              )}
            </div>
          )}
        </div>

        {/* Additional Information Grid */}
        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
          {(admission.insurance_provider || admission.insurance_policy_number) && (
            <>
              {admission.insurance_provider && (
                <div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500 mb-0.5">Insurance Provider</p>
                  <p className="text-sm font-bold text-slate-900">{admission.insurance_provider}</p>
                </div>
              )}
              {admission.insurance_policy_number && (
                <div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500 mb-0.5">Policy #</p>
                  <p className="text-sm font-bold text-slate-900">{admission.insurance_policy_number}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Medical Information */}
        {(admission.reason_for_admission || admission.diagnosis || admission.final_diagnosis) && (
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200">
              {admission.reason_for_admission && (
                <div className="p-3">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500 mb-1.5">Reason for Admission</p>
                  <p className="text-xs font-medium text-slate-900 leading-relaxed">{admission.reason_for_admission}</p>
                </div>
              )}
              {admission.diagnosis && (
                <div className="p-3">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500 mb-1.5">Initial Diagnosis</p>
                  <p className="text-xs font-medium text-slate-900 leading-relaxed">{admission.diagnosis}</p>
                </div>
              )}
              {admission.final_diagnosis && (
                <div className="p-3">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500 mb-1.5">Final Diagnosis</p>
                  <p className="text-xs font-medium text-slate-900 leading-relaxed">{admission.final_diagnosis}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
          {admission.status === "admitted" && (
            <button
              onClick={() => setShowServiceChargesModal(true)}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-sky-500/30 transition-all hover:from-sky-600 hover:to-teal-600 hover:shadow-md"
            >
              <CreditCard className="h-4 w-4" />
              Service Charges
            </button>
          )}
          {admission.status === "discharged" && (
            <>
              {admission.invoice_id && (
                <button
                  onClick={() => handlePrintInvoice(admission.invoice_id!)}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-sky-500/30 transition-all hover:from-sky-600 hover:to-teal-600 hover:shadow-md"
                >
                  <Printer className="h-4 w-4" />
                  Print Invoice
                </button>
              )}
              {admission.payment_id && (
                <button
                  onClick={() => handlePrintPaymentReceipt(admission.payment_id!)}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-emerald-500/30 transition-all hover:from-emerald-600 hover:to-teal-600 hover:shadow-md"
                >
                  <Printer className="h-4 w-4" />
                  Print Payment Receipt
                </button>
              )}
            </>
          )}
          {admission.status !== "discharged" && admission.invoice_id && (
            <button
              onClick={() => handlePrintInvoice(admission.invoice_id!)}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-sky-500/30 transition-all hover:from-sky-600 hover:to-teal-600 hover:shadow-md"
            >
              <Printer className="h-4 w-4" />
              Print Invoice
            </button>
          )}
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700 transition-all hover:border-slate-400 hover:bg-slate-50 hover:shadow-sm"
          >
            Close
          </button>
        </div>
      </div>

      {/* Hidden printable invoice */}
      {printInvoiceData && (
        <div style={{ position: "absolute", left: "-9999px", top: "-9999px", width: "210mm" }}>
          <div ref={printRef} className="print-content">
            <InvoicePrint
              invoice={printInvoiceData.invoice}
              patientName={printInvoiceData.patientName}
              patientMobile={printInvoiceData.patientMobile}
            />
          </div>
        </div>
      )}

      {/* Hidden printable payment receipt */}
      {printPaymentData && (
        <div style={{ position: "absolute", left: "-9999px", top: "-9999px", width: "210mm" }}>
          <div ref={printPaymentRef} className="print-content">
            <PaymentReceiptPrint
              payment={printPaymentData.payment}
              patientName={printPaymentData.patientName}
              patientMobile={printPaymentData.patientMobile}
              invoiceNumber={printPaymentData.invoiceNumber}
            />
          </div>
        </div>
      )}

      {/* Service Charges Modal */}
      <ServiceChargesModal
        isOpen={showServiceChargesModal}
        onClose={() => setShowServiceChargesModal(false)}
        admissionId={admissionId}
      />

      {/* Initiate Discharge Modal */}
      <InitiateDischargeFormModal
        isOpen={showInitiateDischargeModal}
        onClose={() => setShowInitiateDischargeModal(false)}
        admissionId={admissionId}
        onSuccess={async (updatedAdmission) => {
          // Refresh admission details to show updated status
          await fetchAdmissionDetails();
          setShowInitiateDischargeModal(false);
        }}
      />
    </Modal>
  );
}

