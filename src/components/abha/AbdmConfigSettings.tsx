"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { IdCard, Loader2, Save, ShieldAlert, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { abhaApi, type TenantAbdmConfigDto } from "@/services/abhaApi";
import { formatDateTime } from "@/utils/format";
import { getErrorMessage } from "@/utils/errorHandler";

type FormValues = {
  hip_id: string;
  hip_name: string;
};

export function AbdmConfigSettings() {
  const queryClient = useQueryClient();

  const { data: config, isLoading, error } = useQuery({
    queryKey: ["abha-config"],
    queryFn: () => abhaApi.getConfig(),
  });

  const abhaNotEnabled = (error as any)?.response?.status === 403;

  const {
    register,
    handleSubmit,
    reset,
    formState: { isDirty },
  } = useForm<FormValues>({
    defaultValues: { hip_id: "", hip_name: "" },
  });

  useEffect(() => {
    if (config) {
      reset({ hip_id: config.hip_id || "", hip_name: config.hip_name || "" });
    }
  }, [config, reset]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      abhaApi.updateConfig({
        hip_id: values.hip_id.trim() || null,
        hip_name: values.hip_name.trim() || null,
      }),
    onSuccess: (updated: TenantAbdmConfigDto) => {
      queryClient.setQueryData(["abha-config"], updated);
      toast.success("ABDM configuration saved");
    },
    onError: (err) => {
      toast.error(getErrorMessage(err) || "Failed to save ABDM configuration");
    },
  });

  const onSubmit = (values: FormValues) => mutation.mutate(values);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
          <p className="text-sm text-slate-500">Loading ABDM configuration...</p>
        </div>
      </div>
    );
  }

  if (abhaNotEnabled) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 flex items-start gap-3">
        <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-amber-900">ABHA integration is not enabled</p>
          <p className="text-sm text-amber-700 mt-1">
            ABHA is not enabled for your organization. Contact your platform administrator to turn it on before configuring your ABDM facility details.
          </p>
        </div>
      </div>
    );
  }

  const isUnconfigured = !config?.hip_id && !isDirty;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100">
          <IdCard className="h-5 w-5 text-sky-600" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">ABDM Settings</h1>
          <p className="text-sm text-slate-500">
            Register your hospital&apos;s Health Information Provider (HIP) details with ABDM
          </p>
        </div>
      </div>

      {isUnconfigured && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            Your facility isn&apos;t registered with ABDM yet. Enter your HIP ID and name below to enable ABHA enrollment and linking for your staff.
          </p>
        </div>
      )}

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden"
      >
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">HIP Facility Details</h2>
          <p className="text-sm text-slate-500 mt-1">
            These identify your hospital to the ABDM Gateway on every enrollment/linking request
          </p>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              HIP ID
            </label>
            <input
              type="text"
              maxLength={50}
              placeholder="e.g. IN0000000001"
              {...register("hip_id")}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            <p className="mt-1.5 text-xs text-slate-500">
              Your registered Health Information Provider ID with ABDM
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              HIP Facility Name
            </label>
            <input
              type="text"
              maxLength={200}
              placeholder="e.g. Cura Multi-Specialty Hospital"
              {...register("hip_name")}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <p className="text-xs text-slate-400">
              {config?.updated_at
                ? `Last saved on ${formatDateTime(config.updated_at)}${config.updated_by ? ` by ${config.updated_by}` : ""}`
                : "Not saved yet"}
            </p>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Configuration
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
