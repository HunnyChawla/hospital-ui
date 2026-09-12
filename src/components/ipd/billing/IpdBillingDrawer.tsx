"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Modal } from "@/components/common/Modal";
import {
  serviceChargesApi,
  IpdBillingAccountResponse,
  ServiceCharge,
  ChargeType,
} from "@/services/serviceChargesApi";
import { formatCurrency, formatDate, formatDateTime } from "@/utils/format";
import { useReactToPrint } from "react-to-print";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { AddChargeModal } from "./AddChargeModal";
import { ReceiveAdvanceModal } from "./ReceiveAdvanceModal";
import { IpdRefundModal } from "./IpdRefundModal";
import { IpdDischargeSettlementModal } from "./IpdDischargeSettlementModal";
import { IpdItemizedBillPrint } from "./IpdItemizedBillPrint";
import { IpdPaymentReceiptPrint } from "./IpdPaymentReceiptPrint";
import {
  Plus,
  Receipt,
  RotateCcw,
  Printer,
  Bed,
  CreditCard,
  FileText,
  Layers,
  Search,
  Filter,
  Trash2,
  Loader2,
  AlertCircle,
  ShieldCheck,
  User,
  Activity,
  Lock,
} from "lucide-react";

interface IpdBillingDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  admissionId: string;
  onAdmissionUpdated?: () => void;
}

export function IpdBillingDrawer({
  isOpen,
  onClose,
  admissionId,
  onAdmissionUpdated,
}: IpdBillingDrawerProps) {
  const [account, setAccount] = useState<IpdBillingAccountResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"charges" | "categories" | "payments" | "tpa">("charges");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  // Sub-modals state
  const [showAddCharge, setShowAddCharge] = useState(false);
  const [showReceiveAdvance, setShowReceiveAdvance] = useState(false);
  const [showRefund, setShowRefund] = useState(false);
  const [showDischargeSettlement, setShowDischargeSettlement] = useState(false);
  const [cancellingChargeId, setCancellingChargeId] = useState<string | null>(null);

  // Print references
  const itemizedBillRef = useRef<HTMLDivElement>(null);
  const receiptPrintRef = useRef<HTMLDivElement>(null);
  const [printPayment, setPrintPayment] = useState<any | null>(null);

  const handlePrintItemizedBill = useReactToPrint({
    contentRef: itemizedBillRef,
    documentTitle: account
      ? `IPD_Bill_${account.admission_number}`
      : "IPD_Billing_Statement",
  });

  const handlePrintReceipt = useReactToPrint({
    contentRef: receiptPrintRef,
    documentTitle: printPayment
      ? `Receipt_${printPayment.payment_number}`
      : "Payment_Receipt",
  });

  const fetchAccount = useCallback(async () => {
    if (!admissionId) return;
    setLoading(true);
    try {
      const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
      const data = await serviceChargesApi.getBillingAccount(admissionId, tenantId || undefined);
      setAccount(data);
    } catch (error) {
      console.error("Failed to load IPD billing account:", error);
      const err = getErrorMessage(error);
      toast.error(err || "Failed to load IPD billing account");
    } finally {
      setLoading(false);
    }
  }, [admissionId]);

  useEffect(() => {
    if (isOpen && admissionId) {
      fetchAccount();
    }
  }, [isOpen, admissionId, fetchAccount]);

  const handleCancelCharge = async (chargeId: string) => {
    if (!confirm("Are you sure you want to cancel this charge?")) return;
    setCancellingChargeId(chargeId);
    try {
      const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
      await serviceChargesApi.cancel(chargeId, tenantId || undefined);
      toast.success("Charge cancelled successfully");
      fetchAccount();
      onAdmissionUpdated?.();
    } catch (error) {
      const err = getErrorMessage(error);
      toast.error(err || "Failed to cancel charge");
    } finally {
      setCancellingChargeId(null);
    }
  };

  const handleAccrueBedCharges = async () => {
    setLoading(true);
    try {
      const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
      const res = await serviceChargesApi.calculateRoomCharges(
        admissionId,
        { apply_to_account: true },
        tenantId || undefined
      );
      if (res.charges_applied.length > 0) {
        toast.success(`Accrued ${res.total_days} days of room charges (${formatCurrency(Number(res.total_room_charges))})`);
      } else {
        toast.info("Bed occupancy room charges already accrued for today.");
      }
      fetchAccount();
      onAdmissionUpdated?.();
    } catch (error) {
      const err = getErrorMessage(error);
      toast.error(err || "Failed to accrue bed charges");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const summary = account?.summary;
  const charges = account?.charges || [];
  const payments = account?.payments || [];
  const refunds = account?.refunds || [];
  const categories = account?.categories || [];
  const isAccountLocked =
    summary?.billing_account_status === "FROZEN_FOR_DISCHARGE" ||
    summary?.billing_account_status === "SETTLED" ||
    account?.admission_status === "DISCHARGED" ||
    account?.admission_status === "discharged" ||
    !!account?.invoice_id;

  const filteredCharges = charges.filter((c) => {
    const matchesCategory = categoryFilter === "ALL" || c.charge_type === categoryFilter;
    const matchesSearch =
      c.service_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.service_category && c.service_category.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="IPD Running Billing Account & Financial Ledger" size="xl">
        <div className="space-y-4 -mx-6 -mb-6 px-6 pb-6 text-xs">
          {loading && !account ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin text-sky-600 mb-2" />
              <p className="font-semibold">Loading IPD billing account...</p>
            </div>
          ) : account ? (
            <>
              {/* Patient Banner */}
              <div className="p-3 bg-slate-900 text-white rounded-xl shadow-md flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400 font-bold text-base">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-white">{account.patient_name || "Patient"}</h2>
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-sky-500/20 text-sky-300 border border-sky-500/30">
                        {account.admission_number}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      {account.patient_uhid ? `UHID: ${account.patient_uhid} • ` : ""}
                      {account.ward_name} (Bed {account.bed_number || "-"}) • Dr. {account.doctor_name || "-"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Status: {account.admission_status}
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Ledger: {summary?.billing_account_status}
                  </span>
                </div>
              </div>

              {/* Running Financial Summary Cards */}
              {summary && (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Gross Charges</p>
                    <p className="text-base font-bold text-slate-900 font-mono mt-0.5">
                      {formatCurrency(Number(summary.gross_charges))}
                    </p>
                    <p className="text-[10px] text-slate-400">{charges.filter((c) => c.status === "ACTIVE").length} billable items</p>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Total Discounts</p>
                    <p className="text-base font-bold text-amber-700 font-mono mt-0.5">
                      {formatCurrency(Number(summary.total_discounts))}
                    </p>
                    <p className="text-[10px] text-slate-400">Net: {formatCurrency(Number(summary.net_charges))}</p>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Advances Paid</p>
                    <p className="text-base font-bold text-emerald-700 font-mono mt-0.5">
                      {formatCurrency(Number(summary.total_paid))}
                    </p>
                    <p className="text-[10px] text-slate-400">{payments.length} deposit(s)</p>
                  </div>

                  <div
                    className={`p-3 rounded-lg border sm:col-span-2 flex flex-col justify-between ${
                      summary.is_refund_due
                        ? "bg-amber-50/80 border-amber-300 text-amber-950"
                        : "bg-sky-50/80 border-sky-300 text-sky-950"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold uppercase tracking-wider">
                        {summary.is_refund_due ? "Excess Advance Available" : "Current Outstanding Due"}
                      </span>
                      {summary.is_refund_due ? (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-amber-200 text-amber-900">
                          Refund Due
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-sky-200 text-sky-900">
                          Balance Due
                        </span>
                      )}
                    </div>
                    <p
                      className={`text-lg font-extrabold font-mono mt-1 ${
                        summary.is_refund_due ? "text-amber-800" : "text-sky-900"
                      }`}
                    >
                      {formatCurrency(
                        summary.is_refund_due
                          ? Number(summary.refund_due_amount)
                          : Number(summary.outstanding_balance)
                      )}
                    </p>
                  </div>
                </div>
              )}

              {/* Locked Account Warning Banner */}
              {isAccountLocked && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-center justify-between gap-3 text-amber-900 shadow-2xs">
                  <div className="flex items-center gap-2.5">
                    <Lock className="h-5 w-5 text-amber-600 shrink-0" />
                    <div>
                      <p className="font-bold text-xs">
                        Billing Account is {summary?.billing_account_status === "SETTLED" ? "SETTLED" : "FROZEN FOR DISCHARGE"}
                      </p>
                      <p className="text-[11px] text-amber-700">
                        {account.invoice_number
                          ? `Final Tax Invoice #${account.invoice_number} has been generated. The charge ledger is locked against modifications.`
                          : "Discharge billing has been initiated and the charge ledger is locked."}
                      </p>
                    </div>
                  </div>
                  {account.invoice_id && (
                    <a
                      href={`/billing`}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs flex items-center gap-1 shadow-sm shrink-0"
                    >
                      <Receipt className="h-3.5 w-3.5" /> View Invoice in Billing
                    </a>
                  )}
                </div>
              )}

              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-slate-100 border border-slate-200 rounded-lg">
                <div className="flex flex-wrap items-center gap-1.5">
                  {!isAccountLocked ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setShowAddCharge(true)}
                        className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add Charge
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowReceiveAdvance(true)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
                      >
                        <CreditCard className="h-3.5 w-3.5" /> Receive Advance
                      </button>

                      <button
                        type="button"
                        onClick={handleAccrueBedCharges}
                        className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-semibold rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Bed className="h-3.5 w-3.5 text-sky-600" /> Accrue Bed Charges
                      </button>

                      {summary?.is_refund_due && (
                        <button
                          type="button"
                          onClick={() => setShowRefund(true)}
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
                        >
                          <RotateCcw className="h-3.5 w-3.5" /> Issue Refund
                        </button>
                      )}
                    </>
                  ) : (
                    <span className="flex items-center gap-1 text-slate-500 font-semibold text-xs px-2 py-1">
                      <Lock className="h-3.5 w-3.5 text-amber-600" /> Ledger Locked
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handlePrintItemizedBill()}
                    className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-semibold rounded-lg flex items-center gap-1 shadow-sm cursor-pointer"
                  >
                    <Printer className="h-3.5 w-3.5 text-slate-600" /> Print Detailed Bill
                  </button>

                  {!isAccountLocked && account.admission_status !== "DISCHARGED" && account.admission_status !== "discharged" && (
                    <button
                      type="button"
                      onClick={() => setShowDischargeSettlement(true)}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-lg flex items-center gap-1 shadow-md transition-colors cursor-pointer"
                    >
                      <Receipt className="h-3.5 w-3.5" /> Pre-Discharge Review
                    </button>
                  )}
                </div>
              </div>

              {/* Tabs Navigation */}
              <div className="flex border-b border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveTab("charges")}
                  className={`px-4 py-2 font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
                    activeTab === "charges"
                      ? "border-sky-600 text-sky-600"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <FileText className="h-3.5 w-3.5" /> Charge Ledger ({charges.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("categories")}
                  className={`px-4 py-2 font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
                    activeTab === "categories"
                      ? "border-sky-600 text-sky-600"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Layers className="h-3.5 w-3.5" /> Department Summary ({categories.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("payments")}
                  className={`px-4 py-2 font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
                    activeTab === "payments"
                      ? "border-sky-600 text-sky-600"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <CreditCard className="h-3.5 w-3.5" /> Advances & Receipts ({payments.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("tpa")}
                  className={`px-4 py-2 font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
                    activeTab === "tpa"
                      ? "border-sky-600 text-sky-600"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <ShieldCheck className="h-3.5 w-3.5" /> Insurance / TPA
                </button>
              </div>

              {/* TAB 1: Charge Ledger */}
              {activeTab === "charges" && (
                <div className="space-y-3">
                  {/* Category Filter Pills & Search */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-1">
                      {[
                        { id: "ALL", label: "All Items" },
                        { id: "ROOM", label: "Room" },
                        { id: "DOCTOR_VISIT", label: "Doctor" },
                        { id: "LAB", label: "Lab" },
                        { id: "PHARMACY", label: "Pharmacy" },
                        { id: "PROCEDURE", label: "Procedure" },
                        { id: "SURGERY", label: "Surgery" },
                        { id: "NURSING", label: "Nursing" },
                        { id: "CONSUMABLE", label: "Consumables" },
                      ].map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setCategoryFilter(cat.id)}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${
                            categoryFilter === cat.id
                              ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                              : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>

                    <div className="relative w-48">
                      <input
                        type="text"
                        placeholder="Search items..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-7 pr-2 py-1 text-xs border border-slate-300 rounded-lg"
                      />
                      <Search className="absolute left-2 top-1.5 h-3.5 w-3.5 text-slate-400" />
                    </div>
                  </div>

                  {/* Charges Table */}
                  <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm max-h-72 overflow-y-auto">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold sticky top-0">
                        <tr>
                          <th className="px-3 py-2 w-24">Date</th>
                          <th className="px-3 py-2">Service / Description</th>
                          <th className="px-2 py-2 text-center w-24">Category</th>
                          <th className="px-2 py-2 text-center w-14">Qty</th>
                          <th className="px-3 py-2 text-right w-20">Rate</th>
                          <th className="px-3 py-2 text-right w-16">Disc</th>
                          <th className="px-3 py-2 text-right w-24">Amount</th>
                          <th className="px-2 py-2 text-center w-12">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredCharges.length > 0 ? (
                          filteredCharges.map((ch) => {
                            const isCancelled = ch.status === "CANCELLED";
                            return (
                              <tr
                                key={ch.charge_id}
                                className={`hover:bg-slate-50/50 transition-colors ${
                                  isCancelled ? "opacity-40 bg-slate-50 line-through" : ""
                                }`}
                              >
                                <td className="px-3 py-2 font-mono text-[10px] text-slate-500">
                                  {formatDate(ch.performed_at)}
                                </td>
                                <td className="px-3 py-2">
                                  <span className="font-semibold text-slate-900">{ch.service_name}</span>
                                  {ch.notes && (
                                    <span className="text-[10px] text-slate-400 block">{ch.notes}</span>
                                  )}
                                </td>
                                <td className="px-2 py-2 text-center">
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-700">
                                    {ch.charge_type}
                                  </span>
                                </td>
                                <td className="px-2 py-2 text-center text-slate-700 font-mono">{ch.quantity}</td>
                                <td className="px-3 py-2 text-right text-slate-600 font-mono">
                                  {formatCurrency(Number(ch.unit_price))}
                                </td>
                                <td className="px-3 py-2 text-right text-slate-500 font-mono">
                                  {Number(ch.discount) > 0 ? formatCurrency(Number(ch.discount)) : "-"}
                                </td>
                                <td className="px-3 py-2 text-right font-bold text-slate-900 font-mono">
                                  {formatCurrency(Number(ch.net_amount))}
                                </td>
                                <td className="px-2 py-2 text-center">
                                  {!isCancelled && !isAccountLocked && (
                                    <button
                                      type="button"
                                      disabled={cancellingChargeId === ch.charge_id}
                                      onClick={() => handleCancelCharge(ch.charge_id)}
                                      className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                      title="Cancel Charge"
                                    >
                                      {cancellingChargeId === ch.charge_id ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin text-rose-600" />
                                      ) : (
                                        <Trash2 className="h-3.5 w-3.5" />
                                      )}
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={8} className="py-8 text-center text-slate-400">
                              No billable charges found matching criteria. Click &ldquo;+ Add Charge&rdquo; to record charges.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 2: Department Summary */}
              {activeTab === "categories" && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {categories.map((cat) => (
                    <div
                      key={cat.charge_type}
                      className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-slate-900">{cat.category_name}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-700">
                            {cat.item_count} items
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 space-y-0.5">
                          <p>Gross: {formatCurrency(Number(cat.gross_amount))}</p>
                          {Number(cat.discount_amount) > 0 && (
                            <p className="text-amber-700">Disc: -{formatCurrency(Number(cat.discount_amount))}</p>
                          )}
                        </div>
                      </div>
                      <div className="pt-2 border-t border-slate-100 mt-2 flex justify-between items-center">
                        <span className="text-[10px] font-semibold text-slate-500">Net Department Total:</span>
                        <span className="font-bold text-sm text-slate-900 font-mono">
                          {formatCurrency(Number(cat.net_amount))}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* TAB 3: Advances & Receipts */}
              {activeTab === "payments" && (
                <div className="space-y-3">
                  <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                        <tr>
                          <th className="px-3 py-2">Receipt #</th>
                          <th className="px-3 py-2">Date</th>
                          <th className="px-3 py-2 text-center">Mode</th>
                          <th className="px-3 py-2">Reference / Notes</th>
                          <th className="px-3 py-2 text-right">Amount</th>
                          <th className="px-3 py-2 text-center w-20">Print</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {payments.length > 0 ? (
                          payments.map((pmt) => (
                            <tr key={pmt.id} className="hover:bg-slate-50/50">
                              <td className="px-3 py-2 font-mono font-bold text-slate-900">
                                {pmt.payment_number}
                              </td>
                              <td className="px-3 py-2 text-slate-600 font-mono text-[10px]">
                                {formatDateTime(pmt.payment_date)}
                              </td>
                              <td className="px-3 py-2 text-center uppercase font-bold text-[10px] text-slate-700">
                                {pmt.payment_method}
                              </td>
                              <td className="px-3 py-2 text-slate-600">
                                {pmt.payment_reference && (
                                  <span className="font-mono text-slate-800 font-medium block">
                                    {pmt.payment_reference}
                                  </span>
                                )}
                                {pmt.notes && <span className="text-[10px] text-slate-400">{pmt.notes}</span>}
                              </td>
                              <td className="px-3 py-2 text-right font-bold text-emerald-700 font-mono">
                                {formatCurrency(Number(pmt.amount))}
                              </td>
                              <td className="px-3 py-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPrintPayment(pmt);
                                    setTimeout(() => handlePrintReceipt(), 100);
                                  }}
                                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold flex items-center gap-1 mx-auto"
                                >
                                  <Printer className="h-3 w-3" /> Slip
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-slate-400">
                              No advance payments recorded yet. Click &ldquo;Receive Advance&rdquo; to collect deposits.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 4: Insurance / TPA */}
              {activeTab === "tpa" && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">Insurance & TPA Cashless Tracking</h3>
                      <p className="text-slate-500 text-[11px]">
                        Track pre-authorization status, approved coverage, and split patient liability.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-2">
                      <p className="font-semibold text-slate-700">Insurance Provider & Policy</p>
                      <p className="font-bold text-slate-900 text-sm">
                        {account.tpa?.tpa_provider || "Self-Pay / Not Registered"}
                      </p>
                      <p className="text-slate-500 font-mono">
                        Policy #: {account.tpa?.tpa_policy_number || "-"}
                      </p>
                      <p className="text-[11px] text-slate-600">
                        Pre-Auth Status:{" "}
                        <span className="font-bold uppercase text-blue-700">
                          {account.tpa?.tpa_pre_auth_status || "NONE"}
                        </span>
                      </p>
                    </div>

                    <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-2">
                      <p className="font-semibold text-slate-700">Payer Split Breakdown</p>
                      <div className="flex justify-between text-slate-700">
                        <span>Insurance Approved:</span>
                        <span className="font-bold font-mono text-blue-700">
                          {formatCurrency(Number(account.tpa?.tpa_approved_amount || 0))}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-700">
                        <span>Patient Liability:</span>
                        <span className="font-bold font-mono text-slate-900">
                          {formatCurrency(Number(summary?.patient_payable || 0))}
                        </span>
                      </div>
                      <div className="flex justify-between text-emerald-700">
                        <span>Patient Paid:</span>
                        <span className="font-bold font-mono">
                          - {formatCurrency(Number(summary?.total_paid || 0))}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      </Modal>

      {/* Sub Modals */}
      {showAddCharge && (
        <AddChargeModal
          isOpen={showAddCharge}
          onClose={() => setShowAddCharge(false)}
          admissionId={admissionId}
          onSuccess={() => {
            fetchAccount();
            onAdmissionUpdated?.();
          }}
        />
      )}

      {showReceiveAdvance && account && (
        <ReceiveAdvanceModal
          isOpen={showReceiveAdvance}
          onClose={() => setShowReceiveAdvance(false)}
          admissionId={admissionId}
          admissionNumber={account.admission_number}
          patientName={account.patient_name}
          patientUhid={account.patient_uhid}
          bedNumber={account.bed_number}
          wardName={account.ward_name}
          outstandingBalance={Number(summary?.outstanding_balance || 0)}
          onSuccess={() => {
            fetchAccount();
            onAdmissionUpdated?.();
          }}
        />
      )}

      {showRefund && account && (
        <IpdRefundModal
          isOpen={showRefund}
          onClose={() => setShowRefund(false)}
          admissionId={admissionId}
          admissionNumber={account.admission_number}
          patientName={account.patient_name}
          patientUhid={account.patient_uhid}
          bedNumber={account.bed_number}
          wardName={account.ward_name}
          excessAdvanceAmount={Number(summary?.refund_due_amount || 0)}
          onSuccess={() => {
            fetchAccount();
            onAdmissionUpdated?.();
          }}
        />
      )}

      {showDischargeSettlement && (
        <IpdDischargeSettlementModal
          isOpen={showDischargeSettlement}
          onClose={() => setShowDischargeSettlement(false)}
          admissionId={admissionId}
          onSuccess={() => {
            fetchAccount();
            onAdmissionUpdated?.();
          }}
        />
      )}

      {/* Hidden printable components */}
      <div className="hidden">
        {account && <IpdItemizedBillPrint ref={itemizedBillRef} account={account} />}
        {printPayment && account && (
          <IpdPaymentReceiptPrint
            ref={receiptPrintRef}
            payment={printPayment}
            patientName={account.patient_name}
            patientUhid={account.patient_uhid}
            admissionNumber={account.admission_number}
            bedNumber={account.bed_number}
            wardName={account.ward_name}
          />
        )}
      </div>
    </>
  );
}
