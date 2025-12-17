"use client";

import { useEffect, useState, useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { Modal } from "@/components/common/Modal";
import { admissionsApi, Admission } from "@/services/admissionsApi";
import { invoicesApi, Invoice } from "@/services/invoicesApi";
import { paymentsApi, Payment } from "@/services/paymentsApi";
import { currency } from "@/utils/format";
import { formatDate } from "@/utils/format";
import { 
  User, 
  Stethoscope, 
  BedDouble, 
  Calendar, 
  FileText, 
  CreditCard,
  Phone,
  Building2,
  ClipboardList,
  AlertCircle,
  Printer
} from "lucide-react";
import { SkeletonRow } from "@/components/shared/SkeletonRow";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { InvoicePrint } from "@/components/invoices/InvoicePrint";
import { getTenantIdForApi } from "@/utils/auth";

interface AdmissionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  admissionId: string;
}

export function AdmissionDetailModal({ isOpen, onClose, admissionId }: AdmissionDetailModalProps) {
  const [admission, setAdmission] = useState<Admission | null>(null);
  const [loading, setLoading] = useState(false);
  const [printInvoiceData, setPrintInvoiceData] = useState<{ invoice: Invoice; patientName: string; patientMobile?: string } | null>(null);
  const [shouldPrint, setShouldPrint] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<Payment | null>(null);
  const [loadingPayment, setLoadingPayment] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: printInvoiceData ? `Invoice_${printInvoiceData.invoice.invoice_number}` : "Invoice",
  });

  useEffect(() => {
    if (isOpen && admissionId) {
      fetchAdmissionDetails();
    } else {
      setAdmission(null);
      setPaymentDetails(null);
    }
  }, [isOpen, admissionId]);

  useEffect(() => {
    if (admission?.payment_id) {
      fetchPaymentDetails(admission.payment_id);
    } else {
      setPaymentDetails(null);
    }
  }, [admission?.payment_id]);

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
      case "discharged":
        return "bg-slate-50 text-slate-700 border-slate-200";
      case "transferred":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "deceased":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "cancelled":
        return "bg-slate-50 text-slate-700 border-slate-200";
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
      <div className="space-y-3">
        {/* Header with Admission Number and Status */}
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Admission #{admission.admission_number}</h3>
            <p className="text-xs text-slate-500">ID: {admission.id.slice(0, 8)}...</p>
          </div>
          <span className={`pill px-2.5 py-1 text-xs font-semibold border ${getStatusColor(admission.status)}`}>
            {admission.status.toUpperCase()}
          </span>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {/* Left Column */}
          <div className="space-y-3">
            {/* Patient & Admission Info */}
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="mb-2 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <User className="h-3.5 w-3.5 text-sky-600" />
                <h4 className="text-xs font-semibold text-slate-900">Patient & Admission</h4>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Patient:</span>
                  <span className="font-medium text-slate-900">{admission.patient_name || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Date:</span>
                  <span className="font-medium text-slate-900">{formatDate(admission.admission_date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Time:</span>
                  <span className="font-medium text-slate-900">{formatDateTime(admission.admission_time)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Type:</span>
                  <span className="font-medium text-slate-900">{getAdmissionTypeLabel(admission.admission_type)}</span>
                </div>
                {admission.visit_id && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">OPD Visit:</span>
                    <span className="font-medium text-slate-900">{admission.visit_id}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Doctor & Bed Info */}
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="mb-2 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <Stethoscope className="h-3.5 w-3.5 text-sky-600" />
                <h4 className="text-xs font-semibold text-slate-900">Doctor & Bed</h4>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Doctor:</span>
                  <span className="font-medium text-slate-900">{admission.doctor_name || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Ward:</span>
                  <span className="font-medium text-slate-900">{admission.ward_name || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Bed:</span>
                  <span className="font-medium text-slate-900">{admission.bed_number || "N/A"}</span>
                </div>
              </div>
            </div>

            {/* Medical Information */}
            {(admission.reason_for_admission || admission.diagnosis || admission.final_diagnosis) && (
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="mb-2 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                  <FileText className="h-3.5 w-3.5 text-sky-600" />
                  <h4 className="text-xs font-semibold text-slate-900">Medical Info</h4>
                </div>
                <div className="space-y-2 text-xs">
                  {admission.reason_for_admission && (
                    <div>
                      <span className="text-slate-500">Reason:</span>
                      <p className="mt-0.5 font-medium text-slate-900">{admission.reason_for_admission}</p>
                    </div>
                  )}
                  {admission.diagnosis && (
                    <div>
                      <span className="text-slate-500">Initial Diagnosis:</span>
                      <p className="mt-0.5 font-medium text-slate-900">{admission.diagnosis}</p>
                    </div>
                  )}
                  {admission.final_diagnosis && (
                    <div>
                      <span className="text-slate-500">Final Diagnosis:</span>
                      <p className="mt-0.5 font-medium text-slate-900">{admission.final_diagnosis}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Insurance Information */}
            {(admission.insurance_provider || admission.insurance_policy_number) && (
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="mb-2 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                  <CreditCard className="h-3.5 w-3.5 text-sky-600" />
                  <h4 className="text-xs font-semibold text-slate-900">Insurance</h4>
                </div>
                <div className="space-y-2 text-xs">
                  {admission.insurance_provider && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Provider:</span>
                      <span className="font-medium text-slate-900">{admission.insurance_provider}</span>
                    </div>
                  )}
                  {admission.insurance_policy_number && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Policy #:</span>
                      <span className="font-medium text-slate-900">{admission.insurance_policy_number}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-3">
            {/* Next of Kin */}
            {(admission.next_of_kin_name || admission.next_of_kin_relation || admission.next_of_kin_contact) && (
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="mb-2 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                  <Phone className="h-3.5 w-3.5 text-sky-600" />
                  <h4 className="text-xs font-semibold text-slate-900">Next of Kin</h4>
                </div>
                <div className="space-y-2 text-xs">
                  {admission.next_of_kin_name && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Name:</span>
                      <span className="font-medium text-slate-900">{admission.next_of_kin_name}</span>
                    </div>
                  )}
                  {admission.next_of_kin_relation && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Relation:</span>
                      <span className="font-medium text-slate-900">{admission.next_of_kin_relation}</span>
                    </div>
                  )}
                  {admission.next_of_kin_contact && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Contact:</span>
                      <span className="font-medium text-slate-900">{admission.next_of_kin_contact}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Discharge Information */}
            {admission.status !== "admitted" && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <div className="mb-2 flex items-center gap-1.5 border-b border-amber-200 pb-2">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-700" />
                  <h4 className="text-xs font-semibold text-amber-900">Discharge Info</h4>
                </div>
                <div className="space-y-2 text-xs">
                  {admission.discharge_date && (
                    <div className="flex justify-between">
                      <span className="text-amber-700">Date:</span>
                      <span className="font-medium text-amber-900">{formatDate(admission.discharge_date)}</span>
                    </div>
                  )}
                  {admission.discharge_time && (
                    <div className="flex justify-between">
                      <span className="text-amber-700">Time:</span>
                      <span className="font-medium text-amber-900">{formatDateTime(admission.discharge_time)}</span>
                    </div>
                  )}
                  {admission.discharge_type && (
                    <div className="flex justify-between">
                      <span className="text-amber-700">Type:</span>
                      <span className="font-medium text-amber-900">{getDischargeTypeLabel(admission.discharge_type)}</span>
                    </div>
                  )}
                  {admission.discharge_summary && (
                    <div className="mt-2 pt-2 border-t border-amber-200">
                      <span className="text-amber-700">Summary:</span>
                      <p className="mt-0.5 font-medium text-amber-900">{admission.discharge_summary}</p>
                    </div>
                  )}
                  {admission.discharge_instructions && (
                    <div className="mt-2 pt-2 border-t border-amber-200">
                      <span className="text-amber-700">Instructions:</span>
                      <p className="mt-0.5 font-medium text-amber-900">{admission.discharge_instructions}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Billing Information */}
            {(admission.invoice_id || admission.payment_id) && (
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="mb-2 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                  <Building2 className="h-3.5 w-3.5 text-sky-600" />
                  <h4 className="text-xs font-semibold text-slate-900">Billing</h4>
                </div>
                <div className="space-y-3">
                  {admission.invoice_id && (
                    <button
                      onClick={() => handlePrintInvoice(admission.invoice_id!)}
                      className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-sky-100 px-3 py-1.5 text-xs font-semibold text-sky-700 transition hover:bg-sky-200"
                    >
                      <Printer className="h-3 w-3" />
                      Print Invoice
                    </button>
                  )}

                  {admission.payment_id && (
                    <div>
                      {loadingPayment ? (
                        <div className="py-2">
                          <SkeletonRow rows={2} />
                        </div>
                      ) : paymentDetails ? (
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Payment #:</span>
                            <span className="font-medium text-slate-900">{paymentDetails.payment_number}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Status:</span>
                            <span className={`pill px-1.5 py-0.5 text-xs font-semibold border ${getPaymentStatusColor(paymentDetails.status)}`}>
                              {paymentDetails.status.toUpperCase()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Amount:</span>
                            <span className="text-sm font-bold text-emerald-600">{currency(paymentDetails.amount)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Method:</span>
                            <span className="font-medium text-slate-900">{getPaymentMethodLabel(paymentDetails.payment_method)}</span>
                          </div>
                          {paymentDetails.payment_reference && (
                            <div className="flex justify-between">
                              <span className="text-slate-500">Reference:</span>
                              <span className="font-medium text-slate-900">{paymentDetails.payment_reference}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-slate-500">Date:</span>
                            <span className="font-medium text-slate-900">{formatDateTime(paymentDetails.payment_date)}</span>
                          </div>
                          {paymentDetails.notes && (
                            <div className="mt-2 rounded border border-slate-200 bg-slate-50 p-2">
                              <span className="text-slate-500">Notes:</span>
                              <p className="mt-0.5 text-slate-900">{paymentDetails.notes}</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="py-2 text-center text-xs text-slate-500">
                          Failed to load payment details
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Timestamps */}
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="mb-2 flex items-center gap-1.5 border-b border-slate-200 pb-2">
                <Calendar className="h-3.5 w-3.5 text-slate-600" />
                <h4 className="text-xs font-semibold text-slate-900">Timestamps</h4>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Created:</span>
                  <span className="font-medium text-slate-900">{formatDateTime(admission.created_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Updated:</span>
                  <span className="font-medium text-slate-900">{formatDateTime(admission.updated_at)}</span>
                </div>
              </div>
            </div>
          </div>
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
    </Modal>
  );
}

