"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  FlaskConical,
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  X,
  Search,
  Trash2,
  Plus,
  Tag,
  Check,
  XCircle,
} from "lucide-react";
import { labBookingsApi } from "@/services/labBookingsApi";
import { labTestsApi, LabTest } from "@/services/labTestsApi";
import { ipdDoctorApi } from "@/services/ipdDoctorApi";
import { IpdOrder } from "@/types/ipdDoctor";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { currency } from "@/utils/format";

interface IpdInvestigationsTabProps {
  patientId: string;
  admissionId: string;
  labBookings?: any[];
  orders?: IpdOrder[];
  onRefresh: () => void;
}

interface SelectedInvestigationItem {
  id: string; // unique key
  name: string;
  code?: string;
  category?: string;
  price?: number;
  lab_test_id?: string | null;
}

const COMMON_PRESETS = [
  "Complete Blood Count",
  "Serum Electrolytes",
  "Liver Function Test",
  "Kidney Function Test",
  "Blood Sugar Fasting",
  "C-Reactive Protein",
  "Urine Routine & Microscopic",
  "HbA1c",
  "Lipid Profile",
  "Thyroid Profile",
  "Arterial Blood Gas",
  "Blood Culture & Sensitivity",
];

export function IpdInvestigationsTab({
  patientId,
  admissionId,
  labBookings = [],
  orders = [],
  onRefresh,
}: IpdInvestigationsTabProps) {
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [testSearch, setTestSearch] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [availableTests, setAvailableTests] = useState<LabTest[]>([]);
  const [loadingTests, setLoadingTests] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Multi-test selection state
  const [selectedTests, setSelectedTests] = useState<SelectedInvestigationItem[]>([]);
  const [instructions, setInstructions] = useState("");
  const [priority, setPriority] = useState<"routine" | "urgent" | "stat">("routine");
  const [submitting, setSubmitting] = useState(false);

  // Results Modal state
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [resultsData, setResultsData] = useState<any | null>(null);
  const [loadingResults, setLoadingResults] = useState(false);

  // Cancel Order state
  const [cancellingOrder, setCancellingOrder] = useState<IpdOrder | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [submittingCancel, setSubmittingCancel] = useState(false);

  // Load catalog tests for autocomplete
  useEffect(() => {
    const loadCatalog = async () => {
      setLoadingTests(true);
      try {
        const res = await labTestsApi.list({ is_active: true, page_size: 200 });
        setAvailableTests(res.items || []);
      } catch (err) {
        console.error("Failed to load lab catalog:", err);
      } finally {
        setLoadingTests(false);
      }
    };
    loadCatalog();
  }, []);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter tests by search query ONLY when query is non-empty
  const filteredCatalog = useMemo(() => {
    const q = testSearch.trim().toLowerCase();
    if (!q) return [];
    return availableTests.filter(
      (t) =>
        t.test_name.toLowerCase().includes(q) ||
        t.test_code.toLowerCase().includes(q) ||
        (t.category && t.category.toLowerCase().includes(q))
    );
  }, [availableTests, testSearch]);

  const isTestSelected = (name: string, labTestId?: string | null) => {
    return selectedTests.some(
      (item) =>
        (labTestId && item.lab_test_id === labTestId) ||
        item.name.toLowerCase() === name.toLowerCase()
    );
  };

  const handleAddTest = (test: LabTest) => {
    if (isTestSelected(test.test_name, test.id)) {
      toast.info(`"${test.test_name}" is already in the list`);
      return;
    }

    setSelectedTests((prev) => [
      ...prev,
      {
        id: test.id,
        name: test.test_name,
        code: test.test_code,
        category: test.category,
        price: test.price,
        lab_test_id: test.id,
      },
    ]);
    setTestSearch("");
    setIsSearchFocused(false);
    toast.success(`Added ${test.test_name}`);
  };

  const handleTogglePreset = (presetName: string) => {
    const matched = availableTests.find((t) =>
      t.test_name.toLowerCase().includes(presetName.toLowerCase())
    );

    if (matched) {
      if (isTestSelected(matched.test_name, matched.id)) {
        // Remove if already selected
        handleRemoveTest(matched.id);
      } else {
        handleAddTest(matched);
      }
    } else {
      if (isTestSelected(presetName)) {
        handleRemoveTest(presetName);
      } else {
        setSelectedTests((prev) => [
          ...prev,
          {
            id: presetName,
            name: presetName,
            category: "General",
            lab_test_id: null,
          },
        ]);
        toast.success(`Added ${presetName}`);
      }
    }
  };

  const handleAddCustomTest = () => {
    const trimmed = testSearch.trim();
    if (!trimmed) return;

    if (isTestSelected(trimmed)) {
      toast.info(`"${trimmed}" is already in the list`);
      return;
    }

    setSelectedTests((prev) => [
      ...prev,
      {
        id: `custom-${Date.now()}`,
        name: trimmed,
        category: "Custom",
        lab_test_id: null,
      },
    ]);
    setTestSearch("");
    setIsSearchFocused(false);
    toast.success(`Added ${trimmed}`);
  };

  const handleRemoveTest = (id: string) => {
    setSelectedTests((prev) => prev.filter((t) => t.id !== id));
  };

  const handleOrderLabsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTests.length === 0) {
      toast.error("Please select at least one lab test to order");
      return;
    }

    setSubmitting(true);
    try {
      const ordersPayload = selectedTests.map((t) => ({
        order_category: "lab",
        order_title: t.name,
        instructions: instructions.trim() || null,
        priority,
        lab_test_id: t.lab_test_id || null,
      }));

      // Try batch creation endpoint with fallback to single create
      try {
        await ipdDoctorApi.createOrdersBatch(admissionId, ordersPayload);
      } catch {
        await Promise.all(
          ordersPayload.map((payload) => ipdDoctorApi.createOrder(admissionId, payload))
        );
      }

      toast.success(
        `Successfully ordered ${selectedTests.length} investigation${
          selectedTests.length > 1 ? "s" : ""
        }. Sent to Lab Bookings.`
      );
      setShowOrderModal(false);
      setSelectedTests([]);
      setTestSearch("");
      setInstructions("");
      setPriority("routine");
      onRefresh();
    } catch (err: any) {
      toast.error(getErrorMessage(err) || "Failed to order lab investigations");
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewResults = async (bookingId: string) => {
    setSelectedBookingId(bookingId);
    setLoadingResults(true);
    try {
      const res = await labBookingsApi.getResults(bookingId);
      setResultsData(res);
    } catch (err: any) {
      toast.error("Failed to load lab results");
    } finally {
      setLoadingResults(false);
    }
  };

  const handleCancelOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingOrder) return;
    if (!cancelReason.trim()) {
      toast.error("Please provide a cancellation reason");
      return;
    }

    setSubmittingCancel(true);
    try {
      await ipdDoctorApi.discontinueOrder(cancellingOrder.id, cancelReason.trim());
      toast.success("Lab order cancelled");
      setCancellingOrder(null);
      setCancelReason("");
      onRefresh();
    } catch (err: any) {
      toast.error(getErrorMessage(err) || "Failed to cancel lab order");
    } finally {
      setSubmittingCancel(false);
    }
  };

  // Filter lab orders
  const labOrders = useMemo(() => {
    return (orders || []).filter((o) => o.order_category === "lab");
  }, [orders]);

  const totalEstimatedCost = useMemo(() => {
    return selectedTests.reduce((acc, t) => acc + (t.price || 0), 0);
  }, [selectedTests]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 border border-sky-100 text-sky-600 shadow-2xs">
              <FlaskConical className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Lab & Diagnostic Investigations</h3>
              <p className="text-xs text-slate-500">
                Doctor-ordered investigations, lab booking status, and real-time reports
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setSelectedTests([]);
              setTestSearch("");
              setIsSearchFocused(false);
              setShowOrderModal(true);
            }}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-teal-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:shadow-md cursor-pointer"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Order Lab Investigations</span>
          </button>
        </div>

        {/* Section 1: Active Doctor Lab Orders */}
        <div className="mt-5 space-y-3">
          <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
            <span>Doctor Orders & Prescribed Tests</span>
            <span className="rounded-full bg-slate-100 text-slate-600 px-2 py-0.5 text-[10px] font-semibold">
              {labOrders.length}
            </span>
          </h4>

          {labOrders.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center bg-slate-50/50">
              <FlaskConical className="mx-auto h-6 w-6 text-slate-300 mb-1" />
              <p className="text-xs font-semibold text-slate-600">No lab tests ordered yet</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Click &quot;Order Lab Investigations&quot; to order one or multiple tests. They will appear in the Lab Bookings panel.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {labOrders.map((order) => {
                const isCancelled = order.status === "discontinued" || order.status === "cancelled";
                const isCompleted = order.booking_status === "completed" || order.has_results;
                const isBooked = !!order.booking_id;

                return (
                  <div
                    key={order.id}
                    className={`flex flex-col justify-between p-4 rounded-xl border transition shadow-2xs space-y-2 ${
                      isCancelled
                        ? "border-slate-200 bg-slate-50/70 opacity-75"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p
                            className={`font-bold text-sm text-slate-900 ${
                              isCancelled ? "line-through text-slate-500" : ""
                            }`}
                          >
                            {order.order_title}
                          </p>
                          <span
                            className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                              order.priority === "stat"
                                ? "bg-rose-100 text-rose-800 border border-rose-200"
                                : order.priority === "urgent"
                                ? "bg-amber-100 text-amber-800 border border-amber-200"
                                : "bg-slate-100 text-slate-600 border border-slate-200"
                            }`}
                          >
                            {order.priority}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                          Order #{order.order_number} • {new Date(order.ordered_at).toLocaleDateString()}
                        </p>
                      </div>

                      {/* Status Badge */}
                      {isCancelled ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 text-slate-700 px-2.5 py-0.5 text-[10px] font-bold">
                          Cancelled
                        </span>
                      ) : isCompleted ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-[10px] font-bold border border-emerald-200">
                          <CheckCircle2 className="h-3 w-3" />
                          Results Ready
                        </span>
                      ) : isBooked ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 text-sky-800 px-2.5 py-0.5 text-[10px] font-bold border border-sky-200">
                          <Clock className="h-3 w-3" />
                          Booked ({order.booking_status || "In Progress"})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 px-2.5 py-0.5 text-[10px] font-bold border border-amber-200">
                          <Clock className="h-3 w-3" />
                          Pending Lab Booking
                        </span>
                      )}
                    </div>

                    {order.instructions && (
                      <p className="text-xs text-slate-600 bg-slate-50 rounded-lg p-2 border border-slate-100">
                        <span className="font-semibold text-slate-700">Instructions:</span> {order.instructions}
                      </p>
                    )}

                    {order.discontinue_reason && (
                      <p className="text-[11px] text-rose-700 bg-rose-50 rounded-lg p-1.5 border border-rose-100">
                        <span className="font-semibold">Cancellation Reason:</span> {order.discontinue_reason}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                      <span className="text-slate-500 font-medium truncate">
                        By {order.doctor_name || "Attending Doctor"}
                      </span>

                      <div className="flex items-center gap-2">
                        {order.booking_id && (
                          <button
                            onClick={() => handleViewResults(order.booking_id!)}
                            className="inline-flex items-center gap-1 text-xs font-bold text-sky-600 hover:text-sky-800 cursor-pointer"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>View Report</span>
                          </button>
                        )}

                        {!isCancelled && (
                          <button
                            onClick={() => {
                              setCancellingOrder(order);
                              setCancelReason("Cancelled by doctor");
                            }}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-rose-600 transition cursor-pointer"
                            title="Cancel Lab Order"
                          >
                            <XCircle className="h-3.5 w-3.5 text-rose-500" />
                            <span>Cancel</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Section 2: Stay Lab Bookings Archive */}
        {labBookings && labBookings.length > 0 && (
          <div className="mt-8 space-y-3 pt-6 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <span>All Lab Bookings for this Stay</span>
              <span className="rounded-full bg-slate-100 text-slate-600 px-2 py-0.5 text-[10px] font-semibold">
                {labBookings.length}
              </span>
            </h4>

            <div className="space-y-2.5">
              {labBookings.map((b) => {
                const isCompleted = b.status === "completed";
                return (
                  <div
                    key={b.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 hover:bg-white transition"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                          isCompleted
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-sky-100 text-sky-700"
                        }`}
                      >
                        <FlaskConical className="h-4 w-4" />
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-xs sm:text-sm">
                            Booking #{b.booking_number}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${
                              isCompleted
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {b.status}
                          </span>
                        </div>

                        <p className="mt-0.5 text-[11px] text-slate-500">
                          Date: {new Date(b.booking_date || b.scheduled_date).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleViewResults(b.id)}
                        className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 transition shadow-2xs cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5 text-sky-600" />
                        <span>View Results</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Modal: Order Multiple Lab Tests */}
      {showOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center">
                  <FlaskConical className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Order Lab Investigations</h3>
                  <p className="text-[11px] text-slate-500">Select multiple tests to advise for this admission</p>
                </div>
              </div>
              <button
                onClick={() => setShowOrderModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <form onSubmit={handleOrderLabsSubmit} className="mt-4 space-y-4 text-xs overflow-y-auto flex-1 pr-1">
              {/* Quick Presets */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Quick Presets (Click to add / remove)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_PRESETS.map((preset) => {
                    const selected = isTestSelected(preset);
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handleTogglePreset(preset)}
                        className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition cursor-pointer flex items-center gap-1 border ${
                          selected
                            ? "bg-sky-600 text-white border-sky-600 shadow-2xs"
                            : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-sky-50 hover:text-sky-700 hover:border-sky-200"
                        }`}
                      >
                        {selected ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                        <span>{preset}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Searchable Test Catalog */}
              <div ref={searchContainerRef} className="relative">
                <label className="block font-semibold text-slate-700 mb-1">
                  Search & Add Catalog Tests
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Type to search test name, code, or category..."
                    value={testSearch}
                    onFocus={() => setIsSearchFocused(true)}
                    onChange={(e) => {
                      setTestSearch(e.target.value);
                      setIsSearchFocused(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (filteredCatalog.length > 0) {
                          handleAddTest(filteredCatalog[0]);
                        } else if (testSearch.trim()) {
                          handleAddCustomTest();
                        }
                      }
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-20 py-2 text-xs focus:border-sky-500 focus:outline-none"
                  />
                  {testSearch.trim() && (
                    <button
                      type="button"
                      onClick={handleAddCustomTest}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-sky-100 text-sky-700 px-2 py-1 text-[10px] font-bold hover:bg-sky-200 transition cursor-pointer"
                    >
                      + Add Custom
                    </button>
                  )}
                </div>

                {/* Autocomplete Dropdown List - ONLY shown when searching and query length > 0 */}
                {isSearchFocused && testSearch.trim().length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-30 mt-1 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl divide-y divide-slate-100">
                    {filteredCatalog.length > 0 ? (
                      filteredCatalog.map((t) => {
                        const selected = isTestSelected(t.test_name, t.id);
                        return (
                          <div
                            key={t.id}
                            onClick={() => handleAddTest(t)}
                            className="p-2.5 hover:bg-sky-50 transition cursor-pointer flex justify-between items-center text-xs"
                          >
                            <div>
                              <div className="flex items-center gap-1.5">
                                <p className="font-bold text-slate-900">{t.test_name}</p>
                                {selected && (
                                  <span className="rounded bg-sky-100 px-1.5 py-0.2 text-[9px] font-bold text-sky-800">
                                    Added
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-500 font-mono">
                                Code: {t.test_code} • {t.category || "General"}
                              </p>
                            </div>
                            <span className="font-bold text-slate-700">{currency(t.price || 0)}</span>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-3 text-center text-slate-500">
                        <p className="text-xs">No matching catalog test found.</p>
                        <button
                          type="button"
                          onClick={handleAddCustomTest}
                          className="mt-1 text-xs font-bold text-sky-600 hover:underline cursor-pointer"
                        >
                          Add &quot;{testSearch.trim()}&quot; as custom test
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Selected Tests List / Table */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-slate-800 flex items-center gap-1.5">
                    <span>Selected Investigations</span>
                    <span className="rounded-full bg-sky-100 text-sky-800 px-2 py-0.5 text-[10px] font-bold">
                      {selectedTests.length}
                    </span>
                  </label>
                  {selectedTests.length > 0 && totalEstimatedCost > 0 && (
                    <span className="text-[11px] font-bold text-slate-600">
                      Total: {currency(totalEstimatedCost)}
                    </span>
                  )}
                </div>

                {selectedTests.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center bg-slate-50 text-slate-400 text-xs">
                    No tests selected yet. Click quick presets above or search catalog to add multiple tests.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {selectedTests.map((item, idx) => (
                      <div
                        key={item.id || idx}
                        className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50/80 hover:bg-slate-50 transition"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-100 text-sky-700 text-[10px] font-bold">
                            {idx + 1}
                          </span>
                          <div>
                            <p className="font-bold text-slate-900 text-xs">{item.name}</p>
                            <p className="text-[10px] text-slate-500 font-mono">
                              {item.code ? `Code: ${item.code} • ` : ""}
                              {item.category || "General"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {item.price !== undefined && item.price > 0 && (
                            <span className="text-xs font-bold text-slate-700">
                              {currency(item.price)}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveTest(item.id)}
                            className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer"
                            title="Remove test"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Priority Selector */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Priority for this order <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["routine", "urgent", "stat"] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`rounded-xl border py-2 text-xs font-bold capitalize transition cursor-pointer ${
                        priority === p
                          ? p === "stat"
                            ? "border-rose-500 bg-rose-50 text-rose-700 ring-1 ring-rose-400"
                            : p === "urgent"
                            ? "border-amber-500 bg-amber-50 text-amber-700 ring-1 ring-amber-400"
                            : "border-sky-500 bg-sky-50 text-sky-700 ring-1 ring-sky-400"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {p === "stat" ? "STAT (Immediate)" : p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Instructions */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Clinical Instructions for Lab Technician & Nursing
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Draw fasting sample at 7:00 AM; bedside collection; draw before next IV antibiotic dose..."
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-sky-500 focus:outline-none resize-none"
                />
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setShowOrderModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || selectedTests.length === 0}
                  className="rounded-xl bg-gradient-to-r from-sky-600 to-teal-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:shadow transition disabled:opacity-50 cursor-pointer"
                >
                  {submitting
                    ? "Ordering..."
                    : selectedTests.length > 0
                    ? `Order ${selectedTests.length} Lab Test${selectedTests.length > 1 ? "s" : ""}`
                    : "Select at least 1 test"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View Results */}
      {selectedBookingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FlaskConical className="h-5 w-5 text-sky-600" />
                <h3 className="font-bold text-slate-900">Lab Investigation Results</h3>
              </div>
              <button
                onClick={() => {
                  setSelectedBookingId(null);
                  setResultsData(null);
                }}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {loadingResults ? (
              <div className="py-12 text-center text-xs text-slate-500">
                <div className="h-8 w-8 mx-auto animate-spin rounded-full border-2 border-slate-200 border-t-sky-600" />
                <p className="mt-2">Loading test parameters & results...</p>
              </div>
            ) : !resultsData || !resultsData.results || resultsData.results.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                <AlertCircle className="mx-auto h-8 w-8 text-amber-400" />
                <p className="mt-2 text-xs font-semibold">Results pending from the laboratory</p>
                <p className="text-[11px] text-slate-400">
                  The sample has been scheduled or is in process.
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-4 text-xs">
                <div className="rounded-xl bg-slate-50 p-3 border border-slate-200 flex justify-between items-center">
                  <p className="font-bold text-slate-900">
                    Booking #{resultsData.booking_number || selectedBookingId}
                  </p>
                  <span className="rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-[10px] font-bold">
                    Completed
                  </span>
                </div>

                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100/70 text-slate-700">
                      <th className="py-2 px-3 font-semibold">Parameter</th>
                      <th className="py-2 px-3 font-semibold">Result</th>
                      <th className="py-2 px-3 font-semibold">Unit</th>
                      <th className="py-2 px-3 font-semibold">Reference Range</th>
                      <th className="py-2 px-3 font-semibold text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {resultsData.results.map((r: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          {r.parameter_name}
                        </td>
                        <td
                          className={`py-2.5 px-3 font-bold ${
                            r.is_abnormal ? "text-rose-600 font-extrabold" : "text-slate-800"
                          }`}
                        >
                          {r.result_value || r.result_numeric || "—"}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">{r.unit || "—"}</td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {r.reference_range || (r.min_range && r.max_range ? `${r.min_range} - ${r.max_range}` : "—")}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {r.is_abnormal ? (
                            <span className="rounded bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">
                              Abnormal
                            </span>
                          ) : (
                            <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                              Normal
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Modal: Cancel Lab Order */}
      {cancellingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-800">
                <XCircle className="h-5 w-5 text-rose-600" />
                <h3 className="font-bold text-slate-900">Cancel Lab Investigation</h3>
              </div>
              <button
                onClick={() => setCancellingOrder(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCancelOrderSubmit} className="mt-4 space-y-4 text-xs">
              <div className="rounded-xl bg-slate-50 p-3 border border-slate-200">
                <p className="font-bold text-slate-900">{cancellingOrder.order_title}</p>
                <p className="text-slate-500 font-mono mt-0.5">Order #{cancellingOrder.order_number}</p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Reason for Cancellation <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Test not required, Ordered in error, Duplicate test..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-rose-500 focus:outline-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setCancellingOrder(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCancel}
                  className="rounded-xl bg-rose-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
                >
                  {submittingCancel ? "Cancelling..." : "Confirm Cancel"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
