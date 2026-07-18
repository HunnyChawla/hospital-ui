"use client";

import { useState, useEffect } from "react";
import { labBookingsApi, AdvisedTest, BookAdvisedTestsRequest, PaymentMethod, TestPriority, PatientWithPendingTests } from "@/services/labBookingsApi";
import { labTestsApi, PrescriptionField } from "@/services/labTestsApi";
import { opdVisitsApi, Visit } from "@/services/opdVisitsApi";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { Calendar, User, Beaker, Check, AlertCircle, RefreshCw, FileText, ClipboardList } from "lucide-react";
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

  // Standalone mode state: Pending patients and date filters
  const [pendingPatients, setPendingPatients] = useState<PatientWithPendingTests[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [dateFilter, setDateFilter] = useState<"today" | "7days" | "custom">("today");
  const [customStartDate, setCustomStartDate] = useState(getTodayDateLocal());
  const [customEndDate, setCustomEndDate] = useState(getTodayDateLocal());

  // Booking details state
  const [advisedTests, setAdvisedTests] = useState<AdvisedTest[]>([]);
  const [loadingTests, setLoadingTests] = useState(false);
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>([]);
  const [prescriptionFieldsByTestCode, setPrescriptionFieldsByTestCode] = useState<Record<string, PrescriptionField[]>>({});
  const [metadataValues, setMetadataValues] = useState<Record<string, Record<string, string>>>({});
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

  // Standalone Mode: Fetch pending patients
  const fetchPendingPatients = async () => {
    setLoadingPatients(true);
    try {
      let start_date = getTodayDateLocal();
      let end_date = getTodayDateLocal();

      if (dateFilter === "7days") {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        start_date = d.toISOString().split("T")[0];
      } else if (dateFilter === "custom") {
        start_date = customStartDate || getTodayDateLocal();
        end_date = customEndDate || getTodayDateLocal();
      }

      const res = await labBookingsApi.getPatientsWithPendingTests({
        start_date,
        end_date,
      });

      setPendingPatients(res.items || []);

      // If the currently selected visit is not in the new list, deselect it
      if (selectedVisitId) {
        const stillPending = res.items.some((item) => item.visit_id === selectedVisitId);
        if (!stillPending) {
          setSelectedVisitId("");
        }
      }
    } catch (error) {
      console.error("Failed to fetch pending patients:", error);
      toast.error("Failed to load prescribed patients");
    } finally {
      setLoadingPatients(false);
    }
  };

  useEffect(() => {
    if (isDirectMode) return;
    fetchPendingPatients();
  }, [dateFilter, customStartDate, customEndDate, isDirectMode]);

  // Standalone Mode: Listen for booking creation events to refresh the list
  useEffect(() => {
    if (isDirectMode) return;

    const handleBookingCreated = () => {
      fetchPendingPatients();
    };

    window.addEventListener("lab:booking:created", handleBookingCreated);
    return () => {
      window.removeEventListener("lab:booking:created", handleBookingCreated);
    };
  }, [dateFilter, customStartDate, customEndDate, isDirectMode]);

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
      
      const initialMetadata: Record<string, Record<string, any>> = {};
      (tests || []).forEach((t) => {
        if (t.prescription_metadata) {
          initialMetadata[t.lab_test_id] = t.prescription_metadata;
        }
      });
      setMetadataValues(initialMetadata);
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

  // Load active prescription fields for each advised test
  useEffect(() => {
    const loadFieldsForTests = async () => {
      if (advisedTests.length === 0) return;
      
      const newFieldsMap: Record<string, PrescriptionField[]> = {};
      const promises = advisedTests.map(async (test) => {
        try {
          // Fetch fields using API
          const fieldsList = await labTestsApi.listPrescriptionFields(test.test_code);
          newFieldsMap[test.test_code] = fieldsList.filter((f) => f.is_active);
        } catch (error) {
          console.error(`Failed to fetch prescription fields for ${test.test_code}:`, error);
        }
      });
      await Promise.all(promises);
      setPrescriptionFieldsByTestCode(newFieldsMap);
    };

    loadFieldsForTests();
  }, [advisedTests]);

  const handleMetadataChange = (labTestId: string, fieldName: string, value: string) => {
    setMetadataValues((prev) => ({
      ...prev,
      [labTestId]: {
        ...(prev[labTestId] || {}),
        [fieldName]: value,
      },
    }));
  };

  // Checkbox toggle
  const handleToggleTest = (labTestId: string) => {
    setSelectedTestIds((prev) =>
      prev.includes(labTestId)
        ? prev.filter((id) => id !== labTestId)
        : [...prev, labTestId]
    );
  };

  const renderTestItem = (test: AdvisedTest) => {
    const isChecked = selectedTestIds.includes(test.lab_test_id) || test.already_booked;
    const fieldsForTest = prescriptionFieldsByTestCode[test.test_code] || [];
    const showMetadataForm = isChecked && !test.already_booked && fieldsForTest.length > 0;

    return (
      <div key={test.advice_item_id} className="border-b border-slate-100 last:border-0 bg-white">
        {/* Test Row */}
        <div
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

        {/* Custom Prescription Fields Inline Display */}
        {isChecked && !test.already_booked && test.prescription_metadata && Object.keys(test.prescription_metadata).length > 0 && (
          <div className="bg-slate-50 border-t border-slate-100 px-4 py-2.5 pl-10 text-left">
            <div className="flex flex-wrap gap-2 text-xs">
              {Object.entries(test.prescription_metadata).map(([key, val]) => (
                <span key={key} className="inline-flex items-center gap-1 bg-sky-50 px-2 py-0.5 rounded border border-sky-100 text-sky-850 font-medium">
                  <span className="text-slate-500 font-semibold">{key}:</span>
                  <span>{String(val)}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
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

      // Build test_metadata from advised tests directly (technician does not edit these)
      const testMetadata: Array<{ lab_test_id: string; metadata: Record<string, any> }> = [];
      for (const testId of selectedTestIds) {
        const test = advisedTests.find((t) => t.lab_test_id === testId);
        if (test && test.prescription_metadata && Object.keys(test.prescription_metadata).length > 0) {
          testMetadata.push({
            lab_test_id: testId,
            metadata: test.prescription_metadata,
          });
        }
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
        test_metadata: testMetadata.length > 0 ? testMetadata : undefined,
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
                {advisedTests.map(renderTestItem)}
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
  }  // Standalone Mode render
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column: Prescribed Patient Selection */}
      <div className="lg:col-span-1 border-r border-slate-100 pr-0 lg:pr-6 space-y-4">
        {/* Date Filter Selector */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-600 block">Date Range</label>
          <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl">
            {(["today", "7days", "custom"] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setDateFilter(filter)}
                className={`py-1.5 text-xs font-semibold rounded-lg transition-all capitalize cursor-pointer ${
                  dateFilter === filter
                    ? "bg-white text-slate-900 shadow-sm font-bold"
                    : "text-slate-500 hover:text-slate-950"
                }`}
              >
                {filter === "7days" ? "Last 7 Days" : filter}
              </button>
            ))}
          </div>

          {/* Custom Date Picker Inputs */}
          {dateFilter === "custom" && (
            <div className="grid grid-cols-2 gap-2 mt-2 pt-1.5 border-t border-slate-100">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500 block uppercase">Start Date</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  max={customEndDate || getTodayDateLocal()}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-500/10 transition"
                />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500 block uppercase">End Date</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  min={customStartDate}
                  max={getTodayDateLocal()}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-500/10 transition"
                />
              </div>
            </div>
          )}
        </div>

        {/* Prescribed Patients List */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-xs font-semibold text-slate-650 block">Prescribed Patients</label>
            {!loadingPatients && pendingPatients.length > 0 && (
              <span className="inline-flex items-center rounded-full bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700 ring-1 ring-inset ring-rose-600/10">
                {pendingPatients.length} {pendingPatients.length === 1 ? "patient" : "patients"}
              </span>
            )}
          </div>
          {loadingPatients ? (
            <div className="py-12 flex justify-center items-center">
              <RefreshCw className="h-5 w-5 animate-spin text-slate-400" />
              <span className="ml-2 text-xs text-slate-500 font-medium">Loading patients...</span>
            </div>
          ) : pendingPatients.length === 0 ? (
            <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200 px-4">
              <AlertCircle className="mx-auto h-6 w-6 text-slate-400 mb-1" />
              <p className="text-xs font-semibold text-slate-600">No Prescribed Tests</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                No patients found with pending prescribed tests for this date range.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {pendingPatients.map((patient) => {
                const isSelected = patient.visit_id === selectedVisitId;
                return (
                  <div
                    key={patient.visit_id}
                    onClick={() => setSelectedVisitId(patient.visit_id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer text-left ${
                      isSelected
                        ? "border-sky-400 bg-sky-50/50 shadow-sm"
                        : "border-slate-100 hover:border-slate-200 hover:bg-slate-50/30"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {patient.patient_name}
                      </p>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                        isSelected ? "bg-sky-100 text-sky-850" : "bg-slate-100 text-slate-655"
                      }`}>
                        {patient.visit_number}
                      </span>
                    </div>

                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                      <span>Mob: {patient.patient_mobile || "N/A"}</span>
                      <span className="font-medium text-slate-650 truncate max-w-[120px]">
                        {patient.doctor_name || "OPD Doctor"}
                      </span>
                    </div>

                    <div className="flex justify-between items-center mt-2 pt-1.5 border-t border-slate-100/50">
                      <span className="text-[10px] text-slate-400">
                        {patient.visit_date}
                      </span>
                      <span className="inline-flex items-center rounded-md bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-700 ring-1 ring-inset ring-rose-600/10">
                        {patient.pending_test_count} {patient.pending_test_count === 1 ? "test" : "tests"} pending
                      </span>
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
                    {advisedTests.map(renderTestItem)}
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
