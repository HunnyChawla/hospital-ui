"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAppDispatch } from "@/redux/hooks";
import { fetchAdmissions, dischargePatient } from "@/redux/admissionsSlice";
import { admissionsApi, Admission, DischargeRequest, TransferBedRequest } from "@/services/admissionsApi";
import { wardsApi, Ward } from "@/services/wardsApi";
import { bedsApi, Bed } from "@/services/bedsApi";
import { doctorsApi } from "@/services/doctorsApi";
import { formatDate } from "@/utils/format";
import { BedDouble, User, Calendar, Stethoscope, X, ArrowRightLeft, ChevronLeft, ChevronRight, Eye, MinusCircle, CreditCard, FileText, Printer, ChevronDown } from "lucide-react";
import { SkeletonRow } from "@/components/shared/SkeletonRow";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { DischargeFormModal } from "./DischargeFormModal";
import { AdmissionDetailModal } from "./AdmissionDetailModal";
import { TransferBedFormModal } from "./TransferBedFormModal";
import { ServiceChargesModal } from "./ServiceChargesModal";
import { InitiateDischargeFormModal } from "./InitiateDischargeFormModal";
import { invoicesApi, Invoice } from "@/services/invoicesApi";
import { paymentsApi, Payment } from "@/services/paymentsApi";
import { InvoicePrint } from "@/components/invoices/InvoicePrint";
import { PaymentReceiptPrint } from "@/components/payments/PaymentReceiptPrint";
import { useReactToPrint } from "react-to-print";
import { getTenantIdForApi } from "@/utils/auth";

interface AdmissionTableProps {
  patientId?: string;
  onEditClick?: (admission: Admission) => void;
}

export function AdmissionTable({ patientId, onEditClick }: AdmissionTableProps) {
  const dispatch = useAppDispatch();
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedWardId, setSelectedWardId] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showDischargeModal, setShowDischargeModal] = useState(false);
  const [dischargingAdmissionId, setDischargingAdmissionId] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedAdmissionId, setSelectedAdmissionId] = useState<string | null>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferringAdmissionId, setTransferringAdmissionId] = useState<string | null>(null);
  const [transferringBedId, setTransferringBedId] = useState<string | null>(null);
  const [showServiceChargesModal, setShowServiceChargesModal] = useState(false);
  const [selectedAdmissionIdForCharges, setSelectedAdmissionIdForCharges] = useState<string | null>(null);
  const [showInitiateDischargeModal, setShowInitiateDischargeModal] = useState(false);
  const [initiatingAdmissionId, setInitiatingAdmissionId] = useState<string | null>(null);
  const [dischargingAdmissionStatus, setDischargingAdmissionStatus] = useState<string | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchAdmissionsList = useCallback(async () => {
    setLoading(true);
    try {
      const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
      const response = await admissionsApi.list({
        page: currentPage,
        page_size: pageSize,
        patient_id: patientId,
        ward_id: selectedWardId || undefined,
        status: statusFilter !== "all" ? (statusFilter as any) : undefined,
        tenant_id: tenantId || undefined,
      });
      setAdmissions(response.items);
      setTotalPages(response.total_pages);
      setTotal(response.total);
    } catch (error) {
      console.error("Failed to fetch admissions:", error);
      setAdmissions([]);
      setTotalPages(1);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, patientId, selectedWardId, statusFilter]);

  useEffect(() => {
    setCurrentPage(1); // Reset to first page when filter changes
  }, [patientId, selectedWardId, statusFilter]);

  useEffect(() => {
    fetchAdmissionsList();
  }, [fetchAdmissionsList]);

  useEffect(() => {
    const fetchWards = async () => {
      try {
        const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
        const response = await wardsApi.list({
          page: 1,
          page_size: 100,
          tenant_id: tenantId || undefined,
        });
        setWards(response.items);
      } catch (error) {
        console.error("Failed to fetch wards:", error);
      }
    };
    fetchWards();
  }, []);

  useEffect(() => {
    const fetchBeds = async () => {
      try {
        const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
        const response = await bedsApi.list({
          page: 1,
          page_size: 99,
          tenant_id: tenantId || undefined,
        });
        setBeds(response.items);
      } catch (error) {
        console.error("Failed to fetch beds:", error);
      }
    };
    fetchBeds();
  }, []);

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const response = await doctorsApi.list();
        setDoctors(response);
      } catch (error) {
        console.error("Failed to fetch doctors:", error);
      }
    };
    fetchDoctors();
  }, []);

  useEffect(() => {
    const handleAdmissionCreated = () => {
      fetchAdmissionsList();
    };

    window.addEventListener("admission:created", handleAdmissionCreated);
    return () => {
      window.removeEventListener("admission:created", handleAdmissionCreated);
    };
  }, [fetchAdmissionsList]);

  const handleDischargeClick = (e: React.MouseEvent, admissionId: string, admissionStatus?: string) => {
    e.stopPropagation(); // Prevent row click
    setDischargingAdmissionId(admissionId);
    setDischargingAdmissionStatus(admissionStatus);
    setShowDischargeModal(true);
  };

  const handleTransferClick = (e: React.MouseEvent, admission: Admission) => {
    e.stopPropagation(); // Prevent row click
    setTransferringAdmissionId(admission.id);
    setTransferringBedId(admission.bed_id);
    setShowTransferModal(true);
  };

  const handleRowClick = (admissionId: string) => {
    setSelectedAdmissionId(admissionId);
    setShowDetailModal(true);
  };

  const handleViewClick = (e: React.MouseEvent, admission: Admission) => {
    e.stopPropagation(); // Prevent row click
    if (onEditClick) {
      onEditClick(admission);
    } else {
      handleRowClick(admission.id);
    }
  };

  const handleServiceChargesClick = (e: React.MouseEvent, admissionId: string) => {
    e.stopPropagation(); // Prevent row click
    setSelectedAdmissionIdForCharges(admissionId);
    setShowServiceChargesModal(true);
  };

  const handleInitiateDischargeClick = (e: React.MouseEvent, admissionId: string) => {
    e.stopPropagation(); // Prevent row click
    setInitiatingAdmissionId(admissionId);
    setShowInitiateDischargeModal(true);
  };

  const handleInitiateDischargeSuccess = async (updatedAdmission: Admission) => {
    // Refresh the admissions list to show updated status
    await fetchAdmissionsList();
    setShowInitiateDischargeModal(false);
    setInitiatingAdmissionId(null);
  };

  const handleDischargeSubmit = async (admissionId: string, dischargeData: DischargeRequest) => {
    try {
      await dispatch(
        dischargePatient({
          admissionId,
          dischargeData,
        })
      ).unwrap();

      toast.success("Patient discharged successfully!");
      fetchAdmissionsList();
      setShowDischargeModal(false);
      setDischargingAdmissionId(null);
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage);
      throw error; // Re-throw to prevent modal from closing on error
    }
  };

  const handleTransferSubmit = async (admissionId: string, transferData: TransferBedRequest) => {
    try {
      const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
      await admissionsApi.transferBed(admissionId, transferData, tenantId || undefined);

      toast.success("Bed transferred successfully!");
      fetchAdmissionsList();
      setShowTransferModal(false);
      setTransferringAdmissionId(null);
      setTransferringBedId(null);
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage);
      throw error; // Re-throw to prevent modal from closing on error
    }
  };

  const getWardName = (admission: Admission) => {
    return admission.ward_name || (admission.bed_id ? wards.find((w) => w.id === admission.bed_id)?.ward_name : null) || "N/A";
  };

  const getBedNumber = (admission: Admission) => {
    return admission.bed_number || beds.find((b) => b.id === admission.bed_id)?.bed_number || (admission.bed_id ? admission.bed_id.slice(0, 8) : "N/A");
  };

  const getDoctorName = (admission: Admission) => {
    return admission.doctor_name || doctors.find((d) => d.id === admission.doctor_id)?.name || (admission.doctor_id ? admission.doctor_id.slice(0, 8) : "N/A");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "admitted":
        return "bg-emerald-50 text-emerald-700";
      case "discharge_initiated":
        return "bg-purple-50 text-purple-700";
      case "discharged":
        return "bg-slate-50 text-slate-700";
      case "transferred":
        return "bg-amber-50 text-amber-700";
      case "deceased":
        return "bg-rose-50 text-rose-700";
      case "cancelled":
        return "bg-slate-50 text-slate-700";
      default:
        return "bg-slate-50 text-slate-700";
    }
  };

  const formatStatus = (status: string) => {
    return status.split("_").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
  };

  if (loading && admissions.length === 0) {
    return <SkeletonRow rows={5} />;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="space-y-1">
          <span className="text-slate-600 text-sm">Filter by Ward</span>
          <select
            value={selectedWardId}
            onChange={(e) => setSelectedWardId(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
          >
            <option value="">All Wards</option>
            {wards.map((ward) => (
              <option key={ward.id} value={ward.id}>
                {ward.ward_name} ({ward.ward_code})
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-slate-600 text-sm">Filter by Status</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
          >
            <option value="all">All Status</option>
            <option value="admitted">Admitted</option>
            <option value="discharged">Discharged</option>
            <option value="transferred">Transferred</option>
            <option value="deceased">Deceased</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-100 shadow-sm">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50 text-left uppercase tracking-wide text-xs text-slate-500">
            <tr>
              <th className="px-4 py-3">Patient</th>
              <th className="px-4 py-3">Ward / Bed</th>
              <th className="px-4 py-3">Doctor</th>
              <th className="px-4 py-3">Admission Date</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right min-w-[200px]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {admissions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  No admissions found
                </td>
              </tr>
            ) : (
              admissions.map((admission) => (
                <tr 
                  key={admission.id} 
                  className="hover:bg-sky-50/50 transition cursor-pointer"
                  onClick={() => handleRowClick(admission.id)}
                >
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-900">
                        {admission.patient_name || `Patient ${admission.patient_id.slice(0, 8)}...`}
                      </span>
                      {admission.admission_number && (
                        <span className="text-xs text-slate-500">{admission.admission_number}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <BedDouble className="h-4 w-4 text-sky-600" />
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-slate-900">{getWardName(admission)}</span>
                        <span className="text-xs text-slate-500">{getBedNumber(admission)}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Stethoscope className="h-4 w-4 text-slate-400" />
                      <span className="text-slate-700">{getDoctorName(admission)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {formatDate(admission.admission_date)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`pill px-2 py-0.5 text-xs font-normal ${getStatusColor(admission.status)}`}>
                      {formatStatus(admission.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 min-w-[200px]">
                    <div className="flex justify-end gap-2">
                      {admission.status === "admitted" && (
                        <button
                          onClick={(e) => handleServiceChargesClick(e, admission.id)}
                          className="group relative flex items-center justify-center overflow-hidden rounded-lg bg-sky-500 p-2 text-xs font-semibold text-white transition-all duration-300 hover:bg-sky-600"
                          style={{ width: "2rem" }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.width = "auto";
                            e.currentTarget.style.paddingLeft = "0.75rem";
                            e.currentTarget.style.paddingRight = "0.75rem";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.width = "2rem";
                            e.currentTarget.style.paddingLeft = "0.5rem";
                            e.currentTarget.style.paddingRight = "0.5rem";
                          }}
                          title="Service Charges"
                        >
                          <CreditCard className="h-4 w-4 shrink-0" />
                          <span className="ml-1.5 hidden whitespace-nowrap group-hover:inline">Service Charges</span>
                        </button>
                      )}
                      {admission.status === "admitted" && (
                        <button
                          onClick={(e) => handleInitiateDischargeClick(e, admission.id)}
                          className="group relative flex items-center justify-center overflow-hidden rounded-lg bg-purple-500 p-2 text-xs font-semibold text-white transition-all duration-300 hover:bg-purple-600"
                          style={{ width: "2rem" }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.width = "auto";
                            e.currentTarget.style.paddingLeft = "0.75rem";
                            e.currentTarget.style.paddingRight = "0.75rem";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.width = "2rem";
                            e.currentTarget.style.paddingLeft = "0.5rem";
                            e.currentTarget.style.paddingRight = "0.5rem";
                          }}
                          title="Initiate Discharge"
                        >
                          <FileText className="h-4 w-4 shrink-0" />
                          <span className="ml-1.5 hidden whitespace-nowrap group-hover:inline">Initiate Discharge</span>
                        </button>
                      )}
                      {admission.status === "admitted" && (
                        <button
                          onClick={(e) => handleTransferClick(e, admission)}
                          className="group relative flex items-center justify-center overflow-hidden rounded-lg bg-amber-500 p-2 text-xs font-semibold text-white transition-all duration-300 hover:bg-amber-600"
                          style={{ width: "2rem" }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.width = "auto";
                            e.currentTarget.style.paddingLeft = "0.75rem";
                            e.currentTarget.style.paddingRight = "0.75rem";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.width = "2rem";
                            e.currentTarget.style.paddingLeft = "0.5rem";
                            e.currentTarget.style.paddingRight = "0.5rem";
                          }}
                          title="Transfer Bed"
                        >
                          <ArrowRightLeft className="h-4 w-4 shrink-0" />
                          <span className="ml-1.5 hidden whitespace-nowrap group-hover:inline">Transfer Bed</span>
                        </button>
                      )}
                      {admission.status === "discharge_initiated" && (
                        <button
                          onClick={(e) => handleDischargeClick(e, admission.id, admission.status)}
                          className="group relative flex items-center justify-center overflow-hidden rounded-lg bg-rose-500 p-2 text-xs font-semibold text-white transition-all duration-300 hover:bg-rose-600"
                          style={{ width: "2rem" }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.width = "auto";
                            e.currentTarget.style.paddingLeft = "0.75rem";
                            e.currentTarget.style.paddingRight = "0.75rem";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.width = "2rem";
                            e.currentTarget.style.paddingLeft = "0.5rem";
                            e.currentTarget.style.paddingRight = "0.5rem";
                          }}
                          title="Discharge"
                        >
                          <div className="relative flex items-center justify-center shrink-0">
                            <BedDouble className="h-4 w-4" />
                            <MinusCircle className="h-3 w-3 absolute -bottom-0.5 -right-0.5 bg-rose-500 rounded-full" />
                          </div>
                          <span className="ml-1.5 hidden whitespace-nowrap group-hover:inline">Discharge</span>
                        </button>
                      )}
                      {admission.status === "discharged" && (
                        <PrintButtonsGroup admission={admission} />
                      )}
                      {onEditClick && (
                        <button
                          onClick={(e) => handleViewClick(e, admission)}
                          className="group relative flex items-center justify-center overflow-hidden rounded-lg bg-sky-500 p-2 text-xs font-semibold text-white transition-all duration-300 hover:bg-sky-600"
                          style={{ width: "2rem" }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.width = "auto";
                            e.currentTarget.style.paddingLeft = "0.75rem";
                            e.currentTarget.style.paddingRight = "0.75rem";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.width = "2rem";
                            e.currentTarget.style.paddingLeft = "0.5rem";
                            e.currentTarget.style.paddingRight = "0.5rem";
                          }}
                          title="View"
                        >
                          <Eye className="h-4 w-4 shrink-0" />
                          <span className="ml-1.5 hidden whitespace-nowrap group-hover:inline">View</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3">
          <div className="text-sm text-slate-600">
            Showing <span className="font-semibold text-slate-900">{(currentPage - 1) * pageSize + 1}</span> to{" "}
            <span className="font-semibold text-slate-900">
              {Math.min(currentPage * pageSize, total)}
            </span>{" "}
            of <span className="font-semibold text-slate-900">{total}</span> admissions
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`min-w-[2.5rem] rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                      currentPage === pageNum
                        ? "bg-sky-500 text-white"
                        : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {dischargingAdmissionId && (
        <DischargeFormModal
          isOpen={showDischargeModal}
          onClose={() => {
            setShowDischargeModal(false);
            setDischargingAdmissionId(null);
            setDischargingAdmissionStatus(undefined);
          }}
          admissionId={dischargingAdmissionId}
          admissionStatus={dischargingAdmissionStatus}
          onSubmit={handleDischargeSubmit}
        />
      )}

      {selectedAdmissionId && (
        <AdmissionDetailModal
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedAdmissionId(null);
          }}
          admissionId={selectedAdmissionId}
        />
      )}

      {transferringAdmissionId && transferringBedId && (
        <TransferBedFormModal
          isOpen={showTransferModal}
          onClose={() => {
            setShowTransferModal(false);
            setTransferringAdmissionId(null);
            setTransferringBedId(null);
          }}
          admissionId={transferringAdmissionId}
          currentBedId={transferringBedId}
          onSubmit={handleTransferSubmit}
        />
      )}

      {selectedAdmissionIdForCharges && (
        <ServiceChargesModal
          isOpen={showServiceChargesModal}
          onClose={() => {
            setShowServiceChargesModal(false);
            setSelectedAdmissionIdForCharges(null);
          }}
          admissionId={selectedAdmissionIdForCharges}
        />
      )}

      {initiatingAdmissionId && (
        <InitiateDischargeFormModal
          isOpen={showInitiateDischargeModal}
          onClose={() => {
            setShowInitiateDischargeModal(false);
            setInitiatingAdmissionId(null);
          }}
          admissionId={initiatingAdmissionId}
          onSuccess={handleInitiateDischargeSuccess}
        />
      )}
    </div>
  );
}

// Print Buttons Group Component for Discharged Admissions
function PrintButtonsGroup({ admission }: { admission: Admission }) {
  const [showPrintDropdown, setShowPrintDropdown] = useState(false);
  const [printInvoiceData, setPrintInvoiceData] = useState<{ invoice: Invoice; patientName: string; patientMobile?: string } | null>(null);
  const [printPaymentData, setPrintPaymentData] = useState<{ payment: Payment; patientName: string; patientMobile?: string; invoiceNumber?: string } | null>(null);
  const [shouldPrintInvoice, setShouldPrintInvoice] = useState(false);
  const [shouldPrintPayment, setShouldPrintPayment] = useState(false);
  const printInvoiceRef = useRef<HTMLDivElement>(null);
  const printPaymentRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handlePrintInvoiceAction = useReactToPrint({
    contentRef: printInvoiceRef,
    documentTitle: printInvoiceData ? `Invoice_${printInvoiceData.invoice.invoice_number}` : "Invoice",
  });

  const handlePrintPaymentAction = useReactToPrint({
    contentRef: printPaymentRef,
    documentTitle: printPaymentData ? `PaymentReceipt_${printPaymentData.payment.payment_number}` : "Payment Receipt",
  });

  useEffect(() => {
    if (shouldPrintInvoice && printInvoiceRef.current) {
      const timeoutId = setTimeout(() => {
        handlePrintInvoiceAction();
        setShouldPrintInvoice(false);
      }, 200);
      return () => clearTimeout(timeoutId);
    }
  }, [shouldPrintInvoice, handlePrintInvoiceAction]);

  useEffect(() => {
    if (shouldPrintPayment && printPaymentRef.current) {
      const timeoutId = setTimeout(() => {
        handlePrintPaymentAction();
        setShouldPrintPayment(false);
      }, 200);
      return () => clearTimeout(timeoutId);
    }
  }, [shouldPrintPayment, handlePrintPaymentAction]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!showPrintDropdown) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowPrintDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showPrintDropdown]);

  const handlePrintInvoice = async () => {
    if (!admission.invoice_id) {
      toast.error("Invoice ID not available for this admission");
      return;
    }
    
    try {
      const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
      const invoice = await invoicesApi.getById(admission.invoice_id, getTenantIdForApi(tenantId || undefined));
      
      const patientName = invoice.patient_name || admission.patient_name || "Unknown";
      const patientMobile = invoice.patient_mobile;
      
      setPrintInvoiceData({
        invoice,
        patientName,
        patientMobile,
      });
      setShouldPrintInvoice(true);
      setShowPrintDropdown(false);
    } catch (error) {
      console.error("Failed to fetch invoice:", error);
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage || "Failed to fetch invoice details");
    }
  };

  const handlePrintPaymentReceipt = async () => {
    if (!admission.payment_id) {
      toast.error("Payment ID not available for this admission");
      return;
    }
    
    try {
      const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
      const payment = await paymentsApi.getById(admission.payment_id, getTenantIdForApi(tenantId || undefined));
      
      // Get invoice number if available
      let invoiceNumber: string | undefined;
      if (payment.invoice_id) {
        try {
          const invoice = await invoicesApi.getById(payment.invoice_id, getTenantIdForApi(tenantId || undefined));
          invoiceNumber = invoice.invoice_number;
        } catch (error) {
          console.error("Failed to fetch invoice for receipt:", error);
        }
      }
      
      const patientName = admission.patient_name || "Unknown";
      
      setPrintPaymentData({
        payment,
        patientName,
        invoiceNumber,
      });
      setShouldPrintPayment(true);
      setShowPrintDropdown(false);
    } catch (error) {
      console.error("Failed to fetch payment:", error);
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage || "Failed to fetch payment details");
    }
  };

  const hasInvoice = !!admission.invoice_id;
  const hasPayment = !!admission.payment_id;
  
  // Always show print button for discharged admissions
  // Show options in dropdown based on available IDs

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowPrintDropdown(!showPrintDropdown);
          }}
          className="group relative flex items-center justify-center overflow-hidden rounded-lg bg-sky-500 p-2 text-xs font-semibold text-white transition-all duration-300 hover:bg-sky-600"
          style={{ width: "2rem" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.width = "auto";
            e.currentTarget.style.paddingLeft = "0.75rem";
            e.currentTarget.style.paddingRight = "0.75rem";
          }}
          onMouseLeave={(e) => {
            if (!showPrintDropdown) {
              e.currentTarget.style.width = "2rem";
              e.currentTarget.style.paddingLeft = "0.5rem";
              e.currentTarget.style.paddingRight = "0.5rem";
            }
          }}
          title="Print"
        >
          <Printer className="h-4 w-4 shrink-0" />
          <span className="ml-1.5 hidden whitespace-nowrap group-hover:inline">Print</span>
        </button>

        {showPrintDropdown && (
          <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border border-slate-200 bg-white shadow-lg">
            {hasInvoice ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrintInvoice();
                }}
                className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
              >
                <Printer className="h-4 w-4" />
                Print Invoice
              </button>
            ) : (
              <div className="px-4 py-2 text-xs text-slate-500">No invoice available</div>
            )}
            {hasPayment ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrintPaymentReceipt();
                }}
                className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
              >
                <Printer className="h-4 w-4" />
                Print Payment Receipt
              </button>
            ) : (
              <div className="px-4 py-2 text-xs text-slate-500">No payment receipt available</div>
            )}
          </div>
        )}
      </div>

      {/* Hidden printable invoice */}
      {printInvoiceData && (
        <div style={{ position: "absolute", left: "-9999px", top: "-9999px", width: "210mm" }}>
          <div ref={printInvoiceRef} className="print-content">
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
    </>
  );
}

