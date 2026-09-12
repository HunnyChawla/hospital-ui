"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Modal } from "@/components/common/Modal";
import {
  serviceChargesApi,
  ChargeType,
  SourceType,
} from "@/services/serviceChargesApi";
import { servicesApi, Service } from "@/services/servicesApi";
import { formatCurrency } from "@/utils/format";
import { Search, Plus, Loader2, Sparkles, Building2 } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { getTenantIdForApi } from "@/utils/auth";

interface AddChargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  admissionId: string;
  onSuccess: () => void;
}

const CHARGE_TYPE_OPTIONS: { value: ChargeType; label: string; icon: string }[] = [
  { value: "DOCTOR_VISIT", label: "Doctor Visit / Consultation", icon: "👨‍⚕️" },
  { value: "LAB", label: "Lab Investigation", icon: "🧪" },
  { value: "PHARMACY", label: "Medicines & Pharmacy", icon: "💊" },
  { value: "PROCEDURE", label: "Clinical Procedure", icon: "🩺" },
  { value: "SURGERY", label: "Surgery / OT", icon: "🏥" },
  { value: "NURSING", label: "Nursing Care", icon: "👩‍⚕️" },
  { value: "CONSUMABLE", label: "Consumables & Supplies", icon: "📦" },
  { value: "ROOM", label: "Room / Bed Charge", icon: "🛏️" },
  { value: "ADMISSION_FEE", label: "Admission & Registration Fee", icon: "📝" },
  { value: "OTHER", label: "Other Hospital Service", icon: "✨" },
];

export function AddChargeModal({ isOpen, onClose, admissionId, onSuccess }: AddChargeModalProps) {
  const [entryMode, setEntryMode] = useState<"catalog" | "custom">("catalog");
  const [submitting, setSubmitting] = useState(false);

  // Catalog service selection state
  const [serviceSearchTerm, setServiceSearchTerm] = useState("");
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [availableServices, setAvailableServices] = useState<Service[]>([]);
  const [serviceLoading, setServiceLoading] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  // Form Fields
  const [chargeType, setChargeType] = useState<ChargeType>("DOCTOR_VISIT");
  const [customName, setCustomName] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState<number | string>("");
  const [discount, setDiscount] = useState<number | string>(0);
  const [notes, setNotes] = useState("");

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchServices = useCallback(async (searchTerm: string) => {
    setServiceLoading(true);
    try {
      const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
      const response = await servicesApi.list({
        page: 1,
        page_size: 15,
        is_active: true,
        search: searchTerm.trim() || undefined,
        tenant_id: getTenantIdForApi(tenantId),
      });
      setAvailableServices(response.items || []);
    } catch (error) {
      console.error("Failed to search services:", error);
    } finally {
      setServiceLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setEntryMode("catalog");
      setSelectedService(null);
      setServiceSearchTerm("");
      setCustomName("");
      setCustomCategory("");
      setQuantity(1);
      setUnitPrice("");
      setDiscount(0);
      setNotes("");
      setChargeType("DOCTOR_VISIT");
      fetchServices("");
    }
  }, [isOpen, fetchServices]);

  const handleSearchChange = (val: string) => {
    setServiceSearchTerm(val);
    setShowServiceDropdown(true);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      fetchServices(val);
    }, 250);
  };

  const handleSelectService = (service: Service) => {
    setSelectedService(service);
    setUnitPrice(service.price || 0);
    setServiceSearchTerm(service.name);
    setShowServiceDropdown(false);

    // Auto-select charge type from service category
    const cat = (service.category || "").toLowerCase();
    if (cat.includes("consult") || cat.includes("doctor")) setChargeType("DOCTOR_VISIT");
    else if (cat.includes("lab") || cat.includes("investig") || cat.includes("test")) setChargeType("LAB");
    else if (cat.includes("pharm") || cat.includes("med")) setChargeType("PHARMACY");
    else if (cat.includes("room") || cat.includes("bed")) setChargeType("ROOM");
    else if (cat.includes("surg") || cat.includes("ot")) setChargeType("SURGERY");
    else if (cat.includes("proc")) setChargeType("PROCEDURE");
    else if (cat.includes("nurs")) setChargeType("NURSING");
    else if (cat.includes("consum")) setChargeType("CONSUMABLE");
  };

  const parsedUnitPrice = Number(unitPrice) || 0;
  const parsedQty = Math.max(1, Number(quantity) || 1);
  const parsedDiscount = Math.max(0, Number(discount) || 0);
  const grossAmount = parsedUnitPrice * parsedQty;
  const netAmount = Math.max(0, grossAmount - parsedDiscount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (entryMode === "catalog" && !selectedService && !serviceSearchTerm) {
      toast.error("Please select a service or switch to custom charge");
      return;
    }
    if (entryMode === "custom" && !customName.trim()) {
      toast.error("Please enter a charge description/name");
      return;
    }
    if (parsedUnitPrice <= 0) {
      toast.error("Please enter a valid unit price");
      return;
    }
    if (parsedDiscount > grossAmount) {
      toast.error("Discount cannot exceed the total amount");
      return;
    }

    setSubmitting(true);
    try {
      const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
      await serviceChargesApi.create(
        admissionId,
        {
          service_id: entryMode === "catalog" && selectedService ? selectedService.id : null,
          service_name: entryMode === "catalog" ? (selectedService ? selectedService.name : serviceSearchTerm) : customName,
          service_category: entryMode === "catalog" ? (selectedService?.category || undefined) : (customCategory || undefined),
          charge_type: chargeType,
          quantity: parsedQty,
          unit_price: parsedUnitPrice,
          discount: parsedDiscount,
          source_type: "MANUAL",
          notes: notes.trim() || undefined,
        },
        tenantId || undefined
      );

      toast.success("Charge applied successfully to IPD ledger");
      onSuccess();
      onClose();
    } catch (error) {
      const err = getErrorMessage(error);
      toast.error(err || "Failed to apply charge");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add IPD Billable Charge" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Mode Toggle Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
          <button
            type="button"
            onClick={() => {
              setEntryMode("catalog");
              if (selectedService) setUnitPrice(selectedService.price || 0);
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
              entryMode === "catalog"
                ? "bg-white text-slate-900 shadow-sm border border-slate-200/50"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            📋 Select from Service Catalog
          </button>
          <button
            type="button"
            onClick={() => {
              setEntryMode("custom");
              setSelectedService(null);
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
              entryMode === "custom"
                ? "bg-white text-slate-900 shadow-sm border border-slate-200/50"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            ✍️ Custom / Manual Charge
          </button>
        </div>

        {/* Catalog Selector Mode */}
        {entryMode === "catalog" ? (
          <div className="relative space-y-1">
            <label className="text-xs font-semibold text-slate-700">Search Service Catalog</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search procedures, consultations, labs, medicines..."
                value={serviceSearchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => setShowServiceDropdown(true)}
                className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              {serviceLoading && (
                <Loader2 className="absolute right-3 top-2.5 h-4 w-4 text-slate-400 animate-spin" />
              )}
            </div>

            {/* Dropdown Results */}
            {showServiceDropdown && (
              <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-52 overflow-y-auto divide-y divide-slate-100">
                {availableServices.length > 0 ? (
                  availableServices.map((svc) => (
                    <button
                      key={svc.id}
                      type="button"
                      onClick={() => handleSelectService(svc)}
                      className="w-full px-3 py-2 text-left hover:bg-sky-50 flex items-center justify-between text-xs transition-colors"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">{svc.name}</p>
                        <p className="text-[10px] text-slate-500">{svc.category || "General"}</p>
                      </div>
                      <span className="font-bold text-sky-700 font-mono">
                        {formatCurrency(svc.price || 0)}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="p-3 text-center text-xs text-slate-500">
                    {serviceLoading ? "Searching services..." : "No services found in catalog"}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Custom Manual Entry Mode */
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700">Item / Charge Description *</label>
              <input
                type="text"
                required
                placeholder="e.g. ICU Night Round, Special Dressing, etc."
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="w-full mt-1 px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700">Department / Category</label>
              <input
                type="text"
                placeholder="e.g. Nursing, Consultation, Consumables"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                className="w-full mt-1 px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>
        )}

        {/* Charge Classification */}
        <div>
          <label className="text-xs font-semibold text-slate-700">Charge Classification</label>
          <select
            value={chargeType}
            onChange={(e) => setChargeType(e.target.value as ChargeType)}
            className="w-full mt-1 px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 bg-white"
          >
            {CHARGE_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.icon} {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Pricing & Quantity Breakdown */}
        <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
          <div>
            <label className="text-xs font-semibold text-slate-700">Quantity</label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value) || 1)}
              className="w-full mt-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg font-mono"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700">Unit Rate (₹) *</label>
            <input
              type="number"
              min="0"
              step="0.01"
              required
              placeholder="0.00"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              className="w-full mt-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg font-mono"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700">Discount (₹)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              className="w-full mt-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg font-mono"
            />
          </div>
        </div>

        {/* Charge Calculation Total Summary */}
        <div className="flex justify-between items-center px-4 py-2.5 bg-sky-50/80 border border-sky-200 rounded-lg">
          <div className="text-xs">
            <span className="text-slate-600">Gross: {formatCurrency(grossAmount)}</span>
            {parsedDiscount > 0 && (
              <span className="text-amber-700 ml-2 font-medium">
                (Disc: -{formatCurrency(parsedDiscount)})
              </span>
            )}
          </div>
          <div className="text-right">
            <span className="text-xs font-semibold text-slate-500 mr-2">Net Charge Amount:</span>
            <span className="text-base font-extrabold text-sky-950 font-mono">
              {formatCurrency(netAmount)}
            </span>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="text-xs font-semibold text-slate-700">Notes / Instructions (Optional)</label>
          <input
            type="text"
            placeholder="e.g. Advised by Dr. Sharma, urgent round"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full mt-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || parsedUnitPrice <= 0}
            className="px-4 py-2 text-xs font-semibold text-white bg-sky-600 rounded-lg hover:bg-sky-700 disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Adding Charge...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" /> Add to Patient Ledger
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
