"use client";

import { useState, useEffect, useCallback } from "react";
import { labBookingsApi, AdvisedTest, BookAdvisedTestsRequest, PaymentMethod, TestPriority, PatientWithPendingTests, LabBooking } from "@/services/labBookingsApi";
import { labTestsApi, PrescriptionField } from "@/services/labTestsApi";
import { opdVisitsApi, Visit } from "@/services/opdVisitsApi";
import { admissionsApi, Admission } from "@/services/admissionsApi";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { Calendar, User, Beaker, Check, AlertCircle, RefreshCw, FileText, ClipboardList, Eye, AlertTriangle, Edit2, Receipt, Building2 } from "lucide-react";
import { currency, formatDate, getTodayDateLocal, getPastDateLocal } from "@/utils/format";
import { PreviousLabReportModal } from "../optometrist/prescriptions/PreviousLabReportModal";

export interface PrescribedLabBookingPanelProps {
  visitId?: string;
  admissionId?: string;
  patientId?: string;
  patientName?: string;
  onSuccess?: () => void;
}

export function PrescribedLabBookingPanel({
  visitId: propVisitId,
  admissionId: propAdmissionId,
  patientId: propPatientId,
  patientName: propPatientName,
  onSuccess,
}: PrescribedLabBookingPanelProps) {
  // Mode selection
  const isDirectMode = !!propVisitId || !!propAdmissionId;

  // Selected visit/encounter state
  const [selectedVisitId, setSelectedVisitId] = useState<string>(propVisitId || "");
  const [selectedAdmissionId, setSelectedAdmissionId] = useState<string>(propAdmissionId || "");
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [selectedEncounter, setSelectedEncounter] = useState<PatientWithPendingTests | null>(null);

  // Encounter link choice: "none" | "ipd" | "opd"
  const [encounterLinkType, setEncounterLinkType] = useState<"none" | "ipd" | "opd">(
    propAdmissionId ? "ipd" : propVisitId ? "opd" : "none"
  );

  // Patient active admission and recent visits (for switching linking if user desires)
  const [activeAdmission, setActiveAdmission] = useState<Admission | null>(null);
  const [recentVisits, setRecentVisits] = useState<Visit[]>([]);
  const [checkingPatientEncounters, setCheckingPatientEncounters] = useState(false);

  // IPD payment option state: "ledger" = Add to IPD Ledger (Post to Bill), "collect_now" = Collect Payment Now (Generate Invoice)
  const [ipdPaymentOption, setIpdPaymentOption] = useState<"ledger" | "collect_now">("ledger");

  // Determine current active patient ID
  const currentPatientId = isDirectMode
    ? propPatientId || selectedVisit?.patient_id
    : selectedEncounter?.patient_id;

  // Check active IPD admission and recent OPD visits when currentPatientId changes
  useEffect(() => {
    if (!currentPatientId) {
      setActiveAdmission(null);
      setRecentVisits([]);
      return;
    }

    let isMounted = true;
    const loadEncounters = async () => {
      setCheckingPatientEncounters(true);
      try {
        const [admissionsRes, visitsRes] = await Promise.allSettled([
          admissionsApi.list({ patient_id: currentPatientId }),
          opdVisitsApi.list({ patient_id: currentPatientId, page_size: 10 }),
        ]);

        if (!isMounted) return;

        if (admissionsRes.status === "fulfilled") {
          const active = (admissionsRes.value.items || []).find(
            (a) =>
              a.status === "ACTIVE" ||
              a.status === "admitted" ||
              a.status === "DISCHARGE_INITIATED" ||
              a.status === "discharge_initiated"
          ) || null;
          setActiveAdmission(active);
        } else {
          setActiveAdmission(null);
        }

        if (visitsRes.status === "fulfilled") {
          setRecentVisits(visitsRes.value.items || []);
        } else {
          setRecentVisits([]);
        }
      } catch (err) {
        console.error("Failed to load patient encounters for linking:", err);
      } finally {
        if (isMounted) setCheckingPatientEncounters(false);
      }
    };

    loadEncounters();
    return () => {
      isMounted = false;
    };
  }, [currentPatientId]);

  const availableAdmission =
    activeAdmission ||
    (selectedEncounter?.admission_id
      ? {
          id: selectedEncounter.admission_id,
          admission_number: selectedEncounter.admission_number,
        }
      : propAdmissionId
      ? { id: propAdmissionId, admission_number: undefined }
      : null);

  const hasIpdOption = Boolean(availableAdmission);

  const availableOpdVisit =
    selectedVisit ||
    (selectedEncounter?.visit_id
      ? {
          id: selectedEncounter.visit_id,
          visit_number: selectedEncounter.visit_number,
          visit_date: selectedEncounter.visit_date,
        }
      : propVisitId
      ? { id: propVisitId, visit_number: undefined }
      : null) ||
    (recentVisits.length > 0 ? recentVisits[0] : null);

  const hasOpdOption = Boolean(availableOpdVisit);

  const isIpdBilling = encounterLinkType === "ipd";
  const shouldCollectPayment = !isIpdBilling || ipdPaymentOption === "collect_now";

  // Standalone mode state: Pending patients and date filters
  const [pendingPatients, setPendingPatients] = useState<PatientWithPendingTests[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [dateFilter, setDateFilter] = useState<"today" | "yesterday" | "3days" | "custom">("3days");
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
  const [selectedReportBooking, setSelectedReportBooking] = useState<LabBooking | null>(null);
  const [showOnlyPending, setShowOnlyPending] = useState(true);
  const [priceOverrides, setPriceOverrides] = useState<Record<string, number>>({});

  const handleEnableOverride = (labTestId: string, currentPrice: number) => {
    setPriceOverrides((prev) => ({
      ...prev,
      [labTestId]: currentPrice,
    }));
  };

  const handleResetOverride = (labTestId: string) => {
    setPriceOverrides((prev) => {
      const updated = { ...prev };
      delete updated[labTestId];
      return updated;
    });
  };

  const handlePriceChange = (labTestId: string, val: string) => {
    const parsed = parseFloat(val);
    setPriceOverrides((prev) => ({
      ...prev,
      [labTestId]: isNaN(parsed) ? 0 : parsed,
    }));
  };

  // Set default date to today
  useEffect(() => {
    setScheduledDate(getTodayDateLocal());
  }, []);

  // Standalone Mode: Fetch pending patients
  const fetchPendingPatients = useCallback(async () => {
    setLoadingPatients(true);
    try {
      let start_date = getTodayDateLocal();
      let end_date = getTodayDateLocal();

      if (dateFilter === "today") {
        start_date = getTodayDateLocal();
        end_date = getTodayDateLocal();
      } else if (dateFilter === "yesterday") {
        start_date = getPastDateLocal(1);
        end_date = getPastDateLocal(1);
      } else if (dateFilter === "3days") {
        start_date = getPastDateLocal(2);
        end_date = getTodayDateLocal();
      } else if (dateFilter === "custom") {
        start_date = customStartDate || getTodayDateLocal();
        end_date = customEndDate || getTodayDateLocal();
      }

      const res = await labBookingsApi.getPatientsWithPendingTests({
        start_date,
        end_date,
      });

      const items = res.items || [];
      setPendingPatients(items);

      // If the currently selected encounter is not in the new list, deselect it
      if (selectedEncounter) {
        const stillPending = items.some(
          (item) =>
            (item.admission_id && item.admission_id === selectedEncounter.admission_id) ||
            (item.visit_id && item.visit_id === selectedEncounter.visit_id)
        );
        if (!stillPending) {
          setSelectedEncounter(null);
          setSelectedVisitId("");
          setSelectedAdmissionId("");
          setEncounterLinkType("none");
        }
      } else if (selectedVisitId || selectedAdmissionId) {
        const stillPending = items.some(
          (item) =>
            (selectedAdmissionId && item.admission_id === selectedAdmissionId) ||
            (selectedVisitId && item.visit_id === selectedVisitId)
        );
        if (!stillPending) {
          setSelectedVisitId("");
          setSelectedAdmissionId("");
          setEncounterLinkType("none");
        }
      } else if (items.length > 0) {
        // Auto-select the first pending encounter so the user immediately sees the prescribed tests
        const first = items.find((p) => p.pending_test_count > 0) || items[0];
        setSelectedEncounter(first);
        if (first.admission_id) {
          setSelectedAdmissionId(first.admission_id);
          setSelectedVisitId("");
          setEncounterLinkType("ipd");
          fetchAdvisedTests({ admission_id: first.admission_id });
          setIpdPaymentOption("ledger");
        } else if (first.visit_id) {
          setSelectedVisitId(first.visit_id);
          setSelectedAdmissionId("");
          setEncounterLinkType("opd");
          fetchAdvisedTests({ visit_id: first.visit_id });
        } else {
          setSelectedAdmissionId("");
          setSelectedVisitId("");
          setEncounterLinkType("none");
          if (first.patient_id) {
            fetchAdvisedTests({ patient_id: first.patient_id });
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch pending patients:", error);
      toast.error("Failed to load prescribed patients");
    } finally {
      setLoadingPatients(false);
    }
  }, [dateFilter, customStartDate, customEndDate, selectedEncounter, selectedVisitId, selectedAdmissionId]);

  useEffect(() => {
    if (isDirectMode) return;
    fetchPendingPatients();
  }, [fetchPendingPatients, isDirectMode]);

  // Standalone Mode: Listen for booking creation/cancellation events to refresh the list
  useEffect(() => {
    if (isDirectMode) return;

    const handleBookingChanged = () => {
      fetchPendingPatients();
    };

    window.addEventListener("lab:booking:created", handleBookingChanged);
    window.addEventListener("lab:booking:cancelled", handleBookingChanged);
    return () => {
      window.removeEventListener("lab:booking:created", handleBookingChanged);
      window.removeEventListener("lab:booking:cancelled", handleBookingChanged);
    };
  }, [fetchPendingPatients, isDirectMode]);

  // Standalone Mode: Fetch selected visit detail (for OPD visits)
  useEffect(() => {
    if (isDirectMode) return;
    if (!selectedVisitId) {
      setSelectedVisit(null);
      return;
    }

    const fetchVisitDetail = async () => {
      try {
        const visit = await opdVisitsApi.getById(selectedVisitId);
        setSelectedVisit(visit);
      } catch (error) {
        console.error("Failed to fetch visit details:", error);
      }
    };

    fetchVisitDetail();
  }, [selectedVisitId, isDirectMode]);

  // Fetch Advised Tests for the selected encounter
  const fetchAdvisedTests = async (identifier: string | { visit_id?: string; admission_id?: string; patient_id?: string }) => {
    setLoadingTests(true);
    try {
      const tests = await labBookingsApi.getAdvisedTests(identifier);
      // Sort: unbooked tests (already_booked === false) on top
      const sortedTests = [...(tests || [])].sort((a, b) => {
        if (a.already_booked !== b.already_booked) {
          return a.already_booked ? 1 : -1;
        }
        return 0;
      });

      setAdvisedTests(sortedTests);
      // Default checked: all tests where already_booked is false
      const toCheck = sortedTests
        .filter((t) => !t.already_booked)
        .map((t) => t.lab_test_id);
      setSelectedTestIds(toCheck);
      
      const initialMetadata: Record<string, Record<string, any>> = {};
      sortedTests.forEach((t) => {
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
    if (isDirectMode) {
      if (propAdmissionId) {
        setSelectedAdmissionId(propAdmissionId);
        setSelectedVisitId("");
        setEncounterLinkType("ipd");
        fetchAdvisedTests({ admission_id: propAdmissionId });
      } else if (propVisitId) {
        setSelectedVisitId(propVisitId);
        setSelectedAdmissionId("");
        setEncounterLinkType("opd");
        fetchAdvisedTests({ visit_id: propVisitId });
      } else if (propPatientId) {
        setSelectedAdmissionId("");
        setSelectedVisitId("");
        setEncounterLinkType("none");
        fetchAdvisedTests({ patient_id: propPatientId });
      }
    }
  }, [isDirectMode, propVisitId, propAdmissionId, propPatientId]);

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
    const isChecked = selectedTestIds.includes(test.lab_test_id);
    const isRebooking = isChecked && test.already_booked;

    const handleViewExistingReport = async (bookingId: string) => {
      try {
        const bk = await labBookingsApi.getById(bookingId);
        setSelectedReportBooking(bk);
      } catch (err) {
        toast.error("Failed to load booking details");
      }
    };

    return (
      <div key={test.advice_item_id} className="border-b border-slate-100 last:border-0 bg-white">
        {/* Test Row */}
        <div
          className={`flex items-center justify-between p-3 transition-colors ${
            test.already_booked ? "bg-slate-50/70 hover:bg-slate-100/70" : "hover:bg-slate-50/60"
          }`}
        >
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id={`test-${test.advice_item_id}`}
              checked={isChecked}
              onChange={() => handleToggleTest(test.lab_test_id)}
              className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
            />
            <div>
              <label
                htmlFor={`test-${test.advice_item_id}`}
                className="text-sm font-medium text-slate-900 cursor-pointer flex items-center gap-1.5"
              >
                {test.test_name}{" "}
                <span className="text-xs font-mono font-normal text-slate-400">({test.test_code})</span>
              </label>

              {test.already_booked && (
                <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                  <span className="font-medium">
                    Booked {test.existing_booking_date ? `on ${new Date(test.existing_booking_date).toLocaleDateString()}` : ""}:
                  </span>
                  <span className="font-mono text-[11px] font-semibold bg-slate-200/70 text-slate-800 px-1.5 py-0.5 rounded border border-slate-300/60">
                    {test.existing_booking_number || "Existing Booking"}
                  </span>
                  {test.existing_booking_status && (
                    <span className="capitalize text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                      {test.existing_booking_status.replace(/_/g, " ")}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isChecked ? (
              <div className="flex items-center gap-2">
                {priceOverrides[test.lab_test_id] !== undefined ? (
                  <div className="flex items-center gap-1.5 bg-amber-50/80 border border-amber-200/80 rounded-lg px-2 py-1">
                    <div className="flex flex-col text-right">
                      <span className="text-[10px] text-slate-400 line-through leading-none">
                        Orig: {currency(test.price || 0)}
                      </span>
                      <span className="text-[10px] font-semibold text-amber-800 leading-tight">
                        Custom
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-slate-700">₹</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={priceOverrides[test.lab_test_id]}
                        onChange={(e) => handlePriceChange(test.lab_test_id, e.target.value)}
                        className="w-20 rounded-md border border-amber-300 bg-white px-2 py-0.5 text-xs font-bold text-slate-900 shadow-sm outline-none focus:border-amber-500"
                        autoFocus
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleResetOverride(test.lab_test_id)}
                      className="text-xs text-slate-400 hover:text-rose-600 font-bold px-1 cursor-pointer"
                      title="Reset to original price"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-800">
                      {test.price !== undefined && test.price !== null ? currency(test.price) : "Price not set"}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleEnableOverride(test.lab_test_id, test.price || 0)}
                      className="inline-flex items-center gap-1 rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-700 hover:bg-sky-50 hover:text-sky-700 hover:border-sky-200 transition cursor-pointer"
                      title="Override price for this test"
                    >
                      <Edit2 className="h-3 w-3" />
                      <span>Override</span>
                    </button>
                  </div>
                )}
              </div>
            ) : test.price !== undefined && test.price !== null ? (
              <span className="text-sm font-semibold text-slate-700">
                {currency(test.price)}
              </span>
            ) : (
              <span className="text-xs font-medium text-slate-400 italic">
                Price not set
              </span>
            )}

            {test.already_booked && test.existing_booking_id ? (
              <button
                type="button"
                onClick={() => handleViewExistingReport(test.existing_booking_id!)}
                className="inline-flex items-center gap-1 rounded-lg bg-white border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-sm cursor-pointer"
              >
                <Eye className="h-3.5 w-3.5 text-sky-600" />
                View Report
              </button>
            ) : (
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                  test.advice_type === "radiology"
                    ? "bg-purple-50 text-purple-700 border-purple-200"
                    : "bg-slate-100 text-slate-600 border-slate-200"
                }`}
              >
                {test.advice_type === "radiology" ? "Radiology" : test.advice_type}
              </span>
            )}
          </div>
        </div>

        {/* Re-booking Warning Banner */}
        {isRebooking && (
          <div className="bg-amber-50/60 border-t border-amber-200/60 px-4 py-1.5 text-left text-xs text-amber-900 flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
            <span>
              <strong>Repeat Booking Notice:</strong> Previously booked ({test.existing_booking_number || "active booking"}).
              Proceeding will create an intentional duplicate booking.
            </span>
          </div>
        )}

        {/* Custom Prescription Fields Inline Display */}
        {isChecked && test.prescription_metadata && Object.keys(test.prescription_metadata).length > 0 && (
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

    if (!isDirectMode && !selectedEncounter && !selectedVisitId && !selectedAdmissionId) {
      toast.error("No active encounter selected");
      return;
    }

    if (selectedTestIds.length === 0) {
      toast.error("Please select at least one test to book");
      return;
    }

    const isIpd = isIpdBilling;
    const shouldCollectPayment = isIpd ? ipdPaymentOption === "collect_now" : true;

    // Payment validation only if collecting payment now
    if (
      shouldCollectPayment &&
      (paymentMethod === "upi" || paymentMethod === "card" || paymentMethod === "cheque") &&
      !paymentReference.trim()
    ) {
      toast.error(`Please enter payment reference for ${paymentMethod.toUpperCase()}`);
      return;
    }

    setIsSubmitting(true);
    try {
      const pId = isDirectMode ? propPatientId : (selectedEncounter?.patient_id || selectedVisit?.patient_id);
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

      const targetAdmissionId =
        encounterLinkType === "ipd"
          ? (availableAdmission?.id || (isDirectMode ? propAdmissionId : selectedEncounter?.admission_id) || selectedAdmissionId || undefined)
          : undefined;

      const targetVisitId =
        encounterLinkType === "opd"
          ? (selectedVisitId || availableOpdVisit?.id || (isDirectMode ? propVisitId : selectedEncounter?.visit_id) || undefined)
          : undefined;

      const bookingReq: BookAdvisedTestsRequest = {
        patient_id: pId,
        visit_id: targetVisitId,
        admission_id: targetAdmissionId,
        scheduled_date: scheduledDate,
        priority,
        collect_payment: shouldCollectPayment,
        lab_test_ids: selectedTestIds,
        test_items: selectedTestIds.map((id) => {
          const defaultPrice = advisedTests.find((t) => t.lab_test_id === id)?.price;
          return {
            lab_test_id: id,
            price: priceOverrides[id] !== undefined ? priceOverrides[id] : (defaultPrice ?? undefined),
          };
        }),
        notes: notes.trim() || undefined,
        payment_method: shouldCollectPayment ? paymentMethod : undefined,
        payment_reference: shouldCollectPayment ? (paymentReference.trim() || undefined) : undefined,
        test_metadata: testMetadata.length > 0 ? testMetadata : undefined,
      };

      const result = await labBookingsApi.bookAdvisedTests(bookingReq);
      toast.success(
        shouldCollectPayment
          ? `Booking ${result.booking_number} created with payment receipt.`
          : `Booking ${result.booking_number} created & posted to IPD ledger.`
      );

      // Reset local inputs
      setNotes("");
      setPaymentReference("");
      setPriority("routine");

      // Notify parent/dashboard
      window.dispatchEvent(new CustomEvent("lab:booking:created"));

      // Refresh pending patients list and advised tests list
      await Promise.all([
        fetchPendingPatients(),
        isDirectMode
          ? (propAdmissionId ? fetchAdvisedTests({ admission_id: propAdmissionId }) : fetchAdvisedTests(propVisitId!))
          : selectedEncounter?.admission_id
          ? fetchAdvisedTests({ admission_id: selectedEncounter.admission_id })
          : fetchAdvisedTests({ visit_id: selectedEncounter?.visit_id || selectedVisitId }),
      ]);

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
    const isIpd = isIpdBilling;
    return (
      <div className="space-y-4">
        {/* Patient Details */}
        <div className="rounded-xl bg-slate-50 p-4 border border-slate-100 flex justify-between items-center text-sm">
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Patient</p>
            <p className="font-semibold text-slate-900 text-base">{propPatientName || (isIpd ? "IPD Patient" : "OPD Patient")}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">
              {encounterLinkType === "ipd"
                ? "Admission ID"
                : encounterLinkType === "opd"
                ? "Visit ID"
                : "Booking Type"}
            </p>
            <p className="font-mono text-slate-700 font-semibold">
              {encounterLinkType === "ipd"
                ? `${(availableAdmission?.id || propAdmissionId)?.substring(0, 8)}...`
                : encounterLinkType === "opd"
                ? `${(availableOpdVisit?.id || propVisitId)?.substring(0, 8)}...`
                : "Standalone"}
            </p>
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
            <p className="mt-1 text-xs text-slate-500">There are no lab tests prescribed for this encounter.</p>
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
                    .map((t) => {
                      const isOverridden = priceOverrides[t.lab_test_id] !== undefined;
                      const effectivePrice = isOverridden ? priceOverrides[t.lab_test_id] : (t.price || 0);
                      return (
                        <div key={t.advice_item_id} className="flex justify-between items-center text-slate-600">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{t.test_name}</span>
                            {isOverridden && (
                              <span className="inline-flex items-center rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                                Custom (Orig: {currency(t.price || 0)})
                              </span>
                            )}
                          </div>
                          <span className={`font-semibold ${isOverridden ? "text-amber-700 font-bold" : "text-slate-700"}`}>
                            {currency(effectivePrice)}
                          </span>
                        </div>
                      );
                    })}
                  <div className="border-t border-slate-200 my-1 pt-2 flex justify-between font-bold text-slate-900 text-base">
                    <span>{isIpd && ipdPaymentOption === "ledger" ? "Total Charges (IPD Ledger)" : "Total Amount to Collect"}</span>
                    <span className={isIpd && ipdPaymentOption === "ledger" ? "text-purple-600" : "text-sky-600"}>
                      {currency(
                        advisedTests
                          .filter((t) => selectedTestIds.includes(t.lab_test_id) && !t.already_booked)
                          .reduce((sum, t) => sum + (priceOverrides[t.lab_test_id] !== undefined ? priceOverrides[t.lab_test_id] : (t.price || 0)), 0)
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Encounter Linking Choice */}
            <div className="col-span-2 space-y-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-sky-600" /> Link with Patient Encounter (User Choice)
                </span>
                {checkingPatientEncounters && (
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <RefreshCw className="h-3 w-3 animate-spin" /> Checking encounters...
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                {/* Option 1: None (Standalone) */}
                <label
                  className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                    encounterLinkType === "none"
                      ? "border-sky-500 bg-white shadow-sm ring-1 ring-sky-500/20"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="direct_encounter_link"
                    checked={encounterLinkType === "none"}
                    onChange={() => setEncounterLinkType("none")}
                    className="mt-0.5 h-4 w-4 text-sky-600 focus:ring-sky-500 border-slate-300"
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-900">None (Standalone)</p>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                      Direct lab booking. Do not link to admission or OPD visit.
                    </p>
                  </div>
                </label>

                {/* Option 2: Link with IPD */}
                <label
                  className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all ${
                    hasIpdOption
                      ? encounterLinkType === "ipd"
                        ? "border-purple-500 bg-purple-50/50 shadow-sm ring-1 ring-purple-500/20 cursor-pointer"
                        : "border-purple-200/80 bg-white hover:border-purple-300 cursor-pointer"
                      : "border-slate-200 bg-slate-100/60 opacity-60 cursor-not-allowed"
                  }`}
                >
                  <input
                    type="radio"
                    name="direct_encounter_link"
                    disabled={!hasIpdOption}
                    checked={encounterLinkType === "ipd"}
                    onChange={() => {
                      if (hasIpdOption) {
                        setEncounterLinkType("ipd");
                      }
                    }}
                    className="mt-0.5 h-4 w-4 text-purple-600 focus:ring-purple-500 border-slate-300"
                  />
                  <div>
                    <div className="flex items-center gap-1">
                      <p className="text-xs font-bold text-purple-950">Link with IPD</p>
                      {hasIpdOption && (
                        <span className="text-[9px] font-extrabold uppercase px-1 py-0.2 rounded bg-purple-100 text-purple-700">
                          IPD
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                      {availableAdmission
                        ? `Admission #${availableAdmission.admission_number || availableAdmission.id.substring(0, 8)}`
                        : "No active IPD admission"}
                    </p>
                  </div>
                </label>

                {/* Option 3: Link with OPD */}
                <label
                  className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all ${
                    hasOpdOption
                      ? encounterLinkType === "opd"
                        ? "border-teal-500 bg-teal-50/50 shadow-sm ring-1 ring-teal-500/20 cursor-pointer"
                        : "border-teal-200/80 bg-white hover:border-teal-300 cursor-pointer"
                      : "border-slate-200 bg-slate-100/60 opacity-60 cursor-not-allowed"
                  }`}
                >
                  <input
                    type="radio"
                    name="direct_encounter_link"
                    disabled={!hasOpdOption}
                    checked={encounterLinkType === "opd"}
                    onChange={() => {
                      if (hasOpdOption) {
                        setEncounterLinkType("opd");
                      }
                    }}
                    className="mt-0.5 h-4 w-4 text-teal-600 focus:ring-teal-500 border-slate-300"
                  />
                  <div>
                    <div className="flex items-center gap-1">
                      <p className="text-xs font-bold text-teal-950">Link with OPD</p>
                      {hasOpdOption && (
                        <span className="text-[9px] font-extrabold uppercase px-1 py-0.2 rounded bg-teal-100 text-teal-700">
                          OPD
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                      {availableOpdVisit
                        ? `Visit #${availableOpdVisit.visit_number || availableOpdVisit.id.substring(0, 8)}`
                        : "No OPD visit found"}
                    </p>
                  </div>
                </label>
              </div>

              {/* If OPD is selected and multiple visits available, show dropdown */}
              {encounterLinkType === "opd" && recentVisits.length > 1 && (
                <div className="pt-2 border-t border-slate-200/70">
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Select OPD Visit
                  </label>
                  <select
                    value={selectedVisitId}
                    onChange={(e) => setSelectedVisitId(e.target.value)}
                    className="w-full rounded-xl border border-teal-300 bg-white px-3 py-1.5 text-xs outline-none focus:border-teal-500 font-medium"
                  >
                    {recentVisits.map((v) => (
                      <option key={v.id} value={v.id}>
                        Visit #{v.visit_number} — {formatDate(v.created_at)} ({v.visit_type?.replace("_", " ")})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* If IPD is selected, show IPD Payment & Billing Option */}
              {encounterLinkType === "ipd" && (
                <div className="pt-2 border-t border-purple-200/70 space-y-1.5">
                  <label className="text-xs font-semibold text-purple-900 block">
                    IPD Payment & Billing Method
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <label
                      className={`flex items-start gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                        ipdPaymentOption === "ledger"
                          ? "border-purple-500 bg-purple-100/50 shadow-2xs font-medium"
                          : "border-slate-200 bg-white hover:border-purple-200"
                      }`}
                    >
                      <input
                        type="radio"
                        name="direct_ipd_payment_mode"
                        checked={ipdPaymentOption === "ledger"}
                        onChange={() => setIpdPaymentOption("ledger")}
                        className="mt-0.5 h-3.5 w-3.5 text-purple-600 focus:ring-purple-500"
                      />
                      <div>
                        <p className="text-xs font-bold text-slate-800">Add to IPD Ledger (Post to Bill)</p>
                        <p className="text-[10px] text-slate-500">Charges added to admission bill. No immediate invoice.</p>
                      </div>
                    </label>
                    <label
                      className={`flex items-start gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                        ipdPaymentOption === "collect_now"
                          ? "border-sky-500 bg-sky-50 shadow-2xs font-medium"
                          : "border-slate-200 bg-white hover:border-sky-200"
                      }`}
                    >
                      <input
                        type="radio"
                        name="direct_ipd_payment_mode"
                        checked={ipdPaymentOption === "collect_now"}
                        onChange={() => setIpdPaymentOption("collect_now")}
                        className="mt-0.5 h-3.5 w-3.5 text-sky-600 focus:ring-sky-500"
                      />
                      <div>
                        <p className="text-xs font-bold text-slate-800">Collect Payment Now</p>
                        <p className="text-[10px] text-slate-500">Collect payment at lab desk with separate invoice.</p>
                      </div>
                    </label>
                  </div>
                </div>
              )}
            </div>

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

            {/* Payment inputs only if NOT posting to IPD ledger */}
            {(!isIpd || ipdPaymentOption === "collect_now") && (
              <>
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
              </>
            )}

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
                className={`w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:shadow-md transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                  isIpd && ipdPaymentOption === "ledger"
                    ? "bg-gradient-to-r from-purple-600 to-indigo-600"
                    : "bg-gradient-to-r from-sky-500 to-teal-500"
                }`}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Booking...
                  </>
                ) : (
                  <>
                    <Beaker className="h-4 w-4" />
                    {isIpd && ipdPaymentOption === "ledger"
                      ? `Book & Post to IPD Ledger (${selectedTestIds.length})`
                      : `Book Selected Tests (${selectedTestIds.length})`}
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
      {/* Left Column: Prescribed Patient Selection */}
      <div className="lg:col-span-1 border-r border-slate-100 pr-0 lg:pr-6 space-y-4">
        {/* Date Filter Selector */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-600">Date Range</label>
            <button
              type="button"
              onClick={() => fetchPendingPatients()}
              disabled={loadingPatients}
              className="flex items-center gap-1 text-xs font-medium text-sky-600 hover:text-sky-700 disabled:opacity-50 transition cursor-pointer"
              title="Refresh prescribed patients list"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingPatients ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
          <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-xl">
            {(["today", "yesterday", "3days", "custom"] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setDateFilter(filter)}
                className={`py-1.5 text-[11px] font-semibold rounded-lg transition-all capitalize cursor-pointer whitespace-nowrap text-center ${
                  dateFilter === filter
                    ? "bg-white text-slate-900 shadow-sm font-bold"
                    : "text-slate-500 hover:text-slate-950"
                }`}
              >
                {filter === "3days" ? "Last 3 Days" : filter === "today" ? "Today" : filter === "yesterday" ? "Yesterday" : "Custom"}
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
          <div className="flex justify-between items-center flex-wrap gap-1">
            <label className="text-xs font-semibold text-slate-700 block">Prescribed Patients</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowOnlyPending(!showOnlyPending)}
                className="text-[11px] font-semibold text-sky-600 hover:text-sky-700 underline cursor-pointer"
              >
                {showOnlyPending ? "Show All" : "Pending Only"}
              </button>
              {!loadingPatients && pendingPatients.length > 0 && (
                <span className="inline-flex items-center rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 border">
                  {pendingPatients.filter(p => showOnlyPending ? p.pending_test_count > 0 : true).length} {showOnlyPending ? "pending" : "total"}
                </span>
              )}
            </div>
          </div>
          {loadingPatients ? (
            <div className="py-12 flex justify-center items-center">
              <RefreshCw className="h-5 w-5 animate-spin text-slate-400" />
              <span className="ml-2 text-xs text-slate-500 font-medium">Loading patients...</span>
            </div>
          ) : pendingPatients.filter(p => showOnlyPending ? p.pending_test_count > 0 : true).length === 0 ? (
            <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200 px-4">
              <AlertCircle className="mx-auto h-6 w-6 text-slate-400 mb-1" />
              <p className="text-xs font-semibold text-slate-600">No Prescribed Tests</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {showOnlyPending
                  ? "No patients found with pending prescribed tests. Toggle 'Show All' to view completed bookings."
                  : "No patients found with prescribed tests for this date range."}
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {pendingPatients
                .filter(p => showOnlyPending ? p.pending_test_count > 0 : true)
                .map((patient) => {
                  const encounterKey = patient.admission_id ? `ipd_${patient.admission_id}` : `opd_${patient.visit_id}`;
                  const currentSelectedKey = selectedEncounter?.admission_id
                    ? `ipd_${selectedEncounter.admission_id}`
                    : selectedEncounter?.visit_id
                    ? `opd_${selectedEncounter.visit_id}`
                    : selectedVisitId
                    ? `opd_${selectedVisitId}`
                    : "";
                  const isSelected = encounterKey === currentSelectedKey;
                  const isFullyBooked = patient.pending_test_count === 0;
                  const isIpd = patient.encounter_type === "ipd" || !!patient.admission_id;

                  return (
                    <div
                      key={encounterKey}
                      onClick={() => {
                        setSelectedEncounter(patient);
                        if (patient.admission_id) {
                          setSelectedAdmissionId(patient.admission_id);
                          setSelectedVisitId("");
                          setSelectedVisit(null);
                          setEncounterLinkType("ipd");
                          fetchAdvisedTests({ admission_id: patient.admission_id });
                        } else if (patient.visit_id) {
                          setSelectedVisitId(patient.visit_id);
                          setSelectedAdmissionId("");
                          setSelectedVisit(null);
                          setEncounterLinkType("opd");
                          fetchAdvisedTests({ visit_id: patient.visit_id });
                        } else {
                          setSelectedAdmissionId("");
                          setSelectedVisitId("");
                          setSelectedVisit(null);
                          setEncounterLinkType("none");
                          if (patient.patient_id) {
                            fetchAdvisedTests({ patient_id: patient.patient_id });
                          }
                        }
                      }}
                      className={`p-3 rounded-xl border transition-all cursor-pointer text-left ${
                        isSelected
                          ? "border-l-4 border-l-sky-500 border-sky-300 bg-white shadow-sm ring-1 ring-sky-500/10"
                          : isFullyBooked
                            ? "border-slate-200 bg-slate-50/50 opacity-75 hover:opacity-100 hover:border-slate-300"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                                isIpd
                                  ? "bg-purple-100 text-purple-700 border border-purple-200"
                                  : "bg-sky-100 text-sky-700 border border-sky-200"
                              }`}
                            >
                              {isIpd ? "IPD" : "OPD"}
                            </span>
                            <p className="text-sm font-semibold text-slate-900 truncate">
                              {patient.patient_name}
                            </p>
                          </div>
                          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-[11px] font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                              UHID: {patient.patient_uhid || patient.patient_id.substring(0, 8)}
                            </span>
                            {patient.encounter_details && (
                              <span className="text-[11px] text-slate-500 font-medium truncate max-w-[200px]">
                                {patient.encounter_details}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                          isSelected ? "bg-sky-50 text-sky-700 border-sky-200" : "bg-slate-100 text-slate-600 border-slate-200"
                        }`}>
                          {patient.admission_number || patient.visit_number}
                        </span>
                      </div>

                      <div className="flex justify-between text-xs text-slate-500 mt-2">
                        <span>Mob: {patient.patient_mobile || "N/A"}</span>
                        <span className="font-medium text-slate-600 truncate max-w-[120px]">
                          {patient.doctor_name || (isIpd ? "Attending Doctor" : "OPD Doctor")}
                        </span>
                      </div>

                      <div className="flex justify-between items-center mt-2 pt-1.5 border-t border-slate-100">
                        <span className="text-[10px] text-slate-400">
                          {patient.visit_date}
                        </span>
                        {patient.pending_test_count > 0 ? (
                          <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 border border-amber-200/80">
                            {patient.pending_test_count} {patient.pending_test_count === 1 ? "test" : "tests"} pending
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 border border-slate-200">
                            ✓ All Booked
                          </span>
                        )}
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
        {(selectedEncounter || selectedVisitId) ? (
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <FileText className="h-5 w-5 text-sky-500" />
                <h2 className="text-base font-semibold text-slate-950">
                  Prescriptions for{" "}
                  <span className="text-sky-600">
                    {selectedEncounter?.patient_name || selectedVisit?.patient_name || "Patient"}
                  </span>
                </h2>
                {selectedEncounter?.encounter_type && (
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      selectedEncounter.encounter_type === "ipd"
                        ? "bg-purple-100 text-purple-800 border border-purple-200"
                        : "bg-sky-100 text-sky-800 border border-sky-200"
                    }`}
                  >
                    {selectedEncounter.encounter_type === "ipd" ? "IPD Admission" : "OPD Visit"}
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-500 font-mono font-semibold bg-slate-100 px-2 py-1 rounded">
                {selectedEncounter?.admission_number ? `Adm: ${selectedEncounter.admission_number}` : `Visit: ${selectedEncounter?.visit_number || selectedVisit?.visit_number}`}
              </span>
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
                  No catalog-linked lab tests were prescribed for this encounter.
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

                {/* Re-booking Warning Banner */}
                {advisedTests.some((t) => selectedTestIds.includes(t.lab_test_id) && t.already_booked) && (
                  <div className="col-span-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>
                      <strong>Re-booking Notice:</strong> One or more selected tests were previously booked. Proceeding will create an intentional repeat booking for this encounter.
                    </span>
                  </div>
                )}

                {/* Price Breakup & Total Amount */}
                {advisedTests.filter((t) => selectedTestIds.includes(t.lab_test_id)).length > 0 && (
                  <div className="col-span-2 space-y-2.5 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Price Breakup
                    </h4>
                    <div className="space-y-2 text-sm">
                      {advisedTests
                        .filter((t) => selectedTestIds.includes(t.lab_test_id))
                        .map((t) => {
                          const effectivePrice = priceOverrides[t.lab_test_id] !== undefined ? priceOverrides[t.lab_test_id] : (t.price ?? 0);
                          const isOverridden = priceOverrides[t.lab_test_id] !== undefined && priceOverrides[t.lab_test_id] !== t.price;
                          return (
                            <div key={t.advice_item_id} className="flex justify-between items-center text-slate-600">
                              <span className="font-medium flex items-center gap-1.5">
                                {t.test_name} {t.already_booked ? "(Repeat Booking)" : ""}
                                {isOverridden && (
                                  <span className="inline-flex items-center rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                                    Custom (Orig: {currency(t.price ?? 0)})
                                  </span>
                                )}
                              </span>
                              <span className="font-semibold text-slate-700">
                                {currency(effectivePrice)}
                              </span>
                            </div>
                          );
                        })}
                      <div className="border-t border-slate-200 my-1 pt-2 flex justify-between font-bold text-slate-900 text-base">
                        <span>{isIpdBilling && ipdPaymentOption === "ledger" ? "Total Charges (IPD Ledger)" : "Total Amount to Collect"}</span>
                        <span className={isIpdBilling && ipdPaymentOption === "ledger" ? "text-purple-600" : "text-sky-600"}>
                          {currency(
                            advisedTests
                              .filter((t) => selectedTestIds.includes(t.lab_test_id))
                              .reduce((sum, t) => {
                                const p = priceOverrides[t.lab_test_id] !== undefined ? priceOverrides[t.lab_test_id] : (t.price ?? 0);
                                return sum + p;
                              }, 0)
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Encounter Linking Choice */}
                <div className="col-span-2 space-y-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Building2 className="h-4 w-4 text-sky-600" /> Link with Patient Encounter (User Choice)
                    </span>
                    {checkingPatientEncounters && (
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <RefreshCw className="h-3 w-3 animate-spin" /> Checking encounters...
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                    {/* Option 1: None (Standalone) */}
                    <label
                      className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                        encounterLinkType === "none"
                          ? "border-sky-500 bg-white shadow-sm ring-1 ring-sky-500/20"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="standalone_encounter_link"
                        checked={encounterLinkType === "none"}
                        onChange={() => setEncounterLinkType("none")}
                        className="mt-0.5 h-4 w-4 text-sky-600 focus:ring-sky-500 border-slate-300"
                      />
                      <div>
                        <p className="text-xs font-bold text-slate-900">None (Standalone)</p>
                        <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                          Direct lab booking. Do not link to admission or OPD visit.
                        </p>
                      </div>
                    </label>

                    {/* Option 2: Link with IPD */}
                    <label
                      className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all ${
                        hasIpdOption
                          ? encounterLinkType === "ipd"
                            ? "border-purple-500 bg-purple-50/50 shadow-sm ring-1 ring-purple-500/20 cursor-pointer"
                            : "border-purple-200/80 bg-white hover:border-purple-300 cursor-pointer"
                          : "border-slate-200 bg-slate-100/60 opacity-60 cursor-not-allowed"
                      }`}
                    >
                      <input
                        type="radio"
                        name="standalone_encounter_link"
                        disabled={!hasIpdOption}
                        checked={encounterLinkType === "ipd"}
                        onChange={() => {
                          if (hasIpdOption) {
                            setEncounterLinkType("ipd");
                          }
                        }}
                        className="mt-0.5 h-4 w-4 text-purple-600 focus:ring-purple-500 border-slate-300"
                      />
                      <div>
                        <div className="flex items-center gap-1">
                          <p className="text-xs font-bold text-purple-950">Link with IPD</p>
                          {hasIpdOption && (
                            <span className="text-[9px] font-extrabold uppercase px-1 py-0.2 rounded bg-purple-100 text-purple-700">
                              IPD
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                          {availableAdmission
                            ? `Admission #${availableAdmission.admission_number || availableAdmission.id.substring(0, 8)}`
                            : "No active IPD admission"}
                        </p>
                      </div>
                    </label>

                    {/* Option 3: Link with OPD */}
                    <label
                      className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all ${
                        hasOpdOption
                          ? encounterLinkType === "opd"
                            ? "border-teal-500 bg-teal-50/50 shadow-sm ring-1 ring-teal-500/20 cursor-pointer"
                            : "border-teal-200/80 bg-white hover:border-teal-300 cursor-pointer"
                          : "border-slate-200 bg-slate-100/60 opacity-60 cursor-not-allowed"
                      }`}
                    >
                      <input
                        type="radio"
                        name="standalone_encounter_link"
                        disabled={!hasOpdOption}
                        checked={encounterLinkType === "opd"}
                        onChange={() => {
                          if (hasOpdOption) {
                            setEncounterLinkType("opd");
                          }
                        }}
                        className="mt-0.5 h-4 w-4 text-teal-600 focus:ring-teal-500 border-slate-300"
                      />
                      <div>
                        <div className="flex items-center gap-1">
                          <p className="text-xs font-bold text-teal-950">Link with OPD</p>
                          {hasOpdOption && (
                            <span className="text-[9px] font-extrabold uppercase px-1 py-0.2 rounded bg-teal-100 text-teal-700">
                              OPD
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                          {availableOpdVisit
                            ? `Visit #${availableOpdVisit.visit_number || availableOpdVisit.id.substring(0, 8)}`
                            : "No OPD visit found"}
                        </p>
                      </div>
                    </label>
                  </div>

                  {/* If OPD is selected and multiple visits available, show dropdown */}
                  {encounterLinkType === "opd" && recentVisits.length > 1 && (
                    <div className="pt-2 border-t border-slate-200/70">
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Select OPD Visit
                      </label>
                      <select
                        value={selectedVisitId}
                        onChange={(e) => setSelectedVisitId(e.target.value)}
                        className="w-full rounded-xl border border-teal-300 bg-white px-3 py-1.5 text-xs outline-none focus:border-teal-500 font-medium"
                      >
                        {recentVisits.map((v) => (
                          <option key={v.id} value={v.id}>
                            Visit #{v.visit_number} — {formatDate(v.created_at)} ({v.visit_type?.replace("_", " ")})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* If IPD is selected, show IPD Payment & Billing Option */}
                  {encounterLinkType === "ipd" && (
                    <div className="pt-2 border-t border-purple-200/70 space-y-1.5">
                      <label className="text-xs font-semibold text-purple-900 block">
                        IPD Payment & Billing Method
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <label
                          className={`flex items-start gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                            ipdPaymentOption === "ledger"
                              ? "border-purple-500 bg-purple-100/50 shadow-2xs font-medium"
                              : "border-slate-200 bg-white hover:border-purple-200"
                          }`}
                        >
                          <input
                            type="radio"
                            name="standalone_ipd_payment_mode"
                            checked={ipdPaymentOption === "ledger"}
                            onChange={() => setIpdPaymentOption("ledger")}
                            className="mt-0.5 h-3.5 w-3.5 text-purple-600 focus:ring-purple-500"
                          />
                          <div>
                            <p className="text-xs font-bold text-slate-800">Add to IPD Ledger (Post to Bill)</p>
                            <p className="text-[10px] text-slate-500">Charges added to admission bill. No immediate invoice.</p>
                          </div>
                        </label>
                        <label
                          className={`flex items-start gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                            ipdPaymentOption === "collect_now"
                              ? "border-sky-500 bg-sky-50 shadow-2xs font-medium"
                              : "border-slate-200 bg-white hover:border-sky-200"
                          }`}
                        >
                          <input
                            type="radio"
                            name="standalone_ipd_payment_mode"
                            checked={ipdPaymentOption === "collect_now"}
                            onChange={() => setIpdPaymentOption("collect_now")}
                            className="mt-0.5 h-3.5 w-3.5 text-sky-600 focus:ring-sky-500"
                          />
                          <div>
                            <p className="text-xs font-bold text-slate-800">Collect Payment Now</p>
                            <p className="text-[10px] text-slate-500">Collect payment at lab desk with separate invoice.</p>
                          </div>
                        </label>
                      </div>
                    </div>
                  )}
                </div>

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

                {/* Payment inputs only if NOT posting to IPD ledger */}
                {(!isIpdBilling || ipdPaymentOption === "collect_now") && (
                  <>
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
                  </>
                )}

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
                    className={`w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:shadow-md transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                      isIpdBilling && ipdPaymentOption === "ledger"
                        ? "bg-gradient-to-r from-purple-600 to-indigo-600"
                        : "bg-gradient-to-r from-sky-500 to-teal-500"
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Booking...
                      </>
                    ) : (
                      <>
                        <Beaker className="h-4 w-4" />
                        {isIpdBilling && ipdPaymentOption === "ledger"
                          ? `Book & Post to IPD Ledger (${selectedTestIds.length})`
                          : `Book Selected Tests (${selectedTestIds.length})`}
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

      <PreviousLabReportModal
        isOpen={selectedReportBooking !== null}
        onClose={() => setSelectedReportBooking(null)}
        booking={selectedReportBooking}
      />
    </div>
  );
}
