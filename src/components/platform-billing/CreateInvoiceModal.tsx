"use client";

import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { Modal } from "@/components/common/Modal";
import { tenantsApi, Tenant } from "@/services/tenantsApi";
import { platformBillingApi } from "@/services/platformBillingApi";
import { CreatePlatformInvoiceRequest, Quote } from "@/types/platformBilling";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { Plus, Trash, Building2, UserPlus, FileCheck2, Info } from "lucide-react";

interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateInvoiceModal({ isOpen, onClose, onSuccess }: CreateInvoiceModalProps) {
  const [createMode, setCreateMode] = useState<"manual" | "quote">("manual");
  const [hospitalType, setHospitalType] = useState<"onboarded" | "unregistered">("onboarded");
  const [loadingTenants, setLoadingTenants] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [acceptedQuotes, setAcceptedQuotes] = useState<Quote[]>([]);
  
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
  } = useForm<CreatePlatformInvoiceRequest>({
    defaultValues: {
      tenant_id: "",
      hospital_name: "",
      hospital_address: "",
      hospital_email: "",
      hospital_phone: "",
      quote_id: null,
      line_items: [{ description: "", quantity: 1, unit_price: 0, sort_order: 0 }],
      invoice_date: new Date().toISOString().split("T")[0],
      due_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      tax_rate: 0,
      gst_number: "",
      notes: "",
      custom_terms: "",
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: "line_items",
  });

  const watchLineItems = watch("line_items");
  const watchTaxRate = watch("tax_rate") || 0;
  const watchQuoteId = watch("quote_id");

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

  // Fetch quotes (for all hospitals - onboarded or unregistered)
  useEffect(() => {
    if (isOpen && createMode === "quote") {
      setLoadingQuotes(true);
      platformBillingApi.quotes
        .list({ page_size: 100 })
        .then((res) => {
          setAcceptedQuotes(res.items);
        })
        .catch((err) => {
          console.error("Failed to load quotes:", err);
          toast.error("Failed to load quotes");
        })
        .finally(() => {
          setLoadingQuotes(false);
        });
    }
  }, [isOpen, createMode]);

  // Handle quote selection
  const handleQuoteChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const quoteId = e.target.value;
    setValue("quote_id", quoteId || null);

    if (quoteId) {
      try {
        const quoteDetail = await platformBillingApi.quotes.getById(quoteId);
        // Pre-fill line items from quote
        const items = quoteDetail.line_items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          sort_order: item.sort_order,
        }));
        replace(items);
        
        // Match GST rate & party GSTIN
        if (quoteDetail.tax_rate > 0) {
          setGstEnabled(true);
          setValue("tax_rate", quoteDetail.tax_rate);
        } else {
          setGstEnabled(false);
          setValue("tax_rate", 0);
        }

        if (quoteDetail.gst_number) {
          setValue("gst_number", quoteDetail.gst_number);
        }
        if (quoteDetail.tenant_id) {
          setValue("tenant_id", quoteDetail.tenant_id);
          setHospitalType("onboarded");
        } else {
          setValue("tenant_id", null);
          setValue("hospital_name", quoteDetail.hospital_name || quoteDetail.tenant_name);
          setValue("hospital_address", quoteDetail.hospital_address || "");
          setValue("hospital_email", quoteDetail.hospital_email || "");
          setValue("hospital_phone", quoteDetail.hospital_phone || "");
          setHospitalType("unregistered");
        }

        setValue("notes", quoteDetail.notes || "");
        setValue("custom_terms", quoteDetail.terms_and_conditions || "");
      } catch (err) {
        console.error("Failed to fetch quote details:", err);
        toast.error("Failed to load quote details");
      }
    }
  };

  const handleHospitalTypeChange = (type: "onboarded" | "unregistered") => {
    setHospitalType(type);
    if (type === "unregistered") {
      setValue("tenant_id", null);
    } else {
      setValue("hospital_name", "");
    }
  };

  const onSubmit = async (values: CreatePlatformInvoiceRequest) => {
    setSubmitting(true);
    try {
      if (createMode === "quote" && watchQuoteId) {
        // Create from quote API
        await platformBillingApi.invoices.createFromQuote(watchQuoteId, values.due_date);
        toast.success("Invoice generated successfully from accepted quote");
      } else {
        // Direct manual creation
        const payload: CreatePlatformInvoiceRequest = {
          ...values,
          tenant_id: hospitalType === "onboarded" ? values.tenant_id : null,
          hospital_name: hospitalType === "unregistered" ? values.hospital_name : undefined,
          hospital_address: values.hospital_address || undefined,
          hospital_email: values.hospital_email || undefined,
          hospital_phone: values.hospital_phone || undefined,
          gst_number: values.gst_number || undefined,
          tax_rate: gstEnabled ? Number(values.tax_rate) : 0,
        };
        await platformBillingApi.invoices.create(payload);
        toast.success("Invoice created successfully");
      }

      reset();
      setGstEnabled(false);
      setCreateMode("manual");
      setHospitalType("onboarded");
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Platform Invoice" size="xl">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Creation Mode Switcher */}
        <div className="flex border-b border-slate-200">
          <button
            type="button"
            onClick={() => {
              setCreateMode("manual");
              setValue("quote_id", null);
            }}
            className={`border-b-2 py-3 px-4 text-sm font-semibold transition ${
              createMode === "manual"
                ? "border-sky-500 text-sky-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Create Directly
          </button>
          <button
            type="button"
            onClick={() => setCreateMode("quote")}
            className={`border-b-2 py-3 px-4 text-sm font-semibold transition ${
              createMode === "quote"
                ? "border-sky-500 text-sky-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Generate from Accepted Quote
          </button>
        </div>

        {createMode === "quote" ? (
          /* Generate from Quote Mode */
          <div className="space-y-4 rounded-xl border border-sky-100 bg-sky-50/40 p-4">
            <div className="flex items-center gap-2 text-sky-800 text-sm font-medium">
              <FileCheck2 className="h-4 w-4 text-sky-600" />
              <span>Select an accepted quote to convert into an official invoice:</span>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="space-y-1">
                <span className="text-sm font-medium text-slate-700">
                  Accepted Quote <span className="text-rose-500">*</span>
                </span>
                <select
                  onChange={handleQuoteChange}
                  value={watchQuoteId || ""}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400 text-sm"
                  disabled={loadingQuotes}
                >
                  <option value="">
                    {loadingQuotes
                      ? "Loading quotes..."
                      : acceptedQuotes.length === 0
                      ? "No quotes found"
                      : "Select a quote..."}
                  </option>
                  {acceptedQuotes.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.quote_number} - {q.tenant_name} (₹{q.total_amount.toLocaleString("en-IN")})
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-sm font-medium text-slate-700">
                  Due Date <span className="text-rose-500">*</span>
                </span>
                <input
                  type="date"
                  {...register("due_date", { required: "Due date is required" })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400 text-sm"
                />
                {errors.due_date && <p className="text-xs text-rose-500">{errors.due_date.message}</p>}
              </label>
            </div>
          </div>
        ) : (
          /* Manual Mode */
          <div className="space-y-4">
            {/* Hospital Type Selection Tabs */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 block">
                Target Hospital Entity
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleHospitalTypeChange("onboarded")}
                  className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-medium transition ${
                    hospitalType === "onboarded"
                      ? "border-sky-500 bg-sky-50/50 text-sky-700 shadow-sm"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Building2 className="h-4 w-4" />
                  Onboarded Hospital (Registered)
                </button>
                <button
                  type="button"
                  onClick={() => handleHospitalTypeChange("unregistered")}
                  className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-medium transition ${
                    hospitalType === "unregistered"
                      ? "border-sky-500 bg-sky-50/50 text-sky-700 shadow-sm"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <UserPlus className="h-4 w-4" />
                  Unregistered Hospital (Prospect)
                </button>
              </div>
            </div>

            {/* Hospital fields */}
            {hospitalType === "onboarded" ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <label className="space-y-1 md:col-span-1">
                  <span className="text-sm font-medium text-slate-700">
                    Hospital Tenant <span className="text-rose-500">*</span>
                  </span>
                  <select
                    {...register("tenant_id", {
                      required: hospitalType === "onboarded" ? "Hospital tenant is required" : false,
                    })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400 text-sm"
                    disabled={loadingTenants}
                  >
                    <option value="">Select an active hospital...</option>
                    {tenants.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.subdomain})
                      </option>
                    ))}
                  </select>
                  {errors.tenant_id && <p className="text-xs text-rose-500">{errors.tenant_id.message}</p>}
                </label>

                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Invoice Date</span>
                  <input
                    type="date"
                    {...register("invoice_date")}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400 text-sm"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">
                    Due Date <span className="text-rose-500">*</span>
                  </span>
                  <input
                    type="date"
                    {...register("due_date", { required: "Due date is required" })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400 text-sm"
                  />
                  {errors.due_date && <p className="text-xs text-rose-500">{errors.due_date.message}</p>}
                </label>
              </div>
            ) : (
              <div className="space-y-4 rounded-xl border border-sky-100 bg-sky-50/30 p-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <label className="space-y-1">
                    <span className="text-sm font-medium text-slate-700">
                      Hospital / Entity Name <span className="text-rose-500">*</span>
                    </span>
                    <input
                      type="text"
                      {...register("hospital_name", {
                        required: hospitalType === "unregistered" ? "Hospital name is required" : false,
                      })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
                      placeholder="e.g. Apex Health Clinic"
                    />
                    {errors.hospital_name && <p className="text-xs text-rose-500">{errors.hospital_name.message}</p>}
                  </label>

                  <label className="space-y-1">
                    <span className="text-sm font-medium text-slate-700">Invoice Date</span>
                    <input
                      type="date"
                      {...register("invoice_date")}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400 text-sm"
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="text-sm font-medium text-slate-700">
                      Due Date <span className="text-rose-500">*</span>
                    </span>
                    <input
                      type="date"
                      {...register("due_date", { required: "Due date is required" })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400 text-sm"
                    />
                    {errors.due_date && <p className="text-xs text-rose-500">{errors.due_date.message}</p>}
                  </label>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label className="space-y-1">
                    <span className="text-sm font-medium text-slate-700">Contact Email</span>
                    <input
                      type="email"
                      {...register("hospital_email")}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
                      placeholder="contact@hospital.com"
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="text-sm font-medium text-slate-700">Contact Phone</span>
                    <input
                      type="text"
                      {...register("hospital_phone")}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
                      placeholder="+91 98765 43210"
                    />
                  </label>
                </div>

                <label className="block space-y-1">
                  <span className="text-sm font-medium text-slate-700">Hospital Address</span>
                  <input
                    type="text"
                    {...register("hospital_address")}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
                    placeholder="Plot 12, Sector 18, City, State, PIN"
                  />
                </label>
              </div>
            )}
          </div>
        )}

        {/* Other Party GSTIN Input */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2">
          <label className="block space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">Hospital / Party GSTIN (Optional)</span>
              <span className="text-xs text-slate-400">Printed under &quot;BILLED TO&quot;</span>
            </div>
            <input
              type="text"
              {...register("gst_number")}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm uppercase outline-none focus:border-sky-400"
              placeholder="e.g. 06ABBFT0873C1ZH"
            />
          </label>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Info className="h-3.5 w-3.5 text-sky-500 flex-shrink-0" />
            <span>
              Our company credentials (Technesian Software Solutions LLP | GSTIN: 06ABBFT0873C1ZH) are automatically included in the header banner.
            </span>
          </div>
        </div>

        {/* Line Items */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">Line Items</h3>
            {createMode === "manual" && (
              <button
                type="button"
                onClick={() => append({ description: "", quantity: 1, unit_price: 0, sort_order: fields.length })}
                className="inline-flex items-center gap-1 rounded-xl bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-600 hover:bg-sky-100 transition"
              >
                <Plus className="h-3.5 w-3.5" /> Add Item
              </button>
            )}
          </div>

          <div className="space-y-3">
            {fields.map((field, index) => (
              <div key={field.id} className="flex gap-3 items-start bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="flex-grow grid grid-cols-1 gap-3 sm:grid-cols-4">
                  <label className="sm:col-span-2 space-y-1">
                    <span className="text-xs text-slate-500">Description *</span>
                    <input
                      type="text"
                      {...register(`line_items.${index}.description` as const, { required: "Required" })}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-sky-400"
                      disabled={createMode === "quote"}
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs text-slate-500">Quantity *</span>
                    <input
                      type="number"
                      step="any"
                      {...register(`line_items.${index}.quantity` as const, {
                        required: "Required",
                        valueAsNumber: true,
                      })}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-sky-400"
                      disabled={createMode === "quote"}
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs text-slate-500">Unit Price (INR) *</span>
                    <input
                      type="number"
                      step="any"
                      {...register(`line_items.${index}.unit_price` as const, {
                        required: "Required",
                        valueAsNumber: true,
                      })}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-sky-400"
                      disabled={createMode === "quote"}
                    />
                  </label>
                </div>
                {fields.length > 1 && createMode === "manual" && (
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="mt-6 rounded-lg p-2 text-rose-500 hover:bg-rose-50 transition"
                  >
                    <Trash className="h-4.5 w-4.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* GST block */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">Charge GST (Tax) on Invoice</span>
            <button
              type="button"
              onClick={() => {
                const newVal = !gstEnabled;
                setGstEnabled(newVal);
                setValue("tax_rate", newVal ? 18 : 0);
              }}
              disabled={createMode === "quote"}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                gstEnabled ? "bg-sky-500" : "bg-slate-300"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  gstEnabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {gstEnabled && (
            <label className="block max-w-xs space-y-1">
              <span className="text-xs text-slate-600">GST Rate (%)</span>
              <input
                type="number"
                step="any"
                {...register("tax_rate", { valueAsNumber: true })}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-sky-400"
                disabled={createMode === "quote"}
              />
            </label>
          )}
        </div>

        {/* Text fields */}
        <div className="space-y-4">
          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-700">Internal Notes</span>
            <textarea
              {...register("notes")}
              rows={2}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
              placeholder="Internal tracking details..."
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-700">Custom Terms & Conditions Override</span>
            <textarea
              {...register("custom_terms")}
              rows={3}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
              placeholder="Leave empty to use standard platform invoice terms..."
            />
          </label>
        </div>

        {/* Totals Summary */}
        <div className="flex flex-col items-end gap-1.5 border-t border-slate-200 pt-4 text-sm text-slate-600">
          <div>
            Subtotal: <span className="font-semibold text-slate-800">₹{subtotal.toFixed(2)}</span>
          </div>
          {gstEnabled && (
            <div>
              GST ({watchTaxRate}%): <span className="font-semibold text-slate-800">₹{taxAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="text-base font-bold text-slate-900">
            Total Amount: ₹{totalAmount.toFixed(2)}
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow-md disabled:opacity-50"
          >
            {submitting ? "Processing..." : createMode === "quote" ? "Generate Invoice" : "Create Invoice"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
