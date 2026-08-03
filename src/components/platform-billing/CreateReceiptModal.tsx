"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Modal } from "@/components/common/Modal";
import { tenantsApi, Tenant } from "@/services/tenantsApi";
import { platformBillingApi } from "@/services/platformBillingApi";
import { CreateReceiptRequest, PlatformInvoice } from "@/types/platformBilling";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";

interface CreateReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  selectedInvoice?: PlatformInvoice | null;
}

export function CreateReceiptModal({
  isOpen,
  onClose,
  onSuccess,
  selectedInvoice,
}: CreateReceiptModalProps) {
  const [loadingTenants, setLoadingTenants] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [unpaidInvoices, setUnpaidInvoices] = useState<PlatformInvoice[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateReceiptRequest>({
    defaultValues: {
      tenant_id: "",
      platform_invoice_id: "",
      amount: 0,
      payment_method: "bank_transfer",
      payment_date: new Date().toISOString().split("T")[0],
      transaction_reference: "",
      notes: "",
      custom_terms: "",
    },
  });

  const watchTenantId = watch("tenant_id");
  const watchInvoiceId = watch("platform_invoice_id");

  // Load tenant list
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

  // Load pre-selected invoice
  useEffect(() => {
    if (isOpen && selectedInvoice) {
      setValue("tenant_id", selectedInvoice.tenant_id);
      setValue("platform_invoice_id", selectedInvoice.id);
      
      const balance = selectedInvoice.total_amount - selectedInvoice.paid_amount;
      setValue("amount", balance);
    }
  }, [isOpen, selectedInvoice, setValue]);

  // Fetch unpaid invoices for the selected tenant
  useEffect(() => {
    if (isOpen && watchTenantId && !selectedInvoice) {
      setLoadingInvoices(true);
      platformBillingApi.invoices
        .list({ tenant_id: watchTenantId, page_size: 100 })
        .then((res) => {
          // Filter only draft/sent invoices that are not fully paid
          const eligible = res.items.filter(
            (inv) => inv.status !== "paid" && inv.status !== "cancelled"
          );
          setUnpaidInvoices(eligible);
        })
        .catch((err) => {
          console.error("Failed to load invoices:", err);
          toast.error("Failed to load unpaid invoices");
        })
        .finally(() => {
          setLoadingInvoices(false);
        });
    } else {
      setUnpaidInvoices([]);
    }
  }, [isOpen, watchTenantId, selectedInvoice, setValue]);

  // Auto-fill outstanding balance on invoice change
  const handleInvoiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const invId = e.target.value;
    setValue("platform_invoice_id", invId);

    const match = unpaidInvoices.find((i) => i.id === invId);
    if (match) {
      setValue("amount", match.total_amount - match.paid_amount);
    }
  };

  const onSubmit = async (values: CreateReceiptRequest) => {
    setSubmitting(true);
    try {
      const payload = {
        ...values,
        amount: Number(values.amount),
      };
      await platformBillingApi.receipts.create(payload);
      toast.success("Payment receipt recorded successfully");
      reset();
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Log Platform Payment Receipt" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {selectedInvoice && (
          <div className="rounded-xl bg-sky-50 border border-sky-200 p-3.5 mb-4 text-sm text-sky-800">
            Logging payment for invoice <strong>{selectedInvoice.invoice_number}</strong> of{" "}
            <strong>{selectedInvoice.tenant_name}</strong>. Total Outstanding:{" "}
            <strong>₹{(selectedInvoice.total_amount - selectedInvoice.paid_amount).toFixed(2)}</strong>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">
              Hospital Tenant <span className="text-rose-500">*</span>
            </span>
            <select
              {...register("tenant_id", { required: "Hospital is required" })}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400 text-sm"
              disabled={loadingTenants || !!selectedInvoice}
            >
              <option value="">Select a hospital...</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            {errors.tenant_id && <p className="text-xs text-rose-500">{errors.tenant_id.message}</p>}
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">
              Select Invoice <span className="text-rose-500">*</span>
            </span>
            <select
              onChange={handleInvoiceChange}
              value={watchInvoiceId || ""}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400 text-sm"
              disabled={loadingInvoices || !!selectedInvoice || !watchTenantId}
            >
              <option value="">
                {selectedInvoice
                  ? selectedInvoice.invoice_number
                  : !watchTenantId
                  ? "Select hospital first..."
                  : unpaidInvoices.length === 0
                  ? "No outstanding invoices found"
                  : "Select invoice..."}
              </option>
              {unpaidInvoices.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.invoice_number} (Outstanding: ₹{(inv.total_amount - inv.paid_amount).toFixed(2)})
                </option>
              ))}
            </select>
            {!selectedInvoice && errors.platform_invoice_id && (
              <p className="text-xs text-rose-500">Invoice selection is required</p>
            )}
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">
              Payment Amount (INR) <span className="text-rose-500">*</span>
            </span>
            <input
              type="number"
              step="any"
              {...register("amount", { required: "Amount is required", valueAsNumber: true, min: 0.01 })}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400 text-sm"
            />
            {errors.amount && <p className="text-xs text-rose-500">Valid payment amount is required</p>}
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">
              Payment Method <span className="text-rose-500">*</span>
            </span>
            <select
              {...register("payment_method", { required: "Payment method is required" })}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400 text-sm"
            >
              <option value="bank_transfer">Bank Transfer (NEFT/IMPS)</option>
              <option value="upi">UPI (GPay/PhonePe)</option>
              <option value="online">Online Card</option>
              <option value="cash">Cash</option>
              <option value="cheque">Cheque</option>
            </select>
            {errors.payment_method && <p className="text-xs text-rose-500">{errors.payment_method.message}</p>}
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">Payment Date</span>
            <input
              type="date"
              {...register("payment_date")}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400 text-sm"
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">Transaction Reference No.</span>
            <input
              type="text"
              {...register("transaction_reference")}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400 text-sm"
              placeholder="UTR, Txn ID, Cheque No."
            />
          </label>
        </div>

        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-700">Internal Notes</span>
          <textarea
            {...register("notes")}
            rows={2}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
            placeholder="Payment reference logs, clearing dates, etc..."
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-700">Custom Terms & Conditions Override</span>
          <textarea
            {...register("custom_terms")}
            rows={2}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
            placeholder="Leave empty to use Cura standard platform terms..."
          />
        </label>

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
            {submitting ? "Saving..." : "Record Payment"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
