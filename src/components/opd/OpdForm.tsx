"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { useReactToPrint } from "react-to-print";
import { toast } from "sonner";
import { Printer, Plus, Search, User } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { fetchDoctors } from "@/redux/doctorsSlice";
import { Patient } from "@/types";
import { OpdSlipPrint } from "./OpdSlipPrint";
import { opdVisitsApi, CreateVisitRequest, Visit } from "@/services/opdVisitsApi";
import { patientsApi } from "@/services/patientsApi";
import { getErrorMessage } from "@/utils/errorHandler";

interface OpdFormProps {
  defaultPatientId?: string;
  hidePatientSearch?: boolean;
  onSuccess?: () => void;
  onOpenPatientModal?: () => void;
}

export function OpdForm({ defaultPatientId, hidePatientSearch = false, onSuccess, onOpenPatientModal }: OpdFormProps = {} as OpdFormProps) {
  const dispatch = useAppDispatch();
  const patients = useAppSelector((s) => s.patients.list);
  const queue = useAppSelector((s) => s.queue.entries);
  const doctors = useAppSelector((s) => s.doctors.list);
  const doctorsLoading = useAppSelector((s) => s.doctors.loading);

  const [doctorId, setDoctorId] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [patientId, setPatientId] = useState(defaultPatientId || "");
  const [term, setTerm] = useState("");
  const [dropdownSearchTerm, setDropdownSearchTerm] = useState("");
  const [dropdownResults, setDropdownResults] = useState<Patient[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [opdNumber, setOpdNumber] = useState("");
  const [tokenNumber, setTokenNumber] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "upi" | "card" | "cheque">("cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [createdVisitId, setCreatedVisitId] = useState<string | null>(null);
  const [visitData, setVisitData] = useState<Visit | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [shouldPrint, setShouldPrint] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const previousPatientsCount = useRef(patients.length);
  const justSelectedRef = useRef(false);

  // Fetch doctors on mount
  useEffect(() => {
    if (doctors.length === 0 && !doctorsLoading) {
      dispatch(fetchDoctors());
    }
  }, [dispatch, doctors.length, doctorsLoading]);

  // Set default doctor when doctors are loaded
  useEffect(() => {
    if (doctors.length > 0 && !doctorId) {
      setDoctorId(doctors[0].id);
    }
  }, [doctors, doctorId]);

  // Dropdown search effect
  useEffect(() => {
    // Don't search if we just selected a patient or if a patient is already selected
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
          setShowDropdown(searchPatients.length > 0);
        } catch (error) {
          console.error("Search failed:", error);
          setDropdownResults([]);
          setShowDropdown(false);
        } finally {
          setIsSearching(false);
        }
      }, 300);

      return () => clearTimeout(timeoutId);
    } else if (dropdownSearchTerm.trim().length < 2) {
      setDropdownResults([]);
      setShowDropdown(false);
    }
  }, [dropdownSearchTerm, patientId, patients]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Update dropdown search term when patient is selected via defaultPatientId
  useEffect(() => {
    if (defaultPatientId && patientId === defaultPatientId) {
      const patient = patients.find((p) => p.id === patientId);
      if (patient) {
        setDropdownSearchTerm(patient.name);
      }
    }
  }, [defaultPatientId, patientId, patients]);

  const filteredPatients = useMemo(() => {
    const lower = term.toLowerCase();
    return patients.filter(
      (p) =>
        p.name.toLowerCase().includes(lower) ||
        p.mobile.includes(term) ||
        p.healthId.toLowerCase().includes(lower)
    );
  }, [patients, term]);

  const handlePatientSelect = (patient: Patient) => {
    justSelectedRef.current = true;
    setPatientId(patient.id);
    setDropdownSearchTerm(patient.name);
    setShowDropdown(false);
    setDropdownResults([]); // Clear results to prevent dropdown from showing again
    // Reset the flag after a short delay
    setTimeout(() => {
      justSelectedRef.current = false;
    }, 100);
  };

  // Listen for patient creation event to select the newly created patient
  useEffect(() => {
    const handlePatientCreated = (event: CustomEvent) => {
      const { patientId: newPatientId } = event.detail;
      if (newPatientId) {
        const newPatient = patients.find((p) => p.id === newPatientId);
        if (newPatient) {
          setPatientId(newPatient.id);
          setDropdownSearchTerm(newPatient.name);
          setShowDropdown(false);
          setDropdownResults([]);
          toast.success("Patient added and selected");
        }
      }
    };

    window.addEventListener("patient:created", handlePatientCreated as EventListener);
    return () => {
      window.removeEventListener("patient:created", handlePatientCreated as EventListener);
    };
  }, [patients]);

  const selectedPatient = patients.find((p) => p.id === patientId);

  const printWithReactToPrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `OPD_Slip_${opdNumber}`,
  });

  // Trigger print when visitData is set after fetching (only if shouldPrint is true)
  useEffect(() => {
    if (visitData && shouldPrint && printRef.current) {
      // Small delay to ensure DOM is updated
      const timeoutId = setTimeout(() => {
        printWithReactToPrint();
        setShouldPrint(false); // Reset flag after printing
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [visitData, shouldPrint, printWithReactToPrint]);

  const generateOpdNumber = () => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
    return `OPD-${year}${month}${day}-${random}`;
  };

  const generateTokenNumber = () => {
    // Generate token based on current queue length or random
    if (queue.length > 0) {
      const maxToken = Math.max(...queue.map((q) => q.token));
      return maxToken + 1;
    }
    return Math.floor(Math.random() * 100) + 1;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPatient) {
      toast.error("Please select a patient");
      return;
    }

    // Validate payment reference if required
    if ((paymentMethod === "upi" || paymentMethod === "card" || paymentMethod === "cheque") && !paymentReference.trim()) {
      toast.error(`Please enter payment reference for ${paymentMethod.toUpperCase()}`);
      return;
    }

    // Get selected doctor object
    const selectedDoctorObj = doctorId ? doctors.find((doc) => doc.id === doctorId) : null;

    setIsCreating(true);
    try {
      // Create OPD visit using the API
      const visitRequest: CreateVisitRequest = {
        patient_id: selectedPatient.id,
        doctor_id: doctorId || null, // Optional
        visit_type: "walk_in",
        chief_complaint: symptoms.trim() || null,
        notes: null,
        payment_method: paymentMethod,
        payment_reference: paymentReference.trim() || null,
        consultation_fee: selectedDoctorObj?.consultation_fee 
          ? parseFloat(String(selectedDoctorObj.consultation_fee)) 
          : null,
      };

      const visit = await opdVisitsApi.create(visitRequest);
      
      // Dispatch custom event to refresh OPD visits list
      window.dispatchEvent(new CustomEvent("opd:visit:created"));
      
      // Store visit ID for later fetching
      setCreatedVisitId(visit.id);
      setOpdNumber(visit.visit_number);
      setTokenNumber(visit.token_number || 0);
      
      toast.success(`OPD visit created #${visit.visit_number}`);
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  const handlePrint = async () => {
    if (!createdVisitId || !selectedPatient) {
      toast.error("Please create OPD visit first");
      return;
    }

    try {
      // Fetch full visit details
      const visit = await opdVisitsApi.getById(createdVisitId);
      
      // Update opdNumber and tokenNumber from fetched visit
      setOpdNumber(visit.visit_number);
      setTokenNumber(visit.token_number || 0);
      
      // Set shouldPrint flag and visitData - this will trigger the useEffect to print
      setShouldPrint(true);
      setVisitData(visit);
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3 text-sm">
      {!hidePatientSearch && (
        <div ref={searchRef} className="col-span-2 space-y-1">
          <label className="space-y-1">
            <span className="text-slate-600 flex items-center gap-1">
              <User className="h-4 w-4" />
              Patient <span className="text-rose-500">*</span>
            </span>
            <div className="relative">
              <div className="relative flex items-center">
                <Search className="absolute left-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={dropdownSearchTerm}
                  onChange={(e) => {
                    setDropdownSearchTerm(e.target.value);
                    setShowDropdown(true);
                  }}
                  onFocus={() => {
                    if (dropdownResults.length > 0) {
                      setShowDropdown(true);
                    }
                  }}
                  placeholder="Search patient by name, mobile, or Health ID"
                  className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 py-2 outline-none focus:border-sky-400"
                />
              </div>
              {showDropdown && (dropdownResults.length > 0 || isSearching) && (
                <div className="absolute z-50 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-xl max-h-60 overflow-y-auto">
                  {isSearching ? (
                    <div className="p-3 text-center text-sm text-slate-500">Searching...</div>
                  ) : dropdownResults.length > 0 ? (
                    dropdownResults.map((patient) => (
                      <button
                        key={patient.id}
                        type="button"
                        onClick={() => handlePatientSelect(patient)}
                        className="w-full border-b border-slate-100 px-4 py-3 text-left transition hover:bg-sky-50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                            <User className="h-4 w-4" />
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-slate-900">{patient.name}</p>
                            <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                              <span>{patient.mobile}</span>
                              <span>•</span>
                              <span>{patient.healthId}</span>
                              <span>•</span>
                              <span>{patient.age} years, {patient.gender}</span>
                            </div>
                          </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="p-3 text-center text-sm text-slate-500">No patients found</div>
                  )}
                </div>
              )}
            </div>
            {patientId && (
              <div className="mt-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2">
                <p className="text-xs text-sky-700">
                  Selected: {patients.find((p) => p.id === patientId)?.name || "Patient"}
                </p>
              </div>
            )}
          </label>
          <div className="mt-2">
            <button
              type="button"
              onClick={() => {
                if (onOpenPatientModal) {
                  onOpenPatientModal();
                }
              }}
              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-sky-200 hover:text-sky-700"
            >
              <Plus className="h-4 w-4" />
              Add new patient
            </button>
          </div>
        </div>
      )}

      {hidePatientSearch && selectedPatient && (
        <div className="col-span-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="font-semibold text-slate-900">{selectedPatient.name}</p>
          <p className="text-xs text-slate-500">
            {selectedPatient.healthId} • {selectedPatient.mobile}
          </p>
        </div>
      )}
      <label className="space-y-1">
        <span className="text-slate-600">Doctor</span>
        <select
          value={doctorId}
          onChange={(e) => setDoctorId(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
          disabled={doctorsLoading || doctors.length === 0}
        >
          <option value="">Select doctor (optional)</option>
          {doctorsLoading ? (
            <option>Loading doctors...</option>
          ) : doctors.length === 0 ? (
            <option>No doctors available</option>
          ) : (
            doctors.map((doc) => {
              const doctorName = doc.name || `Dr. ${doc.specialization}`;
              return (
                <option key={doc.id} value={doc.id}>
                  {doctorName} - {doc.specialization}
                </option>
              );
            })
          )}
        </select>
      </label>
      <label className="space-y-1">
        <span className="text-slate-600">
          Payment Method <span className="text-rose-500">*</span>
        </span>
        <select
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value as "cash" | "upi" | "card" | "cheque")}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
          required
        >
          <option value="cash">Cash</option>
          <option value="upi">UPI</option>
          <option value="card">Card</option>
          <option value="cheque">Cheque</option>
        </select>
      </label>
      {(paymentMethod === "upi" || paymentMethod === "card" || paymentMethod === "cheque") && (
        <label className="space-y-1">
          <span className="text-slate-600">
            Payment Reference <span className="text-rose-500">*</span>
          </span>
          <input
            type="text"
            value={paymentReference}
            onChange={(e) => setPaymentReference(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
            placeholder={paymentMethod === "upi" ? "UPI transaction ID" : paymentMethod === "card" ? "Card transaction ID" : "Cheque number"}
            required
          />
        </label>
      )}
      <label className="col-span-2 space-y-1">
        <span className="text-slate-600">Chief Complaint / Symptoms</span>
        <textarea
          value={symptoms}
          onChange={(e) => setSymptoms(e.target.value)}
          rows={2}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
          placeholder="Chief complaint or symptoms (optional)"
        />
      </label>
      <div className="col-span-2 flex justify-end gap-3">
        {!createdVisitId ? (
          <button
            type="submit"
            disabled={isCreating}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 font-semibold text-white shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? "Creating..." : "Create OPD"}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => {
                // Reset form state
                setCreatedVisitId(null);
                setVisitData(null);
                setOpdNumber("");
                setTokenNumber(0);
                setPatientId("");
                setDropdownSearchTerm("");
                setSymptoms("");
                setPaymentMethod("cash");
                setPaymentReference("");
                setShouldPrint(false);
              }}
              className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Create Another
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 font-semibold text-white shadow-sm hover:shadow"
            >
              <Printer className="h-4 w-4" />
              Print OPD Slip
            </button>
          </>
        )}
      </div>

      {/* Hidden printable slip - render when we have visit data */}
      {selectedPatient && visitData && (
        <div style={{ position: "absolute", left: "-9999px", top: "-9999px", width: "210mm" }}>
          <div ref={printRef} className="print-content">
            <OpdSlipPrint
              patient={selectedPatient}
              doctor={(() => {
                const doc = visitData.doctor_id ? doctors.find((d) => d.id === visitData.doctor_id) : null;
                return doc ? (doc.name || `Dr. ${doc.specialization}`) : "";
              })()}
              symptoms={visitData.chief_complaint || symptoms}
              opdNumber={visitData.visit_number}
              tokenNumber={visitData.token_number || 0}
            />
          </div>
        </div>
      )}
    </form>
  );
}

