"use client";

import { useState, useEffect, useRef } from "react";
import { labBookingsApi, AdvisedTest, BookAdvisedTestsRequest, PaymentMethod, TestPriority } from "@/services/labBookingsApi";
import { opdVisitsApi, Visit } from "@/services/opdVisitsApi";
import { patientsApi } from "@/services/patientsApi";
import { Patient } from "@/types";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { Calendar, Search, User, Beaker, Check, AlertCircle, RefreshCw, FileText, ClipboardList } from "lucide-react";
import { currency, getTodayDateLocal } from "@/utils/format";

export interface PrescribedLabBookingPanelProps {
  visitId?: string;
  patientId?: string;
  patientName?: string;
  onSuccess?: () => void;
}

export function PrescribedLabBookingPanel({
  visitId: propVisitId,
  patientId: propPatientId,
  patientName: propPatientName,
  onSuccess,
}: PrescribedLabBookingPanelProps) {
  // Mode selection
  const isDirectMode = !!propVisitId;

  // Selected visit state
  const [selectedVisitId, setSelectedVisitId] = useState<string>(propVisitId || "");
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);

  // Standalone mode state: Visits list and search
  const [recentVisits, setRecentVisits] = useState<Visit[]>([]);
  const [loadingVisits, setLoadingVisits] = useState(false);
  const [patientSearchTerm, setPatientSearchTerm] = useState("");
  const [isSearchingPatients, setIsSearchingPatients] = useState(false);
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchDropdownRef = useRef<HTMLDivElement>(null);

  // Booking details state
  const [advisedTests, setAdvisedTests] = useState<AdvisedTest[]>([]);
  const [loadingTests, setLoadingTests] = useState(false);
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>([]);
  const [scheduledDate, setScheduledDate] = useState("");
  const [priority, setPriority] = useState<TestPriority>("routine");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Set default date to today
  useEffect(() => {
    setScheduledDate(getTodayDateLocal());
  }, []);

  // Standalone Mode: Fetch recent visits on load
  useEffect(() => {
    if (isDirectMode) return;

    const fetchRecentVisits = async () => {
      setLoadingVisits(true);
      try {
        const response = await opdVisitsApi.list({ page_size: 20 });
        setRecentVisits(response.items || []);
      } catch (error) {
        console.error("Failed to fetch recent visits:", error);
        toast.error("Failed to load recent visits");
      } finally {
        setLoadingVisits(false);
      }
    };

    fetchRecentVisits();
  }, [isDirectMode]);

  // Standalone Mode: Fetch selected visit detail
  useEffect(() => {
    if (isDirectMode) return;
    if (!selectedVisitId) {
      setSelectedVisit(null);
      setAdvisedTests([]);
      setSelectedTestIds([]);
      return;
    }

    const fetchVisitDetail = async () => {
      try {
        const visit = await opdVisitsApi.getById(selectedVisitId);
        setSelectedVisit(visit);
      } catch (error) {
        console.error("Failed to fetch visit details:", error);
        toast.error("Failed to load visit details");
      }
    };

    fetchVisitDetail();
  }, [selectedVisitId, isDirectMode]);

  // Standalone Mode: Patient search dropdown
  useEffect(() => {
    if (isDirectMode) return;
    if (patientSearchTerm.trim().length >= 2) {
      const timeoutId = setTimeout(async () => {
        setIsSearchingPatients(true);
        try {
          const response = await patientsApi.searchGlobal({ q: patientSearchTerm.trim(), page_size: 10 });
          const mapped = patientsApi.mapToPatients(response.items);
          setSearchResults(mapped);
          setShowSearchDropdown(true);
        } catch (error) {
          console.error("Search failed:", error);
          setSearchResults([]);
        } finally {
          setIsSearchingPatients(false);
        }
      }, 300);

      return () => clearTimeout(timeoutId);
    } else {
      setSearchResults([]);
      setShowSearchDropdown(false);
    }
  }, [patientSearchTerm, isDirectMode]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (searchDropdownRef.current && !searchDropdownRef.current.contains(e.target as Node)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Fetch Advised Tests for the selected visit
  const fetchAdvisedTests = async (vId: string) => {
    setLoadingTests(true);
    try {
      const tests = await labBookingsApi.getAdvisedTests(vId);
      setAdvisedTests(tests || []);
      // Default checked: all tests where already_booked is false
      const toCheck = (tests || [])
        .filter((t) => !t.already_booked)
        .map((t) => t.lab_test_id);
      setSelectedTestIds(toCheck);
    } catch (error) {
      console.error("Failed to fetch advised tests:", error);
      toast.error("Failed to load prescribed lab tests");
      setAdvisedTests([]);
      setSelectedTestIds([]);
    } finally {
      setLoadingTests(false);
    }
  };

  useEffect(() => {
    if (selectedVisitId) {
      fetchAdvisedTests(selectedVisitId);
    }
  }, [selectedVisitId]);

  // Handle patient selection from search dropdown
  const handlePatientSelect = async (patient: Patient) => {
    setPatientSearchTerm("");
    setShowSearchDropdown(false);
    setLoadingVisits(true);
    try {
      // Find visits for the selected patient
      const response = await opdVisitsApi.list({ patient_id: patient.id, page_size: 10 });
      if (response.items && response.items.length > 0) {
        setRecentVisits(response.items);
        // Automatically select the most recent visit
        setSelectedVisitId(response.items[0].id);
      } else {
        toast.info(`No recent visits found for patient ${patient.name}`);
      }
    } catch (error) {
      console.error("Failed to fetch visits for selected patient:", error);
      toast.error("Failed to find visits for patient");
    } finally {
      setLoadingVisits(false);
    }
  };

  // Checkbox toggle
  const handleToggleTest = (labTestId: string) => {
    setSelectedTestIds((prev) =>
      prev.includes(labTestId)
        ? prev.filter((id) => id !== labTestId)
        : [...prev, labTestId]
    );
  };

  // Submit booking
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedVisitId) {
      toast.error("No active visit selected");
      return;
    }

    if (selectedTestIds.length === 0) {
      toast.error("Please select at least one test to book");
      return;
    }

    // Payment validation
    if (
      (paymentMethod === "upi" || paymentMethod === "card" || paymentMethod === "cheque") &&
      !paymentReference.trim()
    ) {
      toast.error(`Please enter payment reference for ${paymentMethod.toUpperCase()}`);
      return;
    }

    setIsSubmitting(true);
    try {
      const pId = isDirectMode ? propPatientId : selectedVisit?.patient_id;
      if (!pId) {
        toast.error("Patient details not available");
        setIsSubmitting(false);
        return;
      }

      const bookingReq: BookAdvisedTestsRequest = {
        patient_id: pId,
        visit_id: selectedVisitId,
        scheduled_date: scheduledDate,
        priority,
        lab_test_ids: selectedTestIds,
        notes: notes.trim() || undefined,
        payment_method: paymentMethod,
        payment_reference: paymentReference.trim() || undefined,
      };

      const result = await labBookingsApi.bookAdvisedTests(bookingReq);
      toast.success(`Booking ${result.booking_number} created successfully.`);

      // Reset local inputs
      setNotes("");
      setPaymentReference("");
      setPriority("routine");

      // Notify parent/dashboard
      window.dispatchEvent(new CustomEvent("lab:booking:created"));

      // Refresh advised tests list (shows newly booked tests as already booked)
      await fetchAdvisedTests(selectedVisitId);

      onSuccess?.();
    } catch (error: any) {
      const msg = getErrorMessage(error);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Direct Mode render helper
  if (isDirectMode) {
    return (
      <div className="space-y-4">
        {/* Patient Details */}
        <div className="rounded-xl bg-slate-50 p-4 border border-slate-100 flex justify-between items-center text-sm">
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Patient</p>
            <p className="font-semibold text-slate-900 text-base">{propPatientName || "OPD Patient"}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Visit ID</p>
            <p className="font-mono text-slate-700 font-semibold">{propVisitId?.substring(0, 8)}...</p>
          </div>
        </div>

        {loadingTests ? (
          <div className="py-12 flex justify-center items-center">
            <RefreshCw className="h-6 w-6 animate-spin text-sky-500" />
            <span className="ml-2 text-slate-500 text-sm font-medium">Fetching prescribed tests...</span>
          </div>
        ) : advisedTests.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center bg-slate-50/50">
            <AlertCircle className="mx-auto h-8 w-8 text-slate-400" />
            <h3 className="mt-2 text-sm font-semibold text-slate-900">No Prescribed Tests</h3>
            <p className="mt-1 text-xs text-slate-500">There are no lab tests prescribed for this visit.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            {/* Prescribed Tests Checklist */}
            <div className="col-span-2 space-y-2">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5 mb-1">
                <ClipboardList className="h-4 w-4 text-sky-500" />
                Select Tests to Book
              </label>
              <div className="max-h-60 overflow-y-auto border border-slate-150 rounded-xl bg-white p-1 divide-y divide-slate-100">
                {advisedTests.map((test) => {
                  const isChecked = selectedTestIds.includes(test.lab_test_id) || test.already_booked;
                  return (
                    <div
                      key={test.advice_item_id}
                      className={`flex items-center justify-between p-3 transition-colors ${
                        test.already_booked ? "bg-slate-50/60" : "hover:bg-sky-50/30"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id={`test-${test.advice_item_id}`}
                          checked={isChecked}
                          disabled={test.already_booked}
                          onChange={() => handleToggleTest(test.lab_test_id)}
                          className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 disabled:bg-slate-200 disabled:border-slate-350 cursor-pointer disabled:cursor-not-allowed"
                        />
                        <label
                          htmlFor={`test-${test.advice_item_id}`}
                          className={`text-sm font-medium cursor-pointer ${
                            test.already_booked ? "text-slate-400 line-through" : "text-slate-900"
                          }`}
                        >
                          {test.test_name}{" "}
                          <span className="text-xs font-mono font-normal text-slate-400">({test.test_code})</span>
                        </label>
                      </div>

                      <div className="flex items-center gap-3">
                        {test.price !== undefined && test.price !== null ? (
                          <span className={`text-sm font-semibold ${test.already_booked ? "text-slate-400 line-through" : "text-slate-700"}`}>
                            {currency(test.price)}
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-slate-400 italic">
                            Price not set
                          </span>
                        )}
                        {test.already_booked ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                            <Check className="h-3.5 w-3.5" /> Booked
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-700 ring-1 ring-inset ring-sky-600/10">
                            {test.advice_type}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Price Breakup & Total Amount */}
            {advisedTests.filter((t) => selectedTestIds.includes(t.lab_test_id) && !t.already_booked).length > 0 && (
              <div className="col-span-2 space-y-2.5 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Price Breakup
                </h4>
                <div className="space-y-2 text-sm">
                  {advisedTests
                    .filter((t) => selectedTestIds.includes(t.lab_test_id) && !t.already_booked)
                    .map((t) => (
                      <div key={t.advice_item_id} className="flex justify-between text-slate-600">
                        <span className="font-medium">{t.test_name}</span>
                        <span className="font-semibold text-slate-700">
                          {t.price !== undefined && t.price !== null ? currency(t.price) : "—"}
                        </span>
                      </div>
                    ))}
                  <div className="border-t border-slate-200 my-1 pt-2 flex justify-between font-bold text-slate-900 text-base">
                    <span>Total Amount to Collect</span>
                    <span className="text-sky-600">
                      {currency(
                        advisedTests
                          .filter((t) => selectedTestIds.includes(t.lab_test_id) && !t.already_booked)
                          .reduce((sum, t) => sum + (t.price || 0), 0)
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Scheduled Date */}
            <div className="col-span-1 space-y-1">
              <label className="text-xs font-semibold text-slate-600">Scheduled Date *</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-500/10 transition"
                />
              </div>
            </div>

            {/* Priority */}
            <div className="col-span-1 space-y-1">
              <label className="text-xs font-semibold text-slate-600">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TestPriority)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-500/10 transition"
              >
                <option value="routine">Routine</option>
                <option value="urgent">Urgent</option>
                <option value="stat">Stat</option>
              </select>
            </div>

            {/* Payment Method */}
            <div className="col-span-1 space-y-1">
              <label className="text-xs font-semibold text-slate-600">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-500/10 transition"
              >
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>

            {/* Payment Reference */}
            <div className="col-span-1 space-y-1">
              <label className="text-xs font-semibold text-slate-600">
                Payment Reference{" "}
                {(paymentMethod === "upi" || paymentMethod === "card" || paymentMethod === "cheque") && (
                  <span className="text-rose-500">*</span>
                )}
              </label>
              <input
                type="text"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder={paymentMethod === "cash" ? "Optional receipt no." : "Transaction ID / Ref #"}
                required={paymentMethod !== "cash"}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-500/10 transition"
              />
            </div>

            {/* Notes */}
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-semibold text-slate-600">Notes (Optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional instructions for lab staff..."
                rows={2}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-500/10 transition resize-none"
              />
            </div>

            {/* Form Actions */}
            <div className="col-span-2 pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting || selectedTestIds.length === 0}
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:shadow-md transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Booking...
                  </>
                ) : (
                  <>
                    <Beaker className="h-4 w-4" />
                    Book Selected Tests ({selectedTestIds.length})
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    );
  }

  // Standalone Mode render
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column: Recent OPD Visits Selection */}
      <div className="lg:col-span-1 border-r border-slate-100 pr-0 lg:pr-6 space-y-4">
        {/* Patient Search */}
        <div className="space-y-1 relative" ref={searchDropdownRef}>
          <label className="text-xs font-semibold text-slate-600">Quick Patient Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={patientSearchTerm}
              onChange={(e) => setPatientSearchTerm(e.target.value)}
              placeholder="Search by name, mobile, ID..."
              className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2 text-sm outline-none focus:border-sky-400 transition"
            />
            {isSearchingPatients && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <RefreshCw className="h-4 w-4 animate-spin text-slate-400" />
              </div>
            )}
          </div>

          {showSearchDropdown && searchResults.length > 0 && (
            <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-xl py-1 divide-y divide-slate-50">
              {searchResults.map((patient) => (
                <div
                  key={patient.id}
                  onClick={() => handlePatientSelect(patient)}
                  className="flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-sky-50 transition"
                >
                  <User className="h-4 w-4 text-slate-400" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{patient.name}</p>
                    <p className="text-xs text-slate-500">{patient.mobile}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent OPD Visits List */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-600 block">Recent Visits</label>
          {loadingVisits ? (
            <div className="py-12 flex justify-center items-center">
              <RefreshCw className="h-5 w-5 animate-spin text-slate-400" />
              <span className="ml-2 text-xs text-slate-500 font-medium">Loading visits...</span>
            </div>
          ) : recentVisits.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4 bg-slate-50 rounded-xl border border-dashed border-slate-250">
              No recent visits found.
            </p>
          ) : (
            <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
              {recentVisits.map((visit) => {
                const isSelected = visit.id === selectedVisitId;
                return (
                  <div
                    key={visit.id}
                    onClick={() => setSelectedVisitId(visit.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer text-left ${
                      isSelected
                        ? "border-sky-400 bg-sky-50/50 shadow-sm"
                        : "border-slate-100 hover:border-slate-200 hover:bg-slate-50/30"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {visit.patient_name || "Unknown Patient"}
                      </p>
                      <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-md ${
                        isSelected ? "bg-sky-100 text-sky-800" : "bg-slate-100 text-slate-600"
                      }`}>
                        {visit.visit_number}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                      <span>Mob: {visit.patient_mobile || "N/A"}</span>
                      <span className="font-medium text-slate-600">{visit.doctor_name || "OPD Doctor"}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Advised Tests Detail and Form */}
      <div className="lg:col-span-2">
        {selectedVisitId ? (
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-sky-500" />
                <h2 className="text-base font-semibold text-slate-950">
                  Prescriptions for{" "}
                  <span className="text-sky-600">
                    {selectedVisit?.patient_name || "Patient"}
                  </span>
                </h2>
              </div>
              <span className="text-xs text-slate-400 font-mono">Visit: {selectedVisit?.visit_number}</span>
            </div>

            {loadingTests ? (
              <div className="py-16 flex justify-center items-center">
                <RefreshCw className="h-6 w-6 animate-spin text-sky-500" />
                <span className="ml-2 text-slate-500 text-sm font-medium">Loading advised tests...</span>
              </div>
            ) : advisedTests.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center bg-slate-50/50">
                <AlertCircle className="mx-auto h-8 w-8 text-slate-400" />
                <h3 className="mt-2 text-sm font-semibold text-slate-900">No Prescribed Tests</h3>
                <p className="mt-1 text-xs text-slate-500">
                  No catalog-linked lab tests were prescribed for this visit.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
                {/* Prescribed Tests Checklist */}
                <div className="col-span-2 space-y-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5 mb-1">
                    <ClipboardList className="h-4 w-4 text-sky-500" />
                    Select Tests to Book
                  </label>
                  <div className="max-h-60 overflow-y-auto border border-slate-150 rounded-xl bg-white p-1 divide-y divide-slate-100">
                    {advisedTests.map((test) => {
                      const isChecked = selectedTestIds.includes(test.lab_test_id) || test.already_booked;
                      return (
                        <div
                          key={test.advice_item_id}
                          className={`flex items-center justify-between p-3 transition-colors ${
                            test.already_booked ? "bg-slate-50/60" : "hover:bg-sky-50/30"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              id={`test-${test.advice_item_id}`}
                              checked={isChecked}
                              disabled={test.already_booked}
                              onChange={() => handleToggleTest(test.lab_test_id)}
                              className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 disabled:bg-slate-200 disabled:border-slate-350 cursor-pointer disabled:cursor-not-allowed"
                            />
                            <label
                              htmlFor={`test-${test.advice_item_id}`}
                              className={`text-sm font-medium cursor-pointer ${
                                test.already_booked ? "text-slate-400 line-through" : "text-slate-900"
                              }`}
                            >
                              {test.test_name}{" "}
                              <span className="text-xs font-mono font-normal text-slate-400">({test.test_code})</span>
                            </label>
                          </div>

                          <div className="flex items-center gap-3">
                            {test.price !== undefined && test.price !== null ? (
                              <span className={`text-sm font-semibold ${test.already_booked ? "text-slate-400 line-through" : "text-slate-700"}`}>
                                {currency(test.price)}
                              </span>
                            ) : (
                              <span className="text-xs font-medium text-slate-400 italic">
                                Price not set
                              </span>
                            )}
                            {test.already_booked ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                                <Check className="h-3.5 w-3.5" /> Booked
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-700 ring-1 ring-inset ring-sky-600/10">
                                {test.advice_type}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Price Breakup & Total Amount */}
                {advisedTests.filter((t) => selectedTestIds.includes(t.lab_test_id) && !t.already_booked).length > 0 && (
                  <div className="col-span-2 space-y-2.5 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Price Breakup
                    </h4>
                    <div className="space-y-2 text-sm">
                      {advisedTests
                        .filter((t) => selectedTestIds.includes(t.lab_test_id) && !t.already_booked)
                        .map((t) => (
                          <div key={t.advice_item_id} className="flex justify-between text-slate-600">
                            <span className="font-medium">{t.test_name}</span>
                            <span className="font-semibold text-slate-700">
                              {t.price !== undefined && t.price !== null ? currency(t.price) : "—"}
                            </span>
                          </div>
                        ))}
                      <div className="border-t border-slate-200 my-1 pt-2 flex justify-between font-bold text-slate-900 text-base">
                        <span>Total Amount to Collect</span>
                        <span className="text-sky-600">
                          {currency(
                            advisedTests
                              .filter((t) => selectedTestIds.includes(t.lab_test_id) && !t.already_booked)
                              .reduce((sum, t) => sum + (t.price || 0), 0)
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Scheduled Date */}
                <div className="col-span-1 space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Scheduled Date *</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      required
                      className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-500/10 transition"
                    />
                  </div>
                </div>

                {/* Priority */}
                <div className="col-span-1 space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TestPriority)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-500/10 transition"
                  >
                    <option value="routine">Routine</option>
                    <option value="urgent">Urgent</option>
                    <option value="stat">Stat</option>
                  </select>
                </div>

                {/* Payment Method */}
                <div className="col-span-1 space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-500/10 transition"
                  >
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="card">Card</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>

                {/* Payment Reference */}
                <div className="col-span-1 space-y-1">
                  <label className="text-xs font-semibold text-slate-600">
                    Payment Reference{" "}
                    {(paymentMethod === "upi" || paymentMethod === "card" || paymentMethod === "cheque") && (
                      <span className="text-rose-500">*</span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder={paymentMethod === "cash" ? "Optional receipt no." : "Transaction ID / Ref #"}
                    required={paymentMethod !== "cash"}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-500/10 transition"
                  />
                </div>

                {/* Notes */}
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Notes (Optional)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Additional instructions for lab staff..."
                    rows={2}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-500/10 transition resize-none"
                  />
                </div>

                {/* Form Actions */}
                <div className="col-span-2 pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting || selectedTestIds.length === 0}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:shadow-md transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Booking...
                      </>
                    ) : (
                      <>
                        <Beaker className="h-4 w-4" />
                        Book Selected Tests ({selectedTestIds.length})
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-slate-50/50 rounded-2xl border border-slate-100 min-h-[350px]">
            <Beaker className="h-12 w-12 text-slate-300 animate-pulse mb-3" />
            <h3 className="text-sm font-semibold text-slate-700">No Visit Selected</h3>
            <p className="text-xs text-slate-400 max-w-xs mt-1">
              Select an OPD visit from the recent list or search for a patient to display and book their prescribed lab tests.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
