"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { labBookingsApi, LabBooking, BookingStatus, LabBookingTest } from "@/services/labBookingsApi";
import { labTestsApi, LabTestResult } from "@/services/labTestsApi";
import { patientsApi } from "@/services/patientsApi";
import { formatDate, currency } from "@/utils/format";
import { Beaker, Calendar, User, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, CheckCircle2, XCircle, Clock, FlaskConical, Eye, Lock, Download, List, Activity, Loader2 } from "lucide-react";
import { SkeletonRow } from "../shared/SkeletonRow";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { TestResultsForm } from "./TestResultsForm";
import { TestResultsView } from "./TestResultsView";
import { TestReportPrint } from "./TestReportPrint";

interface LabBookingWithPatient extends LabBooking {
  patient_name?: string;
  patient_mobile?: string;
  patient_gender?: string;
}

export function LabTechnicianPanel() {
  const [bookings, setBookings] = useState<LabBookingWithPatient[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "all">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [expandedBookings, setExpandedBookings] = useState<Set<string>>(new Set());
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [selectedTestForResults, setSelectedTestForResults] = useState<{
    labBookingId: string;
    bookingItemId: string;
    testCode: string;
    testName: string;
    patientGender?: string;
  } | null>(null);
  const [selectedTestForView, setSelectedTestForView] = useState<{
    labBookingId: string;
    bookingItemId: string;
    testCode: string;
    testName: string;
  } | null>(null);
  const [testsWithResults, setTestsWithResults] = useState<Set<string>>(new Set()); // Track bookingItemId of tests with results
  const [loadingResults, setLoadingResults] = useState<Set<string>>(new Set()); // Track which tests are loading results
  const [printReportData, setPrintReportData] = useState<{
    booking: LabBookingWithPatient;
    patientName: string;
    patientMobile?: string;
    testResults: Array<{
      test: LabBookingTest;
      results: LabTestResult[];
    }>;
  } | null>(null);
  const [shouldPrintReport, setShouldPrintReport] = useState(false);
  const printReportRef = useRef<HTMLDivElement>(null);

  // Set default date on client side only to avoid hydration mismatch
  useEffect(() => {
    if (!selectedDate) {
      setSelectedDate(new Date().toISOString().split("T")[0]);
    }
  }, [selectedDate]);

  const fetchBookings = useCallback(async () => {
    if (!selectedDate) return; // Don't fetch if date is not set yet
    setLoading(true);
    try {
      const response = await labBookingsApi.list({
        page: currentPage,
        page_size: pageSize,
        scheduled_date: selectedDate,
        status: statusFilter !== "all" ? statusFilter : undefined,
      });

      // Fetch patient details for bookings
      const bookingsWithPatients = await Promise.all(
        response.items.map(async (booking) => {
          try {
            const patient = await patientsApi.getById(booking.patient_id);
            // Map gender to F/M format for API
            const genderMap: Record<string, string> = {
              "male": "M",
              "Male": "M",
              "female": "F",
              "Female": "F",
              "other": "M", // Default to M if other
              "Other": "M",
            };
            const patientGender = genderMap[patient.gender] || "M";
            return {
              ...booking,
              patient_name: `${patient.first_name} ${patient.last_name || ""}`.trim(),
              patient_mobile: patient.mobile,
              patient_gender: patientGender,
            };
          } catch {
            return {
              ...booking,
              patient_name: "Unknown",
              patient_mobile: "",
              patient_gender: undefined,
            };
          }
        })
      );

      setBookings(bookingsWithPatients);
      setTotalPages(response.total_pages);
      setTotal(response.total);
    } catch (error: any) {
      console.error("Failed to fetch lab bookings:", error);
      setBookings([]);
      setTotalPages(1);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, selectedDate, statusFilter]);

  useEffect(() => {
    setCurrentPage(1); // Reset to first page when filter changes
  }, [selectedDate, statusFilter]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const getStatusColor = (status: BookingStatus) => {
    switch (status) {
      case "scheduled":
        return "bg-sky-50 text-sky-700";
      case "sample_collected":
        return "bg-amber-50 text-amber-700";
      case "in_progress":
        return "bg-blue-50 text-blue-700";
      case "completed":
        return "bg-emerald-50 text-emerald-700";
      case "cancelled":
        return "bg-rose-50 text-rose-700";
      default:
        return "bg-slate-50 text-slate-700";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-rose-50 text-rose-700";
      case "stat":
        return "bg-red-50 text-red-700";
      default:
        return "bg-slate-50 text-slate-700";
    }
  };

  const getValidNextStatuses = (currentStatus: BookingStatus): BookingStatus[] => {
    switch (currentStatus) {
      case "scheduled":
        return ["sample_collected", "cancelled"];
      case "sample_collected":
        return ["in_progress", "cancelled"];
      case "in_progress":
        return ["completed", "cancelled"];
      case "completed":
      case "cancelled":
        return [];
      default:
        return [];
    }
  };

  const getStatusLabel = (status: BookingStatus): string => {
    return status.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const allTestsHaveResults = (booking: LabBookingWithPatient): boolean => {
    if (booking.tests.length === 0) return false;
    return booking.tests.every((test) => testsWithResults.has(test.id));
  };

  const handleStatusUpdate = async (bookingId: string, newStatus: BookingStatus) => {
    setUpdatingStatus(bookingId);
    try {
      await labBookingsApi.updateStatus(bookingId, newStatus);
      toast.success(`Status updated to ${getStatusLabel(newStatus)}`);
      fetchBookings();
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage || "Failed to update status");
    } finally {
      setUpdatingStatus(null);
    }
  };

  const toggleBookingExpansion = async (bookingId: string) => {
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) return;

    setExpandedBookings((prev) => {
      const newSet = new Set(prev);
      const isExpanding = !newSet.has(bookingId);
      
      if (isExpanding) {
        newSet.add(bookingId);
        // Fetch results for all tests when expanding
        fetchTestsResults(booking);
      } else {
        newSet.delete(bookingId);
      }
      return newSet;
    });
  };

  const fetchTestsResults = async (booking: LabBookingWithPatient) => {
    // Check which tests have published results
    const testIdsToCheck = booking.tests.map((test) => test.id);
    setLoadingResults((prev) => {
      const newSet = new Set(prev);
      testIdsToCheck.forEach((id) => newSet.add(id));
      return newSet;
    });

    try {
      const resultsPromises = booking.tests.map(async (test) => {
        try {
          const results = await labTestsApi.getResults(booking.id, test.id);
          // Ensure results is an array
          const resultsArray = Array.isArray(results) ? results : [];
          return { testId: test.id, hasResults: resultsArray.length > 0 };
        } catch {
          return { testId: test.id, hasResults: false };
        }
      });

      const results = await Promise.all(resultsPromises);
      setTestsWithResults((prev) => {
        const newSet = new Set(prev);
        results.forEach(({ testId, hasResults }) => {
          if (hasResults) {
            newSet.add(testId);
          } else {
            newSet.delete(testId);
          }
        });
        return newSet;
      });
    } catch (error) {
      console.error("Failed to fetch test results:", error);
    } finally {
      setLoadingResults((prev) => {
        const newSet = new Set(prev);
        testIdsToCheck.forEach((id) => newSet.delete(id));
        return newSet;
      });
    }
  };

  const handlePublishResults = (test: LabBookingTest, bookingId: string) => {
    const booking = bookings.find((b) => b.id === bookingId);
    setSelectedTestForResults({
      labBookingId: bookingId,
      bookingItemId: test.id,
      testCode: test.test_code,
      testName: test.test_name,
      patientGender: booking?.patient_gender,
    });
  };

  const handlePrintReport = useReactToPrint({
    contentRef: printReportRef,
    documentTitle: printReportData ? `TestReport_${printReportData.booking.booking_number}` : "Test Report",
  });

  useEffect(() => {
    if (printReportData && shouldPrintReport && printReportRef.current) {
      // Small delay to ensure DOM is updated
      const timeoutId = setTimeout(() => {
        handlePrintReport();
        setShouldPrintReport(false);
      }, 200);
      return () => clearTimeout(timeoutId);
    }
  }, [printReportData, shouldPrintReport, handlePrintReport]);

  const handleDownloadReport = async (booking: LabBookingWithPatient) => {
    try {
      // Check if all tests have results
      if (!allTestsHaveResults(booking)) {
        toast.error("Cannot download report: Not all tests have published results");
        return;
      }

      // Fetch patient details
      let patientName = booking.patient_name || "Unknown";
      let patientMobile = booking.patient_mobile;

      if (!booking.patient_name || !booking.patient_mobile) {
        try {
          const patient = await patientsApi.getById(booking.patient_id);
          patientName = `${patient.first_name} ${patient.last_name || ""}`.trim();
          patientMobile = patient.mobile;
        } catch (error) {
          console.error("Failed to fetch patient details:", error);
        }
      }

      // Fetch results for all tests
      const testResultsPromises = booking.tests.map(async (test) => {
        try {
          const results = await labTestsApi.getResults(booking.id, test.id);
          return {
            test,
            results: Array.isArray(results) ? results : [],
          };
        } catch (error) {
          console.error(`Failed to fetch results for test ${test.id}:`, error);
          return {
            test,
            results: [],
          };
        }
      });

      const testResults = await Promise.all(testResultsPromises);

      // Set up print data
      setPrintReportData({
        booking,
        patientName,
        patientMobile,
        testResults,
      });
      setShouldPrintReport(true);
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage || "Failed to prepare report for download");
    }
  };

  const handleResultsPublished = async () => {
    // Mark this test as having results immediately
    if (selectedTestForResults) {
      setTestsWithResults((prev) => {
        const newSet = new Set(prev);
        newSet.add(selectedTestForResults.bookingItemId);
        return newSet;
      });

      // Refresh results for the entire booking to ensure all tests are checked
      const booking = bookings.find((b) => b.id === selectedTestForResults.labBookingId);
      if (booking) {
        await fetchTestsResults(booking);
      }
    }
    
    // Refresh bookings list
    fetchBookings();
    setSelectedTestForResults(null);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="mb-4">
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Scheduled Date
          </label>
          <div className="relative max-w-xs">
            <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2 text-sm outline-none focus:border-sky-400"
            />
          </div>
        </div>

        {/* Status Tabs */}
        <div className="border-b border-slate-200">
          <div className="flex flex-wrap gap-2 -mb-px">
            <button
              onClick={() => setStatusFilter("all")}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-colors border-b-2 ${
                statusFilter === "all"
                  ? "border-sky-500 text-sky-600"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
              }`}
            >
              <List className="h-4 w-4" />
              All
            </button>
            <button
              onClick={() => setStatusFilter("scheduled")}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-colors border-b-2 ${
                statusFilter === "scheduled"
                  ? "border-sky-500 text-sky-600"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
              }`}
            >
              <Calendar className="h-4 w-4" />
              Scheduled
            </button>
            <button
              onClick={() => setStatusFilter("sample_collected")}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-colors border-b-2 ${
                statusFilter === "sample_collected"
                  ? "border-sky-500 text-sky-600"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
              }`}
            >
              <FlaskConical className="h-4 w-4" />
              Sample Collected
            </button>
            <button
              onClick={() => setStatusFilter("in_progress")}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-colors border-b-2 ${
                statusFilter === "in_progress"
                  ? "border-sky-500 text-sky-600"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
              }`}
            >
              <Activity className="h-4 w-4" />
              In Progress
            </button>
            <button
              onClick={() => setStatusFilter("completed")}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-colors border-b-2 ${
                statusFilter === "completed"
                  ? "border-sky-500 text-sky-600"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
              }`}
            >
              <CheckCircle2 className="h-4 w-4" />
              Completed
            </button>
            <button
              onClick={() => setStatusFilter("cancelled")}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-colors border-b-2 ${
                statusFilter === "cancelled"
                  ? "border-sky-500 text-sky-600"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
              }`}
            >
              <XCircle className="h-4 w-4" />
              Cancelled
            </button>
          </div>
        </div>
      </div>

      {/* Bookings List */}
      {loading ? (
        <SkeletonRow rows={5} />
      ) : bookings.length === 0 ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center">
          <Beaker className="mx-auto h-12 w-12 text-slate-400" />
          <p className="mt-4 text-slate-500">No lab test bookings found</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {bookings.map((booking) => {
            const isExpanded = expandedBookings.has(booking.id);
            const validNextStatuses = getValidNextStatuses(booking.status);
            const isUpdating = updatingStatus === booking.id;
            const allResultsPublished = allTestsHaveResults(booking);

            return (
              <div
                key={booking.id}
                className="rounded-xl border border-slate-100 bg-white shadow-sm transition hover:border-sky-200 hover:shadow-md"
              >
                {/* Booking Header */}
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="flex min-w-[4rem] items-center justify-center rounded-lg bg-sky-100 px-3 py-2">
                          <p className="text-xs font-bold text-sky-700 break-all text-center">
                            {booking.booking_number.split("-").pop()}
                          </p>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-slate-900">
                              {booking.patient_name || `Patient ${booking.patient_id.slice(0, 8)}...`}
                            </p>
                            <span className="pill bg-sky-50 text-sky-700 px-2 py-0.5 text-xs font-mono">
                              {booking.booking_number}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                            {booking.patient_mobile && (
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {booking.patient_mobile}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(booking.scheduled_date)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className={`pill px-2 py-0.5 text-xs font-normal ${getStatusColor(booking.status)}`}>
                          {getStatusLabel(booking.status)}
                        </span>
                        <span className={`pill px-2 py-0.5 text-xs font-normal ${getPriorityColor(booking.priority)}`}>
                          {booking.priority}
                        </span>
                        <span className="pill bg-slate-50 text-slate-700 px-2 py-0.5 text-xs font-normal">
                          {booking.tests.length} test{booking.tests.length !== 1 ? "s" : ""}
                        </span>
                        <span className="pill bg-emerald-50 text-emerald-700 px-2 py-0.5 text-xs font-normal">
                          {currency(booking.total_amount)}
                        </span>
                      </div>
                    </div>

                    {/* Status Update Buttons and Download Report */}
                    <div className="ml-4 flex flex-col gap-2">
                      {validNextStatuses.length > 0 && (
                        <>
                          {validNextStatuses.map((nextStatus) => {
                            // Disable "completed" button if not all tests have results
                            const isCompletedButton = nextStatus === "completed";
                            const isDisabled = isUpdating || (isCompletedButton && !allResultsPublished);
                            const disabledReason = isCompletedButton && !allResultsPublished
                              ? "All test results must be published before completing"
                              : undefined;

                            return (
                              <button
                                key={nextStatus}
                                onClick={() => handleStatusUpdate(booking.id, nextStatus)}
                                disabled={isDisabled}
                                title={disabledReason}
                                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                                  nextStatus === "cancelled"
                                    ? "bg-rose-50 text-rose-700 hover:bg-rose-100"
                                    : nextStatus === "completed"
                                    ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                    : "bg-sky-50 text-sky-700 hover:bg-sky-100"
                                } ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
                              >
                                {nextStatus === "completed" && <CheckCircle2 className="h-3 w-3" />}
                                {nextStatus === "cancelled" && <XCircle className="h-3 w-3" />}
                                {(nextStatus === "sample_collected" || nextStatus === "in_progress") && (
                                  <Clock className="h-3 w-3" />
                                )}
                                {isUpdating ? "Updating..." : getStatusLabel(nextStatus)}
                              </button>
                            );
                          })}
                        </>
                      )}
                      {booking.status === "completed" && (
                        <button
                          onClick={() => handleDownloadReport(booking)}
                          title="Download Test Report as PDF"
                          className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-sky-500 to-teal-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:from-sky-600 hover:to-teal-600"
                        >
                          <Download className="h-3 w-3" />
                          Download Report
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expandable Tests Section */}
                {booking.tests.length > 0 && (
                  <div className="border-t border-slate-100">
                    <button
                      onClick={() => toggleBookingExpansion(booking.id)}
                      className="w-full px-4 py-3 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                    >
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <FlaskConical className="h-4 w-4" />
                          Tests ({booking.tests.length})
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-slate-100 bg-slate-50 p-4">
                        <div className="space-y-2">
                          {booking.tests.map((test) => {
                            const hasResults = testsWithResults.has(test.id);
                            const isLoading = loadingResults.has(test.id);
                            
                            return (
                              <div
                                key={test.id}
                                className={`flex items-center justify-between rounded-lg border px-4 py-3 ${
                                  hasResults
                                    ? "border-emerald-200 bg-emerald-50"
                                    : "border-slate-200 bg-white"
                                }`}
                              >
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="font-semibold text-slate-900">{test.test_name}</p>
                                    {hasResults && (
                                      <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                                        <CheckCircle2 className="h-3 w-3" />
                                        Results Published
                                      </span>
                                    )}
                                    {isLoading && (
                                      <span className="text-xs text-slate-500">Loading...</span>
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-500">
                                    Code: {test.test_code} • Price: {currency(test.price)}
                                  </p>
                                </div>
                                {booking.status === "in_progress" && (
                                  <div className="ml-4 flex items-center gap-2">
                                    {hasResults && (
                                      <button
                                        onClick={() => setSelectedTestForView({
                                          labBookingId: booking.id,
                                          bookingItemId: test.id,
                                          testCode: test.test_code,
                                          testName: test.test_name,
                                        })}
                                        className="flex items-center gap-1.5 rounded-lg border border-sky-300 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 transition hover:bg-sky-100"
                                      >
                                        <Eye className="h-3 w-3" />
                                        View
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handlePublishResults(test, booking.id)}
                                      className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition ${
                                        hasResults
                                          ? "bg-emerald-500 hover:bg-emerald-600"
                                          : "bg-sky-500 hover:bg-sky-600"
                                      }`}
                                    >
                                      <FlaskConical className="h-3 w-3" />
                                      {hasResults ? "Update" : "Publish"}
                                    </button>
                                  </div>
                                )}
                                {booking.status === "completed" && (
                                  <div className="ml-4 flex items-center gap-2">
                                    <div className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5">
                                      <Lock className="h-3 w-3 text-amber-600" />
                                      <span className="text-xs font-semibold text-amber-700">Locked</span>
                                    </div>
                                    <button
                                      onClick={() => setSelectedTestForView({
                                        labBookingId: booking.id,
                                        bookingItemId: test.id,
                                        testCode: test.test_code,
                                        testName: test.test_name,
                                      })}
                                      className="flex items-center gap-1.5 rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-sky-600"
                                    >
                                      <Eye className="h-3 w-3" />
                                      View Results
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3">
          <div className="text-sm text-slate-600">
            Showing <span className="font-semibold text-slate-900">{(currentPage - 1) * pageSize + 1}</span> to{" "}
            <span className="font-semibold text-slate-900">
              {Math.min(currentPage * pageSize, total)}
            </span>{" "}
            of <span className="font-semibold text-slate-900">{total}</span> bookings
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`min-w-[2.5rem] rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                      currentPage === pageNum
                        ? "bg-sky-500 text-white"
                        : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Test Results Form Modal */}
      {selectedTestForResults && (
        <TestResultsForm
          isOpen={!!selectedTestForResults}
          onClose={() => setSelectedTestForResults(null)}
          labBookingId={selectedTestForResults.labBookingId}
          bookingItemId={selectedTestForResults.bookingItemId}
          testCode={selectedTestForResults.testCode}
          testName={selectedTestForResults.testName}
          patientGender={selectedTestForResults.patientGender}
          onSuccess={handleResultsPublished}
        />
      )}

      {/* Test Results View Modal */}
      {selectedTestForView && (
        <TestResultsView
          isOpen={!!selectedTestForView}
          onClose={() => setSelectedTestForView(null)}
          labBookingId={selectedTestForView.labBookingId}
          bookingItemId={selectedTestForView.bookingItemId}
          testCode={selectedTestForView.testCode}
          testName={selectedTestForView.testName}
        />
      )}

      {/* Hidden printable test report */}
      {printReportData && (
        <div style={{ position: "absolute", left: "-9999px", top: "-9999px", width: "210mm" }}>
          <div ref={printReportRef} className="print-content">
            <TestReportPrint
              booking={printReportData.booking}
              patientName={printReportData.patientName}
              patientMobile={printReportData.patientMobile}
              testResults={printReportData.testResults}
            />
          </div>
        </div>
      )}
    </div>
  );
}

