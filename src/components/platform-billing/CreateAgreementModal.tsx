"use client";

import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { Modal } from "@/components/common/Modal";
import { tenantsApi, Tenant } from "@/services/tenantsApi";
import { platformBillingApi } from "@/services/platformBillingApi";
import { CreateAgreementRequest, AgreementClause } from "@/types/platformBilling";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { Plus, Trash, ArrowUp, ArrowDown, Settings } from "lucide-react";

interface CreateAgreementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateAgreementModal({ isOpen, onClose, onSuccess }: CreateAgreementModalProps) {
  const [loadingTenants, setLoadingTenants] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loadingDefaults, setLoadingDefaults] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateAgreementRequest>({
    defaultValues: {
      tenant_id: "",
      title: "Service Level Agreement (SLA) & Software License Agreement",
      clauses: [],
      custom_terms: "",
      notes: "",
    },
  });

  const { fields, append, remove, move, replace } = useFieldArray({
    control,
    name: "clauses",
  });

  // Fetch tenants & default clauses
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

      setLoadingDefaults(true);
      platformBillingApi.agreements
        .getDefaultClauses()
        .then((clauses) => {
          replace(clauses);
        })
        .catch((err) => {
          console.error("Failed to load default clauses:", err);
          toast.error("Failed to load default agreement clauses");
        })
        .finally(() => {
          setLoadingDefaults(false);
        });
    }
  }, [isOpen, replace]);

  const onSubmit = async (values: CreateAgreementRequest) => {
    setSubmitting(true);
    try {
      // Re-assign sort orders based on current index positions
      const clausesWithUpdatedOrder = values.clauses.map((clause, idx) => ({
        ...clause,
        sort_order: idx + 1,
      }));
      
      const payload = {
        ...values,
        clauses: clausesWithUpdatedOrder,
      };

      await platformBillingApi.agreements.create(payload);
      toast.success("Service agreement drafted successfully");
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
    <Modal isOpen={isOpen} onClose={onClose} title="Draft Service Agreement" size="xl">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <label className="md:col-span-1 space-y-1">
            <span className="text-sm font-medium text-slate-700">
              Hospital Tenant <span className="text-rose-500">*</span>
            </span>
            <select
              {...register("tenant_id", { required: "Hospital is required" })}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400 text-sm"
              disabled={loadingTenants}
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

          <label className="md:col-span-2 space-y-1">
            <span className="text-sm font-medium text-slate-700">
              Agreement Title <span className="text-rose-500">*</span>
            </span>
            <input
              type="text"
              {...register("title", { required: "Agreement title is required" })}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400 text-sm"
            />
            {errors.title && <p className="text-xs text-rose-500">{errors.title.message}</p>}
          </label>
        </div>

        {/* Clauses Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div className="flex items-center gap-1.5">
              <Settings className="h-4.5 w-4.5 text-slate-500" />
              <h3 className="text-sm font-semibold text-slate-800">Customize Agreement Clauses</h3>
            </div>
            <button
              type="button"
              onClick={() => append({ title: `${fields.length + 1}. Custom Clause`, content: "", sort_order: fields.length + 1 })}
              className="inline-flex items-center gap-1 rounded-xl bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-600 hover:bg-sky-100 transition"
            >
              <Plus className="h-3.5 w-3.5" /> Add Clause
            </button>
          </div>

          {loadingDefaults ? (
            <div className="py-6 text-center text-sm text-slate-500">Loading default agreement clauses...</div>
          ) : fields.length === 0 ? (
            <div className="p-4 text-center rounded-xl bg-slate-50 text-sm text-slate-500 border border-slate-200">
              No clauses added. Add a custom clause using the button above.
            </div>
          ) : (
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
              {fields.map((field, index) => (
                <div key={field.id} className="flex gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 items-start">
                  {/* Reorder Buttons */}
                  <div className="flex flex-col gap-1 mt-6">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => move(index, index - 1)}
                      className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 disabled:opacity-30 transition"
                      title="Move Up"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={index === fields.length - 1}
                      onClick={() => move(index, index + 1)}
                      className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 disabled:opacity-30 transition"
                      title="Move Down"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="flex-grow grid grid-cols-1 gap-3">
                    <label className="space-y-1">
                      <span className="text-xs font-semibold text-slate-600">Clause Heading *</span>
                      <input
                        type="text"
                        {...register(`clauses.${index}.title` as const, { required: "Required" })}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-sky-400 font-medium text-slate-800"
                        placeholder="e.g. 1. Scope of Work"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs font-semibold text-slate-600">Clause Content *</span>
                      <textarea
                        {...register(`clauses.${index}.content` as const, { required: "Required" })}
                        rows={3}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-sky-400 text-slate-600"
                        placeholder="Detailed terms of the clause..."
                      />
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="mt-6 rounded-lg p-2 text-rose-500 hover:bg-rose-50 transition"
                    title="Remove Clause"
                  >
                    <Trash className="h-4.5 w-4.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Other text fields */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-700">Custom Introduction / Terms Override</span>
            <textarea
              {...register("custom_terms")}
              rows={3}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 text-slate-600"
              placeholder="Leave empty to use Cura standard platform terms..."
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-700">Internal Agreement Notes</span>
            <textarea
              {...register("notes")}
              rows={3}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 text-slate-600"
              placeholder="For platform owners internal logs/history..."
            />
          </label>
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
            {submitting ? "Drafting..." : "Save Agreement Draft"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
