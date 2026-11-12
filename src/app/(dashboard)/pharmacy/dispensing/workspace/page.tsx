"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Receipt,
  Building2,
  Printer,
  RefreshCw,
  Search,
  ExternalLink,
  RotateCcw,
  CreditCard,
  Eye,
  BedDouble,
  FileText,
  Undo2,
} from "lucide-react";
import { PharmacyNav } from "@/components/pharmacy/PharmacyNav";
import { PharmacyInvoiceModal } from "@/components/pharmacy/PharmacyInvoiceModal";
import { Modal } from "@/components/common/Modal";
import {
  pharmacyApi,
  PrescriptionDispenseDetail,
  PrescriptionDispenseMedicineItem,
  PrescriptionSource,
  PharmacyMedicine,
  PharmacyInvoice,
  DispensingResponse,
} from "@/services/pharmacyApi";
import { drugAllergyApi } from "@/services/drugAllergyApi";
import { prescriptionsApi } from "@/services/prescriptionsApi";
import type { DrugAllergyRecord } from "@/types";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";

interface DispenseLineState {
  prescription_item_id: string;
  medicine_id: string | null;
  batch_id: string;
  quantity: number;
  unit_price: number;
  discount: number;
  tax_rate: number;
  override_reason: string;
  is_fefo: boolean;
  fefo_batch_id: string;
}

function DispensingWorkspaceContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const rxId = searchParams.get("rxId");
  const sourceParam = searchParams.get("source") as PrescriptionSource | null;

  const [detail, setDetail] = useState<PrescriptionDispenseDetail | null>(null);
  const [allergies, setAllergies] = useState<DrugAllergyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dispensing, setDispensing] = useState(false);
  const [printingRx, setPrintingRx] = useState(false);

  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState<Record<string, DispenseLineState>>({});

  // Substitute Medicine Modal
  const [subTargetItem, setSubTargetItem] = useState<PrescriptionDispenseMedicineItem | null>(null);
  const [medSearch, setMedSearch] = useState("");
  const [medResults, setMedResults] = useState<PharmacyMedicine[]>([]);
  const [searchingMeds, setSearchingMeds] = useState(false);
  const [subReason, setSubReason] = useState("");
  const [resolvingItem, setResolvingItem] = useState(false);

  // External / Skip Reason Modal
  const [extTarget, setExtTarget] = useState<{
    item: PrescriptionDispenseMedicineItem;
    action: "external" | "skipped";
  } | null>(null);
  const [extReason, setExtReason] = useState("");

  // Reverse Session Modal
  const [reverseTarget, setReverseTarget] = useState<DispensingResponse | null>(null);
  const [reverseReason, setReverseReason] = useState("");
  const [reversing, setReversing] = useState(false);

  // Invoice & Instant Payment Collection after OPD Dispensing
  const [activeInvoice, setActiveInvoice] = useState<PharmacyInvoice | null>(null);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("cash");
  const [payRef, setPayRef] = useState("");
  const [collectingPay, setCollectingPay] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!rxId) return;
    try {
      setLoading(true);
      const res = await pharmacyApi.getPrescriptionDispenseDetail(rxId, sourceParam || undefined);
      setDetail(res);

      // Load clinical allergy warnings non-blockingly
      if (res.patient_id) {
        drugAllergyApi
          .list({ patient_id: res.patient_id, page_size: 50 })
          .then((aRes) => setAllergies(aRes.items || []))
          .catch(() => setAllergies([]));
      }

      const initialLines: Record<string, DispenseLineState> = {};
      for (const m of res.medicines) {
        const effectiveMedId = m.substituted_medicine_id || m.medicine_id;
        const isClosedExternally =
          m.dispense_status === "external" || m.dispense_status === "skipped";
        if (m.remaining_quantity > 0 && !isClosedExternally && effectiveMedId && m.available_batches.length > 0) {
          const fefo = m.fefo_batch || m.available_batches[0];
          const maxCanDispense = Math.min(m.remaining_quantity, fefo.qty_available);
          initialLines[m.prescription_item_id] = {
            prescription_item_id: m.prescription_item_id,
            medicine_id: effectiveMedId,
            batch_id: fefo.id,
            quantity: maxCanDispense,
            unit_price: Number(fefo.selling_price || fefo.mrp || 0),
            discount: 0,
            tax_rate: Number(m.tax_rate ?? 0),
            override_reason: "",
            is_fefo: true,
            fefo_batch_id: fefo.id,
          };
        }
      }
      setLineItems(initialLines);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "Failed to load prescription details");
    } finally {
      setLoading(false);
    }
  }, [rxId, sourceParam]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  useEffect(() => {
    if (!subTargetItem) return;
    let active = true;
    const timer = setTimeout(async () => {
      try {
        setSearchingMeds(true);
        const res = await pharmacyApi.listMedicines({
          search: medSearch.trim() || undefined,
          is_active: true,
          page: 1,
          page_size: 20,
        });
        if (active) setMedResults(res.items);
      } catch {
        if (active) setMedResults([]);
      } finally {
        if (active) setSearchingMeds(false);
      }
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [subTargetItem, medSearch]);

  const handleBatchChange = (med: PrescriptionDispenseMedicineItem, batchId: string) => {
    const selectedBatch = med.available_batches.find((b) => b.id === batchId);
    if (!selectedBatch) return;
    const existing = lineItems[med.prescription_item_id];
    const fefoId = existing?.fefo_batch_id || med.available_batches[0]?.id || "";
    const maxCan = Math.min(med.remaining_quantity, selectedBatch.qty_available);

    setLineItems((prev) => ({
      ...prev,
      [med.prescription_item_id]: {
        prescription_item_id: med.prescription_item_id,
        medicine_id: med.substituted_medicine_id || med.medicine_id,
        batch_id: batchId,
        quantity: maxCan,
        unit_price: Number(selectedBatch.selling_price || selectedBatch.mrp || 0),
        discount: existing?.discount ?? 0,
        tax_rate: Number(med.tax_rate ?? 0),
        override_reason: batchId === fefoId ? "" : existing?.override_reason || "",
        is_fefo: batchId === fefoId,
        fefo_batch_id: fefoId,
      },
    }));
  };

  const handleFieldChange = (
    itemId: string,
    field: "quantity" | "discount" | "override_reason" | "unit_price",
    value: number | string
  ) => {
    setLineItems((prev) => {
      const current = prev[itemId];
      if (!current) return prev;
      return {
        ...prev,
        [itemId]: {
          ...current,
          [field]: value,
        },
      };
    });
  };

  const handleSubstituteSelect = async (catalogMed: PharmacyMedicine) => {
    if (!detail || !subTargetItem) return;
    try {
      setResolvingItem(true);
      await pharmacyApi.resolvePrescriptionItem(detail.prescription_id, subTargetItem.prescription_item_id, {
        source: detail.source || sourceParam || "general",
        action: "substitute",
        substituted_medicine_id: catalogMed.id,
        reason: subReason.trim() || `Mapped to ${catalogMed.name}`,
      });
      toast.success(`Mapped "${subTargetItem.medicine_name}" to "${catalogMed.name}"`);
      setSubTargetItem(null);
      setSubReason("");
      await fetchDetail();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "Failed to substitute medicine");
    } finally {
      setResolvingItem(false);
    }
  };

  const handleExternalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detail || !extTarget) return;
    try {
      setResolvingItem(true);
      await pharmacyApi.resolvePrescriptionItem(detail.prescription_id, extTarget.item.prescription_item_id, {
        source: detail.source || sourceParam || "general",
        action: extTarget.action,
        reason: extReason.trim() || (extTarget.action === "external" ? "Purchased outside" : "Not required"),
      });
      toast.success(
        extTarget.action === "external" ? "Marked as Dispensed Externally" : "Marked as Not Required / Skipped"
      );
      setExtTarget(null);
      setExtReason("");
      await fetchDetail();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "Failed to update item status");
    } finally {
      setResolvingItem(false);
    }
  };

  const handleResetItem = async (item: PrescriptionDispenseMedicineItem) => {
    if (!detail) return;
    try {
      setResolvingItem(true);
      await pharmacyApi.resolvePrescriptionItem(detail.prescription_id, item.prescription_item_id, {
        source: detail.source || sourceParam || "general",
        action: "reset",
      });
      toast.success("Item resolution reset");
      await fetchDetail();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "Failed to reset item");
    } finally {
      setResolvingItem(false);
    }
  };

  const handlePrintPrescription = async () => {
    if (!detail) return;
    if ((detail.source || "general") !== "general") {
      window.print();
      return;
    }
    try {
      setPrintingRx(true);
      const blob = await prescriptionsApi.getPrintPdf(detail.prescription_id);
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener");
      setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "Failed to open prescription PDF");
    } finally {
      setPrintingRx(false);
    }
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let totalTax = 0;
    let totalDiscount = 0;
    let grandTotal = 0;

    Object.values(lineItems).forEach((item) => {
      if (item.quantity > 0 && item.batch_id) {
        const lineGross = item.quantity * item.unit_price;
        const appliedDiscount = Math.min(lineGross, Math.max(0, item.discount || 0));
        const net = Math.max(0, lineGross - appliedDiscount);
        const tax = (net * item.tax_rate) / 100;
        subtotal += net;
        totalDiscount += appliedDiscount;
        totalTax += tax;
        grandTotal += net + tax;
      }
    });

    return { subtotal, totalTax, totalDiscount, grandTotal };
  };

  const handleConfirmDispensing = async () => {
    if (!detail) return;

    const itemsToSubmit = Object.values(lineItems).filter(
      (i) => i.quantity > 0 && i.batch_id && i.medicine_id
    );
    if (itemsToSubmit.length === 0) {
      toast.error("Select at least one in-stock medicine with quantity > 0, or mark items External/Skipped.");
      return;
    }

    for (const item of itemsToSubmit) {
      if (!item.is_fefo && !item.override_reason.trim()) {
        const med = detail.medicines.find((m) => m.prescription_item_id === item.prescription_item_id);
        toast.error(`Provide a FEFO override reason for "${med?.medicine_name || "medicine"}".`);
        return;
      }
    }

    try {
      setDispensing(true);
      const result = await pharmacyApi.confirmDispensing({
        prescription_id: detail.prescription_id,
        prescription_source: detail.source || sourceParam || "general",
        patient_id: detail.patient_id,
        visit_id: detail.visit_id,
        admission_id: detail.admission_id,
        notes: notes.trim() || undefined,
        idempotency_key: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `disp-${Date.now()}`,
        items: itemsToSubmit.map((i) => ({
          prescription_item_id: i.prescription_item_id,
          medicine_id: i.medicine_id as string,
          batch_id: i.batch_id,
          quantity: i.quantity,
          unit_price: i.unit_price,
          discount: i.discount || 0,
          tax_rate: i.tax_rate,
          batch_override_reason: !i.is_fefo ? i.override_reason.trim() : undefined,
        })),
      });

      toast.success(
        detail.encounter_type === "IPD"
          ? "Dispensed successfully & posted to IPD Admission Charges!"
          : `Dispensed successfully! Invoice ${result.invoice_number || ""} created.`
      );

      if (result.invoice_id) {
        try {
          const inv = await pharmacyApi.getInvoice(result.invoice_id);
          setActiveInvoice(inv);
          setPayAmount(Math.max(0, Number(inv.total_amount) - Number(inv.paid_amount ?? 0)).toFixed(2));
          setPayModalOpen(true);
        } catch {
          // Non-blocking
        }
      }

      await fetchDetail();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "Failed to confirm dispensing");
    } finally {
      setDispensing(false);
    }
  };

  const handleQuickPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeInvoice) return;
    const amt = Number(payAmount);
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    try {
      setCollectingPay(true);
      const updated = await pharmacyApi.collectInvoicePayment(activeInvoice.id, {
        amount: amt,
        payment_method: payMethod,
        payment_reference: payRef.trim() || undefined,
      });
      setActiveInvoice(updated);
      setPayModalOpen(false);
      setInvoiceModalOpen(true);
      toast.success(`Payment ₹${amt.toFixed(2)} collected for ${updated.invoice_number}`);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "Payment collection failed");
    } finally {
      setCollectingPay(false);
    }
  };

  const handleReverseSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reverseTarget || reverseReason.trim().length < 3) {
      toast.error("Enter a reversal reason (min 3 characters)");
      return;
    }
    try {
      setReversing(true);
      await pharmacyApi.reverseDispensing(reverseTarget.id, reverseReason.trim());
      toast.success("Dispensing reversed and batch stock restored");
      setReverseTarget(null);
      setReverseReason("");
      await fetchDetail();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "Failed to reverse dispensing");
    } finally {
      setReversing(false);
    }
  };

  const totals = calculateTotals();
  const hasDeliverableItems = Object.values(lineItems).some((i) => i.quantity > 0 && i.batch_id);
  const severeAllergies = allergies.filter((a) => a.severity === "severe");

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/pharmacy/dispensing")}
            aria-label="Back to dispensing queue"
            className="rounded-xl border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 transition cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Dispensing Workspace</h1>
            <p className="text-sm text-slate-600">
              FEFO batch verification, substitution/external handling, and atomic billing
            </p>
          </div>
        </div>

        {detail && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handlePrintPrescription}
              disabled={printingRx}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 transition cursor-pointer disabled:opacity-50"
            >
              <Printer className="h-3.5 w-3.5" />
              {printingRx ? "Opening Rx..." : "Print Prescription"}
            </button>
          </div>
        )}
      </div>

      <PharmacyNav />

      {!rxId ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <p className="text-sm font-medium text-slate-600">No prescription ID selected.</p>
          <button
            type="button"
            onClick={() => router.push("/pharmacy/dispensing")}
            className="mt-3 rounded-xl bg-cyan-700 px-4 py-2 text-xs font-semibold text-white hover:bg-cyan-600 cursor-pointer"
          >
            Go to Dispensing Queue
          </button>
        </div>
      ) : loading || !detail ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500 text-sm">
          Loading prescription details & FEFO stock availability...
        </div>
      ) : (
        <div className="space-y-4">
          {/* Drug Allergy Safety Alert */}
          {allergies.length > 0 && (
            <div
              role="alert"
              className={`rounded-2xl border p-4 flex items-start gap-3 ${
                severeAllergies.length > 0
                  ? "border-rose-300 bg-rose-50 text-rose-950"
                  : "border-amber-300 bg-amber-50 text-amber-950"
              }`}
            >
              <ShieldAlert
                className={`h-5 w-5 shrink-0 mt-0.5 ${
                  severeAllergies.length > 0 ? "text-rose-600" : "text-amber-700"
                }`}
              />
              <div className="text-xs space-y-1">
                <p className="font-bold uppercase tracking-wide">
                  Patient Drug Allergy Alert ({allergies.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {allergies.map((a) => (
                    <span
                      key={a.id}
                      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 font-semibold ${
                        a.severity === "severe"
                          ? "bg-rose-200/80 text-rose-950"
                          : "bg-amber-200/70 text-amber-950"
                      }`}
                    >
                      {a.drug_name}
                      {a.reaction ? ` — ${a.reaction}` : ""} ({a.severity})
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Header Summary Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-mono text-sm font-bold text-slate-900">
                  {detail.prescription_number}
                </span>
                <span
                  className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                    detail.encounter_type === "IPD"
                      ? "bg-indigo-100 text-indigo-800"
                      : "bg-cyan-100 text-cyan-800"
                  }`}
                >
                  {detail.encounter_type}
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                  {detail.source === "optometry" ? (
                    <>
                      <Eye className="h-3 w-3" /> Eye / Optometry
                    </>
                  ) : detail.source === "ipd" ? (
                    <>
                      <BedDouble className="h-3 w-3" /> IPD Order
                    </>
                  ) : (
                    <>
                      <FileText className="h-3 w-3" /> Clinic Rx
                    </>
                  )}
                </span>
              </div>
              <p className="text-slate-600 tabular-nums">
                Date:{" "}
                {new Date(detail.prescription_date).toLocaleString("en-IN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
              {(detail.admission_number || detail.ward_bed) && (
                <p className="text-indigo-700 font-semibold">
                  {detail.admission_number ? `#${detail.admission_number}` : ""}
                  {detail.admission_number && detail.ward_bed ? " · " : ""}
                  {detail.ward_bed || ""}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <span className="text-slate-500 text-[11px] font-semibold uppercase tracking-wide block">
                Patient
              </span>
              <span className="font-bold text-slate-900 text-sm block">{detail.patient_name}</span>
              <span className="text-slate-600 block">
                <span className="font-mono font-semibold">{detail.patient_uhid}</span>
                {detail.patient_age != null ? ` · ${detail.patient_age}y` : ""}
                {detail.patient_gender ? ` · ${detail.patient_gender}` : ""}
                {detail.patient_phone ? ` · ${detail.patient_phone}` : ""}
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-slate-500 text-[11px] font-semibold uppercase tracking-wide block">
                Prescriber & Diagnosis
              </span>
              <span className="font-semibold text-slate-900 block">
                {detail.doctor_name
                  ? detail.doctor_name.startsWith("Dr.")
                    ? detail.doctor_name
                    : `Dr. ${detail.doctor_name}`
                  : "Unassigned"}
              </span>
              <span className="text-slate-600 block">{detail.diagnosis || "No recorded diagnosis"}</span>
              {detail.notes && <span className="text-slate-500 italic block">Note: {detail.notes}</span>}
            </div>

            <div className="space-y-1.5 sm:text-right">
              <span className="text-slate-500 text-[11px] font-semibold uppercase tracking-wide block">
                Dispensing Status
              </span>
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase ${
                  detail.pharmacy_status === "dispensed"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : detail.pharmacy_status === "partially_dispensed"
                      ? "bg-cyan-50 text-cyan-800 border border-cyan-200"
                      : "bg-amber-50 text-amber-800 border border-amber-200"
                }`}
              >
                {detail.pharmacy_status.replace(/_/g, " ")}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Medicines Dispensing Table */}
            <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900">
                  Prescribed Medicines ({detail.medicines.length})
                </h2>
                <span className="text-[11px] font-medium text-slate-500">
                  FEFO batch suggested · catalog GST applied
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Medicine & Instructions</th>
                      <th className="py-2.5 px-3 text-center">Qty (Presc/Disp)</th>
                      <th className="py-2.5 px-3">Batch (FEFO)</th>
                      <th className="py-2.5 px-3 text-right">Dispense Qty</th>
                      <th className="py-2.5 px-3 text-right">Rate / Disc / GST</th>
                      <th className="py-2.5 px-3 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {detail.medicines.map((med) => {
                      const line = lineItems[med.prescription_item_id];
                      const effectiveMedId = med.substituted_medicine_id || med.medicine_id;
                      const isExternalOrSkipped =
                        med.dispense_status === "external" || med.dispense_status === "skipped";
                      const isDone = med.remaining_quantity === 0 || isExternalOrSkipped;
                      const outOfStock = !effectiveMedId || med.available_batches.length === 0;
                      const selectedBatch = line
                        ? med.available_batches.find((b) => b.id === line.batch_id)
                        : undefined;
                      const maxSelectable = selectedBatch
                        ? Math.min(med.remaining_quantity, selectedBatch.qty_available)
                        : med.remaining_quantity;
                      const lineNet = line
                        ? Math.max(0, line.quantity * line.unit_price - (line.discount || 0))
                        : 0;
                      const lineTax = line ? (lineNet * line.tax_rate) / 100 : 0;
                      const lineTotal = lineNet + lineTax;

                      return (
                        <tr key={med.prescription_item_id} className={isDone ? "bg-slate-50/60" : "hover:bg-slate-50/40"}>
                          {/* Medicine & Clinical Instructions */}
                          <td className="py-3 px-3 align-top max-w-[260px]">
                            <div className="font-bold text-slate-900">{med.medicine_name}</div>
                            {med.substituted_medicine_name && (
                              <div className="mt-0.5 inline-flex items-center gap-1 rounded-md bg-cyan-50 px-2 py-0.5 text-[11px] font-semibold text-cyan-800 border border-cyan-200">
                                <RefreshCw className="h-3 w-3" />
                                Sub: {med.substituted_medicine_name}
                              </div>
                            )}
                            <div className="text-[11px] text-slate-600 mt-0.5 space-x-1.5">
                              {med.generic_name && <span>{med.generic_name}</span>}
                              {med.strength && <span>· {med.strength}</span>}
                              {med.form && <span>· {med.form}</span>}
                              {med.applicable_eye && (
                                <span className="inline-flex rounded bg-violet-100 px-1.5 py-0.2 font-semibold text-violet-800">
                                  Eye: {med.applicable_eye}
                                </span>
                              )}
                              {med.schedule && (
                                <span className="inline-flex rounded bg-amber-100 px-1.5 py-0.2 font-semibold text-amber-900">
                                  Sch {med.schedule}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-700 mt-1">
                              {[med.dosage, med.frequency, med.timing, med.duration]
                                .filter(Boolean)
                                .join(" · ") || "As directed"}
                              {med.prescribed_quantity_text && (
                                <span className="ml-1.5 font-semibold text-slate-800">
                                  ({med.prescribed_quantity_text})
                                </span>
                              )}
                            </div>
                            {med.is_prn && (
                              <span className="mt-1 inline-flex rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                                PRN / SOS{med.prn_reason ? `: ${med.prn_reason}` : ""}
                              </span>
                            )}
                            {(med.instructions || med.special_instructions) && (
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                {med.instructions || med.special_instructions}
                              </div>
                            )}
                            {med.external_reason && (
                              <div className="text-[11px] text-slate-500 italic mt-0.5">
                                Reason: {med.external_reason}
                              </div>
                            )}

                            {/* Substitute / External / Reset controls */}
                            {!isDone && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSubTargetItem(med);
                                    setMedSearch(med.generic_name || med.medicine_name.split(" ")[0] || "");
                                    setSubReason("");
                                  }}
                                  className="inline-flex items-center gap-1 rounded-lg border border-cyan-200 bg-cyan-50 px-2 py-1 text-[11px] font-semibold text-cyan-800 hover:bg-cyan-100 transition cursor-pointer"
                                >
                                  <RefreshCw className="h-3 w-3" />
                                  {med.substituted_medicine_id ? "Change Sub" : "Map / Substitute"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setExtTarget({ item: med, action: "external" });
                                    setExtReason(outOfStock ? "Out of stock / purchase externally" : "Patient buying outside");
                                  }}
                                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  External
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setExtTarget({ item: med, action: "skipped" });
                                    setExtReason("Not required by patient");
                                  }}
                                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                                >
                                  Skip
                                </button>
                              </div>
                            )}
                            {isExternalOrSkipped && (
                              <button
                                type="button"
                                disabled={resolvingItem}
                                onClick={() => handleResetItem(med)}
                                className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-700 hover:underline cursor-pointer"
                              >
                                <RotateCcw className="h-3 w-3" />
                                Reopen Item
                              </button>
                            )}
                          </td>

                          {/* Prescribed / Dispensed */}
                          <td className="py-3 px-3 align-top text-center font-mono tabular-nums whitespace-nowrap">
                            <span className="font-bold text-slate-900">{med.prescribed_quantity}</span>
                            {" / "}
                            <span className="text-emerald-700 font-semibold">{med.dispensed_quantity}</span>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              {isExternalOrSkipped ? (
                                <span className="uppercase font-bold text-slate-600">
                                  {med.dispense_status}
                                </span>
                              ) : (
                                `Rem: ${med.remaining_quantity}`
                              )}
                            </div>
                          </td>

                          {/* Batch Selection */}
                          <td className="py-3 px-3 align-top min-w-[205px]">
                            {isExternalOrSkipped ? (
                              <span className="inline-flex rounded-full bg-slate-200 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700 uppercase">
                                {med.dispense_status === "external" ? "Dispensed Externally" : "Skipped"}
                              </span>
                            ) : med.remaining_quantity === 0 ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="h-3 w-3" /> Fully Dispensed
                              </span>
                            ) : outOfStock ? (
                              <span className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-800 border border-rose-200">
                                <AlertTriangle className="h-3 w-3 shrink-0" />
                                {!effectiveMedId ? "Unlinked — Map Catalog Medicine" : "Out of Stock"}
                              </span>
                            ) : (
                              <div className="space-y-1.5">
                                <select
                                  aria-label={`Select batch for ${med.medicine_name}`}
                                  value={line?.batch_id || ""}
                                  onChange={(e) => handleBatchChange(med, e.target.value)}
                                  className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs text-slate-900 focus:border-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-600/20"
                                >
                                  {med.available_batches.map((b, bIdx) => (
                                    <option key={b.id} value={b.id}>
                                      {b.batch_number} {bIdx === 0 ? "(FEFO)" : ""} · Exp: {b.expiry_date} · Qty: {b.qty_available}
                                    </option>
                                  ))}
                                </select>
                                {line && !line.is_fefo && (
                                  <input
                                    type="text"
                                    placeholder="FEFO override reason (required)"
                                    value={line.override_reason}
                                    onChange={(e) =>
                                      handleFieldChange(med.prescription_item_id, "override_reason", e.target.value)
                                    }
                                    className="w-full rounded-lg border border-amber-300 bg-amber-50 px-2 py-1 text-[11px] text-amber-950 focus:border-amber-500 focus:outline-none"
                                  />
                                )}
                              </div>
                            )}
                          </td>

                          {/* Dispense Qty */}
                          <td className="py-3 px-3 align-top text-right">
                            {!isDone && !outOfStock && line ? (
                              <input
                                type="number"
                                step="any"
                                min="0"
                                max={maxSelectable}
                                aria-label={`Quantity to dispense for ${med.medicine_name}`}
                                value={line.quantity}
                                onChange={(e) => {
                                  const raw = Number(e.target.value);
                                  const clamped = Number.isFinite(raw)
                                    ? Math.min(maxSelectable, Math.max(0, raw))
                                    : 0;
                                  handleFieldChange(med.prescription_item_id, "quantity", clamped);
                                }}
                                className="w-20 rounded-lg border border-slate-300 px-2 py-1.5 text-right text-xs font-bold tabular-nums focus:border-cyan-600 focus:outline-none"
                              />
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>

                          {/* Rate / Discount / GST */}
                          <td className="py-3 px-3 align-top text-right tabular-nums whitespace-nowrap">
                            {!isDone && !outOfStock && line ? (
                              <div className="space-y-1">
                                <div className="font-semibold text-slate-800">
                                  ₹{line.unit_price.toFixed(2)}
                                </div>
                                <div className="flex items-center justify-end gap-1 text-[10px] text-slate-500">
                                  <span>Disc ₹</span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    aria-label={`Discount for ${med.medicine_name}`}
                                    value={line.discount}
                                    onChange={(e) =>
                                      handleFieldChange(
                                        med.prescription_item_id,
                                        "discount",
                                        Math.max(0, Number(e.target.value) || 0)
                                      )
                                    }
                                    className="w-14 rounded border border-slate-300 px-1 py-0.5 text-right text-[11px]"
                                  />
                                </div>
                                <div className="text-[10px] text-slate-500">GST {line.tax_rate.toFixed(1)}%</div>
                              </div>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>

                          {/* Line Total */}
                          <td className="py-3 px-3 align-top text-right font-bold text-slate-900 tabular-nums whitespace-nowrap">
                            {!isDone && !outOfStock && line && line.quantity > 0 ? (
                              `₹${lineTotal.toFixed(2)}`
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Summary & Confirm Panel */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between space-y-5">
              <div className="space-y-4">
                <h2 className="text-base font-bold text-slate-900">Summary & Checkout</h2>

                {/* Encounter Billing Indicator */}
                <div
                  className={`rounded-xl p-3 flex items-start gap-2.5 text-xs ${
                    detail.encounter_type === "IPD"
                      ? "bg-indigo-50 border border-indigo-200 text-indigo-900"
                      : "bg-cyan-50 border border-cyan-200 text-cyan-900"
                  }`}
                >
                  {detail.encounter_type === "IPD" ? (
                    <Building2 className="h-4 w-4 shrink-0 mt-0.5 text-indigo-700" />
                  ) : (
                    <Receipt className="h-4 w-4 shrink-0 mt-0.5 text-cyan-700" />
                  )}
                  <div>
                    <p className="font-bold">
                      {detail.encounter_type === "IPD"
                        ? "IPD Admission Charge Posting"
                        : "OPD Retail Pharmacy Billing"}
                    </p>
                    <p className="text-[11px] opacity-90 mt-0.5">
                      {detail.encounter_type === "IPD"
                        ? "Charges post directly to the patient's running inpatient admission ledger."
                        : "Generates a Pharmacy Invoice with immediate payment collection option."}
                    </p>
                  </div>
                </div>

                {/* Price Totals */}
                <div className="space-y-2 border-t border-b border-slate-100 py-3 text-xs tabular-nums">
                  <div className="flex justify-between text-slate-600">
                    <span>Taxable Subtotal</span>
                    <span className="font-semibold text-slate-900">₹{totals.subtotal.toFixed(2)}</span>
                  </div>
                  {totals.totalDiscount > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Discount Applied</span>
                      <span className="font-semibold">-₹{totals.totalDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600">
                    <span>Total GST Tax</span>
                    <span className="font-semibold text-slate-900">₹{totals.totalTax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-slate-900 pt-1">
                    <span>Grand Payable</span>
                    <span className="text-cyan-800">₹{totals.grandTotal.toFixed(2)}</span>
                  </div>
                </div>

                <div>
                  <label htmlFor="dispense-notes" className="block text-xs font-semibold text-slate-700 mb-1">
                    Dispensing Remarks
                  </label>
                  <textarea
                    id="dispense-notes"
                    rows={2}
                    placeholder="Counseling notes, storage advice, or remarks..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-600/20"
                  />
                </div>
              </div>

              <button
                type="button"
                disabled={dispensing || !hasDeliverableItems}
                onClick={handleConfirmDispensing}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-xs hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
              >
                <CheckCircle2 className="h-4 w-4" />
                {dispensing ? "Processing Dispensing..." : "Confirm & Dispense"}
              </button>
            </div>
          </div>

          {/* Past Dispensing Sessions */}
          {detail.past_dispensings && detail.past_dispensings.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900">
                Past Dispensing Sessions ({detail.past_dispensings.length})
              </h3>
              <div className="divide-y divide-slate-100">
                {detail.past_dispensings.map((session) => (
                  <div
                    key={session.id}
                    className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-bold text-slate-800">
                          {new Date(session.dispensed_at).toLocaleString("en-IN", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                            session.status === "reversed"
                              ? "bg-rose-50 text-rose-800 border border-rose-200"
                              : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          }`}
                        >
                          {session.status}
                        </span>
                        {session.invoice_number && (
                          <button
                            type="button"
                            onClick={async () => {
                              if (!session.invoice_id) return;
                              try {
                                const inv = await pharmacyApi.getInvoice(session.invoice_id);
                                setActiveInvoice(inv);
                                setInvoiceModalOpen(true);
                              } catch (err: unknown) {
                                toast.error(getErrorMessage(err) || "Failed to load invoice");
                              }
                            }}
                            className="inline-flex items-center gap-1 font-mono font-semibold text-cyan-800 hover:underline cursor-pointer"
                          >
                            <Receipt className="h-3 w-3" />
                            {session.invoice_number}
                          </button>
                        )}
                      </div>
                      <div className="text-slate-600">
                        Dispensed by <span className="font-medium">{session.dispensed_by}</span> ·{" "}
                        {session.items.map((it) => `${it.medicine_name} × ${it.quantity} (${it.batch_number})`).join(", ")}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right tabular-nums">
                        <div className="font-bold text-slate-900">₹{Number(session.total_amount).toFixed(2)}</div>
                        <div className="text-[11px] text-slate-500">Tax: ₹{Number(session.tax_amount).toFixed(2)}</div>
                      </div>
                      {session.status === "confirmed" && (
                        <button
                          type="button"
                          onClick={() => {
                            setReverseTarget(session);
                            setReverseReason("");
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[11px] font-semibold text-rose-700 hover:bg-rose-100 transition cursor-pointer"
                        >
                          <Undo2 className="h-3 w-3" />
                          Reverse
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Map / Substitute Medicine Modal */}
      <Modal
        isOpen={Boolean(subTargetItem)}
        onClose={() => setSubTargetItem(null)}
        title={`Map / Substitute: ${subTargetItem?.medicine_name || ""}`}
        size="lg"
      >
        <div className="space-y-3 text-xs">
          <p className="text-slate-600">
            Select an active catalog medicine to fulfill this item and unlock FEFO batches.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                autoFocus
                placeholder="Search catalog by brand or generic name..."
                value={medSearch}
                onChange={(e) => setMedSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-300 pl-8 pr-3 py-2 text-xs focus:border-cyan-600 focus:outline-none"
              />
            </div>
            <input
              type="text"
              placeholder="Substitution reason (e.g. Generic equivalent)"
              value={subReason}
              onChange={(e) => setSubReason(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-cyan-600 focus:outline-none"
            />
          </div>

          <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
            {searchingMeds ? (
              <div className="p-6 text-center text-slate-500">Searching medicines...</div>
            ) : medResults.length === 0 ? (
              <div className="p-6 text-center text-slate-500">No catalog medicines found.</div>
            ) : (
              medResults.map((catMed) => (
                <div
                  key={catMed.id}
                  className="p-3 flex items-center justify-between hover:bg-cyan-50/40 transition"
                >
                  <div>
                    <div className="font-bold text-slate-900">{catMed.name}</div>
                    <div className="text-[11px] text-slate-500">
                      {[catMed.generic_name, catMed.strength, catMed.dosage_form]
                        .filter(Boolean)
                        .join(" · ") || "Catalog Medicine"}
                      {catMed.current_stock !== undefined && (
                        <span
                          className={`ml-2 font-semibold ${
                            catMed.current_stock > 0 ? "text-emerald-700" : "text-rose-600"
                          }`}
                        >
                          Stock: {catMed.current_stock}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={resolvingItem}
                    onClick={() => handleSubstituteSelect(catMed)}
                    className="rounded-lg bg-cyan-700 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-cyan-600 cursor-pointer disabled:opacity-50"
                  >
                    Select
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>

      {/* External / Skip Confirmation Modal */}
      <Modal
        isOpen={Boolean(extTarget)}
        onClose={() => setExtTarget(null)}
        title={
          extTarget?.action === "external"
            ? "Mark as Dispensed Externally"
            : "Mark Item Not Required / Skipped"
        }
        size="sm"
      >
        <form onSubmit={handleExternalSubmit} className="space-y-3 text-xs">
          <p className="text-slate-600">
            Medicine: <strong className="text-slate-900">{extTarget?.item.medicine_name}</strong>
          </p>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Reason / Note</label>
            <input
              type="text"
              value={extReason}
              onChange={(e) => setExtReason(e.target.value)}
              placeholder="e.g. Patient will purchase outside"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-cyan-600 focus:outline-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setExtTarget(null)}
              className="rounded-xl border border-slate-300 px-3.5 py-1.5 font-semibold text-slate-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={resolvingItem}
              className="rounded-xl bg-cyan-700 px-3.5 py-1.5 font-semibold text-white hover:bg-cyan-600 cursor-pointer disabled:opacity-50"
            >
              Confirm
            </button>
          </div>
        </form>
      </Modal>

      {/* Reverse Session Modal */}
      <Modal
        isOpen={Boolean(reverseTarget)}
        onClose={() => setReverseTarget(null)}
        title="Reverse Dispensing Session"
        size="sm"
      >
        <form onSubmit={handleReverseSession} className="space-y-3 text-xs">
          <p className="text-slate-600">
            This will restore deducted batch stock to inventory and cancel the associated OPD invoice or IPD charge.
          </p>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Reversal Reason</label>
            <input
              type="text"
              required
              minLength={3}
              value={reverseReason}
              onChange={(e) => setReverseReason(e.target.value)}
              placeholder="e.g. Wrong strength selected, patient declined"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-rose-500 focus:outline-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setReverseTarget(null)}
              className="rounded-xl border border-slate-300 px-3.5 py-1.5 font-semibold text-slate-700 cursor-pointer"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={reversing}
              className="rounded-xl bg-rose-600 px-3.5 py-1.5 font-semibold text-white hover:bg-rose-500 cursor-pointer disabled:opacity-50"
            >
              {reversing ? "Reversing..." : "Confirm Reversal"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Instant Payment Modal after OPD Dispensing */}
      <Modal
        isOpen={payModalOpen && Boolean(activeInvoice)}
        onClose={() => setPayModalOpen(false)}
        title={`Collect OPD Payment — ${activeInvoice?.invoice_number || ""}`}
        size="md"
      >
        <form onSubmit={handleQuickPayment} className="space-y-4 text-xs">
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 flex items-center justify-between">
            <span className="font-semibold text-emerald-900">
              Invoice {activeInvoice?.invoice_number} Ready
            </span>
            <span className="font-mono font-bold text-emerald-900">
              Total: ₹{activeInvoice ? Number(activeInvoice.total_amount).toFixed(2) : "0.00"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Amount Received (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold tabular-nums focus:border-emerald-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
              >
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Transaction Reference</label>
            <input
              type="text"
              placeholder="Optional UPI / Card Ref"
              value={payRef}
              onChange={(e) => setPayRef(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-emerald-600 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap justify-between gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setPayModalOpen(false);
                setInvoiceModalOpen(true);
              }}
              className="rounded-xl border border-slate-300 px-3.5 py-2 font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Skip & Print Unpaid Bill
            </button>
            <button
              type="submit"
              disabled={collectingPay}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-500 cursor-pointer disabled:opacity-50"
            >
              <CreditCard className="h-3.5 w-3.5" />
              {collectingPay ? "Saving..." : "Collect Payment & Print Receipt"}
            </button>
          </div>
        </form>
      </Modal>

      <PharmacyInvoiceModal
        isOpen={invoiceModalOpen}
        onClose={() => setInvoiceModalOpen(false)}
        invoice={activeInvoice}
        onCollectPayment={(inv) => {
          setInvoiceModalOpen(false);
          setActiveInvoice(inv);
          setPayAmount(Math.max(0, Number(inv.total_amount) - Number(inv.paid_amount ?? 0)).toFixed(2));
          setPayModalOpen(true);
        }}
      />
    </div>
  );
}

export default function DispensingWorkspacePage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-slate-500 text-sm">
          Loading dispensing workspace...
        </div>
      }
    >
      <DispensingWorkspaceContent />
    </Suspense>
  );
}
