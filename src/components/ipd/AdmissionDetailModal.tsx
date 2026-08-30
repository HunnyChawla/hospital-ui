"use client";

import { useEffect, useState, useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/common/Modal";
import { FinaliseVisitAction } from "@/components/health-record/FinaliseVisitAction";
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
  Printer,
  Shield
} from "lucide-react";
import { SkeletonRow } from "@/components/shared/SkeletonRow";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { InvoicePrint } from "@/components/invoices/InvoicePrint";
import { InvoicePaymentReceiptPrint } from "@/components/payments/InvoicePaymentReceiptPrint";
import { DischargeSummaryPrint } from "./DischargeSummaryPrint";
import { ConsentFormPrint } from "./ConsentFormPrint";
import { getTenantIdForApi } from "@/utils/auth";
import { ServiceChargesModal } from "./ServiceChargesModal";
import { InitiateDischargeFormModal } from "./InitiateDischargeFormModal";
import { patientsApi, PatientApiResponse } from "@/services/patientsApi";
import { useTenant } from "@/hooks/useTenant";

interface AdmissionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  admissionId: string;
}

export function AdmissionDetailModal({ isOpen, onClose, admissionId }: AdmissionDetailModalProps) {
  const router = useRouter();
  const { tenant, hospitalName } = useTenant();
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
  const [printPaymentInvoiceId, setPrintPaymentInvoiceId] = useState<string | null>(null);
  const [shouldPrintPayment, setShouldPrintPayment] = useState(false);
  const [printDischargeSummaryData, setPrintDischargeSummaryData] = useState<{ admission: Admission; patient: PatientApiResponse } | null>(null);
  const [shouldPrintDischargeSummary, setShouldPrintDischargeSummary] = useState(false);
  const [printConsentFormData, setPrintConsentFormData] = useState<{ admission: Admission; patient: PatientApiResponse } | null>(null);
  const [shouldPrintConsentForm, setShouldPrintConsentForm] = useState(false);
  const [printAdvancePaymentInvoiceId, setPrintAdvancePaymentInvoiceId] = useState<string | null>(null);
  const [shouldPrintAdvancePayment, setShouldPrintAdvancePayment] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const printPaymentRef = useRef<HTMLDivElement>(null);
  const printDischargeSummaryRef = useRef<HTMLDivElement>(null);
  const printConsentFormRef = useRef<HTMLDivElement>(null);
  const printAdvancePaymentRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: printInvoiceData ? `Invoice_${printInvoiceData.invoice.invoice_number}` : "Invoice",
  });

  const handlePrintPayment = useReactToPrint({
    contentRef: printPaymentRef,
    documentTitle: printPaymentInvoiceId ? `PaymentReceipt_Invoice_${printPaymentInvoiceId}` : "Payment Receipt",
  });

  const handlePrintDischargeSummary = useReactToPrint({
    contentRef: printDischargeSummaryRef,
    documentTitle: printDischargeSummaryData ? `DischargeSummary_${printDischargeSummaryData.admission.admission_number}` : "Discharge Summary",
  });

  const handlePrintConsentForm = useReactToPrint({
    contentRef: printConsentFormRef,
    documentTitle: printConsentFormData ? `ConsentForm_${printConsentFormData.admission.admission_number}` : "Consent Form",
  });

  const handlePrintAdvancePayment = useReactToPrint({
    contentRef: printAdvancePaymentRef,
    documentTitle: printAdvancePaymentInvoiceId ? `AdvancePaymentReceipt_Invoice_${printAdvancePaymentInvoiceId}` : "Advance Payment Receipt",
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
    if (shouldPrintPayment && printPaymentInvoiceId && printPaymentRef.current) {
      const timeoutId = setTimeout(() => {
        handlePrintPayment();
        setShouldPrintPayment(false);
      }, 200);
      return () => clearTimeout(timeoutId);
    }
  }, [shouldPrintPayment, printPaymentInvoiceId, handlePrintPayment]);

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

  const handlePrintPaymentReceipt = async () => {
    if (!admission?.invoice_id) {
      toast.error("Invoice ID not available for this admission");
      return;
    }

    try {
      setPrintPaymentInvoiceId(admission.invoice_id);
      setShouldPrintPayment(true);
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage || "Failed to prepare payment receipt for printing");
    }
  };

  const handlePrintAdvancePaymentReceipt = async () => {
    if (!admission?.advance_invoice_id) {
      toast.error("Advance invoice ID not available for this admission");
      return;
    }

    try {
      setPrintAdvancePaymentInvoiceId(admission.advance_invoice_id);
      setShouldPrintAdvancePayment(true);
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage || "Failed to prepare advance payment receipt for printing");
    }
  };

  const handlePrintDischargeSummaryClick = async () => {
    if (!admission) return;

    try {
      const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
      const apiTenantId = getTenantIdForApi(tenantId || undefined);

      // Fetch patient details
      const patient = await patientsApi.getById(admission.patient_id, apiTenantId);

      setPrintDischargeSummaryData({
        admission,
        patient,
      });
      setShouldPrintDischargeSummary(true);
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage || "Failed to fetch patient details");
    }
  };

  const handlePrintConsentFormClick = async () => {
    if (!admission) return;

    try {
      const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
      const apiTenantId = getTenantIdForApi(tenantId || undefined);

      // Fetch patient details
      const patient = await patientsApi.getById(admission.patient_id, apiTenantId);

      setPrintConsentFormData({
        admission,
        patient,
      });
      setShouldPrintConsentForm(true);
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage || "Failed to fetch patient details");
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

  useEffect(() => {
    if (printDischargeSummaryData && shouldPrintDischargeSummary && printDischargeSummaryRef.current) {
      const timeoutId = setTimeout(() => {
        handlePrintDischargeSummary();
        setShouldPrintDischargeSummary(false);
      }, 200);
      return () => clearTimeout(timeoutId);
    }
  }, [printDischargeSummaryData, shouldPrintDischargeSummary, handlePrintDischargeSummary]);

  useEffect(() => {
    if (printConsentFormData && shouldPrintConsentForm && printConsentFormRef.current) {
      const timeoutId = setTimeout(() => {
        handlePrintConsentForm();
        setShouldPrintConsentForm(false);
      }, 200);
      return () => clearTimeout(timeoutId);
    }
  }, [printConsentFormData, shouldPrintConsentForm, handlePrintConsentForm]);

  useEffect(() => {
    if (shouldPrintAdvancePayment && printAdvancePaymentInvoiceId && printAdvancePaymentRef.current) {
      const timeoutId = setTimeout(() => {
        handlePrintAdvancePayment();
        setShouldPrintAdvancePayment(false);
      }, 200);
      return () => clearTimeout(timeoutId);
    }
  }, [shouldPrintAdvancePayment, printAdvancePaymentInvoiceId, handlePrintAdvancePayment]);

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
          <div className="mb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/50 pb-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-teal-500 text-white shadow-md">
                <User className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">Patient</p>
                <p className="mt-0.5 text-sm font-bold text-slate-900">{admission.patient_name || "N/A"}</p>
              </div>
            </div>
            <div className="text-left sm:text-right ml-10 sm:ml-0">
              <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">Doctor</p>
              <p className="mt-0.5 text-sm font-bold text-slate-900">{admission.doctor_name || "N/A"}</p>
            </div>
          </div>
          <div className={`grid grid-cols-2 gap-2.5 ${(admission.payment_id ? 1 : 0) + (admission.discharge_time ? 1 : 0) === 0
            ? 'md:grid-cols-4'
            : (admission.payment_id ? 1 : 0) + (admission.discharge_time ? 1 : 0) === 1
              ? 'md:grid-cols-5'
              : 'md:grid-cols-6'
            }`}>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-0.5">Admission #</p>
              <p className="text-xs font-bold text-slate-900 truncate">{admission.admission_number}</p>
              {/* Separate from discharge: discharging is clinical, finalising
                  freezes the record so it can be published. */}
              <div className="mt-1.5">
                <FinaliseVisitAction episodeType="ipd_admission" sourceId={admission.id} compact />
              </div>
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

        {/* Advance Payment Details */}
        {admission.advance_payment_amount !== undefined && admission.advance_payment_amount > 0 && (
          <div className="rounded-lg border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50/50 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-md">
                  <CreditCard className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Advance Payment</p>
                  <p className="text-lg font-bold text-emerald-700">{currency(admission.advance_payment_amount)}</p>
                </div>
              </div>
              {admission.advance_invoice_id && (
                <button
                  onClick={handlePrintAdvancePaymentReceipt}
                  className="flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-emerald-500/30 transition-all hover:from-emerald-600 hover:to-teal-600 hover:shadow-md"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Download Receipt
                </button>
              )}
            </div>
          </div>
        )}

        {/* Invoice Details */}
        {admission.invoice_id && (
          <div className="space-y-2.5">
            {loadingInvoice ? (
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <SkeletonRow rows={3} />
              </div>
            ) : invoice ? (
              <>
                {/* Line Items - Compact */}
                {invoice.line_items && invoice.line_items.length > 0 && (
                  <>
                    {/* Mobile Card View */}
                    <div className="block sm:hidden space-y-2 max-h-48 overflow-y-auto">
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
                          <div key={item.id || index} className="rounded-lg border border-slate-200 bg-white p-2.5">
                            <p className="font-semibold text-slate-900 text-xs mb-1.5">{item.description}</p>
                            <div className="grid grid-cols-4 gap-1.5 text-[10px]">
                              <div>
                                <p className="text-slate-500">Qty</p>
                                <p className="font-semibold text-slate-900">{quantity}</p>
                              </div>
                              <div>
                                <p className="text-slate-500">Rate</p>
                                <p className="font-semibold text-slate-900">{currency(unitPrice)}</p>
                              </div>
                              <div>
                                <p className="text-slate-500">Disc</p>
                                <p className="font-semibold text-slate-900">{discount > 0 ? currency(discount) : "-"}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-slate-500">Total</p>
                                <p className="font-bold text-slate-900">{currency(total)}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden sm:block rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
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
                  </>
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
                {/* Charges - Compact */}
                {amountDue.charges && amountDue.charges.length > 0 && (
                  <>
                    {/* Mobile Card View */}
                    <div className="block sm:hidden space-y-2 max-h-48 overflow-y-auto">
                      {amountDue.charges.map((charge, index) => {
                        const quantity = typeof charge.quantity === "string" ? parseFloat(charge.quantity) : charge.quantity;
                        const unitPrice = typeof charge.unit_price === "string" ? parseFloat(charge.unit_price) : charge.unit_price;
                        const discount = typeof charge.discount === "string" ? parseFloat(charge.discount) : parseFloat(charge.discount || "0");
                        const total = typeof charge.total_amount === "string" ? parseFloat(charge.total_amount) : charge.total_amount;
                        return (
                          <div key={charge.charge_id || index} className="rounded-lg border border-slate-200 bg-white p-2.5">
                            <p className="font-semibold text-slate-900 text-xs mb-1.5">{charge.service_name}</p>
                            <div className="grid grid-cols-4 gap-1.5 text-[10px]">
                              <div>
                                <p className="text-slate-500">Qty</p>
                                <p className="font-semibold text-slate-900">{quantity}</p>
                              </div>
                              <div>
                                <p className="text-slate-500">Rate</p>
                                <p className="font-semibold text-slate-900">{currency(unitPrice)}</p>
                              </div>
                              <div>
                                <p className="text-slate-500">Disc</p>
                                <p className="font-semibold text-slate-900">{discount > 0 ? currency(discount) : "-"}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-slate-500">Total</p>
                                <p className="font-bold text-slate-900">{currency(total)}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden sm:block rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
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
                  </>
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

        {/* Next of Kin, Insurance & Medical Information - Compact Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {/* Next of Kin Section */}
          {(admission.next_of_kin_name || admission.next_of_kin_relation || admission.next_of_kin_contact) && (
            <div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm">
              <div className="flex items-center gap-1.5 mb-2">
                <User className="h-3.5 w-3.5 text-sky-600" />
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">Next of Kin</p>
              </div>
              <div className="space-y-1.5">
                {admission.next_of_kin_name && (
                  <div>
                    <p className="text-[10px] text-slate-500 mb-0.5">Name</p>
                    <p className="text-xs font-semibold text-slate-900">{admission.next_of_kin_name}</p>
                  </div>
                )}
                {admission.next_of_kin_relation && (
                  <div>
                    <p className="text-[10px] text-slate-500 mb-0.5">Relation</p>
                    <p className="text-xs text-slate-700">{admission.next_of_kin_relation}</p>
                  </div>
                )}
                {admission.next_of_kin_contact && (
                  <div className="flex items-center gap-1">
                    <Phone className="h-3 w-3 text-slate-400" />
                    <div>
                      <p className="text-[10px] text-slate-500 mb-0.5">Contact</p>
                      <p className="text-xs text-slate-700">{admission.next_of_kin_contact}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Insurance Information Section */}
          {(admission.insurance_provider || admission.insurance_policy_number) && (
            <div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm">
              <div className="flex items-center gap-1.5 mb-2">
                <Shield className="h-3.5 w-3.5 text-emerald-600" />
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">Insurance</p>
              </div>
              <div className="space-y-1.5">
                {admission.insurance_provider && (
                  <div>
                    <p className="text-[10px] text-slate-500 mb-0.5">Provider</p>
                    <p className="text-xs font-semibold text-slate-900">{admission.insurance_provider}</p>
                  </div>
                )}
                {admission.insurance_policy_number && (
                  <div>
                    <p className="text-[10px] text-slate-500 mb-0.5">Policy Number</p>
                    <p className="text-xs font-semibold text-slate-900 font-mono">{admission.insurance_policy_number}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Medical Information - Compact */}
        {(admission.reason_for_admission || admission.diagnosis || admission.final_diagnosis) && (
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-1.5 px-2.5 pt-2.5 pb-2 border-b border-slate-200">
              <Stethoscope className="h-3.5 w-3.5 text-amber-600" />
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">Medical Information</p>
            </div>
            <div className="p-2.5 space-y-2">
              {admission.reason_for_admission && (
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <ClipboardList className="h-3 w-3 text-slate-400" />
                    <p className="text-[10px] font-medium text-slate-600">Reason for Admission</p>
                  </div>
                  <p className="text-xs text-slate-900 leading-relaxed ml-4.5">{admission.reason_for_admission}</p>
                </div>
              )}
              {admission.diagnosis && (
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Stethoscope className="h-3 w-3 text-slate-400" />
                    <p className="text-[10px] font-medium text-slate-600">Initial Diagnosis</p>
                  </div>
                  <p className="text-xs text-slate-900 leading-relaxed ml-4.5">{admission.diagnosis}</p>
                </div>
              )}
              {admission.final_diagnosis && (
                <div className="rounded border border-emerald-200 bg-emerald-50/30 p-2">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Stethoscope className="h-3 w-3 text-emerald-600" />
                    <p className="text-[10px] font-medium text-emerald-700">Final Diagnosis</p>
                  </div>
                  <p className="text-xs text-slate-900 leading-relaxed ml-4.5 font-medium">{admission.final_diagnosis}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-slate-200">
          <button
            onClick={() => {
              onClose();
              router.push(`/ipd-workspace?admission_id=${admission.id}`);
            }}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-teal-600 to-sky-600 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm shadow-teal-500/30 transition-all hover:from-teal-700 hover:to-sky-700 hover:shadow-md"
          >
            <Stethoscope className="h-4 w-4" />
            <span>Doctor & Nurse Chart</span>
          </button>
          {/* Consent Form - Available for all statuses */}
          <button
            onClick={handlePrintConsentFormClick}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm shadow-indigo-500/30 transition-all hover:from-indigo-600 hover:to-purple-600 hover:shadow-md"
          >
            <Printer className="h-4 w-4" />
            <span className="hidden xs:inline">Print</span> Consent
          </button>
          {admission.status === "admitted" && (
            <button
              onClick={() => setShowServiceChargesModal(true)}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm shadow-sky-500/30 transition-all hover:from-sky-600 hover:to-teal-600 hover:shadow-md"
            >
              <CreditCard className="h-4 w-4" />
              <span className="hidden xs:inline">Service</span> Charges
            </button>
          )}
          {admission.status === "discharged" && (
            <>
              <button
                onClick={handlePrintDischargeSummaryClick}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm shadow-indigo-500/30 transition-all hover:from-indigo-600 hover:to-purple-600 hover:shadow-md"
              >
                <Printer className="h-4 w-4" />
                <span className="hidden xs:inline">Print</span> Summary
              </button>
              {admission.invoice_id && (
                <button
                  onClick={() => handlePrintInvoice(admission.invoice_id!)}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm shadow-sky-500/30 transition-all hover:from-sky-600 hover:to-teal-600 hover:shadow-md"
                >
                  <Printer className="h-4 w-4" />
                  Invoice
                </button>
              )}
              {admission.invoice_id && (
                <button
                  onClick={handlePrintPaymentReceipt}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm shadow-emerald-500/30 transition-all hover:from-emerald-600 hover:to-teal-600 hover:shadow-md"
                >
                  <Printer className="h-4 w-4" />
                  Receipt
                </button>
              )}
            </>
          )}
          {admission.status !== "discharged" && admission.invoice_id && (
            <button
              onClick={() => handlePrintInvoice(admission.invoice_id!)}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm shadow-sky-500/30 transition-all hover:from-sky-600 hover:to-teal-600 hover:shadow-md"
            >
              <Printer className="h-4 w-4" />
              Invoice
            </button>
          )}
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-300 bg-white px-4 sm:px-5 py-2 text-xs sm:text-sm font-semibold text-slate-700 transition-all hover:border-slate-400 hover:bg-slate-50 hover:shadow-sm"
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
      {printPaymentInvoiceId && (
        <div style={{ position: "absolute", left: "-9999px", top: "-9999px", width: "210mm" }}>
          <div ref={printPaymentRef} className="print-content">
            <InvoicePaymentReceiptPrint invoiceId={printPaymentInvoiceId} />
          </div>
        </div>
      )}

      {/* Hidden printable discharge summary */}
      {printDischargeSummaryData && (
        <div style={{ position: "absolute", left: "-9999px", top: "-9999px", width: "210mm" }}>
          <div ref={printDischargeSummaryRef} className="print-content">
            <DischargeSummaryPrint
              admission={printDischargeSummaryData.admission}
              patient={printDischargeSummaryData.patient}
            />
          </div>
        </div>
      )}

      {/* Hidden printable consent form */}
      {printConsentFormData && (
        <div style={{ position: "absolute", left: "-9999px", top: "-9999px", width: "210mm" }}>
          <div ref={printConsentFormRef} className="print-content">
            <ConsentFormPrint
              admission={printConsentFormData.admission}
              patient={printConsentFormData.patient}
            />
          </div>
        </div>
      )}

      {/* Hidden printable advance payment receipt */}
      {printAdvancePaymentInvoiceId && (
        <div style={{ position: "absolute", left: "-9999px", top: "-9999px", width: "210mm" }}>
          <div ref={printAdvancePaymentRef} className="print-content">
            <InvoicePaymentReceiptPrint invoiceId={printAdvancePaymentInvoiceId} />
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

