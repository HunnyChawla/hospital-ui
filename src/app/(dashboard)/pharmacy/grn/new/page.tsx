"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Trash2,
  PackageCheck,
  Save,
  CheckCircle2,
} from "lucide-react";
import { PharmacyNav } from "@/components/pharmacy/PharmacyNav";
import {
  pharmacyApi,
  PharmacyMedicine,
  PharmacySupplier,
  CreateGRNData,
} from "@/services/pharmacyApi";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";

interface GRNLineItemInput {
  medicine_id: string;
  po_item_id?: string;
  batch_number: string;
  mfg_date?: string;
  expiry_date: string;
  received_qty: number;
  free_qty: number;
  purchase_rate: number;
  mrp: number;
  selling_price: number;
  discount: number;
  tax_rate: number;
}

function NewGoodsReceiptNoteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const poIdParam = searchParams.get("po_id");

  const [suppliers, setSuppliers] = useState<PharmacySupplier[]>([]);
  const [medicines, setMedicines] = useState<PharmacyMedicine[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [poId, setPoId] = useState(poIdParam || "");
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().slice(0, 10));
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState("");
  const [supplierInvoiceDate, setSupplierInvoiceDate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<GRNLineItemInput[]>([]);
  const [saving, setSaving] = useState(false);

  // Default expiry date 1 year from now
  const defaultExpiry = () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 2);
    return d.toISOString().slice(0, 10);
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const [supRes, medRes] = await Promise.all([
          pharmacyApi.listSuppliers({ is_active: true, page_size: 100 }),
          pharmacyApi.listMedicines({ is_active: true, page_size: 200 }),
        ]);
        setSuppliers(supRes.items);
        setMedicines(medRes.items);

        // If PO ID provided, load PO details
        if (poIdParam) {
          try {
            const po = await pharmacyApi.getPurchaseOrder(poIdParam);
            setSelectedSupplierId(po.supplier_id);
            setPoId(po.id);

            if (po.items && po.items.length > 0) {
              const poItems: GRNLineItemInput[] = po.items.map((pi: any) => ({
                medicine_id: pi.medicine_id || "",
                po_item_id: pi.id,
                batch_number: `B-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
                mfg_date: new Date().toISOString().slice(0, 10),
                expiry_date: defaultExpiry(),
                received_qty: Number(pi.ordered_qty ?? pi.quantity ?? 1),
                free_qty: 0,
                purchase_rate: Number(pi.unit_price ?? 0),
                mrp: (Number(pi.unit_price) || 0) * 1.5,
                selling_price: (Number(pi.unit_price) || 0) * 1.5,
                discount: Number(pi.discount ?? 0),
                tax_rate: Number(pi.tax_rate ?? 12),
              }));
              setItems(poItems);
              return;
            }
          } catch (poErr) {
            console.error("Failed to load PO details", poErr);
          }
        }

        // Otherwise default empty row
        if (medRes.items.length > 0) {
          const firstMed = medRes.items[0];
          setItems([
            {
              medicine_id: firstMed.id,
              batch_number: `B-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
              mfg_date: new Date().toISOString().slice(0, 10),
              expiry_date: defaultExpiry(),
              received_qty: 50,
              free_qty: 0,
              purchase_rate: 100,
              mrp: 150,
              selling_price: 150,
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
  }, [poIdParam]);

  const handleAddRow = () => {
    const firstMed = medicines[0];
    setItems([
      ...items,
      {
        medicine_id: firstMed?.id || "",
        batch_number: `B-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        mfg_date: new Date().toISOString().slice(0, 10),
        expiry_date: defaultExpiry(),
        received_qty: 50,
        free_qty: 0,
        purchase_rate: 100,
        mrp: 150,
        selling_price: 150,
        discount: 0,
        tax_rate: Number(firstMed?.tax_rate) || 12,
      },
    ]);
  };

  const handleRemoveRow = (index: number) => {
    if (items.length <= 1) {
      toast.error("A Goods Receipt Note must have at least one batch item");
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof GRNLineItemInput, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };

    // Auto calculate selling price when MRP changes if unset
    if (field === "mrp" && (!updated[index].selling_price || updated[index].selling_price === 0)) {
      updated[index].selling_price = Number(value);
    }

    if (field === "medicine_id") {
      const selectedMed = medicines.find((m) => m.id === value);
      if (selectedMed) {
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
      const gross = item.received_qty * item.purchase_rate;
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

  const handleSave = async (autoConfirm: boolean) => {
    if (!selectedSupplierId) {
      toast.error("Please select a supplier");
      return;
    }
    if (items.length === 0) {
      toast.error("Please add at least one medicine batch");
      return;
    }

    const todayStr = new Date().toISOString().slice(0, 10);

    for (const item of items) {
      if (!item.medicine_id) {
        toast.error("Please select a medicine for all rows");
        return;
      }
      if (!item.batch_number?.trim()) {
        toast.error("Batch number is required for all rows");
        return;
      }
      if (!item.expiry_date) {
        toast.error(`Expiry date is required for batch ${item.batch_number}`);
        return;
      }
      if (item.expiry_date <= todayStr) {
        toast.error(`Batch ${item.batch_number} has already expired on ${item.expiry_date}. Cannot receive expired stock into saleable inventory.`);
        return;
      }
      if (item.received_qty <= 0) {
        toast.error(`Received quantity for batch ${item.batch_number} must be > 0`);
        return;
      }
      if (item.mrp < item.purchase_rate) {
        toast.error(`MRP cannot be less than purchase rate for batch ${item.batch_number}`);
        return;
      }
    }

    try {
      setSaving(true);
      const payload: CreateGRNData = {
        supplier_id: selectedSupplierId,
        purchase_order_id: poId || undefined,
        received_date: receivedDate,
        supplier_invoice_no: supplierInvoiceNo || undefined,
        supplier_invoice_date: supplierInvoiceDate || undefined,
        notes: notes || undefined,
        items: items.map((it) => ({
          medicine_id: it.medicine_id,
          po_item_id: it.po_item_id,
          batch_number: it.batch_number,
          mfg_date: it.mfg_date || undefined,
          expiry_date: it.expiry_date,
          received_qty: it.received_qty,
          free_qty: it.free_qty,
          purchase_rate: it.purchase_rate,
          mrp: it.mrp,
          selling_price: it.selling_price || it.mrp,
          discount: it.discount,
          tax_rate: it.tax_rate,
        })),
      };

      const grn = await pharmacyApi.createGRN(payload);

      if (autoConfirm) {
        await pharmacyApi.confirmGRN(grn.id);
        toast.success(`GRN ${grn.grn_number} confirmed! Inventory and stock ledger updated.`);
      } else {
        toast.success(`GRN ${grn.grn_number} saved as draft.`);
      }

      router.push("/pharmacy/grn");
    } catch (err: any) {
      console.error(err);
      toast.error(getErrorMessage(err) || "Failed to create Goods Receipt Note");
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
            href="/pharmacy/grn"
            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50 transition"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Goods Receipt Note (GRN)</h1>
            <p className="text-sm text-slate-500">
              Receive stock batches into inventory against PO or direct supplier invoice
            </p>
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
            className="flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-500 transition cursor-pointer disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4" />
            Confirm & Inward Stock
          </button>
        </div>
      </div>

      <PharmacyNav />

      {/* GRN Header Fields */}
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Supplier */}
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-700">
              Supplier <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedSupplierId}
              onChange={(e) => setSelectedSupplierId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-hidden"
            >
              <option value="">-- Select Supplier --</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.supplier_name} ({s.supplier_code})
                </option>
              ))}
            </select>
            {suppliers.length === 0 && (
              <p className="mt-1 text-xs text-amber-600">
                No active suppliers found.{" "}
                <Link href="/pharmacy/suppliers" className="font-semibold underline hover:text-amber-800">
                  + Add a Supplier first
                </Link>
              </p>
            )}
          </div>

          {/* Received Date */}
          <div>
            <label className="block text-xs font-medium text-slate-700">Received Date</label>
            <input
              type="date"
              value={receivedDate}
              onChange={(e) => setReceivedDate(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-hidden"
            />
          </div>

          {/* Supplier Invoice No */}
          <div>
            <label className="block text-xs font-medium text-slate-700">Supplier Invoice No</label>
            <input
              type="text"
              value={supplierInvoiceNo}
              onChange={(e) => setSupplierInvoiceNo(e.target.value)}
              placeholder="e.g. INV-99882"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-hidden"
            />
          </div>

          {/* Supplier Invoice Date */}
          <div>
            <label className="block text-xs font-medium text-slate-700">Supplier Invoice Date</label>
            <input
              type="date"
              value={supplierInvoiceDate}
              onChange={(e) => setSupplierInvoiceDate(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-hidden"
            />
          </div>

          {/* Notes */}
          <div className="md:col-span-3">
            <label className="block text-xs font-medium text-slate-700">Notes / Remarks</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Goods received in good physical condition with seals intact"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-hidden"
            />
          </div>
        </div>
      </div>

      {/* Batch Items Table */}
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-900">Batch & Inventory Line Items</h2>
          <button
            type="button"
            onClick={handleAddRow}
            className="flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-700 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Add Batch Row
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/75 border-b border-slate-100 text-slate-500 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-2.5 px-3 font-semibold min-w-[200px]">Medicine</th>
                <th className="py-2.5 px-3 font-semibold w-28">Batch No *</th>
                <th className="py-2.5 px-3 font-semibold w-28">Expiry Date *</th>
                <th className="py-2.5 px-3 font-semibold w-20 text-right">Rec Qty *</th>
                <th className="py-2.5 px-3 font-semibold w-16 text-right">Free</th>
                <th className="py-2.5 px-3 font-semibold w-24 text-right">Rate (₹)</th>
                <th className="py-2.5 px-3 font-semibold w-24 text-right">MRP (₹)</th>
                <th className="py-2.5 px-3 font-semibold w-24 text-right">Selling (₹)</th>
                <th className="py-2.5 px-3 font-semibold w-16 text-right">Tax %</th>
                <th className="py-2.5 px-3 font-semibold w-24 text-right">Total (₹)</th>
                <th className="py-2.5 px-2 text-center w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((row, idx) => {
                const lineGross = row.received_qty * row.purchase_rate;
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
                        className="w-full rounded-xl border border-slate-200 px-2 py-1.5 text-xs focus:border-sky-500 focus:outline-hidden"
                      >
                        {medicines.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.generic_name || m.brand_name || "General"})
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Batch Number */}
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        required
                        value={row.batch_number || ""}
                        onChange={(e) => handleItemChange(idx, "batch_number", e.target.value.toUpperCase())}
                        placeholder="Batch #"
                        className="w-full rounded-xl border border-slate-200 px-2 py-1.5 text-xs uppercase font-mono focus:border-sky-500 focus:outline-hidden"
                      />
                    </td>

                    {/* Expiry Date */}
                    <td className="py-2 px-3">
                      <input
                        type="date"
                        required
                        value={row.expiry_date || ""}
                        onChange={(e) => handleItemChange(idx, "expiry_date", e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-2 py-1.5 text-xs focus:border-sky-500 focus:outline-hidden"
                      />
                    </td>

                    {/* Rec Qty */}
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        min="1"
                        value={row.received_qty ?? ""}
                        onChange={(e) => handleItemChange(idx, "received_qty", Number(e.target.value))}
                        className="w-full rounded-xl border border-slate-200 px-2 py-1.5 text-xs text-right focus:border-sky-500 focus:outline-hidden"
                      />
                    </td>

                    {/* Free Qty */}
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        min="0"
                        value={row.free_qty ?? 0}
                        onChange={(e) => handleItemChange(idx, "free_qty", Number(e.target.value))}
                        className="w-full rounded-xl border border-slate-200 px-2 py-1.5 text-xs text-right focus:border-sky-500 focus:outline-hidden"
                      />
                    </td>

                    {/* Purchase Rate */}
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={row.purchase_rate ?? ""}
                        onChange={(e) => handleItemChange(idx, "purchase_rate", Number(e.target.value))}
                        className="w-full rounded-xl border border-slate-200 px-2 py-1.5 text-xs text-right focus:border-sky-500 focus:outline-hidden"
                      />
                    </td>

                    {/* MRP */}
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={row.mrp ?? ""}
                        onChange={(e) => handleItemChange(idx, "mrp", Number(e.target.value))}
                        className="w-full rounded-xl border border-slate-200 px-2 py-1.5 text-xs text-right focus:border-sky-500 focus:outline-hidden"
                      />
                    </td>

                    {/* Selling Price */}
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={row.selling_price ?? ""}
                        onChange={(e) => handleItemChange(idx, "selling_price", Number(e.target.value))}
                        className="w-full rounded-xl border border-slate-200 px-2 py-1.5 text-xs text-right focus:border-sky-500 focus:outline-hidden"
                      />
                    </td>

                    {/* Tax Rate */}
                    <td className="py-2 px-3">
                      <select
                        value={row.tax_rate ?? 0}
                        onChange={(e) => handleItemChange(idx, "tax_rate", Number(e.target.value))}
                        className="w-full rounded-xl border border-slate-200 px-1 py-1.5 text-xs text-right focus:border-sky-500 focus:outline-hidden"
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
              <span>GST Tax Total:</span>
              <span className="font-medium text-slate-800">₹{totals.taxTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-bold text-slate-900">
              <span>Grand Total:</span>
              <span className="text-teal-600">₹{totals.grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NewGoodsReceiptNotePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading GRN form...</div>}>
      <NewGoodsReceiptNoteContent />
    </Suspense>
  );
}
