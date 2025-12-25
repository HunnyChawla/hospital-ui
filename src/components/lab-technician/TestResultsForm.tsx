"use client";

import { useState, useEffect } from "react";
import { labTestsApi, LabTestParameter, PublishResultsRequest } from "@/services/labTestsApi";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { Modal } from "../common/Modal";
import { Loader2, AlertCircle } from "lucide-react";

interface TestResultsFormProps {
  isOpen: boolean;
  onClose: () => void;
  labBookingId: string;
  bookingItemId: string;
  testCode: string;
  testName: string;
  patientGender?: string;
  onSuccess?: () => void;
}

interface ParameterResult {
  parameter_id: string;
  result_numeric: string;
  notes: string;
}

export function TestResultsForm({
  isOpen,
  onClose,
  labBookingId,
  bookingItemId,
  testCode,
  testName,
  patientGender,
  onSuccess,
}: TestResultsFormProps) {
  const [parameters, setParameters] = useState<LabTestParameter[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<Record<string, ParameterResult>>({});

  useEffect(() => {
    if (isOpen && testCode) {
      fetchParameters();
    }
  }, [isOpen, testCode]);

  const fetchParameters = async () => {
    setLoading(true);
    try {
      // Fetch parameters first
      const params = await labTestsApi.getTestParameters(testCode, patientGender);
      const activeParams = params.filter((p) => p.is_active).sort((a, b) => a.display_order - b.display_order);
      setParameters(activeParams);
      
      // Try to fetch existing results
      let existingResults: any[] = [];
      try {
        const results = await labTestsApi.getResults(labBookingId, bookingItemId);
        // Ensure it's an array
        existingResults = Array.isArray(results) ? results : [];
      } catch (error) {
        // If no results exist (404) or any other error, use empty array
        existingResults = [];
      }

      // Initialize results object with existing values if available
      const initialResults: Record<string, ParameterResult> = {};
      activeParams.forEach((param) => {
        const existingResult = Array.isArray(existingResults) 
          ? existingResults.find((r) => r.parameter_id === param.id)
          : null;
        initialResults[param.id] = {
          parameter_id: param.id,
          result_numeric: existingResult?.result_numeric?.toString() || "",
          notes: existingResult?.notes || "",
        };
      });
      setResults(initialResults);
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage || "Failed to fetch test parameters");
    } finally {
      setLoading(false);
    }
  };

  const handleResultChange = (parameterId: string, value: string) => {
    setResults((prev) => ({
      ...prev,
      [parameterId]: {
        ...prev[parameterId],
        result_numeric: value,
      },
    }));
  };

  const handleNotesChange = (parameterId: string, value: string) => {
    setResults((prev) => ({
      ...prev,
      [parameterId]: {
        ...prev[parameterId],
        notes: value,
      },
    }));
  };

  const isAbnormal = (param: LabTestParameter, value: string): boolean => {
    if (!value || value.trim() === "") return false;
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return false;
    
    if (param.normal_min !== null && numValue < param.normal_min) return true;
    if (param.normal_max !== null && numValue > param.normal_max) return true;
    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate that at least one result is provided
    const hasResults = Object.values(results).some(
      (r) => r.result_numeric.trim() !== ""
    );
    
    if (!hasResults) {
      toast.error("Please enter at least one test result");
      return;
    }

    setSubmitting(true);
    try {
      const publishRequest: PublishResultsRequest = {
        results: Object.values(results)
          .filter((r) => r.result_numeric.trim() !== "")
          .map((r) => ({
            parameter_id: r.parameter_id,
            result_numeric: parseFloat(r.result_numeric),
            notes: r.notes.trim() || undefined,
          })),
      };

      await labTestsApi.publishResults(labBookingId, bookingItemId, publishRequest);
      toast.success("Test results published successfully");
      onSuccess?.();
      onClose();
      
      // Reset form
      setResults({});
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage || "Failed to publish test results");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setResults({});
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`Publish Results - ${testName}`} size="lg">
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
          <span className="ml-3 text-slate-600">Loading test parameters...</span>
        </div>
      ) : parameters.length === 0 ? (
        <div className="py-12 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-slate-400" />
          <p className="mt-4 text-slate-600">No parameters found for this test</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            {parameters.map((param) => {
              const result = results[param.id];
              const abnormal = result && isAbnormal(param, result.result_numeric);
              
              return (
                <div
                  key={param.id}
                  className={`rounded-xl border p-4 ${
                    abnormal ? "border-rose-200 bg-rose-50" : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-900">{param.parameter_name}</h4>
                      <p className="text-xs text-slate-500">
                        Code: {param.parameter_code}
                        {param.unit && ` • Unit: ${param.unit}`}
                      </p>
                    </div>
                    {abnormal && (
                      <span className="ml-2 rounded-full bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-700">
                        Abnormal
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">
                        Result Value {param.unit && `(${param.unit})`}
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={result?.result_numeric || ""}
                        onChange={(e) => handleResultChange(param.id, e.target.value)}
                        placeholder="Enter result"
                        className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition ${
                          abnormal
                            ? "border-rose-300 bg-rose-50 focus:border-rose-400"
                            : "border-slate-300 bg-white focus:border-sky-400"
                        }`}
                      />
                      {param.normal_text && (
                        <p className="mt-1 text-xs text-slate-500">
                          Normal Range: {param.normal_text}
                        </p>
                      )}
                      {param.normal_min !== null && param.normal_max !== null && (
                        <p className="mt-1 text-xs text-slate-500">
                          Normal: {param.normal_min} - {param.normal_max} {param.unit}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">
                        Notes (Optional)
                      </label>
                      <textarea
                        value={result?.notes || ""}
                        onChange={(e) => handleNotesChange(param.id, e.target.value)}
                        placeholder="Add notes..."
                        rows={3}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-sky-400"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Publishing...
                </>
              ) : (
                "Publish Results"
              )}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

