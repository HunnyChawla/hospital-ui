"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { useReactToPrint } from "react-to-print";
import { toast } from "sonner";
import { Printer, Plus, Search, User, Stethoscope, CreditCard, AlertCircle, FileText, Smartphone, Banknote, IndianRupee } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { fetchDoctors } from "@/redux/doctorsSlice";
import { Patient } from "@/types";
import { OpdSlipPrint } from "./OpdSlipPrint";
import { opdVisitsApi, CreateVisitRequest, Visit } from "@/services/opdVisitsApi";
import { prescriptionsApi } from "@/services/prescriptionsApi";
import { useCreateOpdVisit } from "@/hooks/queries/useOpdVisits";
import { patientsApi } from "@/services/patientsApi";
import { doctorsApi, ConsultationFeeCalculation } from "@/services/doctorsApi";
import { getErrorMessage } from "@/utils/errorHandler";
import { getTenantIdForApi } from "@/utils/auth";
import { currency } from "@/utils/format";

interface OpdFormProps {
  defaultPatientId?: string;
  hidePatientSearch?: boolean;
  onSuccess?: () => void;
  onOpenPatientModal?: () => void;
}

export function OpdForm({ defaultPatientId, hidePatientSearch = false, onSuccess, onOpenPatientModal }: OpdFormProps = {} as OpdFormProps) {
  const dispatch = useAppDispatch();
  const createOpdVisit = useCreateOpdVisit();
  const patients = useAppSelector((s) => s.patients.list);
  const queue = useAppSelector((s) => s.queue.entries);
  const doctors = useAppSelector((s) => s.doctors.list);
  const doctorsLoading = useAppSelector((s) => s.doctors.loading);

  const [doctorId, setDoctorId] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("last_selected_doctor_id") || "";
    }
    return "";
  });
  const [symptoms, setSymptoms] = useState("");
  const [patientId, setPatientId] = useState(defaultPatientId || "");
  const [term, setTerm] = useState("");
  const [dropdownSearchTerm, setDropdownSearchTerm] = useState("");
  const [dropdownResults, setDropdownResults] = useState<Patient[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedPatientData, setSelectedPatientData] = useState<Patient | null>(null);

  // Save selected doctor to local storage
  useEffect(() => {
    if (doctorId && typeof window !== "undefined") {
      localStorage.setItem("last_selected_doctor_id", doctorId);
    }
  }, [doctorId]);
  const [opdNumber, setOpdNumber] = useState("");
  const [tokenNumber, setTokenNumber] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<"" | "cash" | "upi" | "card" | "cheque">("");
  const [paymentReference, setPaymentReference] = useState("");
  const [createdVisitId, setCreatedVisitId] = useState<string | null>(null);
  const [visitData, setVisitData] = useState<Visit | null>(null);
  const [prescription, setPrescription] = useState<{
    prescription_number: string;
    diagnosis: string | null;
    items: Array<{
      medicine_name: string;
      dosage: string | null;
      frequency: string | null;
      duration: string | null;
      instructions: string | null;
    }>;
    doctor_name: string;
  } | undefined>(undefined);
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
  const abortControllerRef = useRef<AbortController | null>(null);

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
    // Abort any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    const calculateFee = async () => {
      if (!doctorId || !patientId) {
        setConsultationFee(null);
        setFeeCalculation(null);
        setIsCalculatingFee(false);
        return;
      }

      // Create new AbortController for this request
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      setIsCalculatingFee(true);
      try {
        const calculation = await doctorsApi.calculateConsultationFee(doctorId, patientId, isEmergency, undefined, abortController.signal);

        // Only update state if request wasn't aborted and this is still the current request
        if (!abortController.signal.aborted && abortControllerRef.current === abortController) {
          setFeeCalculation(calculation);
          setConsultationFee(calculation.consultation_fee);
          setIsCalculatingFee(false);
        }
      } catch (error: any) {
        // Ignore aborted requests
        if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
          return;
        }
        console.error("Failed to calculate consultation fee:", error);

        // Only update state if request wasn't aborted and this is still the current request
        if (!abortController.signal.aborted && abortControllerRef.current === abortController) {
          setConsultationFee(null);
          setFeeCalculation(null);
          setIsCalculatingFee(false);
        }
        // Don't show error toast as this is a background operation
      }
    };

    // Debounce the calculation
    const timeoutId = setTimeout(calculateFee, 300);
    return () => {
      clearTimeout(timeoutId);
      // Abort request on cleanup
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
        setIsCalculatingFee(false);
      }
    };
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
      const { patientId: newPatientId, patient } = event.detail;

      if (patient) {
        setPatientId(patient.id);
        setDropdownSearchTerm(patient.name);
        setSelectedPatientData(patient);
        setShowDropdown(false);
        setDropdownResults([]);
        toast.success("Patient added and selected");
        return;
      }

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

    const feeAmount = feeOverride && parseFloat(feeOverride) >= 0
      ? parseFloat(feeOverride)
      : (consultationFee ? parseFloat(consultationFee) : 0);

    // Validate payment reference only if fee > 0 since we hide payment method when fee is 0
    if (feeAmount > 0 && (paymentMethod === "upi" || paymentMethod === "card" || paymentMethod === "cheque") && !paymentReference.trim()) {
      toast.error(`Please enter payment reference for ${paymentMethod.toUpperCase()}`);
      return;
    }

    setIsCreating(true);
    try {
      // Create OPD visit using React Query mutation for automatic cache invalidation
      const visitRequest: CreateVisitRequest = {
        patient_id: selectedPatient.id,
        doctor_id: doctorId, // Required
        visit_type: isEmergency ? "emergency" : "walk_in",
        chief_complaint: symptoms.trim() || null,
        notes: null,
        // If fee is 0, default to cash as payment method is not shown
        payment_method: (feeAmount === 0 && !paymentMethod) ? "cash" : (paymentMethod as any),
        payment_reference: paymentReference.trim() || null,
        consultation_fee: consultationFee ? parseFloat(consultationFee) : null,
        consultation_fee_override: feeOverride && parseFloat(feeOverride) >= 0 ? parseFloat(feeOverride) : null,
      };

      const visit = await createOpdVisit.mutateAsync(visitRequest);

      // Store visit ID for later fetching
      setCreatedVisitId(visit.id);
      setOpdNumber(visit.visit_number);
      setTokenNumber(visit.token_number || 0);

      // Success toast is shown by the mutation's onSuccess callback
    } catch (error: any) {
      // Error toast is shown by the mutation's onError callback
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

      // Fetch finalized prescription for this visit (if exists)
      let prescriptionData = undefined;
      try {
        const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
        const prescriptions = await prescriptionsApi.list({
          visit_id: createdVisitId,
          status: "finalized",
          page_size: 1,
          tenant_id: tenantId || undefined,
        });

        if (prescriptions.items.length > 0) {
          const rxData = prescriptions.items[0];
          prescriptionData = {
            prescription_number: rxData.prescription_number,
            diagnosis: rxData.diagnosis,
            items: rxData.items.map(item => ({
              medicine_name: item.medicine_name,
              dosage: item.dosage,
              frequency: item.frequency,
              duration: item.duration,
              instructions: item.instructions,
            })),
            doctor_name: rxData.doctor_name,
          };
        }
      } catch (error) {
        // Continue without prescription if fetch fails
        console.warn("Failed to fetch prescription for OPD slip:", error);
      }

      // Set prescription state
      setPrescription(prescriptionData);

      // Set shouldPrint flag and visitData - this will trigger the useEffect to print
      setShouldPrint(true);
      setVisitData(visit);
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Patient Selection Section */}
      {!hidePatientSearch && (
        <div ref={searchRef} className="space-y-1.5">
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
              <User className="h-4 w-4 text-sky-600" />
              Patient <span className="text-rose-500">*</span>
            </span>
            <div className="relative">
              <div className="relative flex items-center">
                <Search className="absolute left-3.5 h-4.5 w-4.5 text-slate-400" />
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
                  placeholder="Search by name, mobile number, or Health ID..."
                  className="w-full rounded-lg border border-slate-200 bg-white pl-11 pr-12 py-2 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenPatientModal) {
                      onOpenPatientModal();
                    }
                  }}
                  className="absolute right-2 flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-sky-400 hover:bg-sky-50 hover:text-sky-700 hover:shadow-sm"
                  title="Add New Patient"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              {showDropdown && (dropdownResults.length > 0 || isSearching) && (
                <div className="absolute z-50 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-xl max-h-56 overflow-y-auto scrollbar-hide">
                  {isSearching ? (
                    <div className="p-4 text-center">
                      <div className="inline-flex items-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-sky-500 border-t-transparent"></div>
                        <span className="text-sm text-slate-600">Searching patients...</span>
                      </div>
                    </div>
                  ) : dropdownResults.length > 0 ? (
                    dropdownResults.map((patient) => (
                      <button
                        key={patient.id}
                        type="button"
                        onClick={() => handlePatientSelect(patient)}
                        className="w-full border-b border-slate-100 px-3 py-2.5 text-left transition hover:bg-sky-50 last:border-b-0"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                            <User className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-900 text-sm truncate">{patient.name}</p>
                            <div className="mt-0.5 flex flex-col gap-0.5">
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-600">
                                <span>{patient.mobile}</span>
                                <span className="text-slate-300">•</span>
                                <span>{patient.healthId}</span>
                                <span className="text-slate-300">•</span>
                                <span>{patient.age}y, {patient.gender}</span>
                              </div>
                              {(patient.address || patient.city) && (
                                <div className="text-xs text-slate-400 truncate">
                                  {[patient.address, patient.city, patient.state, patient.pincode].filter(Boolean).join(", ")}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="p-4 text-center text-sm text-slate-500">No patients found</div>
                  )}
                </div>
              )}
            </div>
            {patientId && selectedPatient && (
              <div className="mt-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{selectedPatient.name}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-600">
                      <span>{selectedPatient.healthId}</span>
                      <span>•</span>
                      <span>{selectedPatient.mobile}</span>
                      <span>•</span>
                      <span>{selectedPatient.age}y, {selectedPatient.gender}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </label>
        </div>
      )}

      {hidePatientSearch && selectedPatient && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 text-sky-700">
              <User className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900">{selectedPatient.name}</p>
              <p className="text-xs text-slate-600 mt-0.5">
                {selectedPatient.healthId} • {selectedPatient.mobile}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Doctor & Visit Type */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="space-y-1.5">
          <span className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
            <Stethoscope className="h-4 w-4 text-teal-600" />
            Doctor <span className="text-rose-500">*</span>
          </span>
          <select
            value={doctorId}
            onChange={(e) => setDoctorId(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 pr-4 py-2 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-50 disabled:cursor-not-allowed"
            disabled={doctorsLoading || doctors.length === 0}
            required
          >
            <option value="" disabled>Select a doctor</option>
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

        {/* Emergency Checkbox */}
        <div className="space-y-1.5">
          <span className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
            <AlertCircle className="h-4 w-4 text-rose-600" />
            Visit Type
          </span>
          <label
            htmlFor="emergency"
            className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 cursor-pointer transition ${isEmergency
              ? "border-rose-300 bg-rose-50"
              : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
          >
            <input
              type="checkbox"
              id="emergency"
              checked={isEmergency}
              onChange={(e) => setIsEmergency(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-rose-500 focus:ring-2 focus:ring-rose-500"
            />
            <span className={`text-sm font-medium flex-1 ${isEmergency ? "text-rose-700" : "text-slate-700"}`}>
              Emergency Visit
            </span>
          </label>
        </div>
      </div>

      {/* Consultation Fee */}
      <div className="space-y-1.5">
        <span className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
          <IndianRupee className="h-4 w-4 text-teal-600" />
          Consultation Fee
        </span>
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1">
              {isCalculatingFee ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-sky-500 border-t-transparent"></div>
                  <span className="text-sm text-slate-600">Calculating...</span>
                </div>
              ) : consultationFee ? (
                <div>
                  <span className="text-xl font-bold text-slate-900">{currency(parseFloat(consultationFee))}</span>
                   {feeCalculation && (
                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-600">
                      <span>{feeCalculation.patient_category_used || "General"}</span>
                      <span>•</span>
                      <span>{feeCalculation.patient_type_used}</span>
                      <span>•</span>
                      <span>{feeCalculation.shift}</span>
                      {feeCalculation.is_revisit && (
                        <>
                          <span>•</span>
                          <span className="font-medium text-emerald-600">Revisit</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <span className="text-sm text-slate-500">Auto-calculated</span>
              )}
            </div>
            {selectedDoctor && (
              <input
                type="number"
                step="0.01"
                min="0"
                value={feeOverride}
                onChange={(e) => setFeeOverride(e.target.value)}
                placeholder="Override"
                className="w-24 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              />
            )}
          </div>
          {feeOverride && parseFloat(feeOverride) > 0 && (
            <div className="mt-2 flex items-center justify-between rounded border border-teal-200 bg-teal-50 px-2.5 py-1.5">
              <span className="text-xs font-medium text-teal-800">
                Override: {currency(parseFloat(feeOverride))}
              </span>
              <button
                type="button"
                onClick={() => setFeeOverride("")}
                className="text-xs text-teal-700 hover:text-teal-900"
              >
                ×
              </button>
            </div>
          )}
        </div>
      </div>
      {/* Payment Method - Only show if fee > 0 */}
      {(() => {
        const feeAmount = feeOverride && parseFloat(feeOverride) >= 0
          ? parseFloat(feeOverride)
          : (consultationFee ? parseFloat(consultationFee) : 0);

        if (feeAmount === 0) return null;

        return (
          <div className="space-y-1.5">
            <span className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
              <CreditCard className="h-4 w-4 text-emerald-600" />
              Payment Method <span className="text-rose-500">*</span>
            </span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {/* Cash */}
              <label
                className={`
                  flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border px-2 py-2.5 text-center transition-all
                  ${paymentMethod === "cash"
                    ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                  }
                `}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="cash"
                  checked={paymentMethod === "cash"}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="sr-only"
                  required={feeAmount > 0}
                />
                <Banknote className={`h-5 w-5 ${paymentMethod === "cash" ? "text-emerald-600" : "text-slate-400"}`} />
                <span className={`text-xs font-medium ${paymentMethod === "cash" ? "text-emerald-700" : "text-slate-600"}`}>
                  Cash
                </span>
              </label>

              {/* UPI */}
              <label
                className={`
                  flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border px-2 py-2.5 text-center transition-all
                  ${paymentMethod === "upi"
                    ? "border-violet-500 bg-violet-50 ring-2 ring-violet-200"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                  }
                `}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="upi"
                  checked={paymentMethod === "upi"}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="sr-only"
                  required={feeAmount > 0}
                />
                <Smartphone className={`h-5 w-5 ${paymentMethod === "upi" ? "text-violet-600" : "text-slate-400"}`} />
                <span className={`text-xs font-medium ${paymentMethod === "upi" ? "text-violet-700" : "text-slate-600"}`}>
                  UPI
                </span>
              </label>

              {/* Card */}
              <label
                className={`
                  flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border px-2 py-2.5 text-center transition-all
                  ${paymentMethod === "card"
                    ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                  }
                `}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="card"
                  checked={paymentMethod === "card"}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="sr-only"
                  required={feeAmount > 0}
                />
                <CreditCard className={`h-5 w-5 ${paymentMethod === "card" ? "text-blue-600" : "text-slate-400"}`} />
                <span className={`text-xs font-medium ${paymentMethod === "card" ? "text-blue-700" : "text-slate-600"}`}>
                  Card
                </span>
              </label>

              {/* Cheque */}
              <label
                className={`
                  flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border px-2 py-2.5 text-center transition-all
                  ${paymentMethod === "cheque"
                    ? "border-amber-500 bg-amber-50 ring-2 ring-amber-200"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                  }
                `}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="cheque"
                  checked={paymentMethod === "cheque"}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="sr-only"
                  required={feeAmount > 0}
                />
                <FileText className={`h-5 w-5 ${paymentMethod === "cheque" ? "text-amber-600" : "text-slate-400"}`} />
                <span className={`text-xs font-medium ${paymentMethod === "cheque" ? "text-amber-700" : "text-slate-600"}`}>
                  Cheque
                </span>
              </label>
            </div>
            {(paymentMethod === "upi" || paymentMethod === "card" || paymentMethod === "cheque") && (
              <input
                type="text"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                placeholder={
                  paymentMethod === "upi"
                    ? "Enter UPI transaction ID"
                    : paymentMethod === "card"
                      ? "Enter card transaction ID"
                      : "Enter cheque number"
                }
                required
              />
            )}
          </div>
        );
      })()}

      {/* Chief Complaint */}
      <div className="space-y-1.5">
        <span className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
          <FileText className="h-4 w-4 text-purple-600" />
          Chief Complaint <span className="text-slate-500 text-xs font-normal">(optional)</span>
        </span>
        <textarea
          value={symptoms}
          onChange={(e) => setSymptoms(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100 resize-none"
          placeholder="Enter patient symptoms or complaints..."
        />
      </div>
      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
        {!createdVisitId ? (
          <button
            type="submit"
            disabled={isCreating}
            className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-sky-500 to-teal-500 px-5 py-2.5 text-sm font-semibold text-white shadow transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                <span>Creating...</span>
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                <span>Create Visit</span>
              </>
            )}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // Reset form fields and unselect the patient
                setCreatedVisitId(null);
                setVisitData(null);
                setOpdNumber("");
                setTokenNumber(0);
                // Unselect patient
                setPatientId("");
                setSelectedPatientData(null);
                setDropdownSearchTerm("");
                setDropdownResults([]);
                setShowDropdown(false);
                // Reset remaining form fields
                setSymptoms("");
                setPaymentMethod("");
                setPaymentReference("");
                setShouldPrint(false);
                setConsultationFee(null);
                setFeeCalculation(null);
                setFeeOverride("");
                setIsEmergency(false);
              }}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <Plus className="h-4 w-4" />
              Create Another
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-sky-500 to-teal-500 px-3 py-2 text-sm font-semibold text-white shadow transition hover:shadow-lg"
            >
              <Printer className="h-4 w-4" />
              Print
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
              prescription={prescription}
            />
          </div>
        </div>
      )}
    </form>
  );
}

