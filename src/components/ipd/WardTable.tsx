"use client";

import { useEffect, useState, useCallback } from "react";
import { wardsApi, Ward } from "@/services/wardsApi";
import { Edit2, Trash2, BedDouble, ChevronLeft, ChevronRight, Building2 } from "lucide-react";
import { SkeletonRow } from "@/components/shared/SkeletonRow";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { getTenantIdForApi } from "@/utils/auth";

interface WardTableProps {
  onEditClick?: (ward: Ward) => void;
}

export function WardTable({ onEditClick }: WardTableProps) {
  const [wards, setWards] = useState<Ward[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchWards = useCallback(async () => {
    setLoading(true);
    try {
      const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
      const response = await wardsApi.list({
        page: currentPage,
        page_size: pageSize,
        tenant_id: getTenantIdForApi(tenantId),
      });
      setWards(response.items);
      setTotalPages(response.total_pages);
      setTotal(response.total);
    } catch (error) {
      console.error("Failed to fetch wards:", error);
      setWards([]);
      setTotalPages(1);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize]);

  // Fetch wards when page changes
  useEffect(() => {
    fetchWards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  // Event listeners for ward create/update
  useEffect(() => {
    const handleWardCreated = () => {
      fetchWards();
    };

    const handleWardUpdated = () => {
      fetchWards();
    };

    window.addEventListener("ward:created", handleWardCreated);
    window.addEventListener("ward:updated", handleWardUpdated);
    return () => {
      window.removeEventListener("ward:created", handleWardCreated);
      window.removeEventListener("ward:updated", handleWardUpdated);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async (wardId: string) => {
    if (!confirm("Are you sure you want to delete this ward?")) return;

    try {
      const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
      await wardsApi.delete(wardId, tenantId || undefined);
      toast.success("Ward deleted successfully!");
      fetchWards();
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage);
    }
  };

  if (loading) {
    return <SkeletonRow rows={5} />;
  }

  return (
    <div className="space-y-4">
      {/* Mobile Card View */}
      <div className="block md:hidden space-y-3">
        {wards.length === 0 ? (
          <div className="rounded-xl border border-slate-100 bg-white p-6 text-center text-slate-500 shadow-sm">
            No wards found
          </div>
        ) : (
          wards.map((ward) => (
            <div key={ward.id} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="h-4 w-4 text-sky-600 shrink-0" />
                    <span className="font-semibold text-slate-900 truncate">{ward.ward_name}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-sm">
                    <span className="pill bg-sky-50 text-sky-700 px-2 py-0.5 text-xs font-normal">
                      {ward.ward_code}
                    </span>
                    <span className="text-slate-500">Floor: {ward.floor ?? "N/A"}</span>
                    <span className={`pill px-2 py-0.5 text-xs font-normal ${ward.is_active
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-50 text-slate-700"
                      }`}>
                      {ward.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => onEditClick?.(ward)}
                    className="flex items-center justify-center rounded-lg bg-sky-500 p-2 text-white"
                    title="Edit"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(ward.id)}
                    className="flex items-center justify-center rounded-lg bg-rose-500 p-2 text-white"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-100 shadow-sm">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50 text-left uppercase tracking-wide text-xs text-slate-500">
            <tr>
              <th className="px-4 py-3">Ward Name</th>
              <th className="px-4 py-3">Ward Code</th>
              <th className="px-4 py-3">Floor</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {wards.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  No wards found
                </td>
              </tr>
            ) : (
              wards.map((ward) => (
                <tr key={ward.id} className="hover:bg-sky-50/50 transition">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-sky-600" />
                      <span className="font-semibold text-slate-900">{ward.ward_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="pill bg-sky-50 text-sky-700 px-2 py-0.5 text-xs font-normal">
                      {ward.ward_code}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {ward.floor ?? "N/A"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`pill px-2 py-0.5 text-xs font-normal ${ward.is_active
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-50 text-slate-700"
                      }`}>
                      {ward.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => onEditClick?.(ward)}
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
                        onClick={() => handleDelete(ward.id)}
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
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
          <div className="text-sm text-slate-600 text-center sm:text-left">
            Showing <span className="font-semibold text-slate-900">{(currentPage - 1) * pageSize + 1}</span> to{" "}
            <span className="font-semibold text-slate-900">
              {Math.min(currentPage * pageSize, total)}
            </span>{" "}
            of <span className="font-semibold text-slate-900">{total}</span> wards
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 sm:px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Previous</span>
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
                    className={`min-w-[2rem] sm:min-w-[2.5rem] rounded-lg px-2 sm:px-3 py-1.5 text-sm font-medium transition ${currentPage === pageNum
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
              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 sm:px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

