"use client";

import { useEffect, useState, useCallback } from "react";
import { useAppSelector } from "@/redux/hooks";
import { bedsApi, Bed, BedType } from "@/services/bedsApi";
import { Edit2, Trash2, BedDouble, ChevronLeft, ChevronRight, CheckCircle2, XCircle, Users2 } from "lucide-react";
import { SkeletonRow } from "@/components/shared/SkeletonRow";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";

interface BedTableProps {
  wardId?: string;
  onEditClick?: (bed: Bed) => void;
}

export function BedTable({ wardId, onEditClick }: BedTableProps) {
  const [beds, setBeds] = useState<Bed[]>([]);
  // Use Redux centralized wards cache (fetched once in dashboard layout)
  const wards = useAppSelector((s) => s.wards.list);
  const [bedTypes, setBedTypes] = useState<BedType[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedWardId, setSelectedWardId] = useState<string>(wardId || "");
  const [selectedBedType, setSelectedBedType] = useState<BedType | "all">("all");
  const [availabilityFilter, setAvailabilityFilter] = useState<"all" | "available" | "occupied">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchBedTypes = async () => {
    try {
      const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
      const response = await bedsApi.getBedTypes(tenantId || undefined);
      setBedTypes(response.bed_types);
    } catch (error) {
      console.error("Failed to fetch bed types:", error);
    }
  };

  const fetchBeds = useCallback(async () => {
    setLoading(true);
    try {
      const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
      const response = await bedsApi.list({
        page: currentPage,
        page_size: pageSize,
        ward_id: selectedWardId || undefined,
        bed_type: selectedBedType !== "all" ? selectedBedType : undefined,
        status: availabilityFilter !== "all" ? availabilityFilter : undefined,
        tenant_id: tenantId || undefined,
      });
      setBeds(response.items);
      setTotalPages(response.total_pages);
      setTotal(response.total);
    } catch (error) {
      console.error("Failed to fetch beds:", error);
      setBeds([]);
      setTotalPages(1);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, selectedWardId, selectedBedType, availabilityFilter]);

  // Fetch bed types once on mount (wards now come from Redux)
  useEffect(() => {
    fetchBedTypes();
  }, []);

  useEffect(() => {
    setCurrentPage(1); // Reset to first page when filter changes
  }, [selectedWardId, selectedBedType, availabilityFilter]);

  // Fetch beds when dependencies change
  useEffect(() => {
    fetchBeds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, selectedWardId, selectedBedType, availabilityFilter]);

  // Event listeners for bed create/update
  useEffect(() => {
    const handleBedCreated = () => {
      fetchBeds();
    };

    const handleBedUpdated = () => {
      fetchBeds();
    };

    window.addEventListener("bed:created", handleBedCreated);
    window.addEventListener("bed:updated", handleBedUpdated);
    return () => {
      window.removeEventListener("bed:created", handleBedCreated);
      window.removeEventListener("bed:updated", handleBedUpdated);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async (bedId: string) => {
    if (!confirm("Are you sure you want to delete this bed?")) return;

    try {
      const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
      await bedsApi.delete(bedId, tenantId || undefined);
      toast.success("Bed deleted successfully!");
      fetchBeds();
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-emerald-50 text-emerald-700";
      case "occupied":
        return "bg-rose-50 text-rose-700";
      case "maintenance":
        return "bg-amber-50 text-amber-700";
      case "reserved":
        return "bg-sky-50 text-sky-700";
      default:
        return "bg-slate-50 text-slate-700";
    }
  };

  const getWardName = (bed: Bed) => {
    return bed.ward_name || wards.find((w) => w.id === bed.ward_id)?.ward_name || bed.ward_id.slice(0, 8);
  };

  if (loading && beds.length === 0) {
    return <SkeletonRow rows={5} />;
  }

  const getBedTypeLabel = (bedType: BedType) => {
    const labels: Record<BedType, string> = {
      general: "General",
      private: "Private",
      semi_private: "Semi-Private",
      icu: "ICU",
      ccu: "CCU",
      nicu: "NICU",
      picu: "PICU",
      hdu: "HDU",
      isolation: "Isolation",
    };
    return labels[bedType] || bedType;
  };

  return (
    <div className="space-y-4 -mt-2">
      {/* Bed Type Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto">
        <button
          onClick={() => setSelectedBedType("all")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition whitespace-nowrap ${
            selectedBedType === "all"
              ? "border-sky-500 text-sky-700"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          <BedDouble className="h-4 w-4" />
          All Beds
        </button>
        {bedTypes.map((bedType) => (
          <button
            key={bedType}
            onClick={() => setSelectedBedType(bedType)}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition whitespace-nowrap ${
              selectedBedType === bedType
                ? "border-sky-500 text-sky-700"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <BedDouble className="h-4 w-4" />
            {getBedTypeLabel(bedType)}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3">
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
        <div className="space-y-1">
          <span className="text-slate-600 text-sm">Availability</span>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1">
            <button
              onClick={() => setAvailabilityFilter("all")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                availabilityFilter === "all"
                  ? "bg-sky-500 text-white"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setAvailabilityFilter("available")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                availabilityFilter === "available"
                  ? "bg-emerald-500 text-white"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Available
            </button>
            <button
              onClick={() => setAvailabilityFilter("occupied")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                availabilityFilter === "occupied"
                  ? "bg-rose-500 text-white"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <XCircle className="h-3.5 w-3.5" />
              Occupied
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-100 shadow-sm">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50 text-left uppercase tracking-wide text-xs text-slate-500">
            <tr>
              <th className="px-4 py-3">Bed Number</th>
              <th className="px-4 py-3">Ward</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Daily Rate</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {beds.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  No beds found
                </td>
              </tr>
            ) : (
              beds.map((bed) => (
                <tr key={bed.id} className="hover:bg-sky-50/50 transition">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <BedDouble className="h-4 w-4 text-sky-600" />
                      <span className="font-semibold text-slate-900">{bed.bed_number}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {getWardName(bed)}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    <span className="pill bg-sky-50 text-sky-700 px-2 py-0.5 text-xs font-normal">
                      {bed.bed_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    ₹{parseFloat(bed.daily_rate).toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`pill px-2 py-0.5 text-xs font-normal ${getStatusColor(bed.status)}`}>
                        {bed.status}
                      </span>
                      {bed.status === "occupied" && (bed.occupied_by_patient_name || bed.occupied_by_patient_mobile) && (
                        <div className="relative group">
                          <Users2 className="h-4 w-4 text-sky-600 cursor-help" />
                          <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-20 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                            <div className="rounded-lg bg-slate-900 text-white px-3 py-2 text-xs shadow-xl whitespace-nowrap">
                              <div className="font-semibold mb-1">
                                {bed.occupied_by_patient_name || "Unknown Patient"}
                              </div>
                              {bed.occupied_by_patient_mobile && (
                                <div className="text-slate-300">
                                  {bed.occupied_by_patient_mobile}
                                </div>
                              )}
                            </div>
                            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900"></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => onEditClick?.(bed)}
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
                        title="Edit"
                      >
                        <Edit2 className="h-4 w-4 shrink-0" />
                        <span className="ml-1.5 hidden whitespace-nowrap group-hover:inline">Edit</span>
                      </button>
                      <button
                        onClick={() => handleDelete(bed.id)}
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
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4 shrink-0" />
                        <span className="ml-1.5 hidden whitespace-nowrap group-hover:inline">Delete</span>
                      </button>
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
            of <span className="font-semibold text-slate-900">{total}</span> beds
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
    </div>
  );
}

