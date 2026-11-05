"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Pill,
  Search,
  Plus,
  Filter,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Boxes,
  Tag,
} from "lucide-react";
import { PharmacyNav } from "@/components/pharmacy/PharmacyNav";
import { MedicineFormModal } from "@/components/pharmacy/MedicineFormModal";
import { Pagination } from "@/components/common/Pagination";
import {
  pharmacyApi,
  PharmacyMedicine,
  CreatePharmacyMedicineData,
  UpdatePharmacyMedicineData,
} from "@/services/pharmacyApi";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";

export default function PharmacyMedicinesPage() {
  const [medicines, setMedicines] = useState<PharmacyMedicine[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSchedule, setSelectedSchedule] = useState("");
  const [activeFilter, setActiveFilter] = useState<boolean | undefined>(true);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<PharmacyMedicine | null>(null);

  const fetchCategories = async () => {
    try {
      const cats = await pharmacyApi.getCategories();
      setCategories(cats);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMedicines = useCallback(async () => {
    try {
      setLoading(true);
      const res = await pharmacyApi.listMedicines({
        search: search || undefined,
        category: selectedCategory || undefined,
        schedule: selectedSchedule || undefined,
        is_active: activeFilter,
        page,
        page_size: pageSize,
      });
      setMedicines(res.items);
      setTotal(res.total);
    } catch (err: any) {
      console.error(err);
      toast.error(getErrorMessage(err) || "Failed to load medicines");
    } finally {
      setLoading(false);
    }
  }, [search, selectedCategory, selectedSchedule, activeFilter, page, pageSize]);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchMedicines();
  }, [fetchMedicines]);

  const handleSaveMedicine = async (data: CreatePharmacyMedicineData | UpdatePharmacyMedicineData) => {
    if (editingMedicine) {
      await pharmacyApi.updateMedicine(editingMedicine.id, data);
      toast.success("Medicine updated successfully");
    } else {
      await pharmacyApi.createMedicine(data as CreatePharmacyMedicineData);
      toast.success("Medicine added to master successfully");
    }
    fetchMedicines();
    fetchCategories();
  };

  const handleDeactivate = async (id: string, currentlyActive: boolean) => {
    const action = currentlyActive ? "deactivate" : "activate";
    if (!confirm(`Are you sure you want to ${action} this medicine?`)) return;
    try {
      if (currentlyActive) {
        await pharmacyApi.deleteMedicine(id);
        toast.success("Medicine deactivated");
      } else {
        await pharmacyApi.updateMedicine(id, { is_active: true });
        toast.success("Medicine activated");
      }
      fetchMedicines();
    } catch (err: any) {
      toast.error(getErrorMessage(err) || `Failed to ${action} medicine`);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Medicine Master</h1>
          <p className="text-sm text-slate-500">
            Comprehensive medicine catalog with dosage forms, salt composition, HSN and GST tax settings
          </p>
        </div>
        <button
          onClick={() => {
            setEditingMedicine(null);
            setModalOpen(true);
          }}
          className="flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-500 transition cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Add Medicine
        </button>
      </div>

      <PharmacyNav />

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by brand, generic, salt, mfg..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-sm focus:border-sky-500 focus:outline-hidden"
            />
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-hidden"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Schedule Filter */}
          <div>
            <select
              value={selectedSchedule}
              onChange={(e) => {
                setSelectedSchedule(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-hidden"
            >
              <option value="">All Schedules</option>
              <option value="H">Schedule H</option>
              <option value="H1">Schedule H1</option>
              <option value="X">Schedule X</option>
              <option value="G">Schedule G</option>
              <option value="OTC">OTC</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={activeFilter === undefined ? "all" : activeFilter ? "active" : "inactive"}
              onChange={(e) => {
                const v = e.target.value;
                setActiveFilter(v === "all" ? undefined : v === "active");
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-hidden"
            >
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
              <option value="all">All Records</option>
            </select>
          </div>
        </div>
      </div>

      {/* Medicines Table */}
      <div className="rounded-2xl border border-slate-100 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/75 border-b border-slate-100 text-slate-500 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4 font-semibold">Medicine / Brand</th>
                <th className="py-3 px-4 font-semibold">Generic & Salt</th>
                <th className="py-3 px-4 font-semibold">Form & Strength</th>
                <th className="py-3 px-4 font-semibold">Schedule</th>
                <th className="py-3 px-4 font-semibold">Units & Conv</th>
                <th className="py-3 px-4 font-semibold text-right">Tax (%)</th>
                <th className="py-3 px-4 font-semibold text-right">Current Stock</th>
                <th className="py-3 px-4 font-semibold text-center">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Loading medicine master...
                  </td>
                </tr>
              ) : medicines.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No medicines match the given criteria.
                  </td>
                </tr>
              ) : (
                medicines.map((m) => {
                  const isLow = Number(m.current_stock) <= Number(m.reorder_level);
                  const isOut = Number(m.current_stock) === 0;

                  return (
                    <tr key={m.id} className="hover:bg-slate-50/60 transition">
                      {/* Name / Brand */}
                      <td className="py-3 px-4 font-medium text-slate-900">
                        <div>{m.name}</div>
                        {m.brand_name && m.brand_name !== m.name && (
                          <div className="text-[11px] text-slate-400 font-normal">Brand: {m.brand_name}</div>
                        )}
                        {m.manufacturer && (
                          <div className="text-[11px] text-slate-400 font-normal">Mfg: {m.manufacturer}</div>
                        )}
                      </td>

                      {/* Generic & Salt */}
                      <td className="py-3 px-4 text-slate-600">
                        <div>{m.generic_name || "-"}</div>
                        {m.salt_composition && (
                          <div className="text-[11px] text-slate-400">{m.salt_composition}</div>
                        )}
                      </td>

                      {/* Form & Strength */}
                      <td className="py-3 px-4 text-slate-700">
                        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                          {m.dosage_form || "Tablet"}
                        </span>
                        {m.strength && <div className="text-[11px] text-slate-400 mt-0.5">{m.strength}</div>}
                      </td>

                      {/* Schedule */}
                      <td className="py-3 px-4">
                        {m.schedule ? (
                          <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 border border-amber-200/60">
                            Sched {m.schedule}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Units */}
                      <td className="py-3 px-4 text-slate-600">
                        <div>Dispense: {m.primary_dispensing_unit}</div>
                        {m.purchase_unit && (
                          <div className="text-[11px] text-slate-400">
                            1 {m.purchase_unit} = {m.unit_conversion} {m.primary_dispensing_unit}
                          </div>
                        )}
                      </td>

                      {/* Tax */}
                      <td className="py-3 px-4 text-right font-medium text-slate-700">
                        {m.tax_rate}%
                      </td>

                      {/* Current Stock */}
                      <td className="py-3 px-4 text-right">
                        <div
                          className={`font-semibold ${
                            isOut
                              ? "text-red-600"
                              : isLow
                              ? "text-amber-600"
                              : "text-emerald-600"
                          }`}
                        >
                          {m.current_stock} {m.primary_dispensing_unit}
                        </div>
                        <div className="text-[11px] text-slate-400">Min: {m.reorder_level}</div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        {m.is_active ? (
                          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                            Inactive
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/pharmacy/inventory?medicine_id=${m.id}`}
                            title="View Batches"
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-sky-600 transition"
                          >
                            <Boxes className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => {
                              setEditingMedicine(m);
                              setModalOpen(true);
                            }}
                            title="Edit Medicine"
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-sky-600 transition cursor-pointer"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeactivate(m.id, m.is_active)}
                            title={m.is_active ? "Deactivate" : "Activate"}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-rose-600 transition cursor-pointer"
                          >
                            {m.is_active ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
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

      {/* Add / Edit Medicine Modal */}
      <MedicineFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveMedicine}
        medicine={editingMedicine}
        categories={categories}
      />
    </div>
  );
}
