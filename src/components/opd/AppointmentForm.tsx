"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { searchPatients } from "@/redux/patientsSlice";
import { fetchDoctors } from "@/redux/doctorsSlice";
import { appointmentsApi, CreateAppointmentRequest } from "@/services/appointmentsApi";
import { patientsApi } from "@/services/patientsApi";
import { Patient } from "@/types";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { getTodayDateLocal } from "@/utils/format";
import { Calendar, Search, User, Stethoscope, Plus } from "lucide-react";

interface AppointmentFormProps {
  defaultPatientId?: string;
  hidePatientSearch?: boolean;
  showDropdownSearch?: boolean;
  onSuccess?: () => void;
  onOpenPatientModal?: () => void;
}

export function AppointmentForm({
  defaultPatientId,
  hidePatientSearch = false,
  showDropdownSearch = false,
  onSuccess,
  onOpenPatientModal
}: AppointmentFormProps) {
  const dispatch = useAppDispatch();
  const patients = useAppSelector((s) => s.patients.list);
  const doctors = useAppSelector((s) => s.doctors.list);
  const doctorsLoading = useAppSelector((s) => s.doctors.loading);

  // Only active doctors should be selectable for appointments
  const activeDoctors = useMemo(() => {
    return doctors.filter((d) => d.is_active !== false && d.status !== "inactive");
  }, [doctors]);

  const [patientId, setPatientId] = useState(defaultPatientId || "");
  const [doctorId, setDoctorId] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("last_selected_doctor_id") || "";
    }
    return "";
  });
  const [appointmentDate, setAppointmentDate] = useState("");
  const [notes, setNotes] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [dropdownSearchTerm, setDropdownSearchTerm] = useState("");
  const [dropdownResults, setDropdownResults] = useState<Patient[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedPatientData, setSelectedPatientData] = useState<Patient | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const previousPatientsCount = useRef(patients.length);
  const justSelectedRef = useRef(false);

  useEffect(() => {
    if (doctors.length === 0 && !doctorsLoading) {
      dispatch(fetchDoctors());
    }
  }, [dispatch, doctors.length, doctorsLoading]);

  // Save selected doctor to local storage
  useEffect(() => {
    if (doctorId && typeof window !== "undefined") {
      localStorage.setItem("last_selected_doctor_id", doctorId);
    }
  }, [doctorId]);

  // Reset selected doctor if it is inactive once doctors list is loaded
  useEffect(() => {
    if (!doctorsLoading && doctors.length > 0 && doctorId) {
      const isDoctorActive = activeDoctors.some((d) => d.id === doctorId);
      if (!isDoctorActive) {
        setDoctorId("");
        if (typeof window !== "undefined") {
          localStorage.removeItem("last_selected_doctor_id");
        }
      }
    }
  }, [doctorsLoading, doctors.length, doctorId, activeDoctors]);

  // Do not auto-select the first doctor; require explicit user choice to avoid
  // submitting an unintended doctor. This prevents the form from silently
  // resetting to the first doctor in the list.
  useEffect(() => {
    if (doctorId && doctors.length === 0 && !doctorsLoading) {
      // Clear stale selection if list empties (e.g., refetch) and loading is finished
      setDoctorId("");
    }
  }, [doctors.length, doctorId, doctorsLoading]);

  useEffect(() => {
    // Set default date to today
    const today = getTodayDateLocal();
    setAppointmentDate(today);
  }, []);

  useEffect(() => {
    // Update patientId when defaultPatientId changes
    if (defaultPatientId) {
      setPatientId(defaultPatientId);
    }
  }, [defaultPatientId]);

  // Dropdown search effect
  useEffect(() => {
    // Check against selectedPatientData or Redux store
    const selectedName = (selectedPatientData && selectedPatientData.id === patientId)
      ? selectedPatientData.name
      : patients.find(p => p.id === patientId)?.name;

    // Don't search if we just selected a patient or if a patient is already selected
    if (justSelectedRef.current || (patientId && dropdownSearchTerm === selectedName)) {
      return;
    }

    if (showDropdownSearch && dropdownSearchTerm.trim().length >= 2) {
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
    } else if (showDropdownSearch && dropdownSearchTerm.trim().length < 2) {
      setDropdownResults([]);
      setShowDropdown(false);
    }
  }, [dropdownSearchTerm, showDropdownSearch, patientId, patients]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!showDropdownSearch) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showDropdownSearch]);

  const filteredPatients = patients.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.mobile.includes(searchTerm) ||
    p.healthId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePatientSelect = (patient: Patient) => {
    justSelectedRef.current = true;
    setPatientId(patient.id);
    setDropdownSearchTerm(patient.name);
    setSelectedPatientData(patient);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const selectedPatientId = patientId || defaultPatientId;
    if (!selectedPatientId) {
      toast.error("Please select a patient");
      return;
    }

    if (!doctorId) {
      toast.error("Please select a doctor");
      return;
    }

    if (!appointmentDate) {
      toast.error("Please select an appointment date");
      return;
    }

    // Validate date is not in the past
    const selectedDate = new Date(appointmentDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      toast.error("Appointment date cannot be in the past");
      return;
    }

    try {
      const appointmentData: CreateAppointmentRequest = {
        patient_id: selectedPatientId,
        doctor_id: doctorId,
        appointment_date: appointmentDate,
        appointment_time: "", // Empty string - time not required
        notes: notes.trim() || undefined,
      };

      const appointment = await appointmentsApi.create(appointmentData);
      toast.success(`Appointment created successfully! Token #${appointment.token_number}`);

      // Dispatch custom event to refresh appointments list
      window.dispatchEvent(new CustomEvent("appointment:created"));

      // Reset form
      setPatientId("");
      setNotes("");
      setSearchTerm("");
      setDropdownSearchTerm("");

      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Patient Selection Section */}
      {showDropdownSearch && (
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
                    if (value.trim().length >= 2) {
                      setShowDropdown(true);
                    } else {
                      setShowDropdown(false);
                    }
                  }}
                  onFocus={() => {
                    if (dropdownResults.length > 0 || dropdownSearchTerm.trim().length >= 2) {
                      setShowDropdown(true);
                    }
                  }}
                  placeholder="Search by name, mobile, or Health ID..."
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
                <div className="absolute z-50 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-xl max-h-56 overflow-y-auto">
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
            {(patientId || defaultPatientId) && (
              <div className="mt-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900">
                      {(selectedPatientData && selectedPatientData.id === (patientId || defaultPatientId))
                        ? selectedPatientData.name
                        : patients.find((p) => p.id === (patientId || defaultPatientId))?.name || "Patient"}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-600">
                      {(() => {
                        const p = (selectedPatientData && selectedPatientData.id === (patientId || defaultPatientId))
                          ? selectedPatientData
                          : patients.find((p) => p.id === (patientId || defaultPatientId));
                        if (!p) return null;
                        return (
                          <>
                            <span>{p.healthId}</span>
                            <span>•</span>
                            <span>{p.mobile}</span>
                            <span>•</span>
                            <span>{p.age}y, {p.gender}</span>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </label>
        </div>
      )}

      {hidePatientSearch && (patientId || defaultPatientId) && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 text-sky-700">
              <User className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900">
                {(selectedPatientData && selectedPatientData.id === (patientId || defaultPatientId))
                  ? selectedPatientData.name
                  : patients.find((p) => p.id === (patientId || defaultPatientId))?.name || "Patient"}
              </p>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-600">
                {(() => {
                  const p = (selectedPatientData && selectedPatientData.id === (patientId || defaultPatientId))
                    ? selectedPatientData
                    : patients.find((p) => p.id === (patientId || defaultPatientId));
                  if (!p) return null;
                  return (
                    <>
                      <span>{p.healthId}</span>
                      <span>•</span>
                      <span>{p.mobile}</span>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Doctor & Date Section */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="space-y-1.5">
          <span className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
            <Stethoscope className="h-4 w-4 text-teal-600" />
            Doctor <span className="text-rose-500">*</span>
          </span>
          <select
            value={doctorId}
            onChange={(e) => setDoctorId(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-50"
            disabled={doctorsLoading || activeDoctors.length === 0}
            required
          >
            <option value="">Select doctor</option>
            {doctorsLoading ? (
              <option>Loading doctors...</option>
            ) : activeDoctors.length === 0 ? (
              <option>No doctors available</option>
            ) : (
              activeDoctors.map((doc) => {
                const doctorName = doc.name || doc.user_name || `Dr. ${doc.specialization}`;
                return (
                  <option key={doc.id} value={doc.id}>
                    {doctorName} - {doc.specialization}
                  </option>
                );
              })
            )}
          </select>
        </label>

        <label className="space-y-1.5">
          <span className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-indigo-600" />
            Appointment Date <span className="text-rose-500">*</span>
          </span>
          <input
            type="date"
            value={appointmentDate}
            onChange={(e) => setAppointmentDate(e.target.value)}
            min={getTodayDateLocal()}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            required
          />
        </label>
      </div>

      <label className="space-y-1.5 block">
        <span className="text-sm font-medium text-slate-700">Notes</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
          placeholder="Add any specific instructions or requirements..."
        />
      </label>

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => {
            setPatientId("");
            setDoctorId("");
            setNotes("");
            setSearchTerm("");
            setDropdownSearchTerm("");
            setSelectedPatientData(null);
          }}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
        >
          Reset Form
        </button>
        <button
          type="submit"
          className="rounded-lg bg-gradient-to-r from-sky-500 to-teal-500 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow-md active:scale-[0.98]"
        >
          Create Appointment
        </button>
      </div>
    </form>
  );
}

