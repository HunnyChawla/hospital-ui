"use client";

import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { Modal } from "@/components/common/Modal";
import { tenantsApi, Tenant } from "@/services/tenantsApi";
import { platformBillingApi } from "@/services/platformBillingApi";
import { Quote, UpdateQuoteRequest } from "@/types/platformBilling";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { Plus, Trash, Building2, UserPlus, Info, Loader2 } from "lucide-react";

interface EditQuoteModalProps {
  isOpen: boolean;
  quote: Quote | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditQuoteModal({ isOpen, quote, onClose, onSuccess }: EditQuoteModalProps) {
  const [hospitalType, setHospitalType] = useState<"onboarded" | "unregistered">("onboarded");
  const [loadingTenants, setLoadingTenants] = useState(false);
  const [loadingQuoteDetails, setLoadingQuoteDetails] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [gstEnabled, setGstEnabled] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<UpdateQuoteRequest>({
    defaultValues: {
      tenant_id: "",
      hospital_name: "",
      hospital_address: "",
      hospital_email: "",
      hospital_phone: "",
      gst_number: "",
      line_items: [{ description: "", quantity: 1, unit_price: 0, sort_order: 0 }],
      valid_until: "",
      tax_rate: 0,
      notes: "",
      custom_terms: "",
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: "line_items",
  });

  const watchLineItems = watch("line_items") || [];
  const watchTaxRate = watch("tax_rate") || 0;

  // Calculate totals
  const subtotal = watchLineItems.reduce((acc, item) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unit_price) || 0;
    return acc + qty * price;
  }, 0);

  const taxAmount = gstEnabled ? subtotal * (Number(watchTaxRate) / 100) : 0;
  const totalAmount = subtotal + taxAmount;

  // Fetch tenants
  useEffect(() => {
    if (isOpen) {
      setLoadingTenants(true);
      tenantsApi
        .list({ page: 1, page_size: 100, status: "active" })
        .then((res) => {
          setTenants(res.items);
        })
        .catch((err) => {
          console.error("Failed to load tenants:", err);
          toast.error("Failed to load hospitals list");
        })
        .finally(() => {
          setLoadingTenants(false);
        });
    }
  }, [isOpen]);

  // Load quote details into form
  useEffect(() => {
    if (isOpen && quote) {
      const loadDetails = async () => {
        let fullQuote = quote;
        if (!quote.line_items || quote.line_items.length === 0) {
          try {
            setLoadingQuoteDetails(true);
            fullQuote = await platformBillingApi.quotes.getById(quote.id);
          } catch (err) {
            console.error("Failed to load full quote details:", err);
            toast.error("Failed to load quote line items");
          } finally {
            setLoadingQuoteDetails(false);
          }
        }

        const isUnregistered = !fullQuote.tenant_id;
        setHospitalType(isUnregistered ? "unregistered" : "onboarded");
        const hasGst = Number(fullQuote.tax_rate) > 0;
        setGstEnabled(hasGst);

        const formattedValidUntil = fullQuote.valid_until
          ? fullQuote.valid_until.split("T")[0]
          : "";

        const items = (fullQuote.line_items && fullQuote.line_items.length > 0)
          ? fullQuote.line_items.map((it, idx) => ({
              description: it.description,
              quantity: Number(it.quantity),
              unit_price: Number(it.unit_price),
              sort_order: it.sort_order ?? idx,
            }))
          : [{ description: "", quantity: 1, unit_price: 0, sort_order: 0 }];

        reset({
          tenant_id: fullQuote.tenant_id || "",
          hospital_name: fullQuote.hospital_name || fullQuote.tenant_name || "",
          hospital_address: fullQuote.hospital_address || "",
          hospital_email: fullQuote.hospital_email || "",
          hospital_phone: fullQuote.hospital_phone || "",
          gst_number: fullQuote.gst_number || "",
          valid_until: formattedValidUntil,
          tax_rate: Number(fullQuote.tax_rate) || (hasGst ? 18 : 0),
          notes: fullQuote.notes || "",
          custom_terms: fullQuote.terms_and_conditions || "",
          line_items: items,
        });
      };

      loadDetails();
    }
  }, [isOpen, quote, reset]);

  const handleHospitalTypeChange = (type: "onboarded" | "unregistered") => {
    setHospitalType(type);
    if (type === "unregistered") {
      setValue("tenant_id", null);
    } else {
      setValue("hospital_name", "");
    }
  };

  const onSubmit = async (values: UpdateQuoteRequest) => {
    if (!quote) return;
    setSubmitting(true);
    try {
      const payload: UpdateQuoteRequest = {
        ...values,
        tenant_id: hospitalType === "onboarded" ? values.tenant_id : null,
        hospital_name: hospitalType === "unregistered" ? values.hospital_name : undefined,
        hospital_address: values.hospital_address || undefined,
        hospital_email: values.hospital_email || undefined,
        hospital_phone: values.hospital_phone || undefined,
        gst_number: values.gst_number?.trim() || undefined,
        tax_rate: gstEnabled ? Number(values.tax_rate) : 0,
        line_items: (values.line_items || []).map((item, index) => ({
          description: item.description,
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price),
          sort_order: index,
        })),
      };

      await platformBillingApi.quotes.update(quote.id, payload);
      toast.success("Quote updated successfully");
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Commercial Quote — ${quote?.quote_number || ""}`}
      size="xl"
    >
      {loadingQuoteDetails ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
          <span className="ml-2 text-sm text-slate-500">Loading quote details...</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Hospital Type Selector */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-800">Hospital Entity Type</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleHospitalTypeChange("onboarded")}
                className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition ${
                  hospitalType === "onboarded"
                    ? "border-sky-500 bg-sky-50/50 ring-2 ring-sky-500/20"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div
                  className={`rounded-lg p-2 ${
                    hospitalType === "onboarded"
                      ? "bg-sky-500 text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900">Onboarded Hospital</div>
                  <div className="text-xs text-slate-500">Select an existing registered tenant</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleHospitalTypeChange("unregistered")}
                className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition ${
                  hospitalType === "unregistered"
                    ? "border-sky-500 bg-sky-50/50 ring-2 ring-sky-500/20"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div
                  className={`rounded-lg p-2 ${
                    hospitalType === "unregistered"
                      ? "bg-sky-500 text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    Unregistered Hospital (Prospect)
                  </div>
                  <div className="text-xs text-slate-500">Quote for prospective client hospital</div>
                </div>
              </button>
            </div>
          </div>

          {/* Hospital Selection / Details */}
          {hospitalType === "onboarded" ? (
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Hospital / Tenant <span className="text-rose-500">*</span>
              </label>
              <select
                {...register("tenant_id", {
                  required: hospitalType === "onboarded" ? "Please select a hospital" : false,
                })}
                disabled={loadingTenants}
                className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 disabled:bg-slate-50"
              >
                <option value="">Select a hospital...</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.subdomain})
                  </option>
                ))}
              </select>
              {errors.tenant_id && (
                <p className="mt-1 text-xs text-rose-500">{errors.tenant_id.message}</p>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-4 space-y-3">
              <div className="flex items-center gap-2 text-amber-800 text-xs font-semibold">
                <Info className="h-4 w-4" />
                <span>Prospective Hospital Details</span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700">
                    Hospital Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    {...register("hospital_name", {
                      required:
                        hospitalType === "unregistered" ? "Hospital name is required" : false,
                    })}
                    placeholder="e.g. Apex Multispecialty Hospital"
                    className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                  />
                  {errors.hospital_name && (
                    <p className="mt-1 text-xs text-rose-500">{errors.hospital_name.message}</p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700">Hospital Address</label>
                  <input
                    type="text"
                    {...register("hospital_address")}
                    placeholder="e.g. Sector 14, Main Road, New Delhi"
                    className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700">Contact Email</label>
                  <input
                    type="email"
                    {...register("hospital_email")}
                    placeholder="billing@hospital.com"
                    className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700">Contact Phone</label>
                  <input
                    type="tel"
                    {...register("hospital_phone")}
                    placeholder="+91 9876543210"
                    className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Party GSTIN */}
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-slate-700">
                Hospital / Party GSTIN (Optional)
              </label>
              <span className="text-xs text-slate-500">Other Party GST number</span>
            </div>
            <input
              type="text"
              {...register("gst_number")}
              placeholder="e.g. 06ABBFT0873C1ZH (15-character GSTIN)"
              maxLength={15}
              className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm uppercase tracking-wider font-mono focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              This will be captured in the database and displayed under &apos;Prepared For&apos; in
              the generated Quote PDF.
            </p>
          </div>

          {/* Validity Date */}
          <div>
            <label className="block text-sm font-medium text-slate-700">Valid Until</label>
            <input
              type="date"
              {...register("valid_until")}
              className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            />
          </div>

          {/* Line Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-800">Line Items</label>
              <button
                type="button"
                onClick={() =>
                  append({
                    description: "",
                    quantity: 1,
                    unit_price: 0,
                    sort_order: fields.length,
                  })
                }
                className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-700"
              >
                <Plus className="h-4 w-4" /> Add Item
              </button>
            </div>

            <div className="space-y-2">
              {fields.map((field, index) => (
                <div key={field.id} className="flex gap-2 items-start">
                  <div className="flex-1">
                    <input
                      type="text"
                      {...register(`line_items.${index}.description` as const, {
                        required: "Description is required",
                      })}
                      placeholder="Item description (e.g. HMS Enterprise License)"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                    />
                  </div>
                  <div className="w-24">
                    <input
                      type="number"
                      step="any"
                      min="0.01"
                      {...register(`line_items.${index}.quantity` as const, {
                        required: true,
                        min: 0.01,
                      })}
                      placeholder="Qty"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-right focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                    />
                  </div>
                  <div className="w-32">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      {...register(`line_items.${index}.unit_price` as const, {
                        required: true,
                        min: 0,
                      })}
                      placeholder="Unit Price"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-right focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                    />
                  </div>
                  <div className="w-32 py-2 text-right font-medium text-sm text-slate-900">
                    ₹
                    {(
                      (Number(watchLineItems[index]?.quantity) || 0) *
                      (Number(watchLineItems[index]?.unit_price) || 0)
                    ).toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="rounded-xl p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition"
                    >
                      <Trash className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Taxes & Totals */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={gstEnabled}
                  onChange={(e) => {
                    setGstEnabled(e.target.checked);
                    if (!e.target.checked) setValue("tax_rate", 0);
                    else setValue("tax_rate", 18);
                  }}
                  className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 h-4 w-4"
                />
                <span className="text-sm font-medium text-slate-700">Apply GST</span>
              </label>
              {gstEnabled && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">GST Rate (%):</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    {...register("tax_rate", { valueAsNumber: true })}
                    className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-sm text-right focus:border-sky-500 focus:outline-none"
                  />
                </div>
              )}
            </div>

            <div className="border-t border-slate-200/60 pt-3 space-y-1.5 text-sm">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal</span>
                <span>
                  ₹
                  {subtotal.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              {gstEnabled && (
                <div className="flex justify-between text-slate-500">
                  <span>GST ({watchTaxRate}%)</span>
                  <span>
                    ₹
                    {taxAmount.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              )}
              <div className="flex justify-between font-bold text-slate-900 text-base pt-1 border-t border-slate-200/60">
                <span>Total Amount</span>
                <span>
                  ₹
                  {totalAmount.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Notes & Custom Terms */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">Internal Notes</label>
              <textarea
                {...register("notes")}
                rows={3}
                placeholder="Optional notes for internal tracking..."
                className="mt-1 block w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Terms & Conditions Override
              </label>
              <textarea
                {...register("custom_terms")}
                rows={3}
                placeholder="Leave blank to use default standard terms..."
                className="mt-1 block w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:shadow-md transition disabled:opacity-50"
            >
              {submitting ? "Saving Changes..." : "Save Changes"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
