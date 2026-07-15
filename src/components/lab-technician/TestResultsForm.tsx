"use client";

import { useState, useEffect } from "react";
import { labTestsApi, LabTestParameter, PublishResultsRequest } from "@/services/labTestsApi";
import { mrdApi } from "@/services/mrdApi";
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
  patientId?: string;
  onSuccess?: () => void;
}

interface ParameterResult {
  parameter_id: string;
  result_numeric: string;
  result_value: string;
  notes: string;
  image_file?: File | null;
  image_url?: string;
}

export function MRDImage({ documentId, className, alt }: { documentId: string; className?: string; alt?: string }) {
  const [src, setSrc] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!documentId) return;
    let active = true;
    const loadImg = async () => {
      try {
        setLoading(true);
        const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
        const blob = await mrdApi.download(documentId, tenantId || undefined);
        const url = URL.createObjectURL(blob);
        if (active) {
          setSrc(url);
        }
      } catch (err) {
        console.error("Failed to load MRD image", err);
      } finally {
        if (active) setLoading(false);
      }
    };
    loadImg();
    return () => {
      active = false;
      if (src) URL.revokeObjectURL(src);
    };
  }, [documentId]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center bg-slate-50 text-slate-400 text-xs ${className || ""}`}>
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  if (!src) {
    return (
      <div className={`flex items-center justify-center bg-slate-50 text-slate-400 text-xs ${className || ""}`}>
        Failed to load
      </div>
    );
  }

  return <img src={src} className={className} alt={alt} />;
}

export function TestResultsForm({
  isOpen,
  onClose,
  labBookingId,
  bookingItemId,
  testCode,
  testName,
  patientGender,
  patientId,
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
          result_value: existingResult?.result_value || "",
          notes: existingResult?.notes || "",
          image_url: param.parameter_type === "image" && existingResult?.result_value ? existingResult.result_value : undefined,
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

  const handleResultValueChange = (parameterId: string, value: string) => {
    setResults((prev) => ({
      ...prev,
      [parameterId]: {
        ...prev[parameterId],
        result_value: value,
      },
    }));
  };

  const handleImageChange = (parameterId: string, file: File | null) => {
    setResults((prev) => ({
      ...prev,
      [parameterId]: {
        ...prev[parameterId],
        image_file: file,
        image_url: file ? URL.createObjectURL(file) : undefined,
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
      (r) => {
        const param = parameters.find((p) => p.id === r.parameter_id);
        if (!param) return false;
        if (param.parameter_type === "number") {
          return r.result_numeric.trim() !== "";
        } else if (param.parameter_type === "image") {
          return r.result_value.trim() !== "" || !!r.image_file;
        } else {
          return r.result_value.trim() !== "";
        }
      }
    );
    
    if (!hasResults) {
      toast.error("Please enter at least one test result");
      return;
    }

    setSubmitting(true);
    try {
      const updatedResults = { ...results };
      const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;

      // Upload files for image parameters
      for (const param of parameters) {
        if (param.parameter_type === "image" && updatedResults[param.id]?.image_file) {
          const file = updatedResults[param.id].image_file!;
          const uploadRes = await mrdApi.upload(
            {
              file,
              document_name: `${testName}_${param.parameter_name}_result`,
              category: "LAB_REPORT",
              patient_id: patientId || "",
              lab_booking_id: labBookingId,
            },
            tenantId || undefined
          );
          updatedResults[param.id].result_value = uploadRes.id;
        }
      }

      const publishRequest: PublishResultsRequest = {
        results: Object.values(updatedResults)
          .filter((r) => {
            const param = parameters.find((p) => p.id === r.parameter_id);
            if (!param) return false;
            if (param.parameter_type === "number") {
              return r.result_numeric.trim() !== "";
            } else if (param.parameter_type === "image") {
              return r.result_value.trim() !== "";
            } else {
              return r.result_value.trim() !== "";
            }
          })
          .map((r) => {
            const param = parameters.find((p) => p.id === r.parameter_id)!;
            return {
              parameter_id: r.parameter_id,
              result_numeric: param.parameter_type === "number" ? parseFloat(r.result_numeric) : undefined,
              result_value: param.parameter_type !== "number" ? r.result_value : undefined,
              notes: r.notes.trim() || undefined,
            };
          }),
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

  // Group parameters by section name
  const parametersBySection = parameters.reduce<Record<string, LabTestParameter[]>>((acc, param) => {
    const sectionName = param.section_name || "General Parameters";
    if (!acc[sectionName]) {
      acc[sectionName] = [];
    }
    acc[sectionName].push(param);
    return acc;
  }, {});

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
          <div className="space-y-6 max-h-[60vh] overflow-y-auto px-1">
            {Object.entries(parametersBySection).map(([sectionName, sectionParams]) => (
              <div key={sectionName} className="space-y-4">
                <h3 className="text-xs font-bold text-slate-600 bg-slate-100/75 border border-slate-200/50 rounded-lg px-3 py-1.5 flex items-center justify-between">
                  <span>{sectionName}</span>
                  <span className="text-slate-400 font-normal">
                    ({sectionParams.length} parameter{sectionParams.length !== 1 ? "s" : ""})
                  </span>
                </h3>

                <div className="space-y-4">
                  {sectionParams.map((param) => {
                    const result = results[param.id];
                    const abnormal = param.parameter_type === "number" && result && isAbnormal(param, result.result_numeric);
                    
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
                              {` • Type: ${param.parameter_type}`}
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
                            
                            {param.parameter_type === "number" && (
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
                            )}

                            {param.parameter_type === "dropdown" && (
                              <select
                                value={result?.result_value || ""}
                                onChange={(e) => handleResultValueChange(param.id, e.target.value)}
                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-sky-400"
                              >
                                <option value="">Select option</option>
                                {param.dropdown_options?.map((opt) => (
                                  <option key={opt} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </select>
                            )}

                            {param.parameter_type === "text" && (
                              <input
                                type="text"
                                value={result?.result_value || ""}
                                onChange={(e) => handleResultValueChange(param.id, e.target.value)}
                                placeholder="Enter text value"
                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-sky-400"
                              />
                            )}

                            {param.parameter_type === "image" && (
                              <div className="space-y-2">
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0] || null;
                                    handleImageChange(param.id, file);
                                  }}
                                  className="w-full text-xs text-slate-500 file:mr-4 file:rounded-lg file:border-0 file:bg-sky-50 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-sky-700 hover:file:bg-sky-100"
                                />
                                {result?.image_url && (
                                  <div className="relative mt-2 h-32 w-full overflow-hidden rounded-lg border border-slate-200 flex items-center justify-center bg-slate-50">
                                    {result.image_file ? (
                                      <img
                                        src={result.image_url}
                                        alt="Preview"
                                        className="h-full max-w-full object-contain"
                                      />
                                    ) : (
                                      <MRDImage
                                        documentId={result.result_value}
                                        className="h-full max-w-full object-contain"
                                        alt="Uploaded Result"
                                      />
                                    )}
                                  </div>
                                )}
                              </div>
                            )}

                            {param.parameter_type === "number" && param.normal_text && (
                              <p className="mt-1 text-xs text-slate-500">
                                Normal Range: {param.normal_text}
                              </p>
                            )}
                            {param.parameter_type === "number" && param.normal_min !== null && param.normal_max !== null && (
                              <p className="mt-1 text-xs text-slate-500">
                                Normal: {param.normal_min} - {param.normal_max} {param.unit}
                              </p>
                            )}
                            {param.parameter_type !== "number" && param.normal_text && (
                              <p className="mt-1 text-xs text-slate-500">
                                Expected: {param.normal_text}
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
              </div>
            ))}
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


