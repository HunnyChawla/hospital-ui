"use client";

import { useEffect, useState } from "react";
import { labTestsApi, LabTestPrice, UpdateLabTestPriceRequest } from "@/services/labTestsApi";
import { Modal } from "../common/Modal";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { Loader2, DollarSign } from "lucide-react";
import { currency } from "@/utils/format";
import { useForm } from "react-hook-form";

interface PriceManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  testCode: string;
  testName: string;
  currentPrice?: number;
  onPriceUpdated?: () => void;
}

export function PriceManagementModal({
  isOpen,
  onClose,
  testCode,
  testName,
  currentPrice,
  onPriceUpdated,
}: PriceManagementModalProps) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [priceData, setPriceData] = useState<LabTestPrice | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateLabTestPriceRequest>({
    defaultValues: {
      price: currentPrice || 0,
    },
  });

  useEffect(() => {
    if (isOpen && testCode) {
      fetchPrice();
    } else {
      setPriceData(null);
      reset({ price: currentPrice || 0 });
    }
  }, [isOpen, testCode, currentPrice, reset]);

  const fetchPrice = async () => {
    setLoading(true);
    try {
      const data = await labTestsApi.getTestPrice(testCode);
      setPriceData(data);
      reset({ price: data.price });
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      // If price doesn't exist yet, that's okay - we'll create it on update
      if (errorMessage && !errorMessage.includes("404") && !errorMessage.includes("Not Found")) {
        toast.error(errorMessage || "Failed to fetch price");
      }
      // Use current price from test if available
      if (currentPrice) {
        reset({ price: currentPrice });
      }
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: UpdateLabTestPriceRequest) => {
    setSubmitting(true);
    try {
      await labTestsApi.updateTestPrice(testCode, { price: Number(data.price) });
      toast.success("Price updated successfully");
      onPriceUpdated?.();
      await fetchPrice();
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage || "Failed to update price");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Manage Price - ${testName} (${testCode})`}
      size="md"
    >
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
          <span className="ml-3 text-slate-600">Loading price information...</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <DollarSign className="h-4 w-4" />
              <span>Test Code: {testCode}</span>
            </div>
            {priceData && (
              <div className="mt-2 text-xs text-slate-500">
                Last updated: {new Date(priceData.updated_at).toLocaleString()}
              </div>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Price (₹) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">₹</span>
              <input
                type="number"
                step="0.01"
                min="0"
                {...register("price", {
                  required: "Price is required",
                  min: { value: 0, message: "Price must be positive" },
                  valueAsNumber: true,
                })}
                className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-2 text-sm outline-none focus:border-sky-400"
                placeholder="Enter price"
              />
            </div>
            {errors.price && (
              <p className="mt-1 text-xs text-rose-500">{errors.price.message}</p>
            )}
            {priceData && (
              <p className="mt-1 text-xs text-slate-500">
                Current price: {currency(priceData.price)}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow disabled:opacity-50"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Update Price
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

