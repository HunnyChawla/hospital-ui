"use client";

import { useForm } from "react-hook-form";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { CreateLabTestRequest } from "@/services/labTestsApi";
import { createLabTest, fetchLabTests } from "@/redux/labTestsSlice";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { Beaker, Plus } from "lucide-react";

type LabTestFormProps = {
  onCreated?: () => void;
};

export function LabTestForm({ onCreated }: LabTestFormProps) {
  const dispatch = useAppDispatch();
  const { creating, lastQuery } = useAppSelector((s) => s.labTests);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateLabTestRequest>({
    defaultValues: {
      test_code: "",
      test_name: "",
      description: "",
      category: "",
      price: 0,
    },
  });

  const onSubmit = async (values: CreateLabTestRequest) => {
    try {
      const payload: CreateLabTestRequest = {
        ...values,
        price: Number(values.price),
        description: values.description?.trim() || undefined,
      };

      await dispatch(createLabTest({ payload })).unwrap();
      toast.success("Lab test added");
      reset();
      onCreated?.();

      // Refresh the list with the last used filters
      dispatch(
        fetchLabTests(
          lastQuery || {
            page: 1,
            page_size: 20,
            is_active: true,
          }
        )
      );
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-slate-900">
        <Beaker className="h-4 w-4 text-sky-600" />
        <h3 className="text-sm font-semibold">Add Lab Test</h3>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-3 text-sm">
        <label className="space-y-1">
          <span className="text-slate-600">
            Test Code <span className="text-rose-500">*</span>
          </span>
          <input
            type="text"
            placeholder="CBC"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
            {...register("test_code", { required: "Test code is required" })}
          />
          {errors.test_code && (
            <p className="text-xs text-rose-500">{errors.test_code.message}</p>
          )}
        </label>

        <label className="space-y-1">
          <span className="text-slate-600">
            Test Name <span className="text-rose-500">*</span>
          </span>
          <input
            type="text"
            placeholder="Complete Blood Count"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
            {...register("test_name", { required: "Test name is required" })}
          />
          {errors.test_name && (
            <p className="text-xs text-rose-500">{errors.test_name.message}</p>
          )}
        </label>

        <label className="space-y-1">
          <span className="text-slate-600">
            Category <span className="text-rose-500">*</span>
          </span>
          <input
            type="text"
            placeholder="Hematology"
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
            placeholder="Complete blood count test including RBC, WBC, platelets, hemoglobin"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
            {...register("description")}
          />
        </label>

        <div className="col-span-2 flex justify-end">
          <button
            type="submit"
            disabled={creating}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 font-semibold text-white shadow-sm transition hover:shadow disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            {creating ? "Saving..." : "Add Lab Test"}
          </button>
        </div>
      </form>
    </div>
  );
}

