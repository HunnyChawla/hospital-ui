"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Pill,
  AlertTriangle,
  Clock,
  DollarSign,
  TrendingUp,
  ClipboardList,
  ShoppingCart,
  PackageCheck,
  Plus,
  ArrowRight,
  ShieldAlert,
  Boxes,
} from "lucide-react";
import { PharmacyNav } from "@/components/pharmacy/PharmacyNav";
import { pharmacyApi, PharmacyDashboardStats } from "@/services/pharmacyApi";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";

export default function PharmacyDashboardPage() {
  const [stats, setStats] = useState<PharmacyDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const data = await pharmacyApi.getDashboardStats();
      setStats(data);
    } catch (err: any) {
      console.error(err);
      toast.error(getErrorMessage(err) || "Failed to load pharmacy dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Pharmacy Management</h1>
          <p className="text-sm text-slate-500">
            Real-time stock valuation, prescription queue, batch expiry alerts & purchase operations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/pharmacy/dispensing"
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:shadow-md transition cursor-pointer"
          >
            <ClipboardList className="h-4 w-4" />
            Dispense Queue
          </Link>
          <Link
            href="/pharmacy/grn/new"
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 shadow-xs transition cursor-pointer"
          >
            <PackageCheck className="h-4 w-4 text-emerald-600" />
            Direct GRN
          </Link>
        </div>
      </div>

      {/* Pharmacy Navigation Bar */}
      <PharmacyNav />

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Stock Value */}
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Stock Value</span>
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              ₹{loading ? "..." : (stats?.total_stock_value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">At current purchase cost</p>
        </div>

        {/* Today Sales */}
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Today Sales</span>
            <div className="rounded-lg bg-sky-50 p-2 text-sky-600">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              ₹{loading ? "..." : (stats?.today_sales_amount || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">{stats?.today_dispensed_prescriptions || 0} prescriptions dispensed</p>
        </div>

        {/* Pending Dispensing Queue */}
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Pending Prescriptions</span>
            <div className="rounded-lg bg-amber-50 p-2 text-amber-600">
              <ClipboardList className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {loading ? "..." : stats?.pending_prescriptions_count || 0}
            </span>
          </div>
          <Link href="/pharmacy/dispensing" className="mt-1 inline-flex items-center text-xs text-sky-600 hover:underline">
            Open dispensing queue &rarr;
          </Link>
        </div>

        {/* Total Medicines */}
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Active Medicines</span>
            <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
              <Pill className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {loading ? "..." : stats?.total_medicines || 0}
            </span>
          </div>
          <Link href="/pharmacy/medicines" className="mt-1 inline-flex items-center text-xs text-indigo-600 hover:underline">
            View medicine master &rarr;
          </Link>
        </div>

        {/* Low Stock Medicines */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-900">Low Stock Alert</span>
            <div className="rounded-lg bg-amber-100 p-2 text-amber-700">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-900">
              {loading ? "..." : stats?.low_stock_medicines || 0}
            </span>
          </div>
          <p className="mt-1 text-xs text-amber-700">Below reorder minimum</p>
        </div>

        {/* Out of Stock Medicines */}
        <div className="rounded-2xl border border-red-200 bg-red-50/40 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-red-900">Out of Stock</span>
            <div className="rounded-lg bg-red-100 p-2 text-red-700">
              <Boxes className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-red-900">
              {loading ? "..." : stats?.out_of_stock_medicines || 0}
            </span>
          </div>
          <p className="mt-1 text-xs text-red-700">Zero available stock</p>
        </div>

        {/* Near Expiry Batches */}
        <div className="rounded-2xl border border-orange-200 bg-orange-50/40 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-orange-900">Near Expiry</span>
            <div className="rounded-lg bg-orange-100 p-2 text-orange-700">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-orange-900">
              {loading ? "..." : stats?.near_expiry_batches || 0}
            </span>
          </div>
          <p className="mt-1 text-xs text-orange-700">Configured tenant threshold</p>
        </div>

        {/* Expired Batches */}
        <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-rose-900">Expired Batches</span>
            <div className="rounded-lg bg-rose-100 p-2 text-rose-700">
              <ShieldAlert className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-rose-900">
              {loading ? "..." : stats?.expired_batches || 0}
            </span>
          </div>
          <p className="mt-1 text-xs text-rose-700">Blocked from dispensing</p>
        </div>
      </div>

      {/* Two Alert Monitoring Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Low Stock Items Table */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-amber-100 p-1.5 text-amber-700">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <h2 className="font-semibold text-slate-900 text-sm">Low Stock Items</h2>
            </div>
            <Link
              href="/pharmacy/purchase-orders/new"
              className="text-xs font-medium text-sky-600 hover:text-sky-700 flex items-center gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              Create PO
            </Link>
          </div>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400">
                  <th className="pb-2 font-medium">Medicine</th>
                  <th className="pb-2 font-medium text-right">Current Stock</th>
                  <th className="pb-2 font-medium text-right">Reorder Level</th>
                  <th className="pb-2 font-medium text-right">Unit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {stats?.recent_low_stock && stats.recent_low_stock.length > 0 ? (
                  stats.recent_low_stock.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/60">
                      <td className="py-2.5 font-medium text-slate-800">
                        {item.name}
                        {item.brand_name && <span className="text-slate-400 ml-1">({item.brand_name})</span>}
                      </td>
                      <td className="py-2.5 text-right font-semibold text-amber-600">
                        {item.current_stock}
                      </td>
                      <td className="py-2.5 text-right text-slate-500">{item.reorder_level}</td>
                      <td className="py-2.5 text-right text-slate-400">{item.primary_dispensing_unit}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400">
                      All medicines are well-stocked above reorder thresholds
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Near Expiry Batches Table */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-orange-100 p-1.5 text-orange-700">
                <Clock className="h-4 w-4" />
              </div>
              <h2 className="font-semibold text-slate-900 text-sm">Near Expiry Batches</h2>
            </div>
            <Link
              href="/pharmacy/inventory?tab=near_expiry"
              className="text-xs font-medium text-sky-600 hover:text-sky-700 flex items-center gap-1"
            >
              View All
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400">
                  <th className="pb-2 font-medium">Medicine</th>
                  <th className="pb-2 font-medium">Batch</th>
                  <th className="pb-2 font-medium">Expiry</th>
                  <th className="pb-2 font-medium text-right">Available</th>
                  <th className="pb-2 font-medium text-right">Days Left</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {stats?.recent_near_expiry && stats.recent_near_expiry.length > 0 ? (
                  stats.recent_near_expiry.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/60">
                      <td className="py-2.5 font-medium text-slate-800">{b.medicine_name}</td>
                      <td className="py-2.5 font-mono text-slate-600">{b.batch_number}</td>
                      <td className="py-2.5 text-slate-500">{b.expiry_date}</td>
                      <td className="py-2.5 text-right font-medium text-slate-700">{b.qty_available}</td>
                      <td className="py-2.5 text-right">
                        <span className="inline-flex items-center rounded-md bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold text-orange-800">
                          {b.days_to_expiry} days
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">
                      No near-expiry batches detected
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Quick Action Cards */}
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link
            href="/pharmacy/dispensing"
            className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-sky-50/50 hover:border-sky-200 transition group cursor-pointer"
          >
            <div className="rounded-lg bg-sky-100 p-2 text-sky-600 group-hover:bg-sky-500 group-hover:text-white transition">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-medium text-slate-900">Dispense Medicine</div>
              <div className="text-xs text-slate-400">FEFO-suggested batches</div>
            </div>
          </Link>

          <Link
            href="/pharmacy/purchase-orders/new"
            className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-emerald-50/50 hover:border-emerald-200 transition group cursor-pointer"
          >
            <div className="rounded-lg bg-emerald-100 p-2 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-medium text-slate-900">New Purchase Order</div>
              <div className="text-xs text-slate-400">Procure from suppliers</div>
            </div>
          </Link>

          <Link
            href="/pharmacy/grn/new"
            className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-teal-50/50 hover:border-teal-200 transition group cursor-pointer"
          >
            <div className="rounded-lg bg-teal-100 p-2 text-teal-600 group-hover:bg-teal-500 group-hover:text-white transition">
              <PackageCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-medium text-slate-900">Goods Receipt (GRN)</div>
              <div className="text-xs text-slate-400">Receive batches into stock</div>
            </div>
          </Link>

          <Link
            href="/pharmacy/reports"
            className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-purple-50/50 hover:border-purple-200 transition group cursor-pointer"
          >
            <div className="rounded-lg bg-purple-100 p-2 text-purple-600 group-hover:bg-purple-500 group-hover:text-white transition">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-medium text-slate-900">Inventory Valuation</div>
              <div className="text-xs text-slate-400">Reports & Excel export</div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
