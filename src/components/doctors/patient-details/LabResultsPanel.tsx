"use client";

import React, { useState } from "react";
import { FlaskConical, ChevronDown, ChevronUp, Download, RefreshCw } from "lucide-react";
import { NormalRangeIndicator } from "../shared/NormalRangeIndicator";

interface LabBooking {
  id: string;
  booking_number: string;
  scheduled_date: string;
  status: string;
}

interface LabTestParameter {
  id: string;
  booking_item_id: string;
  parameter_id: string;
  parameter_name: string;
  parameter_code: string;
  unit: string;
  result_value: string;
  result_numeric: number | null;
  is_abnormal: boolean;
  normal_min: number | null;
  normal_max: number | null;
  normal_text: string | null;
  notes: string | null;
  verified_by: string | null;
  verified_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface LabTestResultItem {
  booking_item_id: string;
  lab_test_id: string;
  test_code: string;
  test_name: string;
  results: LabTestParameter[];
}

type LabResultsResponse = LabTestResultItem[];

interface LabResultsPanelProps {
  patientId: string;
  labBookings: LabBooking[];
  loading?: boolean;
  onRefresh: () => void;
  onGetResults: (bookingId: string) => Promise<LabResultsResponse>;
}

export const LabResultsPanel: React.FC<LabResultsPanelProps> = ({
  patientId,
  labBookings,
  loading = false,
  onRefresh,
  onGetResults,
}) => {
  const [expandedBooking, setExpandedBooking] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, LabTestResultItem[]>>({});
  const [loadingResults, setLoadingResults] = useState<Record<string, boolean>>({});

  const getStatusColor = (status: string) => {
    switch ((status || "").toLowerCase()) {
      case "completed":
        return "bg-emerald-100 text-emerald-700 border-emerald-300";
      case "in_progress":
        return "bg-blue-100 text-blue-700 border-blue-300";
      case "sample_collected":
        return "bg-amber-100 text-amber-700 border-amber-300";
      default:
        return "bg-slate-100 text-slate-700 border-slate-300";
    }
  };

  const handleToggleExpand = async (bookingId: string) => {
    if (expandedBooking === bookingId) {
      setExpandedBooking(null);
      return;
    }

    setExpandedBooking(bookingId);

    // Load results if not already loaded
    if (!results[bookingId]) {
      setLoadingResults({ ...loadingResults, [bookingId]: true });
      try {
        const labResults = await onGetResults(bookingId);
        setResults({ ...results, [bookingId]: labResults });
      } catch (error) {
        console.error("Failed to load results:", error);
      } finally {
        setLoadingResults({ ...loadingResults, [bookingId]: false });
      }
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-full animate-pulse rounded-lg bg-slate-200" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      </div>
    );
  }

  if (labBookings.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
        <FlaskConical className="mx-auto h-16 w-16 text-slate-300" />
        <h3 className="mt-4 text-lg font-semibold text-slate-900">No Lab Tests</h3>
        <p className="mt-2 text-sm text-slate-600">
          No lab tests have been ordered for this patient yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-900">Lab Results</h3>
        <button
          onClick={onRefresh}
          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Lab bookings list */}
      <div className="space-y-3">
        {labBookings.map((booking) => {
          const isExpanded = expandedBooking === booking.id;
          const bookingResults = results[booking.id];
          const isLoadingResults = loadingResults[booking.id];
          const canShowResults = (booking.status || "").toLowerCase() === "completed";

          return (
            <div
              key={booking.id}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
            >
              {/* Booking header */}
              <button
                onClick={() => handleToggleExpand(booking.id)}
                className="w-full p-4 text-left transition hover:bg-slate-50"
                disabled={!canShowResults}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <FlaskConical className="h-5 w-5 text-slate-400" />
                      <div>
                        <p className="font-semibold text-slate-900">
                          {booking.booking_number}
                        </p>
                        <p className="text-sm text-slate-600">
                          {new Date(booking.scheduled_date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusColor(
                        booking.status
                      )}`}
                    >
                      {booking.status.replace(/_/g, " ")}
                    </span>

                    {canShowResults && (
                      isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-slate-400" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-slate-400" />
                      )
                    )}
                  </div>
                </div>
              </button>

              {/* Results */}
              {isExpanded && canShowResults && (
                <div className="border-t border-slate-200 bg-slate-50 p-4">
                  {isLoadingResults ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="h-20 animate-pulse rounded-lg bg-slate-200"
                        />
                      ))}
                    </div>
                  ) : bookingResults && bookingResults.length > 0 ? (
                    <div className="space-y-4">
                      {bookingResults.map((testItem) => (
                        <div key={testItem.booking_item_id} className="space-y-3">
                          {/* Test name header */}
                          <div className="rounded-lg bg-sky-50 px-3 py-2">
                            <h4 className="font-semibold text-sky-900">
                              {testItem.test_name}
                            </h4>
                            <p className="text-xs text-sky-700">
                              Code: {testItem.test_code}
                            </p>
                          </div>

                          {/* Test parameters */}
                          {testItem.results.map((parameter) => (
                            <div
                              key={parameter.id}
                              className="rounded-lg border border-slate-200 bg-white p-4"
                            >
                              <NormalRangeIndicator
                                label={parameter.parameter_name}
                                value={parameter.result_numeric ?? parameter.result_value}
                                normalMin={parameter.normal_min}
                                normalMax={parameter.normal_max}
                                unit={parameter.unit}
                                size="md"
                              />
                              {parameter.normal_text && (
                                <p className="mt-2 text-xs text-slate-600">
                                  Normal: {parameter.normal_text}
                                </p>
                              )}
                              {parameter.notes && (
                                <p className="mt-1 text-xs italic text-slate-500">
                                  Note: {parameter.notes}
                                </p>
                              )}
                              {parameter.verified_at && (
                                <p className="mt-1 text-xs text-emerald-600">
                                  ✓ Verified on {new Date(parameter.verified_at).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      ))}

                      {/* Download button */}
                      <button className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700">
                        <Download className="h-4 w-4" />
                        Download Report
                      </button>
                    </div>
                  ) : (
                    <p className="text-center text-sm text-slate-600">
                      Results not available yet.
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
