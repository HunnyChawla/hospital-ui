"use client";

import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { CreateServiceRequest, Service, UpdateServiceRequest } from "@/services/servicesApi";
import { createService, updateService, fetchServices } from "@/redux/servicesSlice";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { Package, Plus, Check } from "lucide-react";

type ServiceFormProps = {
  onCreated?: () => void;
  onSuccess?: () => void;
  defaultValues?: Service;
};

export function ServiceForm({ onCreated, onSuccess, defaultValues }: ServiceFormProps) {
  const dispatch = useAppDispatch();
  const { creating, updatingId, lastQuery } = useAppSelector((s) => s.services);
  const isEditing = !!defaultValues;
  const originalValuesRef = useRef<Service | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateServiceRequest>({
    defaultValues: {
      name: "",
      description: "",
      category: "",
      price: 0,
      is_active: true,
    },
  });

  // Reset form when defaultValues change
  useEffect(() => {
    if (defaultValues) {
      originalValuesRef.current = defaultValues;
      reset({
        name: defaultValues.name,
        description: defaultValues.description || "",
        category: defaultValues.category,
        price: defaultValues.price,
        is_active: defaultValues.is_active ?? true,
      });
    } else {
      originalValuesRef.current = null;
      reset({
        name: "",
        description: "",
        category: "",
        price: 0,
        is_active: true,
      });
    }
  }, [defaultValues, reset]);

  const onSubmit = async (values: CreateServiceRequest) => {
    try {
      if (isEditing && defaultValues) {
        // Update service - only send changed fields
        const updateData: UpdateServiceRequest = {};
        
        if (values.name !== originalValuesRef.current?.name) {
          updateData.name = values.name;
        }
        if (values.description?.trim() !== (originalValuesRef.current?.description || "")) {
          updateData.description = values.description?.trim() || undefined;
        }
        if (values.category !== originalValuesRef.current?.category) {
          updateData.category = values.category;
        }
        const originalPrice = originalValuesRef.current?.price || 0;
        const currentPrice = Number(values.price);
        if (Math.abs(originalPrice - currentPrice) > 0.01) {
          updateData.price = currentPrice;
        }
        const currentIsActive = values.is_active === true;
        const originalIsActive = originalValuesRef.current?.is_active === true;
        if (currentIsActive !== originalIsActive) {
          updateData.is_active = currentIsActive;
        }

        // Only make API call if there are changes
        if (Object.keys(updateData).length > 0) {
          await dispatch(updateService({ id: defaultValues.id, updates: updateData })).unwrap();
          toast.success("Service updated");
        } else {
          toast.info("No changes to save");
        }
      } else {
        // Create service
        const payload: CreateServiceRequest = {
          ...values,
          price: Number(values.price),
          description: values.description?.trim() || undefined,
          is_active: values.is_active ?? true,
        };

        await dispatch(createService({ payload })).unwrap();
        toast.success("Service added");
        reset();
      }

      onSuccess?.();
      onCreated?.();

      // Refresh the list with the last used filters
      dispatch(
        fetchServices(
          lastQuery || {
            page: 1,
            page_size: 20,
          }
        )
      );
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <div className={isEditing ? "" : "rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"}>
      {!isEditing && (
        <div className="mb-3 flex items-center gap-2 text-slate-900">
          <Package className="h-4 w-4 text-sky-600" />
          <h3 className="text-sm font-semibold">Add Service</h3>
        </div>
      )}
      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-3 text-sm">
        <label className="col-span-2 space-y-1">
          <span className="text-slate-600">
            Name <span className="text-rose-500">*</span>
          </span>
          <input
            type="text"
            placeholder="Doctor Visit"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
            {...register("name", { required: "Name is required" })}
          />
          {errors.name && (
            <p className="text-xs text-rose-500">{errors.name.message}</p>
          )}
        </label>

        <label className="space-y-1">
          <span className="text-slate-600">
            Category <span className="text-rose-500">*</span>
          </span>
          <input
            type="text"
            placeholder="Consultation"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
            {...register("category", { required: "Category is required" })}
          />
          {errors.category && (
            <p className="text-xs text-rose-500">{errors.category.message}</p>
          )}
        </label>

        <label className="space-y-1">
          <span className="text-slate-600">
            Price (₹) <span className="text-rose-500">*</span>
          </span>
          <input
            type="number"
            step="0.01"
            min="0"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
            {...register("price", {
              required: "Price is required",
              min: { value: 0, message: "Price must be positive" },
              valueAsNumber: true,
            })}
          />
          {errors.price && (
            <p className="text-xs text-rose-500">{errors.price.message}</p>
          )}
        </label>

        <label className="col-span-2 space-y-1">
          <span className="text-slate-600">Description</span>
          <textarea
            rows={2}
            placeholder="Service description"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
            {...register("description")}
          />
        </label>

        <div className="col-span-2 flex justify-end">
          <button
            type="submit"
            disabled={creating || (isEditing && updatingId === defaultValues?.id)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 font-semibold text-white shadow-sm transition hover:shadow disabled:opacity-60"
          >
            {isEditing ? (
              <>
                <Check className="h-4 w-4" />
                {updatingId === defaultValues?.id ? "Updating..." : "Update Service"}
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                {creating ? "Saving..." : "Add Service"}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

