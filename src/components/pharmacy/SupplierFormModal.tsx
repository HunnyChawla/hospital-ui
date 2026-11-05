"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/common/Modal";
import { PharmacySupplier, CreateSupplierData, UpdateSupplierData } from "@/services/pharmacyApi";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";

interface SupplierFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateSupplierData | UpdateSupplierData) => Promise<void>;
  supplier?: PharmacySupplier | null;
}

export function SupplierFormModal({ isOpen, onClose, onSave, supplier }: SupplierFormModalProps) {
  const [formData, setFormData] = useState<CreateSupplierData>({
    supplier_name: "",
    supplier_code: "",
    contact_person: "",
    phone: "",
    email: "",
    gstin: "",
    drug_licence_no: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    payment_terms_days: 30,
    opening_balance: 0,
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (supplier) {
      setFormData({
        supplier_name: supplier.supplier_name || "",
        supplier_code: supplier.supplier_code || "",
        contact_person: supplier.contact_person || "",
        phone: supplier.phone || "",
        email: supplier.email || "",
        gstin: supplier.gstin || "",
        drug_licence_no: supplier.drug_licence_no || "",
        address: supplier.address || "",
        city: supplier.city || "",
        state: supplier.state || "",
        pincode: supplier.pincode || "",
        payment_terms_days: supplier.payment_terms_days ?? 30,
        opening_balance: Number(supplier.opening_balance) || 0,
      });
    } else {
      setFormData({
        supplier_name: "",
        supplier_code: "",
        contact_person: "",
        phone: "",
        email: "",
        gstin: "",
        drug_licence_no: "",
        address: "",
        city: "",
        state: "",
        pincode: "",
        payment_terms_days: 30,
        opening_balance: 0,
      });
    }
  }, [supplier, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.supplier_name.trim()) {
      toast.error("Supplier name is required");
      return;
    }
    if (!supplier && !formData.supplier_code.trim()) {
      toast.error("Supplier code is required");
      return;
    }
    try {
      setSaving(true);
      await onSave(formData);
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(getErrorMessage(err) || "Failed to save supplier");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={supplier ? "Edit Supplier" : "Add New Supplier"}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Supplier Name */}
          <div>
            <label className="block text-xs font-medium text-slate-700">
              Supplier Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.supplier_name}
              onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
              placeholder="e.g. Medplus Distributors"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-hidden"
            />
          </div>

          {/* Supplier Code */}
          <div>
            <label className="block text-xs font-medium text-slate-700">
              Supplier Code {!supplier && <span className="text-red-500">*</span>}
            </label>
            <input
              type="text"
              required={!supplier}
              disabled={!!supplier}
              value={formData.supplier_code}
              onChange={(e) => setFormData({ ...formData, supplier_code: e.target.value.toUpperCase() })}
              placeholder="e.g. SUP-001"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-hidden disabled:bg-slate-50 uppercase"
            />
          </div>

          {/* Contact Person */}
          <div>
            <label className="block text-xs font-medium text-slate-700">Contact Person</label>
            <input
              type="text"
              value={formData.contact_person || ""}
              onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
              placeholder="e.g. Rajesh Sharma"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-hidden"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-medium text-slate-700">Phone Number</label>
            <input
              type="text"
              value={formData.phone || ""}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="e.g. 9876543210"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-hidden"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-slate-700">Email Address</label>
            <input
              type="email"
              value={formData.email || ""}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="e.g. sales@medplus.com"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-hidden"
            />
          </div>

          {/* GSTIN */}
          <div>
            <label className="block text-xs font-medium text-slate-700">GSTIN Number</label>
            <input
              type="text"
              value={formData.gstin || ""}
              onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
              placeholder="e.g. 07AAAAA0000A1Z5"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-hidden uppercase"
            />
          </div>

          {/* Drug Licence No */}
          <div>
            <label className="block text-xs font-medium text-slate-700">Drug Licence Number</label>
            <input
              type="text"
              value={formData.drug_licence_no || ""}
              onChange={(e) => setFormData({ ...formData, drug_licence_no: e.target.value })}
              placeholder="e.g. DL-20B-12345"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-hidden"
            />
          </div>

          {/* Payment Terms */}
          <div>
            <label className="block text-xs font-medium text-slate-700">Payment Terms (Days)</label>
            <input
              type="number"
              min="0"
              value={formData.payment_terms_days ?? 30}
              onChange={(e) => setFormData({ ...formData, payment_terms_days: Number(e.target.value) })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-hidden"
            />
          </div>

          {!supplier && (
            <div>
              <label className="block text-xs font-medium text-slate-700">Opening Balance (₹)</label>
              <input
                type="number"
                step="0.01"
                value={formData.opening_balance ?? 0}
                onChange={(e) => setFormData({ ...formData, opening_balance: Number(e.target.value) })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-hidden"
              />
            </div>
          )}

          {/* Address */}
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-700">Address</label>
            <textarea
              rows={2}
              value={formData.address || ""}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Shop / Unit address"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-hidden"
            />
          </div>

          {/* City */}
          <div>
            <label className="block text-xs font-medium text-slate-700">City</label>
            <input
              type="text"
              value={formData.city || ""}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              placeholder="e.g. Mumbai"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-hidden"
            />
          </div>

          {/* State */}
          <div>
            <label className="block text-xs font-medium text-slate-700">State</label>
            <input
              type="text"
              value={formData.state || ""}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              placeholder="e.g. Maharashtra"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-500 transition disabled:opacity-50 cursor-pointer"
          >
            {saving ? "Saving..." : supplier ? "Update Supplier" : "Create Supplier"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
