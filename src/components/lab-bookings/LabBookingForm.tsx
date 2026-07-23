"use client";

import { useState, useEffect, useRef } from "react";
import { useAppSelector } from "@/redux/hooks";
import { labBookingsApi, CreateLabBookingRequest, TestPriority, PaymentMethod } from "@/services/labBookingsApi";
import { labTestsApi, LabTest } from "@/services/labTestsApi";
import { patientsApi } from "@/services/patientsApi";
import { Patient } from "@/types";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { Calendar, Search, User, Beaker, Plus, X } from "lucide-react";
import { PatientFormModal } from "@/components/patients/PatientFormModal";
import { currency, getTodayDateLocal } from "@/utils/format";

interface LabBookingFormProps {
  defaultPatientId?: string;
  onSuccess?: () => void;
  onOpenPatientModal?: () => void;
}

export function LabBookingForm({ 
  defaultPatientId, 
  onSuccess,
  onOpenPatientModal
}: LabBookingFormProps) {
  const patients = useAppSelector((s) => s.patients.list);

  const [patientId, setPatientId] = useState(defaultPatientId || "");
  const [scheduledDate, setScheduledDate] = useState("");
  const [priority, setPriority] = useState<TestPriority>("routine");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [selectedTests, setSelectedTests] = useState<Array<{ lab_test_id: string; test: LabTest; customPrice?: number }>>([]);
  
  // Patient search
  const [dropdownSearchTerm, setDropdownSearchTerm] = useState("");
  const [dropdownResults, setDropdownResults] = useState<Patient[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const justSelectedRef = useRef(false);

  // Lab tests
  const [availableTests, setAvailableTests] = useState<LabTest[]>([]);
  const [testSearchTerm, setTestSearchTerm] = useState("");
  const [showTestDropdown, setShowTestDropdown] = useState(false);
  const testSearchRef = useRef<HTMLDivElement>(null);
  const [loadingTests, setLoadingTests] = useState(false);

  // Patient modal
  const [showPatientModal, setShowPatientModal] = useState(false);

  // Set default date to today
  useEffect(() => {
    const today = getTodayDateLocal();
    setScheduledDate(today);
  }, []);

  // Update patientId when defaultPatientId changes
  useEffect(() => {
    if (defaultPatientId) {
      setPatientId(defaultPatientId);
      const patient = patients.find((p) => p.id === defaultPatientId);
      if (patient) {
        setDropdownSearchTerm(patient.name);
      }
    }
  }, [defaultPatientId, patients]);

  // Fetch available lab tests
  useEffect(() => {
    const fetchTests = async () => {
      setLoadingTests(true);
      try {
        const response = await labTestsApi.list({ is_active: true, page_size: 100 });
        setAvailableTests(response.items);
      } catch (error) {
        console.error("Failed to fetch lab tests:", error);
        toast.error("Failed to load lab tests");
      } finally {
        setLoadingTests(false);
      }
    };
    fetchTests();
  }, []);

  // Patient dropdown search effect
  useEffect(() => {
    if (justSelectedRef.current || (patientId && dropdownSearchTerm === patients.find(p => p.id === patientId)?.name)) {
      return;
    }

    if (dropdownSearchTerm.trim().length >= 2) {
      const timeoutId = setTimeout(async () => {
        setIsSearching(true);
        try {
          const response = await patientsApi.searchGlobal({ q: dropdownSearchTerm.trim(), page_size: 10 });
          const searchPatients = patientsApi.mapToPatients(response.items);
          setDropdownResults(searchPatients);
        } catch (error) {
          console.error("Failed to search patients:", error);
          setDropdownResults([]);
        } finally {
          setIsSearching(false);
        }
      }, 300);

      return () => clearTimeout(timeoutId);
    } else {
      setDropdownResults([]);
    }
  }, [dropdownSearchTerm, patientId, patients]);

  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
      if (testSearchRef.current && !testSearchRef.current.contains(event.target as Node)) {
        setShowTestDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Listen for patient:created event
  useEffect(() => {
    const handlePatientCreated = (e: CustomEvent<{ patientId: string }>) => {
      const newPatientId = e.detail?.patientId;
      if (newPatientId) {
        setPatientId(newPatientId);
        const patient = patients.find((p) => p.id === newPatientId);
        if (patient) {
          setDropdownSearchTerm(patient.name);
        }
      }
    };

    window.addEventListener("patient:created", handlePatientCreated as EventListener);
    return () => {
      window.removeEventListener("patient:created", handlePatientCreated as EventListener);
    };
  }, [patients]);

  const handlePatientSelect = (patient: Patient) => {
    justSelectedRef.current = true;
    setPatientId(patient.id);
    setDropdownSearchTerm(patient.name);
    setShowDropdown(false);
    setDropdownResults([]);
    setTimeout(() => {
      justSelectedRef.current = false;
    }, 100);
  };

  const handleAddTest = (test: LabTest) => {
    // Check if test is already added
    if (selectedTests.some((st) => st.lab_test_id === test.id)) {
      toast.error("Test already added");
      return;
    }
    setSelectedTests([...selectedTests, { lab_test_id: test.id, test, customPrice: test.price }]);
    setTestSearchTerm("");
    setShowTestDropdown(false);
  };

  const handlePriceChange = (labTestId: string, val: string) => {
    const numVal = val === "" ? 0 : parseFloat(val);
    setSelectedTests((prev) =>
      prev.map((st) => {
        if (st.lab_test_id === labTestId) {
          return { ...st, customPrice: isNaN(numVal) ? 0 : numVal };
        }
        return st;
      })
    );
  };

  const handleRemoveTest = (labTestId: string) => {
    setSelectedTests(selectedTests.filter((st) => st.lab_test_id !== labTestId));
  };

  const filteredTests = availableTests.filter((test) =>
    test.test_name.toLowerCase().includes(testSearchTerm.toLowerCase()) ||
    test.test_code.toLowerCase().includes(testSearchTerm.toLowerCase())
  );

  const selectedPatient = patients.find((p) => p.id === patientId);
  const totalAmount = selectedTests.reduce((sum, st) => sum + (st.customPrice ?? st.test.price ?? 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!patientId) {
      toast.error("Please select a patient");
      return;
    }

    if (selectedTests.length === 0) {
      toast.error("Please select at least one test");
      return;
    }

    // Validate payment reference if required
    if ((paymentMethod === "upi" || paymentMethod === "card" || paymentMethod === "cheque") && !paymentReference.trim()) {
      toast.error(`Please enter payment reference for ${paymentMethod.toUpperCase()}`);
      return;
    }

    try {
      const bookingData: CreateLabBookingRequest = {
        patient_id: patientId,
        scheduled_date: scheduledDate,
        scheduled_time: undefined, // Not required
        priority,
        tests: selectedTests.map((st) => ({
          lab_test_id: st.lab_test_id,
          price: st.customPrice,
        })),
        notes: notes.trim() || undefined,
        payment_method: paymentMethod,
        payment_reference: paymentReference.trim() || undefined,
      };

      await labBookingsApi.create(bookingData);
      toast.success("Lab test booking created successfully");
      
      // Reset form
      setPatientId("");
      setDropdownSearchTerm("");
      setScheduledDate(getTodayDateLocal());
      setPriority("routine");
      setNotes("");
      setPaymentMethod("cash");
      setPaymentReference("");
      setSelectedTests([]);
      
      // Dispatch custom event
      window.dispatchEvent(new CustomEvent("lab:booking:created"));
      
      onSuccess?.();
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3 text-sm">
        {/* Patient Search */}
        <div className="col-span-2 space-y-1" ref={searchRef}>
          <label className="text-slate-600">
            Select Patient <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={dropdownSearchTerm}
                onChange={(e) => {
                  setDropdownSearchTerm(e.target.value);
                  setShowDropdown(true);
                  if (!e.target.value) {
                    setPatientId("");
                  }
                }}
                onFocus={() => {
                  if (dropdownSearchTerm.length >= 2) {
                    setShowDropdown(true);
                  }
                }}
                placeholder="Search patient by name, mobile, or MRN..."
                className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-20 py-2 outline-none focus:border-sky-400"
              />
              <button
                type="button"
                onClick={() => {
                  if (onOpenPatientModal) {
                    onOpenPatientModal();
                  } else {
                    setShowPatientModal(true);
                  }
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 rounded-lg bg-sky-50 px-2 py-1 text-xs font-medium text-sky-600 hover:bg-sky-100 transition-colors"
              >
                <Plus className="h-3 w-3" /> New
              </button>
            </div>
            {showDropdown && (
              <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                {isSearching ? (
                  <div className="p-3 text-center text-xs text-slate-500">Searching patients...</div>
                ) : dropdownResults.length > 0 ? (
                  dropdownResults.map((patient) => (
                    <div
                      key={patient.id}
                      onClick={() => handlePatientSelect(patient)}
                      className="flex cursor-pointer items-center justify-between px-4 py-2 hover:bg-sky-50"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">{patient.name}</p>
                        <p className="text-xs text-slate-500">
                          {patient.mobile || "No Mobile"} • ID: {patient.id.slice(0, 8)}...
                        </p>
                      </div>
                    </div>
                  ))
                ) : dropdownSearchTerm.length >= 2 ? (
                  <div className="p-3 text-center text-xs text-slate-500">No patients found</div>
                ) : null}
              </div>
            )}
          </div>
        </div>

        {/* Scheduled Date */}
        <label className="space-y-1">
          <span className="text-slate-600">
            Scheduled Date <span className="text-rose-500">*</span>
          </span>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              min={getTodayDateLocal()}
              className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2 outline-none focus:border-sky-400"
              required
            />
          </div>
        </label>

        {/* Priority */}
        <label className="space-y-1">
          <span className="text-slate-600">Priority</span>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as TestPriority)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400 capitalize"
          >
            <option value="routine">Routine</option>
            <option value="urgent">Urgent</option>
            <option value="stat">Stat (Immediate)</option>
          </select>
        </label>

        {/* Payment Method */}
        <label className="col-span-2 space-y-1">
          <span className="text-slate-600">Payment Method</span>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
          >
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="card">Card</option>
            <option value="cheque">Cheque</option>
          </select>
        </label>

        {/* Payment Reference */}
        {(paymentMethod === "upi" || paymentMethod === "card" || paymentMethod === "cheque") && (
          <label className="col-span-2 space-y-1">
            <span className="text-slate-600">
              Payment Reference <span className="text-rose-500">*</span>
            </span>
            <input
              type="text"
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              placeholder={`Enter ${paymentMethod.toUpperCase()} reference`}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
            />
          </label>
        )}

        {/* Lab Tests Selection */}
        <div className="col-span-2 space-y-1" ref={testSearchRef}>
          <label className="text-slate-600">
            Select Tests <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <div className="relative">
              <Beaker className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={testSearchTerm}
                onChange={(e) => {
                  setTestSearchTerm(e.target.value);
                  setShowTestDropdown(e.target.value.length > 0);
                }}
                onFocus={() => setShowTestDropdown(testSearchTerm.length > 0)}
                placeholder="Search tests by name or code"
                className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2 outline-none focus:border-sky-400"
              />
            </div>
            {showTestDropdown && filteredTests.length > 0 && (
              <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                {filteredTests
                  .filter((test) => !selectedTests.some((st) => st.lab_test_id === test.id))
                  .map((test) => (
                    <div
                      key={test.id}
                      onClick={() => handleAddTest(test)}
                      className="flex cursor-pointer items-center justify-between px-4 py-2 hover:bg-sky-50"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">{test.test_name}</p>
                        <p className="text-xs text-slate-500">{test.test_code} • ₹{test.price}</p>
                      </div>
                      <Plus className="h-4 w-4 text-sky-600" />
                    </div>
                  ))}
              </div>
            )}
          </div>
          {selectedTests.length > 0 && (
            <div className="mt-2 space-y-2">
              {selectedTests.map((st) => (
                <div
                  key={st.lab_test_id}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/80 p-3"
                >
                  <div className="flex-1 min-w-0 pr-3">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900 truncate">{st.test.test_name}</p>
                      {st.customPrice !== undefined && st.customPrice !== st.test.price && (
                        <span className="inline-flex items-center rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800 shrink-0">
                          Custom Price (Orig: ₹{st.test.price})
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">{st.test.test_code}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-slate-500">₹</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={st.customPrice ?? st.test.price}
                        onChange={(e) => handlePriceChange(st.lab_test_id, e.target.value)}
                        className="w-24 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-sm font-semibold text-slate-900 shadow-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                        title="Override test price"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveTest(st.lab_test_id)}
                      className="rounded-lg p-1 text-rose-500 hover:bg-rose-50 transition-colors"
                      title="Remove test"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notes */}
        <label className="col-span-2 space-y-1">
          <span className="text-slate-600">Notes</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
            placeholder="Additional notes (e.g., fasting required)"
          />
        </label>

        {/* Total Amount */}
        {selectedTests.length > 0 && (
          <div className="col-span-2 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <span className="text-sm font-semibold text-slate-700">Total Booking Amount:</span>
            <span className="text-lg font-bold text-slate-900">
              {currency(totalAmount)}
            </span>
          </div>
        )}

        {/* Submit Button */}
        <div className="col-span-2 flex justify-end gap-3">
          <button
            type="submit"
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 font-semibold text-white shadow-sm hover:shadow"
          >
            <Beaker className="h-4 w-4" />
            Create Booking
          </button>
        </div>
      </form>

      <PatientFormModal
        isOpen={showPatientModal}
        onClose={() => setShowPatientModal(false)}
      />
    </>
  );
}
