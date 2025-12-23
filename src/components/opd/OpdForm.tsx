"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { useReactToPrint } from "react-to-print";
import { toast } from "sonner";
import { Printer, Plus, Search, User, Stethoscope, CreditCard, AlertCircle, FileText, DollarSign } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { fetchDoctors } from "@/redux/doctorsSlice";
import { Patient } from "@/types";
import { OpdSlipPrint } from "./OpdSlipPrint";
import { opdVisitsApi, CreateVisitRequest, Visit } from "@/services/opdVisitsApi";
import { patientsApi } from "@/services/patientsApi";
import { doctorsApi, ConsultationFeeCalculation } from "@/services/doctorsApi";
import { getErrorMessage } from "@/utils/errorHandler";
import { currency } from "@/utils/format";

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
  const [selectedPatientData, setSelectedPatientData] = useState<Patient | null>(null);
  const [opdNumber, setOpdNumber] = useState("");
  const [tokenNumber, setTokenNumber] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<"" | "cash" | "upi" | "card" | "cheque" >("");
  const [paymentReference, setPaymentReference] = useState("");
  const [createdVisitId, setCreatedVisitId] = useState<string | null>(null);
  const [visitData, setVisitData] = useState<Visit | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [shouldPrint, setShouldPrint] = useState(false);
  const [consultationFee, setConsultationFee] = useState<string | null>(null);
  const [feeCalculation, setFeeCalculation] = useState<ConsultationFeeCalculation | null>(null);
  const [isCalculatingFee, setIsCalculatingFee] = useState(false);
  const [feeOverride, setFeeOverride] = useState<string>("");
  const [isEmergency, setIsEmergency] = useState(false);
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


  // Dropdown search effect
  useEffect(() => {
    // Don't search if we just selected a patient
    if (justSelectedRef.current) {
      return;
    }

    // Don't search if patient is already selected and search term matches patient name
    if (patientId && dropdownSearchTerm === patients.find(p => p.id === patientId)?.name) {
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
        setSelectedPatientData(patient);
      }
    }
  }, [defaultPatientId, patientId, patients]);

  // Calculate consultation fee when doctor and patient are selected
  useEffect(() => {
    const calculateFee = async () => {
      if (!doctorId || !patientId) {
        setConsultationFee(null);
        setFeeCalculation(null);
        return;
      }

      setIsCalculatingFee(true);
      try {
        const calculation = await doctorsApi.calculateConsultationFee(doctorId, patientId, isEmergency);
        setFeeCalculation(calculation);
        setConsultationFee(calculation.consultation_fee);
      } catch (error) {
        console.error("Failed to calculate consultation fee:", error);
        setConsultationFee(null);
        setFeeCalculation(null);
        // Don't show error toast as this is a background operation
      } finally {
        setIsCalculatingFee(false);
      }
    };

    // Debounce the calculation
    const timeoutId = setTimeout(calculateFee, 300);
    return () => clearTimeout(timeoutId);
  }, [doctorId, patientId, isEmergency]);

  const filteredPatients = useMemo(() => {
    const lower = term.toLowerCase();
    return patients.filter(
      (p) =>
        p.name.toLowerCase().includes(lower) ||
        p.mobile.includes(term) ||
        p.healthId.toLowerCase().includes(lower)
    );
  }, [patients, term]);

  const selectedDoctor = useMemo(() => {
    return doctorId ? doctors.find((d) => d.id === doctorId) || null : null;
  }, [doctorId, doctors]);

  const handlePatientSelect = (patient: Patient) => {
    justSelectedRef.current = true;
    setPatientId(patient.id);
    setDropdownSearchTerm(patient.name);
    setSelectedPatientData(patient); // Store the selected patient object
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
          setSelectedPatientData(newPatient);
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

  // Find selected patient from stored data, Redux list, or dropdown results
  const selectedPatient = patientId 
    ? selectedPatientData && selectedPatientData.id === patientId
      ? selectedPatientData
      : patients.find((p) => p.id === patientId) || dropdownResults.find((p) => p.id === patientId)
    : undefined;

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

    if (!doctorId) {
      toast.error("Please select a doctor");
      return;
    }

    // Validate payment reference if required
    if ((paymentMethod === "upi" || paymentMethod === "card" || paymentMethod === "cheque") && !paymentReference.trim()) {
      toast.error(`Please enter payment reference for ${paymentMethod.toUpperCase()}`);
      return;
    }

    setIsCreating(true);
    try {
      // Create OPD visit using the API
      const visitRequest: CreateVisitRequest = {
        patient_id: selectedPatient.id,
        doctor_id: doctorId, // Required
        visit_type: isEmergency ? "emergency" : "walk_in",
        chief_complaint: symptoms.trim() || null,
        notes: null,
        payment_method: paymentMethod as any,
        payment_reference: paymentReference.trim() || null,
        consultation_fee: consultationFee ? parseFloat(consultationFee) : null,
        consultation_fee_override: feeOverride && parseFloat(feeOverride) > 0 ? parseFloat(feeOverride) : null,
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
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Patient Selection Section */}
      {!hidePatientSearch && (
        <div ref={searchRef} className="space-y-2">
          <label className="space-y-1">
            <span className="text-slate-600 flex items-center gap-1 text-xs">
              Patient <span className="text-rose-500">*</span>
            </span>
            <div className="relative">
              <div className="relative flex items-center">
                <Search className="absolute left-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={dropdownSearchTerm}
                  onChange={(e) => {
                    const value = e.target.value;
                    setDropdownSearchTerm(value);
                    // Clear selected patient if user is typing a different value
                    if (selectedPatientData && value !== selectedPatientData.name) {
                      setSelectedPatientData(null);
                      setPatientId("");
                    }
                    // Only show dropdown if we have results or are searching, or if user is typing
                    if (value.trim().length >= 2) {
                      setShowDropdown(true);
                    } else {
                      setShowDropdown(false);
                    }
                  }}
                  onFocus={() => {
                    // Show dropdown if we have results or user has typed at least 2 characters
                    if (dropdownResults.length > 0 || dropdownSearchTerm.trim().length >= 2) {
                      setShowDropdown(true);
                    }
                  }}
                  placeholder="Search patient by name, mobile, or Health ID"
                  className="w-full rounded-lg border border-slate-200 bg-white pl-10 pr-10 py-1.5 text-sm outline-none focus:border-sky-400"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenPatientModal) {
                      onOpenPatientModal();
                    }
                  }}
                  className="absolute right-2 flex h-7 w-7 items-center justify-center rounded border border-slate-200 bg-white text-slate-600 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
                  title="Add New Patient"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
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
                <div className="mt-1.5 rounded border border-sky-200 bg-sky-50 px-2 py-1">
                  <p className="text-xs font-medium text-sky-700">
                    Selected: {patients.find((p) => p.id === patientId)?.name || "Patient"}
                  </p>
                </div>
              )}
            </label>
        </div>
      )}

      {hidePatientSearch && selectedPatient && (
        <div className="rounded border border-slate-200 bg-slate-50 px-2.5 py-1.5">
          <div className="flex items-center gap-2">
            <User className="h-3.5 w-3.5 text-sky-600" />
            <div>
              <p className="text-xs font-semibold text-slate-900">{selectedPatient.name}</p>
              <p className="text-xs text-slate-500">
                {selectedPatient.healthId} • {selectedPatient.mobile}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Doctor, Emergency & Fee Section - All in one row */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <label className="space-y-1">
          <span className="text-slate-600 text-xs">Doctor <span className="text-rose-500">*</span></span>
          <select
            value={doctorId}
            onChange={(e) => setDoctorId(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-sky-400"
            disabled={doctorsLoading || doctors.length === 0}
            required
          >
            <option value="" disabled>Select doctor</option>
            {doctorsLoading ? (
              <option>Loading...</option>
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

        {/* Emergency Checkbox - Compact */}
        <label className="space-y-1">
          <span className="text-slate-600 text-xs">Visit Type</span>
          <div className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 transition hover:border-rose-200 hover:bg-rose-50/30">
            <input
              type="checkbox"
              id="emergency"
              checked={isEmergency}
              onChange={(e) => setIsEmergency(e.target.checked)}
              className="h-4 w-4 rounded border-2 border-slate-300 text-rose-500 focus:ring-1 focus:ring-rose-500"
            />
            <AlertCircle className={`h-4 w-4 ${isEmergency ? 'text-rose-600' : 'text-slate-400'}`} />
            <span className={`text-xs font-medium ${isEmergency ? 'text-rose-600' : 'text-slate-600'}`}>
              Emergency
            </span>
          </div>
        </label>

        {/* Consultation Fee - Compact */}
        <label className="space-y-1">
          <span className="text-slate-600 text-xs">Consultation Fee</span>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5">
            {isCalculatingFee ? (
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-sky-500 border-t-transparent"></div>
                <span className="text-xs text-slate-500">Calculating...</span>
              </div>
            ) : consultationFee ? (
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-900">{currency(parseFloat(consultationFee))}</span>
                {feeCalculation && (
                  <span className="text-xs text-slate-500">
                    {feeCalculation.patient_type_used} • {feeCalculation.shift}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-xs text-slate-500">—</span>
            )}
          </div>
          {selectedDoctor && (
            <div className="mt-1 flex items-center gap-1">
              <input
                type="number"
                step="0.01"
                min="0"
                value={feeOverride}
                onChange={(e) => setFeeOverride(e.target.value)}
                placeholder="Override (optional)"
                className="flex-1 rounded border border-slate-200 bg-white px-2 py-1 text-xs outline-none focus:border-sky-400"
              />
              {feeOverride && (
                <button
                  type="button"
                  onClick={() => setFeeOverride("")}
                  className="rounded border border-slate-200 bg-white px-1.5 py-1 text-xs text-slate-500 hover:bg-slate-50"
                  title="Clear override"
                >
                  ×
                </button>
              )}
            </div>
          )}
          {feeOverride && parseFloat(feeOverride) > 0 && (
            <div className="mt-1 rounded bg-teal-50 border border-teal-200 px-2 py-1">
              <span className="text-xs font-semibold text-teal-700">
                Override: {currency(parseFloat(feeOverride))}
              </span>
            </div>
          )}
        </label>
      </div>
      {/* Payment & Symptoms - Combined Row */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <label className="space-y-1">
            <span className="text-slate-600 text-xs">
              Payment Method <span className="text-rose-500">*</span>
            </span>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as any)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-sky-400"
              required
            >
              <option value="" disabled>Select method</option>
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="card">Card</option>
              <option value="cheque">Cheque</option>
            </select>
          </label>
          {(paymentMethod === "upi" || paymentMethod === "card" || paymentMethod === "cheque") && (
            <label className="space-y-1">
              <span className="text-slate-600 text-xs">
                Payment Reference <span className="text-rose-500">*</span>
              </span>
              <input
                type="text"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-sky-400"
                placeholder={paymentMethod === "upi" ? "UPI transaction ID" : paymentMethod === "card" ? "Card transaction ID" : "Cheque number"}
                required
              />
            </label>
          )}
        </div>
        <label className="space-y-1">
          <span className="text-slate-600 text-xs">Chief Complaint / Symptoms</span>
          <textarea
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-sky-400"
            placeholder="Enter chief complaint or symptoms (optional)"
          />
        </label>
      </div>
      {/* Action Buttons */}
      <div className="flex justify-end gap-2 pt-2">
        {!createdVisitId ? (
          <button
            type="submit"
            disabled={isCreating}
            className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? (
              <>
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                Creating...
              </>
            ) : (
              <>
                <Plus className="h-3.5 w-3.5" />
                Create OPD Visit
              </>
            )}
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
                setDoctorId("");
                setPatientId("");
                setDropdownSearchTerm("");
                setDropdownResults([]);
                setShowDropdown(false);
                setSelectedPatientData(null);
                setSymptoms("");
                setPaymentMethod("");
                setPaymentReference("");
                setShouldPrint(false);
                setConsultationFee(null);
                setFeeCalculation(null);
                setFeeOverride("");
                setIsEmergency(false);
                justSelectedRef.current = false;
              }}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <Plus className="h-3.5 w-3.5" />
              Create Another
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:shadow"
            >
              <Printer className="h-3.5 w-3.5" />
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

