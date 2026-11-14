"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, Eye, XCircle, CreditCard, RotateCcw } from "lucide-react";
import { PharmacyNav } from "@/components/pharmacy/PharmacyNav";
import { PharmacyInvoiceModal } from "@/components/pharmacy/PharmacyInvoiceModal";
import { Modal } from "@/components/common/Modal";
import { Pagination } from "@/components/common/Pagination";
import { pharmacyApi, PharmacyInvoice } from "@/services/pharmacyApi";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";

export default function PharmacyInvoicesPage() {
  const [invoices, setInvoices] = useState<PharmacyInvoice[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [loading, setLoading] = useState(true);

  // View Receipt Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<PharmacyInvoice | null>(null);

  // Payment Collection Modal
  const [payTarget, setPayTarget] = useState<PharmacyInvoice | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("cash");
  const [payRef, setPayRef] = useState("");
  const [payNotes, setPayNotes] = useState("");
  const [paying, setPaying] = useState(false);

  // Cancel Modal
  const [cancelTarget, setCancelTarget] = useState<PharmacyInvoice | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

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
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "Failed to load pharmacy invoices");
    } finally {
      setLoading(false);
    }
  }, [search, selectedStatus, page, pageSize]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleOpenInvoice = async (inv: PharmacyInvoice) => {
    try {
      const full = await pharmacyApi.getInvoice(inv.id);
      setSelectedInvoice(full);
      setModalOpen(true);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "Failed to load invoice details");
    }
  };

  const openPaymentModal = (inv: PharmacyInvoice) => {
    const due = Math.max(0, Number(inv.total_amount) - Number(inv.paid_amount ?? 0));
    setPayTarget(inv);
    setPayAmount(due.toFixed(2));
    setPayMethod("cash");
    setPayRef("");
    setPayNotes("");
  };

  const handleCollectPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payTarget) return;
    const amt = Number(payAmount);
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error("Enter a valid payment amount");
      return;
    }
    try {
      setPaying(true);
      const updated = await pharmacyApi.collectInvoicePayment(payTarget.id, {
        amount: amt,
        payment_method: payMethod,
        payment_reference: payRef.trim() || undefined,
        notes: payNotes.trim() || undefined,
      });
      toast.success(`Payment collected for ${updated.invoice_number}`);
      setPayTarget(null);
      if (selectedInvoice?.id === updated.id) {
        setSelectedInvoice(updated);
      }
      fetchInvoices();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "Failed to record payment");
    } finally {
      setPaying(false);
    }
  };

  const handleCancelInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelTarget || cancelReason.trim().length < 3) {
      toast.error("Please provide a cancellation reason (min 3 characters)");
      return;
    }
    try {
      setCancelling(true);
      await pharmacyApi.cancelInvoice(cancelTarget.id, cancelReason.trim());
      toast.success(`Invoice ${cancelTarget.invoice_number} cancelled`);
      setCancelTarget(null);
      setCancelReason("");
      fetchInvoices();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "Failed to cancel invoice");
    } finally {
      setCancelling(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return (
          <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-200">
            Paid
          </span>
        );
      case "partial":
        return (
          <span className="inline-flex rounded-full bg-cyan-50 px-2.5 py-0.5 text-[11px] font-semibold text-cyan-800 ring-1 ring-inset ring-cyan-200">
            Partial
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 ring-1 ring-inset ring-amber-200">
            Pending
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold text-rose-800 ring-1 ring-inset ring-rose-200">
            Cancelled
          </span>
        );
      case "refunded":
        return (
          <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 ring-1 ring-inset ring-amber-200">
            Refunded
          </span>
        );
      default:
        return (
          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Pharmacy Invoices</h1>
          <p className="text-sm text-slate-600">
            Dispensing OPD bills, payment collection, GST breakdown, and printable receipts
          </p>
        </div>
        {(searchInput || selectedStatus) && (
          <button
            type="button"
            onClick={() => {
              setSearchInput("");
              setSearch("");
              setSelectedStatus("");
              setPage(1);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer self-start"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset Filters
          </button>
        )}
      </div>

      <PharmacyNav />

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative sm:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              aria-label="Search pharmacy invoices"
              placeholder="Search by invoice #, patient name or UHID..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full rounded-xl border border-slate-300 pl-9 pr-3 py-2 text-sm text-slate-900 focus:border-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-600/20"
            />
          </div>

          <div>
            <select
              aria-label="Filter by invoice status"
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-600/20 cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending Payment</option>
              <option value="partial">Partially Paid</option>
              <option value="paid">Paid</option>
              <option value="refunded">Refunded / Adjusted</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4 font-semibold">Invoice #</th>
                <th className="py-3 px-4 font-semibold">Patient</th>
                <th className="py-3 px-4 font-semibold">Date</th>
                <th className="py-3 px-4 font-semibold text-right">Subtotal</th>
                <th className="py-3 px-4 font-semibold text-right">GST Tax</th>
                <th className="py-3 px-4 font-semibold text-right">Total</th>
                <th className="py-3 px-4 font-semibold text-right">Paid / Due</th>
                <th className="py-3 px-4 font-semibold text-center">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    Loading pharmacy invoices...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    No pharmacy invoices found.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => {
                  const tax = Number(inv.tax_amount ?? inv.tax_total ?? 0);
                  const totalAmt = Number(inv.total_amount ?? 0);
                  const paidAmt = Number(inv.paid_amount ?? 0);
                  const dueAmt = Math.max(0, totalAmt - paidAmt);
                  const canCollect =
                    dueAmt > 0 && inv.status !== "cancelled" && inv.status !== "refunded";
                  const canCancel = inv.status !== "cancelled" && inv.status !== "refunded";

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/75 transition">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                        {inv.invoice_number}
                      </td>
                      <td className="py-3 px-4 text-slate-800">
                        <div className="font-semibold">{inv.patient_name || "-"}</div>
                        <div className="text-[11px] font-mono text-slate-500">{inv.patient_uhid}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-700 tabular-nums whitespace-nowrap">
                        {inv.invoice_date}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-700 tabular-nums">
                        ₹{Number(inv.subtotal).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-700 tabular-nums">
                        ₹{tax.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900 tabular-nums">
                        ₹{totalAmt.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums">
                        <div className="font-semibold text-emerald-700">₹{paidAmt.toFixed(2)}</div>
                        {dueAmt > 0 && inv.status !== "cancelled" && (
                          <div className="text-[11px] font-semibold text-amber-700">Due ₹{dueAmt.toFixed(2)}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">{getStatusBadge(inv.status)}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenInvoice(inv)}
                            title="View / Print Receipt"
                            className="inline-flex items-center gap-1 rounded-lg bg-cyan-50 px-2.5 py-1 text-[11px] font-semibold text-cyan-800 hover:bg-cyan-100 transition cursor-pointer"
                          >
                            <Eye className="h-3 w-3" />
                            View
                          </button>
                          {canCollect && (
                            <button
                              type="button"
                              onClick={() => openPaymentModal(inv)}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-500 transition cursor-pointer"
                            >
                              <CreditCard className="h-3 w-3" />
                              Pay
                            </button>
                          )}
                          {canCancel && (
                            <button
                              type="button"
                              onClick={() => {
                                setCancelTarget(inv);
                                setCancelReason("");
                              }}
                              title="Cancel Invoice"
                              className="rounded-lg p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <Pagination currentPage={page} total={total} pageSize={pageSize} onPageChange={(p) => setPage(p)} />
      </div>

      {/* Receipt Modal */}
      <PharmacyInvoiceModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        invoice={selectedInvoice}
        onCollectPayment={(inv) => {
          setModalOpen(false);
          openPaymentModal(inv);
        }}
      />

      {/* Collect Payment Modal */}
      <Modal
        isOpen={Boolean(payTarget)}
        onClose={() => setPayTarget(null)}
        title={`Collect Payment — ${payTarget?.invoice_number || ""}`}
        size="md"
      >
        <form onSubmit={handleCollectPayment} className="space-y-4 text-sm">
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 flex justify-between items-center text-xs">
            <span className="text-slate-600">Patient: <strong className="text-slate-900">{payTarget?.patient_name}</strong></span>
            <span className="font-mono font-bold text-cyan-800">
              Due: ₹{payTarget ? Math.max(0, Number(payTarget.total_amount) - Number(payTarget.paid_amount ?? 0)).toFixed(2) : "0.00"}
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Amount Received (₹)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold tabular-nums focus:border-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-600/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-600/20"
              >
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Reference / Txn ID</label>
              <input
                type="text"
                placeholder="Optional UPI / card ref"
                value={payRef}
                onChange={(e) => setPayRef(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-600/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
            <input
              type="text"
              placeholder="Optional receipt notes"
              value={payNotes}
              onChange={(e) => setPayNotes(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-600/20"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setPayTarget(null)}
              className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={paying}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 cursor-pointer"
            >
              {paying ? "Recording..." : "Confirm Payment"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Cancel Invoice Modal */}
      <Modal
        isOpen={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        title={`Cancel Invoice — ${cancelTarget?.invoice_number || ""}`}
        size="sm"
      >
        <form onSubmit={handleCancelInvoice} className="space-y-4 text-sm">
          <p className="text-xs text-slate-600">
            Cancelling an invoice marks the billing record cancelled. To restore dispensed batch stock, reverse the dispensing session from the Dispensing Workspace.
          </p>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Cancellation Reason</label>
            <input
              type="text"
              required
              minLength={3}
              placeholder="Reason for cancelling invoice"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setCancelTarget(null)}
              className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={cancelling}
              className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-50 cursor-pointer"
            >
              {cancelling ? "Cancelling..." : "Cancel Invoice"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
