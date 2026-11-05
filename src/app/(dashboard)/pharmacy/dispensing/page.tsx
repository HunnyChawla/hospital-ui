"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  ClipboardList,
  Search,
  Filter,
  User,
  ArrowRight,
  CheckCircle2,
  Clock,
  BedDouble,
  Activity,
} from "lucide-react";
import { PharmacyNav } from "@/components/pharmacy/PharmacyNav";
import { Pagination } from "@/components/common/Pagination";
import {
  pharmacyApi,
  PrescriptionQueueItem,
} from "@/services/pharmacyApi";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";

export default function PrescriptionDispensingQueuePage() {
  const [queue, setQueue] = useState<PrescriptionQueueItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [search, setSearch] = useState("");
  const [encounterType, setEncounterType] = useState<"OPD" | "IPD" | "">("");
  const [pharmacyStatus, setPharmacyStatus] = useState<string>("pending");
  const [loading, setLoading] = useState(true);

  const fetchQueue = useCallback(async () => {
    try {
      setLoading(true);
      const res = await pharmacyApi.getDispensingQueue({
        search: search || undefined,
        encounter_type: encounterType || undefined,
        pharmacy_status: pharmacyStatus === "all" ? undefined : pharmacyStatus,
        page,
        page_size: pageSize,
      });
      setQueue(res.items);
      setTotal(res.total);
    } catch (err: any) {
      console.error(err);
      toast.error(getErrorMessage(err) || "Failed to load prescription dispensing queue");
    } finally {
      setLoading(false);
    }
  }, [search, encounterType, pharmacyStatus, page, pageSize]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">Pending</span>;
      case "partially_dispensed":
        return <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">Partially Dispensed</span>;
      case "dispensed":
        return <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">Dispensed</span>;
      default:
        return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">{status}</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Prescription Dispensing Queue</h1>
          <p className="text-sm text-slate-500">
            Real-time outpatient (OPD) and inpatient (IPD) prescriptions awaiting medicine dispensing
          </p>
        </div>
      </div>

      <PharmacyNav />

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by UHID, patient name, phone or prescription #..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-sm focus:border-sky-500 focus:outline-hidden"
            />
          </div>

          {/* Encounter Type */}
          <div>
            <select
              value={encounterType}
              onChange={(e) => {
                setEncounterType(e.target.value as any);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-hidden"
            >
              <option value="">All Encounters (OPD + IPD)</option>
              <option value="OPD">OPD Prescriptions Only</option>
              <option value="IPD">IPD Prescriptions Only</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={pharmacyStatus}
              onChange={(e) => {
                setPharmacyStatus(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-hidden"
            >
              <option value="pending">Pending Dispensing</option>
              <option value="partially_dispensed">Partially Dispensed</option>
              <option value="dispensed">Fully Dispensed</option>
              <option value="all">All Prescriptions</option>
            </select>
          </div>
        </div>
      </div>

      {/* Prescription Queue Table */}
      <div className="rounded-2xl border border-slate-100 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/75 border-b border-slate-100 text-slate-500 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4 font-semibold">Prescription #</th>
                <th className="py-3 px-4 font-semibold">Patient Information</th>
                <th className="py-3 px-4 font-semibold">Encounter</th>
                <th className="py-3 px-4 font-semibold">Doctor</th>
                <th className="py-3 px-4 font-semibold text-center">Items</th>
                <th className="py-3 px-4 font-semibold text-center">Dispensing Status</th>
                <th className="py-3 px-4 font-semibold">Date & Time</th>
                <th className="py-3 px-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Loading prescription queue...
                  </td>
                </tr>
              ) : queue.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No prescriptions in queue matching the filter.
                  </td>
                </tr>
              ) : (
                queue.map((item) => (
                  <tr key={item.prescription_id} className="hover:bg-slate-50/60 transition">
                    {/* Prescription Number */}
                    <td className="py-3 px-4 font-mono font-medium text-slate-900">
                      <div>{item.prescription_number}</div>
                      {item.diagnosis && (
                        <div className="text-[11px] text-slate-400 truncate max-w-xs">{item.diagnosis}</div>
                      )}
                    </td>

                    {/* Patient Information */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{item.patient_name}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span className="font-mono">{item.patient_uhid}</span>
                        {item.patient_mobile && <span>• {item.patient_mobile}</span>}
                      </div>
                    </td>

                    {/* Encounter Badge */}
                    <td className="py-3 px-4">
                      {item.encounter_type === "IPD" ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-[11px] font-semibold text-purple-700 border border-purple-200/60">
                          <BedDouble className="h-3 w-3" />
                          IPD Patient
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700 border border-sky-200/60">
                          <Activity className="h-3 w-3" />
                          OPD Walk-in
                        </span>
                      )}
                    </td>

                    {/* Doctor */}
                    <td className="py-3 px-4 text-slate-700">
                      {item.doctor_name || "Doctor"}
                    </td>

                    {/* Items */}
                    <td className="py-3 px-4 text-center font-medium text-slate-700">
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                        {item.items_count} medicines
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 text-center">
                      {getStatusBadge(item.pharmacy_status)}
                    </td>

                    {/* Date */}
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {new Date(item.prescription_date).toLocaleDateString()}{" "}
                      <span className="text-slate-400">
                        {new Date(item.prescription_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/pharmacy/dispensing/workspace?prescription_id=${item.prescription_id}`}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:shadow-md transition cursor-pointer"
                      >
                        Dispense
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
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
