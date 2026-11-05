"use client";

import { useEffect, useState, useCallback } from "react";
import {
  RotateCcw,
  Search,
  Plus,
  Filter,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import { PharmacyNav } from "@/components/pharmacy/PharmacyNav";
import ProcessReturnModal from "@/components/pharmacy/ProcessReturnModal";
import { Pagination } from "@/components/common/Pagination";
import {
  pharmacyApi,
  MedicineReturn,
} from "@/services/pharmacyApi";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";

export default function PharmacyReturnsPage() {
  const [returnsList, setReturnsList] = useState<MedicineReturn[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);

  const fetchReturns = useCallback(async () => {
    try {
      setLoading(true);
      const res = await pharmacyApi.listReturns({
        search: search || undefined,
        page,
        page_size: pageSize,
      });
      setReturnsList(res.items);
      setTotal(res.total);
    } catch (err: any) {
      console.error(err);
      toast.error(getErrorMessage(err) || "Failed to load medicine returns");
    } finally {
      setLoading(false);
    }
  }, [search, page, pageSize]);

  useEffect(() => {
    fetchReturns();
  }, [fetchReturns]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Patient Medicine Returns</h1>
          <p className="text-sm text-slate-500">
            Process patient returns with original batch stock restoration and financial refund adjustments
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-500 transition cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Process Return
        </button>
      </div>

      <PharmacyNav />

      {/* Search Bar */}
      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-xs">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by return number, patient name or UHID..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-sm focus:border-sky-500 focus:outline-hidden"
          />
        </div>
      </div>

      {/* Returns Table */}
      <div className="rounded-2xl border border-slate-100 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/75 border-b border-slate-100 text-slate-500 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4 font-semibold">Return Number</th>
                <th className="py-3 px-4 font-semibold">Patient</th>
                <th className="py-3 px-4 font-semibold">Return Date</th>
                <th className="py-3 px-4 font-semibold">Reason</th>
                <th className="py-3 px-4 font-semibold text-center">Items</th>
                <th className="py-3 px-4 font-semibold text-right">Refund Amount</th>
                <th className="py-3 px-4 font-semibold text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Loading medicine returns...
                  </td>
                </tr>
              ) : returnsList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No medicine return records found. Click "Process Return" to record patient returns.
                  </td>
                </tr>
              ) : (
                returnsList.map((ret) => (
                  <tr key={ret.id} className="hover:bg-slate-50/60 transition">
                    {/* Return Number */}
                    <td className="py-3 px-4 font-mono font-medium text-slate-900">
                      <div>{ret.return_number}</div>
                      {ret.invoice_number && (
                        <div className="text-[10px] text-slate-400 font-sans">Inv: {ret.invoice_number}</div>
                      )}
                    </td>

                    {/* Patient */}
                    <td className="py-3 px-4 text-slate-700">
                      <div className="font-semibold">{ret.patient_name || "-"}</div>
                      <div className="text-[11px] font-mono text-slate-400">{ret.patient_uhid}</div>
                    </td>

                    {/* Return Date */}
                    <td className="py-3 px-4 text-slate-600">
                      {ret.return_date}
                    </td>

                    {/* Reason */}
                    <td className="py-3 px-4 text-slate-600 truncate max-w-xs">
                      {ret.return_reason}
                    </td>

                    {/* Items Count */}
                    <td className="py-3 px-4 text-center font-medium text-slate-700">
                      {ret.items?.length || 0}
                    </td>

                    {/* Refund Amount */}
                    <td className="py-3 px-4 text-right font-bold text-teal-700">
                      ₹{Number(ret.total_refund).toFixed(2)}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 uppercase">
                        {ret.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <Pagination
          currentPage={page}
          total={total}
          pageSize={pageSize}
          onPageChange={(p) => setPage(p)}
        />
      </div>

      {/* Process Return Modal */}
      <ProcessReturnModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={fetchReturns}
      />
    </div>
  );
}
