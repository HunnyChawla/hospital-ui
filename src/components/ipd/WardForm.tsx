"use client";

import { useForm } from "react-hook-form";
import { useEffect, useRef } from "react";
import { wardsApi, Ward, CreateWardRequest, UpdateWardRequest } from "@/services/wardsApi";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";

interface WardFormProps {
  defaultValues?: Ward;
  onSuccess?: () => void;
}

export function WardForm({ defaultValues, onSuccess }: WardFormProps) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateWardRequest & UpdateWardRequest>();
  const originalValuesRef = useRef<Partial<Ward> | null>(null);

  useEffect(() => {
    if (defaultValues) {
      const initialValues = {
        ward_name: defaultValues.ward_name,
        ward_code: defaultValues.ward_code,
        floor: defaultValues.floor ?? undefined,
        is_active: defaultValues.is_active,
      };
      reset(initialValues);
      // Store original values for comparison
      originalValuesRef.current = {
        ward_name: defaultValues.ward_name,
        ward_code: defaultValues.ward_code,
        floor: defaultValues.floor,
        is_active: defaultValues.is_active,
      };
    } else {
      reset({
        ward_name: "",
        ward_code: "",
        floor: undefined,
      });
      originalValuesRef.current = null;
    }
  }, [defaultValues, reset]);

  const onSubmit = async (values: CreateWardRequest & UpdateWardRequest) => {
    try {
      const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
      
      if (defaultValues && originalValuesRef.current) {
        // Update ward - only send changed fields
        const updateData: UpdateWardRequest = {};
        
        if (values.ward_name !== originalValuesRef.current.ward_name) {
          updateData.ward_name = values.ward_name;
        }
        if (values.ward_code !== originalValuesRef.current.ward_code) {
          updateData.ward_code = values.ward_code;
        }
        if (values.floor !== originalValuesRef.current.floor) {
          updateData.floor = values.floor ?? null;
        }
        // Handle boolean comparison
        const currentIsActive = values.is_active === true;
        const originalIsActive = originalValuesRef.current.is_active === true;
        if (currentIsActive !== originalIsActive) {
          updateData.is_active = currentIsActive;
        }

        // Only make API call if there are changes
        if (Object.keys(updateData).length > 0) {
          await wardsApi.update(defaultValues.id, updateData, tenantId || undefined);
          toast.success("Ward updated successfully!");
          window.dispatchEvent(new CustomEvent("ward:updated", { detail: { wardId: defaultValues.id } }));
        } else {
          toast.info("No changes to save");
        }
      } else {
        // Create ward
        const createData: CreateWardRequest = {
          ward_name: values.ward_name!,
          ward_code: values.ward_code!,
          floor: values.floor ?? null,
        };
        const newWard = await wardsApi.create(createData, tenantId || undefined);
        toast.success(`Ward ${newWard.ward_name} created successfully!`);
        window.dispatchEvent(new CustomEvent("ward:created", { detail: { wardId: newWard.id } }));
      }
      onSuccess?.();
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4 text-sm">
      <label className="col-span-2 space-y-1">
        <span className="text-slate-600">
          Ward Name <span className="text-rose-500">*</span>
        </span>
        <input
          {...register("ward_name", { required: "Ward name is required" })}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
          placeholder="e.g., Ward A, ICU-1"
        />
        {errors.ward_name && <span className="text-xs text-rose-500">{errors.ward_name.message}</span>}
      </label>

      <label className="col-span-2 space-y-1">
        <span className="text-slate-600">
          Ward Code <span className="text-rose-500">*</span>
        </span>
        <input
          {...register("ward_code", { required: "Ward code is required" })}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
          placeholder="e.g., WARD-A, ICU-01"
        />
        {errors.ward_code && <span className="text-xs text-rose-500">{errors.ward_code.message}</span>}
      </label>

      <label className="space-y-1">
        <span className="text-slate-600">Floor Number</span>
        <input
          type="number"
          min="0"
          {...register("floor", { valueAsNumber: true })}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
          placeholder="Optional"
        />
      </label>

      {defaultValues && (
        <label className="space-y-1">
          <span className="text-slate-600">Status</span>
          <select
            {...register("is_active")}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
          >
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </label>
      )}

      <div className="col-span-2 flex justify-end gap-3">
        <button
          type="submit"
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 font-semibold text-white shadow-sm hover:shadow"
        >
          {defaultValues ? "Update Ward" : "Create Ward"}
        </button>
      </div>
    </form>
  );
}


