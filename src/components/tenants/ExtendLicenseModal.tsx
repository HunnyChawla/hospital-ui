"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Modal } from "@/components/common/Modal";
import { tenantsApi, Tenant } from "@/services/tenantsApi";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { formatDate } from "@/utils/format";
import { CalendarClock, AlertTriangle, CheckCircle } from "lucide-react";

interface ExtendLicenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: Tenant;
}

interface FormData {
  license_valid_till: string;
}

export function ExtendLicenseModal({
  isOpen,
  onClose,
  tenant,
}: ExtendLicenseModalProps) {
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      license_valid_till: tenant.license_valid_till
        ? tenant.license_valid_till.split("T")[0]
        : "",
    },
  });

  const getLicenseStatus = () => {
    if (!tenant.license_valid_till) {
      return { status: "none", color: "text-slate-500", bgColor: "bg-slate-50" };
    }

    const expiry = new Date(tenant.license_valid_till);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) {
      return { status: "expired", color: "text-rose-600", bgColor: "bg-rose-50", days: Math.abs(daysUntilExpiry) };
    }
    if (daysUntilExpiry <= 30) {
      return { status: "expiring", color: "text-amber-600", bgColor: "bg-amber-50", days: daysUntilExpiry };
    }
    return { status: "valid", color: "text-emerald-600", bgColor: "bg-emerald-50", days: daysUntilExpiry };
  };

  const licenseStatus = getLicenseStatus();

  const addMonths = (months: number) => {
    const baseDate = tenant.license_valid_till
      ? new Date(tenant.license_valid_till)
      : new Date();

    // If expired, start from today
    if (baseDate < new Date()) {
      baseDate.setTime(new Date().getTime());
    }

    baseDate.setMonth(baseDate.getMonth() + months);
    const dateString = baseDate.toISOString().split("T")[0];
    setValue("license_valid_till", dateString);
  };

  const onSubmit = async (values: FormData) => {
    setSubmitting(true);
    try {
      await tenantsApi.update(tenant.id, {
        license_valid_till: values.license_valid_till,
      });
      toast.success("License updated successfully");
      window.dispatchEvent(
        new CustomEvent("tenant:updated", {
          detail: { tenantId: tenant.id },
        })
      );
      onClose();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Extend License - ${tenant.name}`}
      size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Current License Status */}
        <div className={`rounded-xl border p-4 ${licenseStatus.bgColor}`}>
          <div className="flex items-start gap-3">
            {licenseStatus.status === "expired" ? (
              <AlertTriangle className="h-5 w-5 text-rose-500 mt-0.5" />
            ) : licenseStatus.status === "expiring" ? (
              <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
            ) : licenseStatus.status === "valid" ? (
              <CheckCircle className="h-5 w-5 text-emerald-500 mt-0.5" />
            ) : (
              <CalendarClock className="h-5 w-5 text-slate-400 mt-0.5" />
            )}
            <div>
              <p className={`font-medium ${licenseStatus.color}`}>
                {licenseStatus.status === "expired"
                  ? `License expired ${licenseStatus.days} days ago`
                  : licenseStatus.status === "expiring"
                  ? `License expires in ${licenseStatus.days} days`
                  : licenseStatus.status === "valid"
                  ? `License valid for ${licenseStatus.days} days`
                  : "No license date set"}
              </p>
              {tenant.license_valid_till && (
                <p className="text-sm text-slate-600 mt-1">
                  Current expiry: {formatDate(tenant.license_valid_till)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Quick Extend Buttons */}
        <div>
          <p className="text-sm font-medium text-slate-700 mb-2">Quick Extend:</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => addMonths(1)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              +1 Month
            </button>
            <button
              type="button"
              onClick={() => addMonths(3)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              +3 Months
            </button>
            <button
              type="button"
              onClick={() => addMonths(6)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              +6 Months
            </button>
            <button
              type="button"
              onClick={() => addMonths(12)}
              className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-sm font-medium text-sky-700 transition hover:bg-sky-100"
            >
              +1 Year
            </button>
          </div>
        </div>

        {/* Date Picker */}
        <label className="space-y-1 block">
          <span className="text-slate-600">
            New Expiry Date <span className="text-rose-500">*</span>
          </span>
          <input
            type="date"
            {...register("license_valid_till", { required: "Expiry date is required" })}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
          />
          {errors.license_valid_till && (
            <p className="text-xs text-rose-500">{errors.license_valid_till.message}</p>
          )}
        </label>

        <div className="flex justify-end gap-3 pt-4">
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
            {submitting ? "Updating..." : "Update License"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
