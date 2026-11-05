"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Truck,
  Search,
  Plus,
  Download,
  Upload,
  Phone,
  Mail,
  Edit2,
  XCircle,
  CheckCircle,
  FileSpreadsheet,
} from "lucide-react";
import { PharmacyNav } from "@/components/pharmacy/PharmacyNav";
import { SupplierFormModal } from "@/components/pharmacy/SupplierFormModal";
import { Pagination } from "@/components/common/Pagination";
import {
  pharmacyApi,
  PharmacySupplier,
  CreateSupplierData,
  UpdateSupplierData,
} from "@/services/pharmacyApi";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";

export default function PharmacySuppliersPage() {
  const [suppliers, setSuppliers] = useState<PharmacySupplier[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<boolean | undefined>(true);
  const [loading, setLoading] = useState(true);

  // Modal & File Upload State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<PharmacySupplier | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await pharmacyApi.listSuppliers({
        search: search || undefined,
        is_active: activeFilter,
        page,
        page_size: pageSize,
      });
      setSuppliers(res.items);
      setTotal(res.total);
    } catch (err: any) {
      console.error(err);
      toast.error(getErrorMessage(err) || "Failed to load suppliers");
    } finally {
      setLoading(false);
    }
  }, [search, activeFilter, page, pageSize]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const handleSaveSupplier = async (data: CreateSupplierData | UpdateSupplierData) => {
    if (editingSupplier) {
      await pharmacyApi.updateSupplier(editingSupplier.id, data);
      toast.success("Supplier updated successfully");
    } else {
      await pharmacyApi.createSupplier(data as CreateSupplierData);
      toast.success("Supplier registered successfully");
    }
    fetchSuppliers();
  };

  const handleDeactivate = async (id: string, currentlyActive: boolean) => {
    const action = currentlyActive ? "deactivate" : "activate";
    if (!confirm(`Are you sure you want to ${action} this supplier?`)) return;
    try {
      if (currentlyActive) {
        await pharmacyApi.deactivateSupplier(id);
        toast.success("Supplier deactivated");
      } else {
        await pharmacyApi.updateSupplier(id, { is_active: true });
        toast.success("Supplier activated");
      }
      fetchSuppliers();
    } catch (err: any) {
      toast.error(getErrorMessage(err) || `Failed to ${action} supplier`);
    }
  };

  const handleExportExcel = async () => {
    try {
      const blob = await pharmacyApi.exportSuppliersExcel();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pharmacy_suppliers_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Suppliers exported successfully");
    } catch (err) {
      toast.error("Failed to export suppliers");
    }
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await pharmacyApi.importSuppliersExcel(file);
      toast.success(res.message || `Imported ${res.imported_count} suppliers`);
      fetchSuppliers();
    } catch (err: any) {
      toast.error(getErrorMessage(err) || "Failed to import suppliers from Excel");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Supplier Management</h1>
          <p className="text-sm text-slate-500">
            Vendor records, drug licenses, GSTIN, payment terms and purchase transaction tracking
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Hidden Excel Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportExcel}
            accept=".xlsx,.xls"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            <Upload className="h-4 w-4 text-slate-500" />
            Import Excel
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            <Download className="h-4 w-4 text-slate-500" />
            Export
          </button>
          <button
            onClick={() => {
              setEditingSupplier(null);
              setModalOpen(true);
            }}
            className="flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-500 transition cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Add Supplier
          </button>
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
              placeholder="Search by supplier name, code, contact or GSTIN..."
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
              value={activeFilter === undefined ? "all" : activeFilter ? "active" : "inactive"}
              onChange={(e) => {
                const v = e.target.value;
                setActiveFilter(v === "all" ? undefined : v === "active");
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-hidden"
            >
              <option value="active">Active Suppliers</option>
              <option value="inactive">Inactive Suppliers</option>
              <option value="all">All Suppliers</option>
            </select>
          </div>
        </div>
      </div>

      {/* Suppliers Table */}
      <div className="rounded-2xl border border-slate-100 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/75 border-b border-slate-100 text-slate-500 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4 font-semibold">Supplier Name & Code</th>
                <th className="py-3 px-4 font-semibold">Contact Details</th>
                <th className="py-3 px-4 font-semibold">Tax & Licences</th>
                <th className="py-3 px-4 font-semibold">Location</th>
                <th className="py-3 px-4 font-semibold text-center">Payment Terms</th>
                <th className="py-3 px-4 font-semibold text-right">Current Balance</th>
                <th className="py-3 px-4 font-semibold text-center">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Loading suppliers...
                  </td>
                </tr>
              ) : suppliers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No suppliers found. Click "Add Supplier" or import from Excel.
                  </td>
                </tr>
              ) : (
                suppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/60 transition">
                    {/* Name & Code */}
                    <td className="py-3 px-4 font-medium text-slate-900">
                      <div>{s.supplier_name}</div>
                      <span className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-600 mt-0.5">
                        {s.supplier_code}
                      </span>
                    </td>

                    {/* Contact */}
                    <td className="py-3 px-4 text-slate-600">
                      {s.contact_person && <div>{s.contact_person}</div>}
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                        {s.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {s.phone}
                          </span>
                        )}
                        {s.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {s.email}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Tax & Licences */}
                    <td className="py-3 px-4 text-slate-600">
                      {s.gstin && <div>GST: <span className="font-mono">{s.gstin}</span></div>}
                      {s.drug_licence_no && (
                        <div className="text-[11px] text-slate-400">DL: {s.drug_licence_no}</div>
                      )}
                    </td>

                    {/* Location */}
                    <td className="py-3 px-4 text-slate-600">
                      <div>{s.city || s.state || "-"}</div>
                      {s.address && <div className="text-[11px] text-slate-400 truncate max-w-xs">{s.address}</div>}
                    </td>

                    {/* Payment Terms */}
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center rounded-md bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700">
                        {s.payment_terms_days} days
                      </span>
                    </td>

                    {/* Current Balance */}
                    <td className="py-3 px-4 text-right font-medium text-slate-800">
                      ₹{Number(s.current_balance || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 text-center">
                      {s.is_active ? (
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
                        <button
                          onClick={() => {
                            setEditingSupplier(s);
                            setModalOpen(true);
                          }}
                          title="Edit Supplier"
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-sky-600 transition cursor-pointer"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeactivate(s.id, s.is_active)}
                          title={s.is_active ? "Deactivate" : "Activate"}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-rose-600 transition cursor-pointer"
                        >
                          {s.is_active ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                        </button>
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

      {/* Supplier Modal */}
      <SupplierFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveSupplier}
        supplier={editingSupplier}
      />
    </div>
  );
}
