"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  ShoppingCart,
  Search,
  Plus,
  Filter,
  CheckCircle2,
  Send,
  XCircle,
  PackageCheck,
  Calendar,
} from "lucide-react";
import { PharmacyNav } from "@/components/pharmacy/PharmacyNav";
import { Pagination } from "@/components/common/Pagination";
import {
  pharmacyApi,
  PurchaseOrder,
  PharmacySupplier,
} from "@/services/pharmacyApi";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
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

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const res = await pharmacyApi.listPurchaseOrders({
        supplier_id: selectedSupplier || undefined,
        status: selectedStatus || undefined,
        search: search || undefined,
        page,
        page_size: pageSize,
      });
      setOrders(res.items);
      setTotal(res.total);
    } catch (err: any) {
      console.error(err);
      toast.error(getErrorMessage(err) || "Failed to load purchase orders");
    } finally {
      setLoading(false);
    }
  }, [selectedSupplier, selectedStatus, search, page, pageSize]);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleSubmitPO = async (id: string) => {
    if (!confirm("Submit this Purchase Order for approval?")) return;
    try {
      await pharmacyApi.submitPurchaseOrder(id);
      toast.success("Purchase order submitted");
      fetchOrders();
    } catch (err: any) {
      toast.error(getErrorMessage(err) || "Failed to submit purchase order");
    }
  };

  const handleApprovePO = async (id: string) => {
    if (!confirm("Approve this Purchase Order?")) return;
    try {
      await pharmacyApi.approvePurchaseOrder(id);
      toast.success("Purchase order approved. Ready for goods receipt (GRN).");
      fetchOrders();
    } catch (err: any) {
      toast.error(getErrorMessage(err) || "Failed to approve purchase order");
    }
  };

  const handleCancelPO = async (id: string) => {
    const reason = prompt("Enter cancellation reason:");
    if (!reason) return;
    try {
      await pharmacyApi.cancelPurchaseOrder(id, reason);
      toast.success("Purchase order cancelled");
      fetchOrders();
    } catch (err: any) {
      toast.error(getErrorMessage(err) || "Failed to cancel purchase order");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">Draft</span>;
      case "submitted":
        return <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">Submitted</span>;
      case "approved":
        return <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700">Approved</span>;
      case "partially_received":
        return <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">Partially Received</span>;
      case "completed":
        return <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">Completed</span>;
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
          <h1 className="text-xl font-bold text-slate-900">Purchase Orders</h1>
          <p className="text-sm text-slate-500">
            Create and track procurement orders sent to pharmaceutical suppliers
          </p>
        </div>
        <Link
          href="/pharmacy/purchase-orders/new"
          className="flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-500 transition cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Create Purchase Order
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
              placeholder="Search by PO number or notes..."
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
                  {s.supplier_name} ({s.supplier_code})
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
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="partially_received">Partially Received</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="rounded-2xl border border-slate-100 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/75 border-b border-slate-100 text-slate-500 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4 font-semibold">PO Number</th>
                <th className="py-3 px-4 font-semibold">Supplier</th>
                <th className="py-3 px-4 font-semibold">Order Date</th>
                <th className="py-3 px-4 font-semibold text-center">Status</th>
                <th className="py-3 px-4 font-semibold text-center">Items</th>
                <th className="py-3 px-4 font-semibold text-right">Subtotal</th>
                <th className="py-3 px-4 font-semibold text-right">Tax</th>
                <th className="py-3 px-4 font-semibold text-right">Grand Total</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Loading purchase orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No purchase orders found. Click "Create Purchase Order" to start a new procurement.
                  </td>
                </tr>
              ) : (
                orders.map((po) => (
                  <tr key={po.id} className="hover:bg-slate-50/60 transition">
                    {/* PO Number */}
                    <td className="py-3 px-4 font-mono font-medium text-slate-900">
                      {po.po_number}
                    </td>

                    {/* Supplier */}
                    <td className="py-3 px-4 text-slate-700 font-medium">
                      {po.supplier_name || "-"}
                    </td>

                    {/* Order Date */}
                    <td className="py-3 px-4 text-slate-600">
                      <div>{po.order_date}</div>
                      {po.expected_delivery_date && (
                        <div className="text-[11px] text-slate-400">Exp: {po.expected_delivery_date}</div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 text-center">
                      {getStatusBadge(po.status)}
                    </td>

                    {/* Items Count */}
                    <td className="py-3 px-4 text-center font-medium text-slate-700">
                      {po.items?.length || 0}
                    </td>

                    {/* Subtotal */}
                    <td className="py-3 px-4 text-right text-slate-600">
                      ₹{Number(po.subtotal || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                    </td>

                    {/* Tax */}
                    <td className="py-3 px-4 text-right text-slate-600">
                      ₹{Number(po.tax_total || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                    </td>

                    {/* Grand Total */}
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      ₹{Number(po.grand_total || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {po.status === "draft" && (
                          <button
                            onClick={() => handleSubmitPO(po.id)}
                            title="Submit for Approval"
                            className="flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700 hover:bg-amber-100 transition cursor-pointer"
                          >
                            <Send className="h-3 w-3" />
                            Submit
                          </button>
                        )}
                        {po.status === "submitted" && (
                          <button
                            onClick={() => handleApprovePO(po.id)}
                            title="Approve PO"
                            className="flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100 transition cursor-pointer"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            Approve
                          </button>
                        )}
                        {(po.status === "approved" || po.status === "partially_received") && (
                          <Link
                            href={`/pharmacy/grn/new?po_id=${po.id}`}
                            title="Create GRN against PO"
                            className="flex items-center gap-1 rounded-lg bg-sky-50 px-2 py-1 text-[11px] font-medium text-sky-700 hover:bg-sky-100 transition cursor-pointer"
                          >
                            <PackageCheck className="h-3 w-3" />
                            Receive GRN
                          </Link>
                        )}
                        {po.status !== "completed" && po.status !== "cancelled" && (
                          <button
                            onClick={() => handleCancelPO(po.id)}
                            title="Cancel PO"
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
    </div>
  );
}
