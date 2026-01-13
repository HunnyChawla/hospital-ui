"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Modal } from "@/components/common/Modal";
import { tenantsApi, SetShiftConfigRequest, ShiftConfiguration } from "@/services/tenantsApi";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { Clock, Trash2 } from "lucide-react";

interface ShiftConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  tenantName: string;
}

const DEFAULT_CONFIG: SetShiftConfigRequest = {
  morning_start_time: "08:00",
  morning_end_time: "14:00",
  evening_start_time: "14:00",
  evening_end_time: "20:00",
  night_start_time: "20:00",
  night_end_time: "08:00",
};

export function ShiftConfigModal({
  isOpen,
  onClose,
  tenantId,
  tenantName,
}: ShiftConfigModalProps) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hasExistingConfig, setHasExistingConfig] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SetShiftConfigRequest>();

  useEffect(() => {
    if (isOpen && tenantId) {
      setLoading(true);
      tenantsApi
        .getShiftConfiguration(tenantId)
        .then((config: ShiftConfiguration) => {
          reset({
            morning_start_time: config.morning_start_time,
            morning_end_time: config.morning_end_time,
            evening_start_time: config.evening_start_time,
            evening_end_time: config.evening_end_time,
            night_start_time: config.night_start_time,
            night_end_time: config.night_end_time,
          });
          setHasExistingConfig(true);
        })
        .catch(() => {
          // No existing config, use defaults
          reset(DEFAULT_CONFIG);
          setHasExistingConfig(false);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen, tenantId, reset]);

  const onSubmit = async (values: SetShiftConfigRequest) => {
    setSubmitting(true);
    try {
      await tenantsApi.setShiftConfiguration(tenantId, values);
      toast.success("Shift configuration saved successfully");
      setHasExistingConfig(true);
      onClose();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete the shift configuration? This will revert to default values.")) {
      return;
    }
    setSubmitting(true);
    try {
      await tenantsApi.deleteShiftConfiguration(tenantId);
      toast.success("Shift configuration deleted");
      reset(DEFAULT_CONFIG);
      setHasExistingConfig(false);
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
      title={`Shift Configuration - ${tenantName}`}
      size="md"
    >
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <p className="text-slate-500">Loading configuration...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Morning Shift */}
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600" />
              <h3 className="font-medium text-amber-800">Morning Shift</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <label className="space-y-1">
                <span className="text-sm text-amber-700">Start Time</span>
                <input
                  type="time"
                  {...register("morning_start_time", { required: "Required" })}
                  className="w-full rounded-lg border border-amber-300 bg-white px-3 py-2 outline-none focus:border-amber-500"
                />
                {errors.morning_start_time && (
                  <p className="text-xs text-rose-500">{errors.morning_start_time.message}</p>
                )}
              </label>
              <label className="space-y-1">
                <span className="text-sm text-amber-700">End Time</span>
                <input
                  type="time"
                  {...register("morning_end_time", { required: "Required" })}
                  className="w-full rounded-lg border border-amber-300 bg-white px-3 py-2 outline-none focus:border-amber-500"
                />
                {errors.morning_end_time && (
                  <p className="text-xs text-rose-500">{errors.morning_end_time.message}</p>
                )}
              </label>
            </div>
          </div>

          {/* Evening Shift */}
          <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-sky-600" />
              <h3 className="font-medium text-sky-800">Evening Shift</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <label className="space-y-1">
                <span className="text-sm text-sky-700">Start Time</span>
                <input
                  type="time"
                  {...register("evening_start_time", { required: "Required" })}
                  className="w-full rounded-lg border border-sky-300 bg-white px-3 py-2 outline-none focus:border-sky-500"
                />
                {errors.evening_start_time && (
                  <p className="text-xs text-rose-500">{errors.evening_start_time.message}</p>
                )}
              </label>
              <label className="space-y-1">
                <span className="text-sm text-sky-700">End Time</span>
                <input
                  type="time"
                  {...register("evening_end_time", { required: "Required" })}
                  className="w-full rounded-lg border border-sky-300 bg-white px-3 py-2 outline-none focus:border-sky-500"
                />
                {errors.evening_end_time && (
                  <p className="text-xs text-rose-500">{errors.evening_end_time.message}</p>
                )}
              </label>
            </div>
          </div>

          {/* Night Shift */}
          <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-indigo-600" />
              <h3 className="font-medium text-indigo-800">Night Shift</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <label className="space-y-1">
                <span className="text-sm text-indigo-700">Start Time</span>
                <input
                  type="time"
                  {...register("night_start_time", { required: "Required" })}
                  className="w-full rounded-lg border border-indigo-300 bg-white px-3 py-2 outline-none focus:border-indigo-500"
                />
                {errors.night_start_time && (
                  <p className="text-xs text-rose-500">{errors.night_start_time.message}</p>
                )}
              </label>
              <label className="space-y-1">
                <span className="text-sm text-indigo-700">End Time</span>
                <input
                  type="time"
                  {...register("night_end_time", { required: "Required" })}
                  className="w-full rounded-lg border border-indigo-300 bg-white px-3 py-2 outline-none focus:border-indigo-500"
                />
                {errors.night_end_time && (
                  <p className="text-xs text-rose-500">{errors.night_end_time.message}</p>
                )}
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-4">
            {hasExistingConfig && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={submitting}
                className="flex items-center gap-2 rounded-xl border border-rose-300 px-4 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                Delete Config
              </button>
            )}
            <div className="ml-auto flex gap-3">
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
                {submitting ? "Saving..." : "Save Configuration"}
              </button>
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
}
