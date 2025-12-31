"use client";

import { useForm } from "react-hook-form";
import { useEffect, useState, useRef } from "react";
import { useAppSelector } from "@/redux/hooks";
import { bedsApi, Bed, CreateBedRequest, UpdateBedRequest, BedStatus, BedType, AddBulkBedsRequest } from "@/services/bedsApi";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { Plus, X } from "lucide-react";

interface BedFormProps {
  defaultValues?: Bed;
  onSuccess?: () => void;
}

export function BedForm({ defaultValues, onSuccess }: BedFormProps) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<
    CreateBedRequest &
    UpdateBedRequest &
    AddBulkBedsRequest &
    { bed_numbers_input?: string }
  >();
  // Use Redux centralized wards cache (fetched once in dashboard layout)
  const wards = useAppSelector((s) => s.wards.list);
  const [bedNumbers, setBedNumbers] = useState<string[]>([""]);
  const originalValuesRef = useRef<Partial<Bed> | null>(null);

  useEffect(() => {
    if (defaultValues) {
      const initialValues = {
        ward_id: defaultValues.ward_id,
        bed_number: defaultValues.bed_number,
        bed_type: defaultValues.bed_type,
        status: defaultValues.status,
        daily_rate: parseFloat(defaultValues.daily_rate),
        is_active: defaultValues.is_active,
      };
      reset(initialValues);
      // Store original values for comparison
      originalValuesRef.current = {
        ward_id: defaultValues.ward_id,
        bed_number: defaultValues.bed_number,
        bed_type: defaultValues.bed_type,
        status: defaultValues.status,
        daily_rate: defaultValues.daily_rate,
        is_active: defaultValues.is_active,
      };
    } else {
      reset({
        ward_id: "",
        bed_number: "",
        bed_type: "general",
        daily_rate: 0,
        bed_numbers_input: "",
      });
      setBedNumbers([""]);
      originalValuesRef.current = null;
    }
  }, [defaultValues, reset]);

  const onSubmit = async (
    values: CreateBedRequest & UpdateBedRequest & { bed_numbers_input?: string }
  ) => {
    try {
      const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
      
      if (defaultValues && originalValuesRef.current) {
        // Update bed - only send changed fields
        const updateData: UpdateBedRequest = {};
        
        if (values.bed_number !== originalValuesRef.current.bed_number) {
          updateData.bed_number = values.bed_number;
        }
        if (values.bed_type !== originalValuesRef.current.bed_type) {
          updateData.bed_type = values.bed_type;
        }
        if (values.status !== originalValuesRef.current.status) {
          updateData.status = values.status;
        }
        // Compare daily_rate - normalize both to numbers for comparison
        const originalDailyRate = parseFloat(originalValuesRef.current.daily_rate || "0");
        const currentDailyRate = typeof values.daily_rate === "number" 
          ? values.daily_rate 
          : parseFloat(values.daily_rate?.toString() || "0");
        if (Math.abs(originalDailyRate - currentDailyRate) > 0.01) { // Use small epsilon for float comparison
          updateData.daily_rate = values.daily_rate;
        }
        // Handle boolean comparison
        const currentIsActive = values.is_active === true;
        const originalIsActive = originalValuesRef.current.is_active === true;
        if (currentIsActive !== originalIsActive) {
          updateData.is_active = currentIsActive;
        }
        if (values.ward_id && values.ward_id !== originalValuesRef.current.ward_id) {
          updateData.ward_id = values.ward_id;
        }

        // Only make API call if there are changes
        if (Object.keys(updateData).length > 0) {
          await bedsApi.update(defaultValues.id, updateData, tenantId || undefined);
          toast.success("Bed updated successfully!");
          window.dispatchEvent(new CustomEvent("bed:updated", { detail: { bedId: defaultValues.id } }));
        } else {
          toast.info("No changes to save");
        }
      } else {
        // Create beds using bulk API
        const cleanedBeds = bedNumbers.map((b) => b.trim()).filter(Boolean);
        if (cleanedBeds.length === 0) {
          toast.error("Please enter at least one bed number");
          return;
        }
        const uniqueBedNumbers = Array.from(new Set(cleanedBeds));

        const bulkData: AddBulkBedsRequest = {
          ward_id: values.ward_id!,
          bed_numbers: uniqueBedNumbers,
          bed_type: values.bed_type!,
          daily_rate: values.daily_rate!,
        };
        const response = await bedsApi.addBulk(bulkData, tenantId || undefined);
        toast.success(`${response.total_created} bed(s) created successfully!`);
        window.dispatchEvent(new CustomEvent("bed:created", { detail: { beds: response.beds } }));
      }
      onSuccess?.();
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4 text-sm">
      {!defaultValues && (
        <>
          <label className="col-span-2 space-y-1">
            <span className="text-slate-600">
              Ward <span className="text-rose-500">*</span>
            </span>
            <select
              {...register("ward_id", { required: "Ward is required" })}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
            >
              <option value="">Select Ward</option>
              {wards.map((ward) => (
                <option key={ward.id} value={ward.id}>
                  {ward.ward_name} ({ward.ward_code})
                </option>
              ))}
            </select>
            {errors.ward_id && <span className="text-xs text-rose-500">{errors.ward_id.message}</span>}
          </label>

          <label className="space-y-1">
            <span className="text-slate-600">
              Bed Numbers <span className="text-rose-500">*</span>
            </span>
            <div className="space-y-2">
              {bedNumbers.map((val, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    value={val}
                    onChange={(e) => {
                      const next = [...bedNumbers];
                      next[idx] = e.target.value;
                      setBedNumbers(next);
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
                    placeholder={`e.g., B-${String(idx + 1).padStart(3, "0")}`}
                  />
                  {bedNumbers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const next = bedNumbers.filter((_, i) => i !== idx);
                        setBedNumbers(next.length ? next : [""]);
                      }}
                      className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:border-rose-200 hover:text-rose-600"
                      aria-label="Remove bed number"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setBedNumbers((prev) => [...prev, ""])}
                className="flex items-center gap-2 text-sm font-semibold text-sky-600 hover:text-sky-700"
              >
                <Plus className="h-4 w-4" /> Add bed number
              </button>
              <p className="text-xs text-slate-500">Empty rows are ignored and duplicates are removed automatically.</p>
            </div>
          </label>
        </>
      )}

      {defaultValues && (
        <label className="space-y-1">
          <span className="text-slate-600">
            Bed Number <span className="text-rose-500">*</span>
          </span>
          <input
            {...register("bed_number", { required: "Bed number is required" })}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
            placeholder="e.g., B-101, ICU-01"
          />
          {errors.bed_number && <span className="text-xs text-rose-500">{errors.bed_number.message}</span>}
        </label>
      )}

      <label className="space-y-1">
        <span className="text-slate-600">
          Bed Type <span className="text-rose-500">*</span>
        </span>
        <select
          {...register("bed_type", { required: "Bed type is required" })}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
        >
          <option value="general">General</option>
          <option value="private">Private</option>
          <option value="semi_private">Semi-Private</option>
          <option value="icu">ICU</option>
          <option value="ccu">CCU</option>
          <option value="nicu">NICU</option>
          <option value="picu">PICU</option>
          <option value="hdu">HDU</option>
          <option value="isolation">Isolation</option>
        </select>
        {errors.bed_type && <span className="text-xs text-rose-500">{errors.bed_type.message}</span>}
      </label>

      <label className="space-y-1">
        <span className="text-slate-600">
          Daily Rate <span className="text-rose-500">*</span>
        </span>
        <input
          type="number"
          min="0"
          step="0.01"
          {...register("daily_rate", { required: "Daily rate is required", min: { value: 0, message: "Must be at least 0" }, valueAsNumber: true })}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
          placeholder="0.00"
        />
        {errors.daily_rate && <span className="text-xs text-rose-500">{errors.daily_rate.message}</span>}
      </label>

      {defaultValues && (
        <>
          <label className="space-y-1">
            <span className="text-slate-600">Status</span>
            <select
              {...register("status")}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
            >
              <option value="available">Available</option>
              <option value="occupied">Occupied</option>
              <option value="maintenance">Maintenance</option>
              <option value="reserved">Reserved</option>
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-slate-600">Active Status</span>
            <select
              {...register("is_active")}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
            >
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </label>
        </>
      )}

      <div className="col-span-2 flex justify-end gap-3">
        <button
          type="submit"
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 font-semibold text-white shadow-sm hover:shadow"
        >
          {defaultValues ? "Update Bed" : "Create Bed"}
        </button>
      </div>
    </form>
  );
}


