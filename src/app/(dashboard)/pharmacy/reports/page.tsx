"use client";

import { useEffect, useState, useCallback } from "react";
import {
  BarChart3,
  Download,
  Filter,
  Boxes,
  Clock,
  ShoppingCart,
  TrendingUp,
  Calendar,
  Loader2,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { PharmacyNav } from "@/components/pharmacy/PharmacyNav";
import {
  pharmacyApi,
  StockValuationItem,
  BatchStockReportItem,
  PurchaseReportItem,
  SalesReportItem,
} from "@/services/pharmacyApi";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";

export default function PharmacyReportsPage() {
  const [activeTab, setActiveTab] = useState<"stock" | "batches" | "purchases" | "sales">("stock");

  // Date Filters
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));

  // Data states
  const [stockReport, setStockReport] = useState<StockValuationItem[]>([]);
  const [batchReport, setBatchReport] = useState<BatchStockReportItem[]>([]);
  const [purchaseReport, setPurchaseReport] = useState<PurchaseReportItem[]>([]);
  const [salesReport, setSalesReport] = useState<SalesReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReportData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      if (activeTab === "stock") {
        const data = await pharmacyApi.getStockReport();
        setStockReport(Array.isArray(data) ? data : (data as any)?.items ?? []);
      } else if (activeTab === "batches") {
        const data = await pharmacyApi.getBatchStockReport();
        setBatchReport(Array.isArray(data) ? data : (data as any)?.items ?? []);
      } else if (activeTab === "purchases") {
        const data = await pharmacyApi.getPurchaseReport({
          start_date: startDate,
          end_date: endDate,
        });
        setPurchaseReport(Array.isArray(data) ? data : (data as any)?.items ?? []);
      } else if (activeTab === "sales") {
        const data = await pharmacyApi.getSalesReport({
          start_date: startDate,
          end_date: endDate,
        });
        setSalesReport(Array.isArray(data) ? data : (data as any)?.items ?? []);
      }
    } catch (err: any) {
      console.error(err);
      const msg = getErrorMessage(err) || "Failed to load report data";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [activeTab, startDate, endDate]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  const handleExportExcel = async () => {
    try {
      setExporting(true);
      const reportTypeMap = {
        stock: "STOCK_VALUATION",
        batches: "BATCH_STOCK",
        purchases: "PURCHASE_REGISTER",
        sales: "SALES_DISPENSING",
      };

      const blob = await pharmacyApi.exportReportExcel({
        report_type: reportTypeMap[activeTab],
        start_date: startDate,
        end_date: endDate,
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pharmacy_${activeTab}_report_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Excel report downloaded successfully");
    } catch (err) {
      toast.error("Failed to export Excel report");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Pharmacy Reports & Analytics</h1>
          <p className="text-sm text-slate-500">
            Stock valuation, expiry schedules, supplier purchase register and prescription sales audits
          </p>
        </div>
        <button
          onClick={handleExportExcel}
          disabled={exporting}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition cursor-pointer disabled:opacity-50"
        >
          <Download className="h-4 w-4 text-emerald-600" />
          {exporting ? "Generating Excel..." : "Export to Excel"}
        </button>
      </div>

      <PharmacyNav />

      {/* Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("stock")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl transition cursor-pointer ${
              activeTab === "stock"
                ? "bg-slate-900 text-white font-semibold shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Boxes className="h-3.5 w-3.5" />
            Stock Valuation
          </button>
          <button
            onClick={() => setActiveTab("batches")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl transition cursor-pointer ${
              activeTab === "batches"
                ? "bg-slate-900 text-white font-semibold shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            Batch Expiry Register
          </button>
          <button
            onClick={() => setActiveTab("purchases")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl transition cursor-pointer ${
              activeTab === "purchases"
                ? "bg-slate-900 text-white font-semibold shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            Purchase Register
          </button>
          <button
            onClick={() => setActiveTab("sales")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl transition cursor-pointer ${
              activeTab === "sales"
                ? "bg-slate-900 text-white font-semibold shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            Sales & Dispensing
          </button>
        </div>

        {/* Date Filters for Purchases & Sales */}
        {(activeTab === "purchases" || activeTab === "sales") && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-lg border border-slate-200 px-2 py-1 text-xs focus:border-sky-500 focus:outline-hidden"
            />
            <span className="text-slate-500">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-lg border border-slate-200 px-2 py-1 text-xs focus:border-sky-500 focus:outline-hidden"
            />
          </div>
        )}
      </div>

      {/* Reports Tables */}
      <div className="rounded-2xl border border-slate-100 bg-white shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-sky-600" />
            <span>Loading report dataset...</span>
          </div>
        ) : error ? (
          <div className="py-16 text-center">
            <div className="flex flex-col items-center justify-center space-y-3">
              <AlertCircle className="h-10 w-10 text-amber-500" />
              <p className="text-sm font-semibold text-slate-800">Failed to load report</p>
              <p className="text-xs text-slate-500 max-w-md">{error}</p>
              <button
                onClick={fetchReportData}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Retry
              </button>
            </div>
          </div>
        ) : activeTab === "stock" ? (
          /* 1. Stock Valuation Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 border-b border-slate-100 text-slate-500 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4 font-semibold">Medicine</th>
                  <th className="py-3 px-4 font-semibold">Category</th>
                  <th className="py-3 px-4 font-semibold text-right">Current Stock</th>
                  <th className="py-3 px-4 font-semibold text-right">Reorder Level</th>
                  <th className="py-3 px-4 font-semibold text-right">Avg Purchase Rate</th>
                  <th className="py-3 px-4 font-semibold text-right">Total Stock Value</th>
                  <th className="py-3 px-4 font-semibold text-center">Active Batches</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stockReport.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Boxes className="h-10 w-10 text-slate-300" />
                        <p className="text-sm font-medium text-slate-700">No active stock in pharmacy inventory</p>
                        <p className="text-xs text-slate-400 max-w-md">
                          Medicines only appear here once stock is added through a confirmed Goods Receipt Note (GRN) or purchase entry for your hospital.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  stockReport.map((m) => (
                    <tr key={m.medicine_id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-4 font-medium text-slate-800">
                        {m.medicine_name || m.name || "Unknown"}{" "}
                        {(m.generic_name || m.brand_name) && (
                          <span className="text-slate-400 font-normal">
                            ({m.generic_name || m.brand_name})
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{m.category || "-"}</td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-900">
                        {Number(m.total_stock ?? m.current_stock ?? 0)}{" "}
                        {m.dispensing_unit || m.primary_dispensing_unit || ""}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-500">
                        {m.reorder_level != null ? Number(m.reorder_level) : "-"}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-700">
                        ₹{(Number(m.average_purchase_rate) || 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-700">
                        ₹{(Number(m.total_stock_value ?? m.stock_value_purchase ?? 0) || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-center font-medium text-slate-600">
                        {m.batches_count ?? m.active_batches_count ?? 0}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : activeTab === "batches" ? (
          /* 2. Batch Expiry Register Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 border-b border-slate-100 text-slate-500 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4 font-semibold">Medicine</th>
                  <th className="py-3 px-4 font-semibold">Batch Number</th>
                  <th className="py-3 px-4 font-semibold">Expiry Date</th>
                  <th className="py-3 px-4 font-semibold text-center">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Available Qty</th>
                  <th className="py-3 px-4 font-semibold text-right">Purchase Rate</th>
                  <th className="py-3 px-4 font-semibold text-right">MRP</th>
                  <th className="py-3 px-4 font-semibold text-right">Valuation (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {batchReport.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Clock className="h-10 w-10 text-slate-300" />
                        <p className="text-sm font-medium text-slate-700">No active batches recorded</p>
                        <p className="text-xs text-slate-400 max-w-md">
                          Batches with available quantities, expiry dates, and rates will be listed here after stock receipts are posted.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  batchReport.map((b) => (
                    <tr key={b.batch_id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-4 font-medium text-slate-800">{b.medicine_name || "Unknown"}</td>
                      <td className="py-3 px-4 font-mono font-medium text-slate-700">{b.batch_number}</td>
                      <td className="py-3 px-4 text-slate-600">{b.expiry_date}</td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold ${
                            String(b.status || "").toUpperCase() === "EXPIRED"
                              ? "bg-rose-100 text-rose-800"
                              : String(b.status || "").toUpperCase() === "NEAR_EXPIRY"
                              ? "bg-orange-100 text-orange-800"
                              : "bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {String(b.status || "NORMAL").toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-900">{Number(b.qty_available || 0)}</td>
                      <td className="py-3 px-4 text-right text-slate-600">₹{(Number(b.purchase_rate) || 0).toFixed(2)}</td>
                      <td className="py-3 px-4 text-right text-slate-600">₹{(Number(b.mrp) || 0).toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-bold text-slate-800">
                        ₹{(Number(b.total_purchase_value ?? b.stock_value ?? 0) || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : activeTab === "purchases" ? (
          /* 3. Purchase Register Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 border-b border-slate-100 text-slate-500 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4 font-semibold">GRN #</th>
                  <th className="py-3 px-4 font-semibold">Date</th>
                  <th className="py-3 px-4 font-semibold">Supplier</th>
                  <th className="py-3 px-4 font-semibold">Medicine</th>
                  <th className="py-3 px-4 font-semibold">Batch</th>
                  <th className="py-3 px-4 font-semibold text-right">Rec Qty</th>
                  <th className="py-3 px-4 font-semibold text-right">Rate (₹)</th>
                  <th className="py-3 px-4 font-semibold text-right">Tax (₹)</th>
                  <th className="py-3 px-4 font-semibold text-right">Total (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {purchaseReport.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      No purchase register records found for the selected period.
                    </td>
                  </tr>
                ) : (
                  purchaseReport.map((p, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60">
                      <td className="py-3 px-4 font-mono font-medium text-slate-900">{p.grn_number}</td>
                      <td className="py-3 px-4 text-slate-600">{p.receipt_date || p.received_date || "-"}</td>
                      <td className="py-3 px-4 text-slate-700 font-medium">{p.supplier_name || "-"}</td>
                      <td className="py-3 px-4 font-medium text-slate-800">{p.medicine_name || "Unknown"}</td>
                      <td className="py-3 px-4 font-mono text-slate-600">{p.batch_number}</td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-900">{Number(p.received_qty || 0)}</td>
                      <td className="py-3 px-4 text-right text-slate-600">₹{(Number(p.purchase_rate) || 0).toFixed(2)}</td>
                      <td className="py-3 px-4 text-right text-slate-600">₹{(Number(p.tax_amount) || 0).toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        ₹{(Number(p.total_amount) || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* 4. Sales & Dispensing Register Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 border-b border-slate-100 text-slate-500 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4 font-semibold">Date & Time</th>
                  <th className="py-3 px-4 font-semibold">Patient</th>
                  <th className="py-3 px-4 font-semibold">Encounter</th>
                  <th className="py-3 px-4 font-semibold">Medicine</th>
                  <th className="py-3 px-4 font-semibold">Batch</th>
                  <th className="py-3 px-4 font-semibold text-right">Qty</th>
                  <th className="py-3 px-4 font-semibold text-right">Unit Price</th>
                  <th className="py-3 px-4 font-semibold text-right">Total (₹)</th>
                  <th className="py-3 px-4 font-semibold">Invoice / Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {salesReport.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      No dispensing sales records found for the selected period.
                    </td>
                  </tr>
                ) : (
                  salesReport.map((s, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60">
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        {s.dispensed_at ? new Date(s.dispensed_at).toLocaleString() : "-"}
                      </td>
                      <td className="py-3 px-4 text-slate-800">
                        <div className="font-semibold">{s.patient_name || "-"}</div>
                        <div className="text-[10px] font-mono text-slate-400">{s.patient_uhid || "-"}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                            s.encounter_type === "IPD"
                              ? "bg-purple-100 text-purple-800"
                              : "bg-sky-100 text-sky-800"
                          }`}
                        >
                          {s.encounter_type || "OPD"}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">{s.medicine_name || "Unknown"}</td>
                      <td className="py-3 px-4 font-mono text-slate-600">{s.batch_number}</td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-900">{Number(s.quantity || 0)}</td>
                      <td className="py-3 px-4 text-right text-slate-600">₹{(Number(s.unit_price) || 0).toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-bold text-sky-700">₹{(Number(s.total_amount) || 0).toFixed(2)}</td>
                      <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                        {s.invoice_number || "IPD Charge"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
