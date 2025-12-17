"use client";

import { useEffect, useState, useCallback } from "react";
import { useAppDispatch } from "@/redux/hooks";
import { fetchAdmissions, dischargePatient } from "@/redux/admissionsSlice";
import { admissionsApi, Admission, DischargeRequest, TransferBedRequest } from "@/services/admissionsApi";
import { wardsApi, Ward } from "@/services/wardsApi";
import { bedsApi, Bed } from "@/services/bedsApi";
import { doctorsApi } from "@/services/doctorsApi";
import { formatDate } from "@/utils/format";
import { BedDouble, User, Calendar, Stethoscope, X, ArrowRightLeft, ChevronLeft, ChevronRight, Eye, MinusCircle } from "lucide-react";
import { SkeletonRow } from "@/components/shared/SkeletonRow";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { DischargeFormModal } from "./DischargeFormModal";
import { AdmissionDetailModal } from "./AdmissionDetailModal";
import { TransferBedFormModal } from "./TransferBedFormModal";

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

  const handleDischargeClick = (e: React.MouseEvent, admissionId: string) => {
    e.stopPropagation(); // Prevent row click
    setDischargingAdmissionId(admissionId);
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
              <th className="px-4 py-3 text-right">Actions</th>
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
                      {admission.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {admission.status === "admitted" && (
                        <>
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
                          <button
                            onClick={(e) => handleDischargeClick(e, admission.id)}
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
                        </>
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
          }}
          admissionId={dischargingAdmissionId}
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
    </div>
  );
}

