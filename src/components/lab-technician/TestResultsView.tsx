"use client";

import { useState, useEffect } from "react";
import { labTestsApi, LabTestResult } from "@/services/labTestsApi";
import { MRDImage } from "./TestResultsForm";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { Modal } from "../common/Modal";
import { Loader2, AlertCircle, CheckCircle2, XCircle, Lock } from "lucide-react";

interface TestResultsViewProps {
  isOpen: boolean;
  onClose: () => void;
  labBookingId: string;
  bookingItemId: string;
  testCode: string;
  testName: string;
}

export function TestResultsView({
  isOpen,
  onClose,
  labBookingId,
  bookingItemId,
  testCode,
  testName,
}: TestResultsViewProps) {
  const [results, setResults] = useState<LabTestResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && bookingItemId) {
      fetchResults();
    }
  }, [isOpen, bookingItemId, labBookingId]);

  const fetchResults = async () => {
    setLoading(true);
    try {
      const resultsData = await labTestsApi.getResults(labBookingId, bookingItemId);
      setResults(resultsData);
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage || "Failed to fetch test results");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Group results by section name
  const resultsBySection = results.reduce<Record<string, LabTestResult[]>>((acc, res) => {
    const sectionName = res.section_name || "General Parameters";
    if (!acc[sectionName]) {
      acc[sectionName] = [];
    }
    acc[sectionName].push(res);
    return acc;
  }, {});

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Test Results - ${testName}`} size="lg">
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
          <span className="ml-3 text-slate-600">Loading test results...</span>
        </div>
      ) : results.length === 0 ? (
        <div className="py-12 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-slate-400" />
          <p className="mt-4 text-slate-600">No results found for this test</p>
        </div>
      ) : (
        <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
          {/* Header Info */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-slate-500" />
              <p className="text-sm font-semibold text-slate-700">Results are locked and cannot be modified</p>
            </div>
          </div>

          {/* Results List Grouped by Section */}
          <div className="space-y-6">
            {Object.entries(resultsBySection).map(([sectionName, sectionResults]) => (
              <div key={sectionName} className="space-y-3">
                <h3 className="text-xs font-bold text-slate-600 bg-slate-100/75 border border-slate-200/50 rounded-lg px-3 py-1.5 flex items-center justify-between">
                  <span>{sectionName}</span>
                  <span className="text-slate-400 font-normal">
                    ({sectionResults.length} parameter{sectionResults.length !== 1 ? "s" : ""})
                  </span>
                </h3>

                <div className="space-y-3">
                  {sectionResults.map((result) => {
                    const isAbnormal = result.is_abnormal;
                    
                    return (
                      <div
                        key={result.id}
                        className={`rounded-xl border p-4 ${
                          isAbnormal
                            ? "border-rose-200 bg-rose-50"
                            : "border-slate-200 bg-white"
                        }`}
                      >
                        <div className="mb-3 flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-slate-900">{result.parameter_name}</h4>
                              {result.parameter_type === "number" && (
                                isAbnormal ? (
                                  <span className="flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">
                                    <XCircle className="h-3 w-3" />
                                    Abnormal
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                                    <CheckCircle2 className="h-3 w-3" />
                                    Normal
                                  </span>
                                )
                              )}
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                              Code: {result.parameter_code}
                              {result.unit && ` • Unit: ${result.unit}`}
                              {` • Type: ${result.parameter_type}`}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">
                              Result Value {result.unit && `(${result.unit})`}
                            </label>
                            
                            {result.parameter_type === "image" ? (
                              <div className="relative h-48 w-full overflow-hidden rounded-lg border border-slate-200 flex items-center justify-center bg-slate-50">
                                <MRDImage
                                  documentId={result.result_value}
                                  className="h-full max-w-full object-contain"
                                  alt={result.parameter_name}
                                />
                              </div>
                            ) : (
                              <div className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900">
                                {result.result_value}
                              </div>
                            )}

                            {result.parameter_type === "number" && result.normal_text && (
                              <p className="mt-1 text-xs text-slate-500">
                                Normal Range: {result.normal_text}
                              </p>
                            )}
                            {result.parameter_type === "number" && result.normal_min !== null && result.normal_max !== null && (
                              <p className="mt-1 text-xs text-slate-500">
                                Normal: {result.normal_min} - {result.normal_max} {result.unit}
                              </p>
                            )}
                            {result.parameter_type !== "number" && result.normal_text && (
                              <p className="mt-1 text-xs text-slate-500">
                                Expected: {result.normal_text}
                              </p>
                            )}
                          </div>

                          {result.notes && (
                            <div>
                              <label className="mb-1 block text-sm font-medium text-slate-700">
                                Notes
                              </label>
                              <div className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
                                {result.notes}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Verification Info */}
                        {result.verified_at && (
                          <div className="mt-3 border-t border-slate-200 pt-3">
                            <p className="text-xs text-slate-500">
                              Verified on {new Date(result.verified_at).toLocaleString()}
                              {result.verified_by && " • Verified by technician"}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}

