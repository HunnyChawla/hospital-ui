"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Sparkles,
  Plus,
  Search,
  Trash2,
  Loader2,
  X,
  Clock,
  Layers,
  CheckCircle2,
  AlertCircle,
  FileText,
  DollarSign,
  Receipt,
  User,
  Activity,
  Stethoscope,
  Scissors,
  FlaskConical,
  Pill,
  Bed,
  Box,
  ShieldCheck,
  Building2,
  Calendar,
} from "lucide-react";
import {
  serviceChargesApi,
  ServiceCharge,
  ChargeType,
  IpdBillingAccountResponse,
  CreateServiceChargeRequest,
} from "@/services/serviceChargesApi";
import { servicesApi, Service } from "@/services/servicesApi";
import { formatCurrency, formatDateTime } from "@/utils/format";
import { getTenantIdForApi } from "@/utils/auth";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { SkeletonRow } from "@/components/shared/SkeletonRow";
import { ScrollableContainer } from "@/components/common/ScrollableContainer";

interface IpdServicesTabProps {
  admissionId: string;
  patientId?: string;
  onRefresh?: () => void;
  isDischarged?: boolean;
  isDoctor?: boolean;
}

const CHARGE_TYPE_CONFIG: Record<
  string,
  { label: string; icon: any; bg: string; text: string; border: string }
> = {
  DOCTOR_VISIT: {
    label: "Doctor Visit / Consultation",
    icon: Stethoscope,
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
  },
  NURSING: {
    label: "Nursing Care",
    icon: Activity,
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
  },
  PROCEDURE: {
    label: "Clinical Procedure",
    icon: Scissors,
    bg: "bg-purple-50",
    text: "text-purple-700",
    border: "border-purple-200",
  },
  SURGERY: {
    label: "Surgery / OT",
    icon: Scissors,
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
  },
  LAB: {
    label: "Lab Investigation",
    icon: FlaskConical,
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
  },
  PHARMACY: {
    label: "Pharmacy & Medicines",
    icon: Pill,
    bg: "bg-teal-50",
    text: "text-teal-700",
    border: "border-teal-200",
  },
  CONSUMABLE: {
    label: "Consumables & Supplies",
    icon: Box,
    bg: "bg-orange-50",
    text: "text-orange-700",
    border: "border-orange-200",
  },
  ROOM: {
    label: "Room / Bed Charge",
    icon: Bed,
    bg: "bg-indigo-50",
    text: "text-indigo-700",
    border: "border-indigo-200",
  },
  ADMISSION_FEE: {
    label: "Admission & Registration",
    icon: FileText,
    bg: "bg-sky-50",
    text: "text-sky-700",
    border: "border-sky-200",
  },
  OTHER: {
    label: "Other Hospital Service",
    icon: Sparkles,
    bg: "bg-slate-50",
    text: "text-slate-700",
    border: "border-slate-200",
  },
};

const CATEGORY_FILTERS: { id: string; label: string }[] = [
  { id: "ALL", label: "All Services" },
  { id: "DOCTOR_VISIT", label: "Doctor Visits" },
  { id: "NURSING", label: "Nursing Care" },
  { id: "PROCEDURE", label: "Procedures" },
  { id: "SURGERY", label: "Surgeries / OT" },
  { id: "LAB", label: "Lab Tests" },
  { id: "CONSUMABLE", label: "Consumables" },
  { id: "ROOM", label: "Room / Bed" },
  { id: "OTHER", label: "Other Services" },
];

export function IpdServicesTab({
  admissionId,
  patientId,
  onRefresh,
  isDischarged = false,
  isDoctor = false,
}: IpdServicesTabProps) {
  const [charges, setCharges] = useState<ServiceCharge[]>([]);
  const [billingAccount, setBillingAccount] = useState<IpdBillingAccountResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("ALL");

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [cancellingCharge, setCancellingCharge] = useState<ServiceCharge | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Add Service Form state
  const [entryMode, setEntryMode] = useState<"catalog" | "custom">("catalog");
  const [chargeType, setChargeType] = useState<ChargeType>("NURSING");
  const [customName, setCustomName] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [quantity, setQuantity] = useState<number>(1);
  const [unitPrice, setUnitPrice] = useState<number | string>("");
  const [discount, setDiscount] = useState<number | string>(0);
  const [notes, setNotes] = useState("");
  const [performedAtTime, setPerformedAtTime] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  // Catalog service lookup state
  const [catalogSearch, setCatalogSearch] = useState("");
  const [availableServices, setAvailableServices] = useState<Service[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [selectedCatalogService, setSelectedCatalogService] = useState<Service | null>(null);
  const [showCatalogDropdown, setShowCatalogDropdown] = useState(false);
  const catalogSearchRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch all charges and billing account summary
  const loadData = useCallback(async () => {
    if (!admissionId) return;
    setLoading(true);
    try {
      const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
      const [chargesData, accountData] = await Promise.all([
        serviceChargesApi.list(admissionId, tenantId || undefined),
        serviceChargesApi.getBillingAccount(admissionId, tenantId || undefined).catch(() => null),
      ]);
      setCharges(chargesData);
      setBillingAccount(accountData);
    } catch (err) {
      console.error("Failed to load services data:", err);
      toast.error(getErrorMessage(err) || "Failed to load services data");
    } finally {
      setLoading(false);
    }
  }, [admissionId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Catalog search debounce
  const fetchCatalogServices = useCallback(async (query: string) => {
    setLoadingCatalog(true);
    try {
      const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
      const res = await servicesApi.list({
        page: 1,
        page_size: 20,
        is_active: true,
        search: query.trim() || undefined,
        tenant_id: getTenantIdForApi(tenantId),
      });
      setAvailableServices(res.items || []);
    } catch (err) {
      console.error("Failed to fetch catalog services:", err);
    } finally {
      setLoadingCatalog(false);
    }
  }, []);

  const handleCatalogSearchChange = (val: string) => {
    setCatalogSearch(val);
    setShowCatalogDropdown(true);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      fetchCatalogServices(val);
    }, 250);
  };

  const handleSelectCatalogService = (service: Service) => {
    setSelectedCatalogService(service);
    setCatalogSearch(service.name);
    setUnitPrice(service.price || 0);
    setShowCatalogDropdown(false);

    // Auto-detect best matching ChargeType from category
    const cat = (service.category || "").toLowerCase();
    if (cat.includes("consult") || cat.includes("doctor") || cat.includes("round")) {
      setChargeType("DOCTOR_VISIT");
    } else if (cat.includes("nurs") || cat.includes("dressing") || cat.includes("injection") || cat.includes("nebul")) {
      setChargeType("NURSING");
    } else if (cat.includes("lab") || cat.includes("investig") || cat.includes("test") || cat.includes("path")) {
      setChargeType("LAB");
    } else if (cat.includes("pharm") || cat.includes("med")) {
      setChargeType("PHARMACY");
    } else if (cat.includes("surg") || cat.includes("ot") || cat.includes("operat")) {
      setChargeType("SURGERY");
    } else if (cat.includes("proc") || cat.includes("physio") || cat.includes("ecg") || cat.includes("cath")) {
      setChargeType("PROCEDURE");
    } else if (cat.includes("room") || cat.includes("bed") || cat.includes("stay")) {
      setChargeType("ROOM");
    } else if (cat.includes("consum") || cat.includes("kit") || cat.includes("glove")) {
      setChargeType("CONSUMABLE");
    } else {
      setChargeType("OTHER");
    }
  };

  // Close catalog dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (catalogSearchRef.current && !catalogSearchRef.current.contains(e.target as Node)) {
        setShowCatalogDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const resetForm = () => {
    setEntryMode("catalog");
    setChargeType(isDoctor ? "DOCTOR_VISIT" : "NURSING");
    setSelectedCatalogService(null);
    setCatalogSearch("");
    setCustomName("");
    setCustomCategory("");
    setQuantity(1);
    setUnitPrice("");
    setDiscount(0);
    setNotes("");
    setPerformedAtTime(new Date().toISOString().slice(0, 16));
  };

  const handleOpenAddModal = () => {
    resetForm();
    setShowAddModal(true);
    fetchCatalogServices("");
  };

  // Calculations
  const numUnitPrice = Number(unitPrice) || 0;
  const numQty = Math.max(1, Number(quantity) || 1);
  const numDiscount = Math.max(0, Number(discount) || 0);
  const formGross = numUnitPrice * numQty;
  const formNet = Math.max(0, formGross - numDiscount);

  const handleSubmitAddCharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (entryMode === "catalog" && !selectedCatalogService && !catalogSearch.trim()) {
      toast.error("Please select a service from the catalog or switch to custom charge");
      return;
    }
    if (entryMode === "custom" && !customName.trim()) {
      toast.error("Please enter a service name / description");
      return;
    }
    if (numUnitPrice <= 0) {
      toast.error("Please enter a valid unit price");
      return;
    }
    if (numDiscount > formGross) {
      toast.error("Discount cannot exceed total gross amount");
      return;
    }

    setSubmitting(true);
    try {
      const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
      const payload: CreateServiceChargeRequest = {
        service_id: entryMode === "catalog" && selectedCatalogService ? selectedCatalogService.id : undefined,
        service_name: entryMode === "catalog"
          ? (selectedCatalogService?.name || catalogSearch.trim())
          : customName.trim(),
        service_category: entryMode === "catalog"
          ? (selectedCatalogService?.category || CHARGE_TYPE_CONFIG[chargeType]?.label)
          : (customCategory.trim() || CHARGE_TYPE_CONFIG[chargeType]?.label),
        charge_type: chargeType,
        quantity: numQty,
        unit_price: numUnitPrice,
        discount: numDiscount,
        source_type: "MANUAL",
        notes: notes.trim() || undefined,
      };

      await serviceChargesApi.create(admissionId, payload, tenantId || undefined);
      toast.success("Service added successfully! Total billing amount updated automatically.");
      setShowAddModal(false);
      resetForm();
      await loadData();
      onRefresh?.();
    } catch (err) {
      console.error("Failed to add service charge:", err);
      toast.error(getErrorMessage(err) || "Failed to add service charge");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancellingCharge) return;
    setCancellingId(cancellingCharge.charge_id);
    try {
      const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
      await serviceChargesApi.cancel(cancellingCharge.charge_id, tenantId || undefined);
      toast.success("Service charge cancelled successfully");
      setCancellingCharge(null);
      await loadData();
      onRefresh?.();
    } catch (err) {
      console.error("Failed to cancel charge:", err);
      toast.error(getErrorMessage(err) || "Failed to cancel service charge");
    } finally {
      setCancellingId(null);
    }
  };

  // Filter charges
  const filteredCharges = useMemo(() => {
    return charges.filter((c) => {
      const matchesCategory =
        selectedCategoryFilter === "ALL" ||
        (c.charge_type || "").toUpperCase() === selectedCategoryFilter;
      const matchesSearch =
        !searchQuery.trim() ||
        c.service_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.service_category && c.service_category.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.notes && c.notes.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [charges, selectedCategoryFilter, searchQuery]);

  // Financial summary metrics calculated from active charges
  const activeCharges = useMemo(() => charges.filter((c) => c.status === "ACTIVE"), [charges]);
  const totalGrossCharges = useMemo(
    () => activeCharges.reduce((acc, c) => acc + Number(c.gross_amount || Number(c.unit_price) * c.quantity), 0),
    [activeCharges]
  );
  const totalDiscounts = useMemo(
    () => activeCharges.reduce((acc, c) => acc + Number(c.discount || 0), 0),
    [activeCharges]
  );
  const totalNetCharges = useMemo(
    () => activeCharges.reduce((acc, c) => acc + Number(c.net_amount || c.total_amount || 0), 0),
    [activeCharges]
  );

  return (
    <div className="space-y-4">
      {/* Top Financial & Services Summary Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-500 to-teal-500 text-white shadow-sm">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Patient Services & Billable Charges
                </h2>
                <p className="text-xs text-slate-500">
                  Add nursing procedures, doctor visits, clinical services, and consumables. All items automatically calculate into the patient&apos;s billing ledger and final discharge bill.
                </p>
              </div>
            </div>
          </div>

          {/* Action Button */}
          {!isDischarged && (
            <div className="flex items-center gap-2 self-start lg:self-auto shrink-0">
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-teal-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-sky-600/20 transition-all hover:from-sky-700 hover:to-teal-700 active:scale-98 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Add Service Charge</span>
              </button>
            </div>
          )}
        </div>

        {/* Live Metrics Strip */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 border-t border-slate-100 pt-4">
          <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
            <p className="text-[11px] font-semibold text-slate-500">Active Services</p>
            <p className="mt-1 text-lg font-bold text-slate-900">{activeCharges.length}</p>
            <p className="text-[10px] text-slate-400">Total billable items</p>
          </div>

          <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
            <p className="text-[11px] font-semibold text-slate-500">Gross Charges</p>
            <p className="mt-1 text-lg font-bold text-slate-900">{formatCurrency(totalGrossCharges)}</p>
            <p className="text-[10px] text-slate-400">Before discounts</p>
          </div>

          <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
            <p className="text-[11px] font-semibold text-slate-500">Total Discounts</p>
            <p className="mt-1 text-lg font-bold text-emerald-600">{formatCurrency(totalDiscounts)}</p>
            <p className="text-[10px] text-slate-400">Deducted from bill</p>
          </div>

          <div className="rounded-xl bg-gradient-to-br from-sky-50 to-teal-50 p-3 border border-sky-100">
            <p className="text-[11px] font-semibold text-sky-800">Net Billable Total</p>
            <p className="mt-1 text-lg font-bold text-sky-950">{formatCurrency(totalNetCharges)}</p>
            <p className="text-[10px] text-sky-700 font-medium">Auto-synced to billing</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search services by name, category, or notes..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-9 pr-4 py-2 text-xs text-slate-900 outline-none focus:border-sky-500 focus:bg-white focus:ring-1 focus:ring-sky-500 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Quick Stats Pill */}
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 px-1">
            <span>Showing {filteredCharges.length} of {charges.length} services</span>
          </div>
        </div>

        {/* Category Filter Pills */}
        <ScrollableContainer
          className="flex items-center gap-1 sm:gap-1.5"
          contentClassName="flex flex-1 items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide text-xs min-w-0"
          buttonClassName="h-7 w-7 rounded-lg text-xs"
        >
          {CATEGORY_FILTERS.map((cat) => {
            const isSelected = selectedCategoryFilter === cat.id;
            const count =
              cat.id === "ALL"
                ? charges.length
                : charges.filter((c) => (c.charge_type || "").toUpperCase() === cat.id).length;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategoryFilter(cat.id)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-bold whitespace-nowrap transition cursor-pointer shrink-0 ${
                  isSelected
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                }`}
              >
                <span>{cat.label}</span>
                {count > 0 && (
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                      isSelected ? "bg-white/20 text-white" : "bg-white text-slate-700 font-bold shadow-2xs"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </ScrollableContainer>
      </div>

      {/* Services List Table / Cards */}
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <SkeletonRow rows={6} />
        </div>
      ) : filteredCharges.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-xs space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
            <Sparkles className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900">
              {searchQuery || selectedCategoryFilter !== "ALL"
                ? "No matching service charges found"
                : "No Services Added Yet"}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery || selectedCategoryFilter !== "ALL"
                ? "Try clearing your search query or selecting a different category filter."
                : "Nursing staff and attending doctors can add hospital services, procedures, rounds, and items directly from here."}
            </p>
          </div>
          {!isDischarged && (
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-sky-700 transition cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Add First Service Charge</span>
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50/80 border-b border-slate-200 sticky top-0 z-10 backdrop-blur-xs">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold uppercase tracking-wider text-slate-600">Service / Procedure</th>
                    <th className="px-3 py-3 text-left font-bold uppercase tracking-wider text-slate-600">Type & Category</th>
                    <th className="px-2 py-3 text-center font-bold uppercase tracking-wider text-slate-600 w-16">Qty</th>
                    <th className="px-3 py-3 text-right font-bold uppercase tracking-wider text-slate-600 w-24">Unit Price</th>
                    <th className="px-3 py-3 text-right font-bold uppercase tracking-wider text-slate-600 w-24">Discount</th>
                    <th className="px-3 py-3 text-right font-bold uppercase tracking-wider text-slate-600 w-28">Net Amount</th>
                    <th className="px-3 py-3 text-center font-bold uppercase tracking-wider text-slate-600 w-24">Status</th>
                    <th className="px-3 py-3 text-left font-bold uppercase tracking-wider text-slate-600">Performed At</th>
                    {!isDischarged && (
                      <th className="px-3 py-3 text-center font-bold uppercase tracking-wider text-slate-600 w-20">Action</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredCharges.map((charge) => {
                    const cfg = CHARGE_TYPE_CONFIG[charge.charge_type] || CHARGE_TYPE_CONFIG.OTHER;
                    const Icon = cfg.icon;
                    const isCancelled = charge.status === "CANCELLED";

                    return (
                      <tr
                        key={charge.charge_id}
                        className={`hover:bg-slate-50/60 transition-colors ${
                          isCancelled ? "bg-slate-50/40 opacity-70" : ""
                        }`}
                      >
                        <td className="px-4 py-3">
                          <p className={`font-bold text-slate-900 ${isCancelled ? "line-through text-slate-500" : ""}`}>
                            {charge.service_name}
                          </p>
                          {charge.notes && (
                            <p className="text-[11px] text-slate-500 mt-0.5 max-w-md truncate" title={charge.notes}>
                              📝 {charge.notes}
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}
                          >
                            <Icon className="h-3 w-3" />
                            <span>{charge.service_category || cfg.label}</span>
                          </span>
                        </td>
                        <td className="px-2 py-3 text-center font-semibold text-slate-700">
                          {charge.quantity}
                        </td>
                        <td className="px-3 py-3 text-right font-medium text-slate-700">
                          {formatCurrency(Number(charge.unit_price))}
                        </td>
                        <td className="px-3 py-3 text-right text-slate-600">
                          {Number(charge.discount) > 0 ? (
                            <span className="font-semibold text-emerald-600">
                              -{formatCurrency(Number(charge.discount))}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <span
                            className={`font-bold ${
                              isCancelled ? "text-slate-400 line-through" : "text-slate-900"
                            }`}
                          >
                            {formatCurrency(Number(charge.net_amount || charge.total_amount))}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                              isCancelled
                                ? "bg-slate-100 text-slate-600 border-slate-200"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200"
                            }`}
                          >
                            {charge.status}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-slate-600 text-[11px] whitespace-nowrap">
                          {formatDateTime(charge.performed_at)}
                        </td>
                        {!isDischarged && (
                          <td className="px-3 py-3 text-center">
                            {charge.status === "ACTIVE" && (
                              <button
                                type="button"
                                onClick={() => setCancellingCharge(charge)}
                                className="inline-flex items-center justify-center h-7 w-7 rounded-lg text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition cursor-pointer"
                                title="Cancel Charge"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="block md:hidden space-y-2.5">
            {filteredCharges.map((charge) => {
              const cfg = CHARGE_TYPE_CONFIG[charge.charge_type] || CHARGE_TYPE_CONFIG.OTHER;
              const Icon = cfg.icon;
              const isCancelled = charge.status === "CANCELLED";

              return (
                <div
                  key={charge.charge_id}
                  className={`rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs space-y-2.5 ${
                    isCancelled ? "bg-slate-50/50 opacity-75" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className={`font-bold text-sm text-slate-900 ${isCancelled ? "line-through text-slate-500" : ""}`}>
                        {charge.service_name}
                      </p>
                      <span
                        className={`inline-flex items-center gap-1 mt-1 rounded-md px-2 py-0.5 text-[10px] font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}
                      >
                        <Icon className="h-2.5 w-2.5" />
                        <span>{charge.service_category || cfg.label}</span>
                      </span>
                    </div>
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold border shrink-0 ${
                        isCancelled
                          ? "bg-slate-100 text-slate-600 border-slate-200"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200"
                      }`}
                    >
                      {charge.status}
                    </span>
                  </div>

                  {charge.notes && (
                    <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      📝 {charge.notes}
                    </p>
                  )}

                  <div className="grid grid-cols-3 gap-2 text-xs border-t border-slate-100 pt-2">
                    <div>
                      <p className="text-[10px] text-slate-500">Qty × Rate</p>
                      <p className="font-semibold text-slate-800">
                        {charge.quantity} × {formatCurrency(Number(charge.unit_price))}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500">Discount</p>
                      <p className="font-semibold text-slate-800">
                        {Number(charge.discount) > 0 ? formatCurrency(Number(charge.discount)) : "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500">Net Total</p>
                      <p className="font-bold text-slate-900">
                        {formatCurrency(Number(charge.net_amount || charge.total_amount))}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-50">
                    <span>🕒 {formatDateTime(charge.performed_at)}</span>
                    {!isDischarged && charge.status === "ACTIVE" && (
                      <button
                        type="button"
                        onClick={() => setCancellingCharge(charge)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700"
                      >
                        <Trash2 className="h-3 w-3" />
                        <span>Cancel</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Add Service Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div
            className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-600 to-teal-600 text-white shadow-sm">
                  <Plus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Add Service to Patient</h3>
                  <p className="text-xs text-slate-500">Charges automatically apply to IPD billing ledger</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmitAddCharge} className="overflow-y-auto p-5 space-y-4 flex-1">
              {/* Entry Mode Switcher */}
              <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setEntryMode("catalog")}
                  className={`flex-1 rounded-lg py-2 transition cursor-pointer ${
                    entryMode === "catalog"
                      ? "bg-white text-sky-700 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  🏥 Select from Service Master Catalog
                </button>
                <button
                  type="button"
                  onClick={() => setEntryMode("custom")}
                  className={`flex-1 rounded-lg py-2 transition cursor-pointer ${
                    entryMode === "custom"
                      ? "bg-white text-sky-700 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  ✍️ Enter Custom Clinical Charge
                </button>
              </div>

              {/* Catalog Service Selection */}
              {entryMode === "catalog" ? (
                <div className="space-y-1 relative" ref={catalogSearchRef}>
                  <label className="block text-xs font-bold text-slate-700">
                    Search Service Catalog <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={catalogSearch}
                      onChange={(e) => handleCatalogSearchChange(e.target.value)}
                      onFocus={() => setShowCatalogDropdown(true)}
                      placeholder="Type service name, code, or category (e.g., ICU Round, Dressing, Nebulization)..."
                      className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2.5 text-xs text-slate-900 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    />
                    {loadingCatalog && (
                      <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-sky-600" />
                    )}
                  </div>

                  {/* Dropdown Results */}
                  {showCatalogDropdown && (
                    <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                      {loadingCatalog ? (
                        <div className="p-4 text-center text-xs text-slate-500">
                          <Loader2 className="h-4 w-4 animate-spin mx-auto mb-1 text-sky-600" />
                          Searching services...
                        </div>
                      ) : availableServices.length > 0 ? (
                        availableServices.map((svc) => (
                          <button
                            key={svc.id}
                            type="button"
                            onClick={() => handleSelectCatalogService(svc)}
                            className="flex w-full items-start justify-between p-3 text-left hover:bg-sky-50/60 border-b border-slate-50 last:border-0 transition"
                          >
                            <div>
                              <p className="text-xs font-bold text-slate-900">{svc.name}</p>
                              {svc.description && (
                                <p className="text-[11px] text-slate-500 line-clamp-1">{svc.description}</p>
                              )}
                              <span className="inline-block mt-1 rounded bg-slate-100 px-1.5 py-0.2 text-[10px] font-semibold text-slate-600">
                                {svc.category || "Service"}
                              </span>
                            </div>
                            <span className="text-xs font-bold text-slate-900 shrink-0 ml-2">
                              {formatCurrency(svc.price || 0)}
                            </span>
                          </button>
                        ))
                      ) : (
                        <div className="p-4 text-center text-xs text-slate-500">
                          No services found matching &quot;{catalogSearch}&quot;
                        </div>
                      )}
                    </div>
                  )}

                  {selectedCatalogService && (
                    <div className="mt-2 flex items-center justify-between rounded-xl bg-sky-50 border border-sky-200 px-3 py-2 text-xs">
                      <div>
                        <span className="font-bold text-sky-900">Selected: </span>
                        <span className="font-semibold text-slate-800">{selectedCatalogService.name}</span>
                        <span className="ml-2 text-sky-700">({selectedCatalogService.category || "Standard Service"})</span>
                      </div>
                      <span className="font-bold text-sky-900">{formatCurrency(selectedCatalogService.price || 0)}</span>
                    </div>
                  )}
                </div>
              ) : (
                /* Custom Charge Form */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1 sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700">
                      Charge Description / Service Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="e.g. Special Specialist Consultation, Emergency Dressing"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-900 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">Category (Optional)</label>
                    <input
                      type="text"
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      placeholder="e.g. Nursing, Consultant, Equipment"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-900 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                </div>
              )}

              {/* Charge Type Classification */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">
                  Charge Classification / Department <span className="text-rose-500">*</span>
                </label>
                <select
                  value={chargeType}
                  onChange={(e) => setChargeType(e.target.value as ChargeType)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-900 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                >
                  {Object.entries(CHARGE_TYPE_CONFIG).map(([key, cfg]) => (
                    <option key={key} value={key}>
                      {cfg.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity, Unit Price & Discount */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Quantity <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-900 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 font-semibold"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Unit Price (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-900 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 font-bold"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Discount (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-900 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>

              {/* Performed Timestamp & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Performed Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={performedAtTime}
                    onChange={(e) => setPerformedAtTime(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-900 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Clinical / Billing Remarks</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional remarks (e.g. Round by Dr. Sharma, Ward 3)"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-900 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>

              {/* Total Calculation Preview */}
              <div className="rounded-xl border border-sky-100 bg-gradient-to-r from-sky-50/80 to-teal-50/80 p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">Calculation:</span>
                  <span className="font-semibold text-slate-800">
                    {numQty} × {formatCurrency(numUnitPrice)} = {formatCurrency(formGross)}
                  </span>
                </div>
                {numDiscount > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-emerald-700 font-semibold">Discount:</span>
                    <span className="font-semibold text-emerald-700">-{formatCurrency(numDiscount)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm font-bold text-slate-900 border-t border-sky-200 pt-2">
                  <span>Net Billable Charge:</span>
                  <span className="text-base text-sky-700">{formatCurrency(formNet)}</span>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-teal-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:from-sky-700 hover:to-teal-700 disabled:opacity-50 transition cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Adding to Ledger...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Add to Patient Bill</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {cancellingCharge && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Cancel Service Charge</h3>
                <p className="text-xs text-slate-500">This action will remove the charge from the patient&apos;s bill</p>
              </div>
            </div>

            <div className="rounded-xl bg-rose-50/60 border border-rose-100 p-3 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Service:</span>
                <span className="font-bold text-slate-900">{cancellingCharge.service_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Amount:</span>
                <span className="font-bold text-rose-700">
                  {formatCurrency(Number(cancellingCharge.net_amount || cancellingCharge.total_amount))}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Are you sure you want to cancel this charge? The patient&apos;s billing account total will automatically be reduced.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCancellingCharge(null)}
                disabled={Boolean(cancellingId)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Keep Charge
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={Boolean(cancellingId)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 transition cursor-pointer disabled:opacity-50"
              >
                {cancellingId ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Cancelling...</span>
                  </>
                ) : (
                  <span>Confirm Cancel</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
