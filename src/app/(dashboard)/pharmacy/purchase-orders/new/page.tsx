"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Trash2,
  ShoppingCart,
  Send,
  Save,
  Calculator,
} from "lucide-react";
import { PharmacyNav } from "@/components/pharmacy/PharmacyNav";
import {
  pharmacyApi,
  PharmacyMedicine,
  PharmacySupplier,
  CreatePurchaseOrderData,
} from "@/services/pharmacyApi";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";

interface POLineItemInput {
  medicine_id: string;
  quantity: number;
  purchase_unit: string;
  unit_price: number;
  discount: number;
  tax_rate: number;
}

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<PharmacySupplier[]>([]);
  const [medicines, setMedicines] = useState<PharmacyMedicine[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [expectedDate, setExpectedDate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<POLineItemInput[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [supRes, medRes] = await Promise.all([
          pharmacyApi.listSuppliers({ is_active: true, page_size: 100 }),
          pharmacyApi.listMedicines({ is_active: true, page_size: 200 }),
        ]);
        setSuppliers(supRes.items);
        setMedicines(medRes.items);

        // Initial empty row
        if (medRes.items.length > 0) {
          const firstMed = medRes.items[0];
          setItems([
            {
              medicine_id: firstMed.id,
              quantity: 10,
              purchase_unit: firstMed.purchase_unit || "Strip",
              unit_price: 100,
              discount: 0,
              tax_rate: Number(firstMed.tax_rate) || 12,
            },
          ]);
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadData();
  }, []);

  const handleAddRow = () => {
    const firstMed = medicines[0];
    setItems([
      ...items,
      {
        medicine_id: firstMed?.id || "",
        quantity: 10,
        purchase_unit: firstMed?.purchase_unit || "Strip",
        unit_price: 100,
        discount: 0,
        tax_rate: Number(firstMed?.tax_rate) || 12,
      },
    ]);
  };

  const handleRemoveRow = (index: number) => {
    if (items.length <= 1) {
      toast.error("A purchase order must have at least one line item");
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof POLineItemInput, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };

    // If changing medicine, auto-fill unit & tax rate
    if (field === "medicine_id") {
      const selectedMed = medicines.find((m) => m.id === value);
      if (selectedMed) {
        updated[index].purchase_unit = selectedMed.purchase_unit || "Strip";
        updated[index].tax_rate = Number(selectedMed.tax_rate) || 12;
      }
    }

    setItems(updated);
  };

  // Financial calculations
  const calculateTotals = () => {
    let subtotal = 0;
    let discountTotal = 0;
    let taxTotal = 0;

    items.forEach((item) => {
      const gross = item.quantity * item.unit_price;
      const net = Math.max(0, gross - item.discount);
      const tax = (net * item.tax_rate) / 100;

      subtotal += net;
      discountTotal += item.discount;
      taxTotal += tax;
    });

    const grandTotal = subtotal + taxTotal;
    return { subtotal, discountTotal, taxTotal, grandTotal };
  };

  const totals = calculateTotals();

  const handleSave = async (autoSubmit: boolean) => {
    if (!selectedSupplierId) {
      toast.error("Please select a supplier");
      return;
    }
    if (items.length === 0) {
      toast.error("Please add at least one medicine");
      return;
    }

    for (const item of items) {
      if (!item.medicine_id) {
        toast.error("Please select a valid medicine for all rows");
        return;
      }
      if (item.quantity <= 0) {
        toast.error("Quantity must be greater than zero");
        return;
      }
      if (item.unit_price < 0) {
        toast.error("Unit price cannot be negative");
        return;
      }
    }

    try {
      setSaving(true);
      const payload: CreatePurchaseOrderData = {
        supplier_id: selectedSupplierId,
        order_date: orderDate,
        expected_date: expectedDate || undefined,
        expected_delivery_date: expectedDate || undefined,
        notes: notes || undefined,
        items: items.map((it) => ({
          medicine_id: it.medicine_id,
          ordered_qty: Number(it.quantity),
          quantity: Number(it.quantity),
          purchase_unit: it.purchase_unit,
          unit_price: Number(it.unit_price) || 0,
          discount: Number(it.discount) || 0,
          tax_rate: Number(it.tax_rate) || 0,
        })),
      };

      const po = await pharmacyApi.createPurchaseOrder(payload);

      if (autoSubmit) {
        await pharmacyApi.submitPurchaseOrder(po.id);
        toast.success(`Purchase order ${po.po_number} created & submitted for approval`);
      } else {
        toast.success(`Purchase order ${po.po_number} saved as draft`);
      }

      router.push("/pharmacy/purchase-orders");
    } catch (err: any) {
      console.error(err);
      toast.error(getErrorMessage(err) || "Failed to create purchase order");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/pharmacy/purchase-orders"
            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50 transition"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Create Purchase Order</h1>
            <p className="text-sm text-slate-500">Draft procurement order for medicines from supplier</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => handleSave(false)}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
          >
            <Save className="h-4 w-4 text-slate-500" />
            Save Draft
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => handleSave(true)}
            className="flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-500 transition cursor-pointer disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            Submit for Approval
          </button>
        </div>
      </div>

      <PharmacyNav />

      {/* PO Header Fields */}
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Supplier */}
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-700">
              Supplier / Vendor <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedSupplierId}
              onChange={(e) => setSelectedSupplierId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-hidden"
            >
              <option value="">-- Select Supplier --</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.supplier_name} ({s.supplier_code}) - Terms: {s.payment_terms_days}d
                </option>
              ))}
            </select>
          </div>

          {/* Order Date */}
          <div>
            <label className="block text-xs font-medium text-slate-700">Order Date</label>
            <input
              type="date"
              value={orderDate}
              onChange={(e) => setOrderDate(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-hidden"
            />
          </div>

          {/* Expected Delivery Date */}
          <div>
            <label className="block text-xs font-medium text-slate-700">Expected Delivery</label>
            <input
              type="date"
              value={expectedDate}
              onChange={(e) => setExpectedDate(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Notes */}
        <div className="mt-4">
          <label className="block text-xs font-medium text-slate-700">Remarks / Instructions</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Please deliver by next Monday; require batches with at least 18 months shelf life"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-hidden"
          />
        </div>
      </div>

      {/* Line Items Table */}
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-900">Purchase Order Line Items</h2>
          <button
            type="button"
            onClick={handleAddRow}
            className="flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-700 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Add Medicine Row
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/75 border-b border-slate-100 text-slate-500 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-2.5 px-3 font-semibold min-w-[240px]">Medicine</th>
                <th className="py-2.5 px-3 font-semibold w-24">Qty</th>
                <th className="py-2.5 px-3 font-semibold w-24">Unit</th>
                <th className="py-2.5 px-3 font-semibold w-28 text-right">Unit Price (₹)</th>
                <th className="py-2.5 px-3 font-semibold w-24 text-right">Disc (₹)</th>
                <th className="py-2.5 px-3 font-semibold w-24 text-right">Tax (%)</th>
                <th className="py-2.5 px-3 font-semibold w-28 text-right">Line Total (₹)</th>
                <th className="py-2.5 px-2 text-center w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((row, idx) => {
                const lineGross = row.quantity * row.unit_price;
                const lineNet = Math.max(0, lineGross - row.discount);
                const lineTax = (lineNet * row.tax_rate) / 100;
                const lineTotal = lineNet + lineTax;

                return (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    {/* Medicine */}
                    <td className="py-2 px-3">
                      <select
                        value={row.medicine_id || ""}
                        onChange={(e) => handleItemChange(idx, "medicine_id", e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs focus:border-sky-500 focus:outline-hidden"
                      >
                        {medicines.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.generic_name || m.brand_name || "General"})
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Qty */}
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        min="1"
                        value={row.quantity ?? ""}
                        onChange={(e) => handleItemChange(idx, "quantity", Number(e.target.value))}
                        className="w-full rounded-xl border border-slate-200 px-2 py-1.5 text-xs focus:border-sky-500 focus:outline-hidden"
                      />
                    </td>

                    {/* Unit */}
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={row.purchase_unit || ""}
                        onChange={(e) => handleItemChange(idx, "purchase_unit", e.target.value)}
                        placeholder="Strip / Box"
                        className="w-full rounded-xl border border-slate-200 px-2 py-1.5 text-xs focus:border-sky-500 focus:outline-hidden"
                      />
                    </td>

                    {/* Unit Price */}
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={row.unit_price ?? ""}
                        onChange={(e) => handleItemChange(idx, "unit_price", Number(e.target.value))}
                        className="w-full rounded-xl border border-slate-200 px-2 py-1.5 text-xs text-right focus:border-sky-500 focus:outline-hidden"
                      />
                    </td>

                    {/* Discount */}
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={row.discount ?? 0}
                        onChange={(e) => handleItemChange(idx, "discount", Number(e.target.value))}
                        className="w-full rounded-xl border border-slate-200 px-2 py-1.5 text-xs text-right focus:border-sky-500 focus:outline-hidden"
                      />
                    </td>

                    {/* Tax Rate */}
                    <td className="py-2 px-3">
                      <select
                        value={row.tax_rate ?? 0}
                        onChange={(e) => handleItemChange(idx, "tax_rate", Number(e.target.value))}
                        className="w-full rounded-xl border border-slate-200 px-2 py-1.5 text-xs text-right focus:border-sky-500 focus:outline-hidden"
                      >
                        <option value={0}>0%</option>
                        <option value={5}>5%</option>
                        <option value={12}>12%</option>
                        <option value={18}>18%</option>
                      </select>
                    </td>

                    {/* Line Total */}
                    <td className="py-2 px-3 text-right font-semibold text-slate-800">
                      ₹{lineTotal.toFixed(2)}
                    </td>

                    {/* Delete Action */}
                    <td className="py-2 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(idx)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Totals Summary */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-6 pt-4 border-t border-slate-100">
          <div className="space-y-1 text-xs text-slate-600 sm:w-64">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="font-medium text-slate-800">₹{totals.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Discount Total:</span>
              <span className="font-medium text-slate-800">₹{totals.discountTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>GST Tax Total:</span>
              <span className="font-medium text-slate-800">₹{totals.taxTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-bold text-slate-900">
              <span>Grand Total:</span>
              <span className="text-sky-600">₹{totals.grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
