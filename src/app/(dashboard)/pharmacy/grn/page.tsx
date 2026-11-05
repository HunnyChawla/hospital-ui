"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  PackageCheck,
  Search,
  Plus,
  Filter,
  CheckCircle2,
  XCircle,
  FileText,
  Calendar,
} from "lucide-react";
import { PharmacyNav } from "@/components/pharmacy/PharmacyNav";
import { Pagination } from "@/components/common/Pagination";
import {
  pharmacyApi,
  GoodsReceiptNote,
  PharmacySupplier,
} from "@/services/pharmacyApi";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";

export default function GoodsReceiptNotesPage() {
  const [grnList, setGrnList] = useState<GoodsReceiptNote[]>([]);
  const [suppliers, setSuppliers] = useState<PharmacySupplier[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [search, setSearch] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchSuppliers = async () => {
    try {
      const res = await pharmacyApi.listSuppliers({ is_active: true, page_size: 100 });
      setSuppliers(res.items);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchGRNs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await pharmacyApi.listGRN({
        supplier_id: selectedSupplier || undefined,
        status: selectedStatus || undefined,
        search: search || undefined,
        page,
        page_size: pageSize,
      });
      setGrnList(res.items);
      setTotal(res.total);
    } catch (err: any) {
      console.error(err);
      toast.error(getErrorMessage(err) || "Failed to load goods receipt notes");
    } finally {
      setLoading(false);
    }
  }, [selectedSupplier, selectedStatus, search, page, pageSize]);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  useEffect(() => {
    fetchGRNs();
  }, [fetchGRNs]);

  const handleConfirmGRN = async (id: string) => {
    if (!confirm("Confirm this Goods Receipt Note? This will immediately add all received batches to active inventory.")) return;
    try {
      await pharmacyApi.confirmGRN(id);
      toast.success("GRN confirmed and inventory stock updated!");
      fetchGRNs();
    } catch (err: any) {
      toast.error(getErrorMessage(err) || "Failed to confirm GRN");
    }
  };

  const handleCancelGRN = async (id: string) => {
    const reason = prompt("Enter cancellation reason:");
    if (!reason) return;
    try {
      await pharmacyApi.cancelGRN(id, reason);
      toast.success("GRN cancelled");
      fetchGRNs();
    } catch (err: any) {
      toast.error(getErrorMessage(err) || "Failed to cancel GRN");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">Draft (Pending Confirmation)</span>;
      case "confirmed":
        return <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">Confirmed (Stock Updated)</span>;
      case "cancelled":
        return <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700">Cancelled</span>;
      default:
        return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">{status}</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Goods Receipt Notes (GRN)</h1>
          <p className="text-sm text-slate-500">
            Verify and receive medicine batches, MRP, expiry dates and stock inwards into inventory
          </p>
        </div>
        <Link
          href="/pharmacy/grn/new"
          className="flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-500 transition cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Create GRN
        </Link>
      </div>

      <PharmacyNav />

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by GRN #, invoice # or PO #..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-sm focus:border-sky-500 focus:outline-hidden"
            />
          </div>

          {/* Supplier Filter */}
          <div>
            <select
              value={selectedSupplier}
              onChange={(e) => {
                setSelectedSupplier(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-hidden"
            >
              <option value="">All Suppliers</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.supplier_name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-hidden"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft (Unconfirmed)</option>
              <option value="confirmed">Confirmed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* GRN Table */}
      <div className="rounded-2xl border border-slate-100 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/75 border-b border-slate-100 text-slate-500 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4 font-semibold">GRN Number</th>
                <th className="py-3 px-4 font-semibold">Supplier</th>
                <th className="py-3 px-4 font-semibold">Supplier Invoice</th>
                <th className="py-3 px-4 font-semibold">Received Date</th>
                <th className="py-3 px-4 font-semibold text-center">Status</th>
                <th className="py-3 px-4 font-semibold text-center">Batches</th>
                <th className="py-3 px-4 font-semibold text-right">Tax Total</th>
                <th className="py-3 px-4 font-semibold text-right">Grand Total</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Loading GRNs...
                  </td>
                </tr>
              ) : grnList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No goods receipt notes recorded yet.
                  </td>
                </tr>
              ) : (
                grnList.map((grn) => (
                  <tr key={grn.id} className="hover:bg-slate-50/60 transition">
                    {/* GRN Number */}
                    <td className="py-3 px-4 font-mono font-medium text-slate-900">
                      <div>{grn.grn_number}</div>
                      {grn.po_number && (
                        <div className="text-[10px] text-slate-400">Against: {grn.po_number}</div>
                      )}
                    </td>

                    {/* Supplier */}
                    <td className="py-3 px-4 text-slate-700 font-medium">
                      {grn.supplier_name || "-"}
                    </td>

                    {/* Invoice */}
                    <td className="py-3 px-4 text-slate-600">
                      <div>{grn.supplier_invoice_no || "-"}</div>
                      {grn.supplier_invoice_date && (
                        <div className="text-[11px] text-slate-400">Date: {grn.supplier_invoice_date}</div>
                      )}
                    </td>

                    {/* Received Date */}
                    <td className="py-3 px-4 text-slate-600">
                      {grn.received_date}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 text-center">
                      {getStatusBadge(grn.status)}
                    </td>

                    {/* Items/Batches Count */}
                    <td className="py-3 px-4 text-center font-medium text-slate-700">
                      {grn.items?.length || 0}
                    </td>

                    {/* Tax */}
                    <td className="py-3 px-4 text-right text-slate-600">
                      ₹{Number(grn.tax_total || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                    </td>

                    {/* Grand Total */}
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      ₹{Number(grn.grand_total || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {grn.status === "draft" && (
                          <>
                            <button
                              onClick={() => handleConfirmGRN(grn.id)}
                              title="Confirm GRN (Inward to Inventory)"
                              className="flex items-center gap-1 rounded-lg bg-teal-50 px-2 py-1 text-[11px] font-medium text-teal-700 hover:bg-teal-100 transition cursor-pointer"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              Confirm GRN
                            </button>
                            <button
                              onClick={() => handleCancelGRN(grn.id)}
                              title="Cancel GRN"
                              className="rounded-lg p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        {grn.status === "confirmed" && (
                          <span className="text-[11px] text-emerald-600 font-medium">
                            Stock Inwarded
                          </span>
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
        <Pagination
          currentPage={page}
          total={total}
          pageSize={pageSize}
          onPageChange={(p) => setPage(p)}
        />
      </div>
    </div>
  );
}
