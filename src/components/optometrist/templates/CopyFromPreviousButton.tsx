"use client";

import { useState } from "react";
import clsx from "clsx";
import { History, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { mockOptometryService } from "../mock";
import { handleError, getErrorMessage } from "@/utils/errorHandler";

type DataType = "refraction" | "ar_data" | "iop" | "complaints" | "medical_history";

interface CopyFromPreviousButtonProps {
  patientId: string;
  dataType: DataType;
  onDataLoaded: (data: unknown) => void;
  disabled?: boolean;
  size?: "sm" | "md";
  className?: string;
}

const dataTypeLabels: Record<DataType, string> = {
  refraction: "Previous Refraction",
  ar_data: "Previous AR Data",
  iop: "Previous IOP",
  complaints: "Previous Complaints",
  medical_history: "Previous History",
};

const sizes = {
  sm: {
    button: "px-2 py-1 text-xs gap-1",
    icon: "h-3 w-3",
  },
  md: {
    button: "px-3 py-1.5 text-sm gap-1.5",
    icon: "h-4 w-4",
  },
};

export function CopyFromPreviousButton({
  patientId,
  dataType,
  onDataLoaded,
  disabled = false,
  size = "md",
  className,
}: CopyFromPreviousButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const sizeClasses = sizes[size];

  const fetchPreviousData = async () => {
    if (disabled || isLoading) return;

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      let data: unknown = null;

      switch (dataType) {
        case "refraction":
          data = await mockOptometryService.getPreviousRefraction(patientId);
          break;
        case "ar_data":
          data = await mockOptometryService.getPreviousARData(patientId);
          break;
        case "iop":
          data = await mockOptometryService.getPreviousIOP(patientId);
          break;
        case "complaints":
          data = await mockOptometryService.getPreviousComplaints(patientId);
          break;
        case "medical_history":
          data = await mockOptometryService.getPreviousMedicalHistory(patientId);
          break;
      }

      if (data === null || (Array.isArray(data) && data.length === 0)) {
        setError("No previous data found");
        setTimeout(() => setError(null), 3000);
      } else {
        onDataLoaded(data);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 2000);
      }
    } catch (err) {
      const errorMessage = getErrorMessage(err) || "Failed to fetch data";
      setError(errorMessage);
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={fetchPreviousData}
      disabled={disabled || isLoading}
      className={clsx(
        "flex items-center rounded-lg border font-medium transition",
        sizeClasses.button,
        error
          ? "bg-red-50 text-red-700 border-red-200"
          : success
            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
            : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100",
        (disabled || isLoading) && "cursor-not-allowed opacity-50",
        className
      )}
      title={`Copy from ${dataTypeLabels[dataType]}`}
    >
      {isLoading ? (
        <Loader2 className={clsx(sizeClasses.icon, "animate-spin")} />
      ) : error ? (
        <AlertCircle className={sizeClasses.icon} />
      ) : success ? (
        <CheckCircle2 className={sizeClasses.icon} />
      ) : (
        <History className={sizeClasses.icon} />
      )}
      <span>
        {isLoading
          ? "Loading..."
          : error
            ? "No Data"
            : success
              ? "Copied!"
              : "Copy Previous"}
      </span>
    </button>
  );
}
