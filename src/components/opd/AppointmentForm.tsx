"use client";

import { useState, useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { searchPatients } from "@/redux/patientsSlice";
import { fetchDoctors } from "@/redux/doctorsSlice";
import { appointmentsApi, CreateAppointmentRequest } from "@/services/appointmentsApi";
import { patientsApi } from "@/services/patientsApi";
import { Patient } from "@/types";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { Calendar, Clock, Search, User, Stethoscope, Plus } from "lucide-react";

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

  const [patientId, setPatientId] = useState(defaultPatientId || "");
  const [doctorId, setDoctorId] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("");
  const [notes, setNotes] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [dropdownSearchTerm, setDropdownSearchTerm] = useState("");
  const [dropdownResults, setDropdownResults] = useState<Patient[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const previousPatientsCount = useRef(patients.length);
  const justSelectedRef = useRef(false);

  useEffect(() => {
    if (doctors.length === 0 && !doctorsLoading) {
      dispatch(fetchDoctors());
    }
  }, [dispatch, doctors.length, doctorsLoading]);

  useEffect(() => {
    // Set default doctor when doctors are loaded
    if (doctors.length > 0 && !doctorId) {
      setDoctorId(doctors[0].id);
    }
  }, [doctors, doctorId]);

  useEffect(() => {
    // Set default date to today
    const today = new Date().toISOString().split("T")[0];
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
    // Don't search if we just selected a patient or if a patient is already selected
    if (justSelectedRef.current || (patientId && dropdownSearchTerm === patients.find(p => p.id === patientId)?.name)) {
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

    if (!appointmentTime) {
      toast.error("Please select an appointment time");
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
      // Convert time from HH:MM to HH:MM:SS format
      const timeFormatted = appointmentTime ? `${appointmentTime}:00` : "";
      
      const appointmentData: CreateAppointmentRequest = {
        patient_id: selectedPatientId,
        doctor_id: doctorId,
        appointment_date: appointmentDate,
        appointment_time: timeFormatted,
        notes: notes.trim() || undefined,
      };

      const appointment = await appointmentsApi.create(appointmentData);
      toast.success(`Appointment created successfully! Token #${appointment.token_number}`);
      
      // Dispatch custom event to refresh appointments list
      window.dispatchEvent(new CustomEvent("appointment:created"));
      
      // Reset form
      setPatientId("");
      setDoctorId("");
      setAppointmentTime("");
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
    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4 text-sm">
      {showDropdownSearch && (
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

      {!hidePatientSearch && !showDropdownSearch && (
        <>
          <div className="col-span-2 space-y-2 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-slate-500" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search patient by name, mobile, or Health ID"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
              />
            </div>
            <div className="text-xs text-slate-600">
              {filteredPatients.length} match{filteredPatients.length === 1 ? "" : "es"}
            </div>
          </div>

          <label className="space-y-1">
            <span className="text-slate-600 flex items-center gap-1">
              <User className="h-4 w-4" />
              Patient <span className="text-rose-500">*</span>
            </span>
            <select
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
              required
            >
              <option value="">Select patient</option>
              {filteredPatients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} • {p.healthId} • {p.mobile}
                </option>
              ))}
            </select>
          </label>
        </>
      )}

      {hidePatientSearch && (
        <div className="col-span-2">
          {(patientId || defaultPatientId) ? (
            <div className="rounded-xl border border-slate-200 bg-sky-50 p-3">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-sky-600" />
                <span className="font-semibold text-slate-900">
                  {patients.find((p) => p.id === (patientId || defaultPatientId))?.name || "Patient selected"}
                </span>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <div className="flex items-center gap-2 text-sm text-amber-700">
                <User className="h-4 w-4" />
                <span>Please select a patient from the global search above to create an appointment</span>
              </div>
            </div>
          )}
        </div>
      )}

      <label className="space-y-1">
        <span className="text-slate-600 flex items-center gap-1">
          <Stethoscope className="h-4 w-4" />
          Doctor <span className="text-rose-500">*</span>
        </span>
        <select
          value={doctorId}
          onChange={(e) => setDoctorId(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
          disabled={doctorsLoading || doctors.length === 0}
          required
        >
          <option value="">Select doctor</option>
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
        <span className="text-slate-600 flex items-center gap-1">
          <Calendar className="h-4 w-4" />
          Appointment Date <span className="text-rose-500">*</span>
        </span>
        <input
          type="date"
          value={appointmentDate}
          onChange={(e) => setAppointmentDate(e.target.value)}
          min={new Date().toISOString().split("T")[0]}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
          required
        />
      </label>

      <label className="space-y-1">
        <span className="text-slate-600 flex items-center gap-1">
          <Clock className="h-4 w-4" />
          Appointment Time <span className="text-rose-500">*</span>
        </span>
        <input
          type="time"
          value={appointmentTime}
          onChange={(e) => setAppointmentTime(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
          required
        />
      </label>

      <label className="col-span-2 space-y-1">
        <span className="text-slate-600">Notes</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
          placeholder="Additional notes (optional)"
        />
      </label>

      <div className="col-span-2 flex justify-end gap-3">
        <button
          type="button"
          onClick={() => {
            setPatientId("");
            setDoctorId("");
            setAppointmentTime("");
            setNotes("");
            setSearchTerm("");
            setDropdownSearchTerm("");
          }}
          className="rounded-xl border border-slate-200 px-4 py-2 text-slate-600 transition hover:border-slate-300"
        >
          Reset
        </button>
        <button
          type="submit"
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 font-semibold text-white shadow-sm hover:shadow"
        >
          Create Appointment
        </button>
      </div>
    </form>
  );
}

