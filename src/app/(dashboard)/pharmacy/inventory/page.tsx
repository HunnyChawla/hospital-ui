"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Boxes,
  Search,
  AlertTriangle,
  Clock,
  ShieldAlert,
  SlidersHorizontal,
  History,
  CheckCircle,
  Settings,
  ArrowUpDown,
} from "lucide-react";
import { PharmacyNav } from "@/components/pharmacy/PharmacyNav";
import { StockAdjustmentModal } from "@/components/pharmacy/StockAdjustmentModal";
import { Pagination } from "@/components/common/Pagination";
import {
  pharmacyApi,
  MedicineBatch,
  StockLedgerEntry,
  InventoryAlerts,
} from "@/services/pharmacyApi";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";

function BatchInventoryContent() {
  const searchParams = useSearchParams();
  const medIdParam = searchParams.get("medicine_id");
  const tabParam = searchParams.get("tab");

  const [activeTab, setActiveTab] = useState<"batches" | "near_expiry" | "expired" | "ledger">(
    tabParam === "near_expiry" ? "near_expiry" : "batches"
  );

  const [batches, setBatches] = useState<MedicineBatch[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<StockLedgerEntry[]>([]);
  const [alerts, setAlerts] = useState<InventoryAlerts | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Near Expiry Setting
  const [nearExpiryDays, setNearExpiryDays] = useState(90);
  const [savingThreshold, setSavingThreshold] = useState(false);

  // Stock Adjustment Modal
  const [adjustmentModalOpen, setAdjustmentModalOpen] = useState(false);
  const [selectedBatchForAdjustment, setSelectedBatchForAdjustment] = useState<MedicineBatch | null>(null);

  const loadAlerts = async () => {
    try {
      const data = await pharmacyApi.getInventoryAlerts();
      setAlerts(data);
      setNearExpiryDays(data.near_expiry_threshold_days || 90);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchBatches = useCallback(async () => {
    try {
      setLoading(true);
      const res = await pharmacyApi.listBatches({
        medicine_id: medIdParam || undefined,
        search: search || undefined,
        near_expiry: activeTab === "near_expiry" ? true : undefined,
        is_expired: activeTab === "expired" ? true : undefined,
        page,
        page_size: pageSize,
      });
      setBatches(res.items);
      setTotal(res.total);
    } catch (err: any) {
      console.error(err);
      toast.error(getErrorMessage(err) || "Failed to load inventory batches");
    } finally {
      setLoading(false);
    }
  }, [medIdParam, search, activeTab, page, pageSize]);

  const fetchLedger = useCallback(async () => {
    try {
      setLoading(true);
      const res = await pharmacyApi.getStockLedger({
        medicine_id: medIdParam || undefined,
        page,
        page_size: pageSize,
      });
      setLedgerEntries(res.items);
      setTotal(res.total);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to load stock ledger");
    } finally {
      setLoading(false);
    }
  }, [medIdParam, page, pageSize]);

  useEffect(() => {
    loadAlerts();
  }, []);

  useEffect(() => {
    if (activeTab === "ledger") {
      fetchLedger();
    } else {
      fetchBatches();
    }
  }, [activeTab, fetchBatches, fetchLedger]);

  const handleUpdateThreshold = async () => {
    try {
      setSavingThreshold(true);
      await pharmacyApi.updateNearExpirySettings(nearExpiryDays);
      toast.success(`Near-expiry threshold set to ${nearExpiryDays} days`);
      loadAlerts();
      if (activeTab === "near_expiry") fetchBatches();
    } catch (err: any) {
      toast.error("Failed to update near-expiry threshold");
    } finally {
      setSavingThreshold(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Batch-wise Inventory Management</h1>
          <p className="text-sm text-slate-500">
            Real-time batch stock tracking, FEFO dispatch ordering, expiry monitoring and immutable audit ledger
          </p>
        </div>

        {/* Tenant Configurable Near-Expiry Threshold */}
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-xs text-xs">
          <Settings className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-slate-600 font-medium">Near-Expiry Threshold:</span>
          <input
            type="number"
            min="1"
            max="365"
            value={nearExpiryDays}
            onChange={(e) => setNearExpiryDays(Number(e.target.value))}
            className="w-14 rounded-lg border border-slate-200 px-2 py-0.5 text-center text-xs font-semibold focus:border-sky-500 focus:outline-hidden"
          />
          <span className="text-slate-500">days</span>
          <button
            onClick={handleUpdateThreshold}
            disabled={savingThreshold}
            className="rounded-lg bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700 hover:bg-sky-100 transition cursor-pointer"
          >
            {savingThreshold ? "..." : "Save"}
          </button>
        </div>
      </div>

      <PharmacyNav />

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => {
            setActiveTab("batches");
            setPage(1);
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl transition cursor-pointer ${
            activeTab === "batches"
              ? "bg-slate-900 text-white font-semibold shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Boxes className="h-3.5 w-3.5" />
          All Batches
        </button>

        <button
          onClick={() => {
            setActiveTab("near_expiry");
            setPage(1);
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl transition cursor-pointer ${
            activeTab === "near_expiry"
              ? "bg-orange-500 text-white font-semibold shadow-xs"
              : "text-orange-700 bg-orange-50 hover:bg-orange-100"
          }`}
        >
          <Clock className="h-3.5 w-3.5" />
          Near Expiry ({alerts?.near_expiry?.length || 0})
        </button>

        <button
          onClick={() => {
            setActiveTab("expired");
            setPage(1);
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl transition cursor-pointer ${
            activeTab === "expired"
              ? "bg-rose-600 text-white font-semibold shadow-xs"
              : "text-rose-700 bg-rose-50 hover:bg-rose-100"
          }`}
        >
          <ShieldAlert className="h-3.5 w-3.5" />
          Expired ({alerts?.expired?.length || 0})
        </button>

        <button
          onClick={() => {
            setActiveTab("ledger");
            setPage(1);
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl transition cursor-pointer ${
            activeTab === "ledger"
              ? "bg-slate-900 text-white font-semibold shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <History className="h-3.5 w-3.5" />
          Stock Ledger
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-xs">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by medicine name, batch number or category..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-sm focus:border-sky-500 focus:outline-hidden"
          />
        </div>
      </div>

      {/* Table Content */}
      {activeTab !== "ledger" ? (
        /* Batches Table */
        <div className="rounded-2xl border border-slate-100 bg-white shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 border-b border-slate-100 text-slate-500 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4 font-semibold">Medicine</th>
                  <th className="py-3 px-4 font-semibold">Batch Number</th>
                  <th className="py-3 px-4 font-semibold">Expiry Date</th>
                  <th className="py-3 px-4 font-semibold text-center">Shelf Life Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Purchase Rate</th>
                  <th className="py-3 px-4 font-semibold text-right">MRP</th>
                  <th className="py-3 px-4 font-semibold text-right">Selling Price</th>
                  <th className="py-3 px-4 font-semibold text-right">Available Qty</th>
                  <th className="py-3 px-4 font-semibold text-right">Dispensed</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400">
                      Loading inventory batches...
                    </td>
                  </tr>
                ) : batches.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400">
                      No inventory batches found matching criteria.
                    </td>
                  </tr>
                ) : (
                  batches.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/60 transition">
                      {/* Medicine */}
                      <td className="py-3 px-4 font-medium text-slate-900">
                        <div>{b.medicine_name}</div>
                        {b.category && <div className="text-[11px] text-slate-400">{b.category}</div>}
                      </td>

                      {/* Batch Number */}
                      <td className="py-3 px-4 font-mono font-medium text-slate-700">
                        {b.batch_number}
                      </td>

                      {/* Expiry */}
                      <td className="py-3 px-4 text-slate-600">
                        <div>{b.expiry_date}</div>
                        {b.mfg_date && <div className="text-[10px] text-slate-400">Mfg: {b.mfg_date}</div>}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        {b.is_expired ? (
                          <span className="inline-flex items-center rounded-md bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-800">
                            EXPIRED
                          </span>
                        ) : b.is_near_expiry ? (
                          <span className="inline-flex items-center rounded-md bg-orange-100 px-2 py-0.5 text-[11px] font-semibold text-orange-800">
                            {b.days_to_expiry}d LEFT
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                            {b.days_to_expiry}d left
                          </span>
                        )}
                      </td>

                      {/* Purchase Rate */}
                      <td className="py-3 px-4 text-right text-slate-600">
                        ₹{Number(b.purchase_rate).toFixed(2)}
                      </td>

                      {/* MRP */}
                      <td className="py-3 px-4 text-right text-slate-600">
                        ₹{Number(b.mrp).toFixed(2)}
                      </td>

                      {/* Selling Price */}
                      <td className="py-3 px-4 text-right font-medium text-slate-800">
                        ₹{Number(b.selling_price || b.mrp).toFixed(2)}
                      </td>

                      {/* Available Qty */}
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        <span className={Number(b.qty_available) <= 0 ? "text-slate-400" : "text-emerald-600"}>
                          {b.qty_available}
                        </span>
                      </td>

                      {/* Dispensed */}
                      <td className="py-3 px-4 text-right text-slate-500">
                        {b.qty_dispensed}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedBatchForAdjustment(b);
                            setAdjustmentModalOpen(true);
                          }}
                          className="rounded-lg bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                        >
                          Adjust
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={page}
            total={total}
            pageSize={pageSize}
            onPageChange={(p) => setPage(p)}
          />
        </div>
      ) : (
        /* Stock Ledger Table */
        <div className="rounded-2xl border border-slate-100 bg-white shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 border-b border-slate-100 text-slate-500 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4 font-semibold">Timestamp</th>
                  <th className="py-3 px-4 font-semibold">Medicine</th>
                  <th className="py-3 px-4 font-semibold">Batch</th>
                  <th className="py-3 px-4 font-semibold">Txn Type</th>
                  <th className="py-3 px-4 font-semibold text-right">Qty In (+)</th>
                  <th className="py-3 px-4 font-semibold text-right">Qty Out (-)</th>
                  <th className="py-3 px-4 font-semibold text-right">Balance After</th>
                  <th className="py-3 px-4 font-semibold">Reason / Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      Loading ledger entries...
                    </td>
                  </tr>
                ) : ledgerEntries.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No stock ledger transactions found.
                    </td>
                  </tr>
                ) : (
                  ledgerEntries.map((it) => (
                    <tr key={it.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        {new Date(it.created_at).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">{it.medicine_name}</td>
                      <td className="py-3 px-4 font-mono text-slate-600">{it.batch_number || "-"}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                          {it.txn_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-emerald-600">
                        {Number(it.quantity_in) > 0 ? `+${it.quantity_in}` : "-"}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-rose-600">
                        {Number(it.quantity_out) > 0 ? `-${it.quantity_out}` : "-"}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        {it.balance_after}
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {it.notes || "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={page}
            total={total}
            pageSize={pageSize}
            onPageChange={(p) => setPage(p)}
          />
        </div>
      )}

      {/* Stock Adjustment Modal */}
      <StockAdjustmentModal
        isOpen={adjustmentModalOpen}
        onClose={() => setAdjustmentModalOpen(false)}
        batch={selectedBatchForAdjustment}
        onSuccess={() => {
          if (activeTab === "ledger") fetchLedger();
          else fetchBatches();
          loadAlerts();
        }}
      />
    </div>
  );
}

export default function BatchInventoryPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading inventory...</div>}>
      <BatchInventoryContent />
    </Suspense>
  );
}
