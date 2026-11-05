"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Receipt,
  Search,
  Filter,
  Eye,
  XCircle,
  Calendar,
} from "lucide-react";
import { PharmacyNav } from "@/components/pharmacy/PharmacyNav";
import { PharmacyInvoiceModal } from "@/components/pharmacy/PharmacyInvoiceModal";
import { Pagination } from "@/components/common/Pagination";
import {
  pharmacyApi,
  PharmacyInvoice,
} from "@/services/pharmacyApi";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";

export default function PharmacyInvoicesPage() {
  const [invoices, setInvoices] = useState<PharmacyInvoice[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [loading, setLoading] = useState(true);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<PharmacyInvoice | null>(null);

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const res = await pharmacyApi.listInvoices({
        search: search || undefined,
        status: selectedStatus || undefined,
        page,
        page_size: pageSize,
      });
      setInvoices(res.items);
      setTotal(res.total);
    } catch (err: any) {
      console.error(err);
      toast.error(getErrorMessage(err) || "Failed to load pharmacy invoices");
    } finally {
      setLoading(false);
    }
  }, [search, selectedStatus, page, pageSize]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleCancelInvoice = async (id: string) => {
    const reason = prompt("Enter invoice cancellation reason:");
    if (!reason) return;
    try {
      await pharmacyApi.cancelInvoice(id, reason);
      toast.success("Invoice cancelled successfully");
      fetchInvoices();
    } catch (err: any) {
      toast.error(getErrorMessage(err) || "Failed to cancel invoice");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">Paid</span>;
      case "cancelled":
        return <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700">Cancelled</span>;
      case "refunded":
        return <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">Refunded</span>;
      default:
        return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">{status}</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Pharmacy Invoices</h1>
          <p className="text-sm text-slate-500">
            Dispensing billing records, sales invoices, tax breakdowns and print receipts
          </p>
        </div>
      </div>

      <PharmacyNav />

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search */}
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by invoice #, patient name or UHID..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-sm focus:border-sky-500 focus:outline-hidden"
            />
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
              <option value="paid">Paid</option>
              <option value="refunded">Refunded / Adjusted</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="rounded-2xl border border-slate-100 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/75 border-b border-slate-100 text-slate-500 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4 font-semibold">Invoice Number</th>
                <th className="py-3 px-4 font-semibold">Patient</th>
                <th className="py-3 px-4 font-semibold">Invoice Date</th>
                <th className="py-3 px-4 font-semibold text-center">Items</th>
                <th className="py-3 px-4 font-semibold text-right">Subtotal</th>
                <th className="py-3 px-4 font-semibold text-right">Tax</th>
                <th className="py-3 px-4 font-semibold text-right">Total Amount</th>
                <th className="py-3 px-4 font-semibold text-center">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Loading pharmacy invoices...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No pharmacy invoices found.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/60 transition">
                    {/* Invoice Number */}
                    <td className="py-3 px-4 font-mono font-medium text-slate-900">
                      {inv.invoice_number}
                    </td>

                    {/* Patient */}
                    <td className="py-3 px-4 text-slate-700">
                      <div className="font-semibold">{inv.patient_name || "-"}</div>
                      <div className="text-[11px] font-mono text-slate-400">{inv.patient_uhid}</div>
                    </td>

                    {/* Date */}
                    <td className="py-3 px-4 text-slate-600">
                      {inv.invoice_date}
                    </td>

                    {/* Items */}
                    <td className="py-3 px-4 text-center font-medium text-slate-700">
                      {inv.items?.length || 0}
                    </td>

                    {/* Subtotal */}
                    <td className="py-3 px-4 text-right text-slate-600">
                      ₹{Number(inv.subtotal).toFixed(2)}
                    </td>

                    {/* Tax */}
                    <td className="py-3 px-4 text-right text-slate-600">
                      ₹{Number(inv.tax_total).toFixed(2)}
                    </td>

                    {/* Total */}
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      ₹{Number(inv.total_amount).toFixed(2)}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 text-center">
                      {getStatusBadge(inv.status)}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedInvoice(inv);
                            setModalOpen(true);
                          }}
                          title="View / Print Receipt"
                          className="flex items-center gap-1 rounded-lg bg-sky-50 px-2 py-1 text-[11px] font-medium text-sky-700 hover:bg-sky-100 transition cursor-pointer"
                        >
                          <Eye className="h-3 w-3" />
                          View
                        </button>
                        {inv.status === "paid" && (
                          <button
                            onClick={() => handleCancelInvoice(inv.id)}
                            title="Cancel Invoice"
                            className="rounded-lg p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                          >
                            <XCircle className="h-4 w-4" />
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
        <Pagination
          currentPage={page}
          total={total}
          pageSize={pageSize}
          onPageChange={(p) => setPage(p)}
        />
      </div>

      {/* Invoice Detail & Print Modal */}
      <PharmacyInvoiceModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        invoice={selectedInvoice}
      />
    </div>
  );
}
