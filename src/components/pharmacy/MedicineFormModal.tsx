"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/common/Modal";
import { PharmacyMedicine, CreatePharmacyMedicineData, UpdatePharmacyMedicineData } from "@/services/pharmacyApi";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";

interface MedicineFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreatePharmacyMedicineData | UpdatePharmacyMedicineData) => Promise<void>;
  medicine?: PharmacyMedicine | null;
  categories: string[];
}

const DOSAGE_FORMS = [
  "Tablet",
  "Capsule",
  "Syrup",
  "Injection",
  "Eye Drops",
  "Ear Drops",
  "Ointment",
  "Cream",
  "Inhaler",
  "Suspension",
  "Powder",
  "Infusion",
];

const SCHEDULES = ["H", "H1", "X", "G", "OTC", "Non-Scheduled"];

export function MedicineFormModal({
  isOpen,
  onClose,
  onSave,
  medicine,
  categories,
}: MedicineFormModalProps) {
  const [formData, setFormData] = useState<CreatePharmacyMedicineData>({
    name: "",
    brand_name: "",
    generic_name: "",
    salt_composition: "",
    category: "",
    dosage_form: "Tablet",
    strength: "",
    manufacturer: "",
    hsn_code: "",
    schedule: "H",
    primary_dispensing_unit: "Tablet",
    purchase_unit: "Strip",
    unit_conversion: 10,
    reorder_level: 20,
    max_stock_level: 500,
    barcode: "",
    tax_rate: 12,
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (medicine) {
      setFormData({
        name: medicine.name || "",
        brand_name: medicine.brand_name || "",
        generic_name: medicine.generic_name || "",
        salt_composition: medicine.salt_composition || "",
        category: medicine.category || "",
        dosage_form: medicine.dosage_form || "Tablet",
        strength: medicine.strength || "",
        manufacturer: medicine.manufacturer || "",
        hsn_code: medicine.hsn_code || "",
        schedule: medicine.schedule || "H",
        primary_dispensing_unit: medicine.primary_dispensing_unit || "Tablet",
        purchase_unit: medicine.purchase_unit || "Strip",
        unit_conversion: Number(medicine.unit_conversion) || 1,
        reorder_level: Number(medicine.reorder_level) || 0,
        max_stock_level: medicine.max_stock_level ? Number(medicine.max_stock_level) : undefined,
        barcode: medicine.barcode || "",
        tax_rate: Number(medicine.tax_rate) || 12,
      });
    } else {
      setFormData({
        name: "",
        brand_name: "",
        generic_name: "",
        salt_composition: "",
        category: categories[0] || "Antibiotic",
        dosage_form: "Tablet",
        strength: "",
        manufacturer: "",
        hsn_code: "3004",
        schedule: "H",
        primary_dispensing_unit: "Tablet",
        purchase_unit: "Strip",
        unit_conversion: 10,
        reorder_level: 20,
        max_stock_level: 500,
        barcode: "",
        tax_rate: 12,
      });
    }
  }, [medicine, categories, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Medicine name is required");
      return;
    }
    try {
      setSaving(true);
      await onSave(formData);
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(getErrorMessage(err) || "Failed to save medicine");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={medicine ? "Edit Medicine" : "Add New Medicine"}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Brand / Medicine Name */}
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-700">
              Medicine Name / Brand <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Mox 500 Capsule"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-hidden"
            />
          </div>

          {/* Trade / Brand Name */}
          <div>
            <label className="block text-xs font-medium text-slate-700">Trade / Brand Alias</label>
            <input
              type="text"
              value={formData.brand_name || ""}
              onChange={(e) => setFormData({ ...formData, brand_name: e.target.value })}
              placeholder="e.g. Mox"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-hidden"
            />
          </div>

          {/* Generic Name */}
          <div>
            <label className="block text-xs font-medium text-slate-700">Generic Name</label>
            <input
              type="text"
              value={formData.generic_name || ""}
              onChange={(e) => setFormData({ ...formData, generic_name: e.target.value })}
              placeholder="e.g. Amoxicillin Trihydrate"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-hidden"
            />
          </div>

          {/* Salt / Composition */}
          <div>
            <label className="block text-xs font-medium text-slate-700">Salt / Composition</label>
            <input
              type="text"
              value={formData.salt_composition || ""}
              onChange={(e) => setFormData({ ...formData, salt_composition: e.target.value })}
              placeholder="e.g. Amoxicillin 500mg"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-hidden"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-medium text-slate-700">Category</label>
            <input
              type="text"
              list="category-suggestions"
              value={formData.category || ""}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              placeholder="e.g. Antibiotic"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-hidden"
            />
            <datalist id="category-suggestions">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>

          {/* Dosage Form */}
          <div>
            <label className="block text-xs font-medium text-slate-700">Dosage Form</label>
            <select
              value={formData.dosage_form}
              onChange={(e) => setFormData({ ...formData, dosage_form: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-hidden"
            >
              {DOSAGE_FORMS.map((form) => (
                <option key={form} value={form}>
                  {form}
                </option>
              ))}
            </select>
          </div>

          {/* Strength */}
          <div>
            <label className="block text-xs font-medium text-slate-700">Strength</label>
            <input
              type="text"
              value={formData.strength || ""}
              onChange={(e) => setFormData({ ...formData, strength: e.target.value })}
              placeholder="e.g. 500 mg or 10 mg/ml"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-hidden"
            />
          </div>

          {/* Manufacturer */}
          <div>
            <label className="block text-xs font-medium text-slate-700">Manufacturer</label>
            <input
              type="text"
              value={formData.manufacturer || ""}
              onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
              placeholder="e.g. Sun Pharma, Cipla"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-hidden"
            />
          </div>

          {/* HSN Code */}
          <div>
            <label className="block text-xs font-medium text-slate-700">HSN Code</label>
            <input
              type="text"
              value={formData.hsn_code || ""}
              onChange={(e) => setFormData({ ...formData, hsn_code: e.target.value })}
              placeholder="e.g. 3004"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-hidden"
            />
          </div>

          {/* Schedule */}
          <div>
            <label className="block text-xs font-medium text-slate-700">Schedule Drug</label>
            <select
              value={formData.schedule || "H"}
              onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-hidden"
            >
              {SCHEDULES.map((s) => (
                <option key={s} value={s}>
                  Schedule {s}
                </option>
              ))}
            </select>
          </div>

          {/* GST Tax Rate */}
          <div>
            <label className="block text-xs font-medium text-slate-700">Applicable GST Rate (%)</label>
            <select
              value={formData.tax_rate ?? 12}
              onChange={(e) => setFormData({ ...formData, tax_rate: Number(e.target.value) })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-hidden"
            >
              <option value={0}>0% (Exempt)</option>
              <option value={5}>5% GST</option>
              <option value={12}>12% GST</option>
              <option value={18}>18% GST</option>
            </select>
          </div>

          {/* Primary Dispensing Unit */}
          <div>
            <label className="block text-xs font-medium text-slate-700">
              Primary Dispensing Unit <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.primary_dispensing_unit}
              onChange={(e) => setFormData({ ...formData, primary_dispensing_unit: e.target.value })}
              placeholder="e.g. Tablet, Capsule, ml"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-hidden"
            />
          </div>

          {/* Purchase Unit */}
          <div>
            <label className="block text-xs font-medium text-slate-700">Purchase Unit</label>
            <input
              type="text"
              value={formData.purchase_unit || ""}
              onChange={(e) => setFormData({ ...formData, purchase_unit: e.target.value })}
              placeholder="e.g. Strip, Box, Bottle"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-hidden"
            />
          </div>

          {/* Unit Conversion */}
          <div>
            <label className="block text-xs font-medium text-slate-700">
              Conversion (1 Purchase Unit = X Dispense Units)
            </label>
            <input
              type="number"
              min="1"
              value={formData.unit_conversion ?? 1}
              onChange={(e) => setFormData({ ...formData, unit_conversion: Number(e.target.value) })}
              placeholder="e.g. 10 (1 strip = 10 tablets)"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-hidden"
            />
          </div>

          {/* Reorder Level */}
          <div>
            <label className="block text-xs font-medium text-slate-700">Reorder Level (Min Stock)</label>
            <input
              type="number"
              min="0"
              value={formData.reorder_level ?? 0}
              onChange={(e) => setFormData({ ...formData, reorder_level: Number(e.target.value) })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-hidden"
            />
          </div>

          {/* Max Stock Level */}
          <div>
            <label className="block text-xs font-medium text-slate-700">Max Stock Level (Optional)</label>
            <input
              type="number"
              min="0"
              value={formData.max_stock_level ?? ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  max_stock_level: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-hidden"
            />
          </div>

          {/* Barcode */}
          <div>
            <label className="block text-xs font-medium text-slate-700">Barcode / EAN</label>
            <input
              type="text"
              value={formData.barcode || ""}
              onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
              placeholder="Scan or enter barcode"
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
            {saving ? "Saving..." : medicine ? "Update Medicine" : "Create Medicine"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
