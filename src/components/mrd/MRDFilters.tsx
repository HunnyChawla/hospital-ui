"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { MRDDocumentCategory } from "@/services/mrdApi";
import { patientsApi, PatientApiResponse } from "@/services/patientsApi";
import { Patient } from "@/types";
import { Search, X, Calendar, Loader2, User } from "lucide-react";

const DOCUMENT_CATEGORIES: { value: MRDDocumentCategory | ""; label: string }[] = [
  { value: "", label: "All Categories" },
  { value: "DISCHARGE_SUMMARY", label: "Discharge Summary" },
  { value: "LAB_REPORT", label: "Lab Report" },
  { value: "RADIOLOGY_REPORT", label: "Radiology Report" },
  { value: "PRESCRIPTION", label: "Prescription" },
  { value: "INSURANCE_DOCUMENT", label: "Insurance Document" },
  { value: "ID_PROOF", label: "ID Proof" },
  { value: "CONSENT_FORM", label: "Consent Form" },
  { value: "ADMISSION_FORM", label: "Admission Form" },
  { value: "MEDICAL_CERTIFICATE", label: "Medical Certificate" },
  { value: "IPD_REPORT", label: "IPD Report" },
  { value: "OPD_REPORT", label: "OPD Report" },
  { value: "PATHOLOGY_REPORT", label: "Pathology Report" },
  { value: "DIAGNOSTIC_REPORT", label: "Diagnostic Report" },
  { value: "SURGICAL_REPORT", label: "Surgical Report" },
  { value: "OTHER", label: "Other" },
];

interface MRDFiltersProps {
  patientId?: string;
  category?: MRDDocumentCategory;
  dateFrom?: string;
  dateTo?: string;
  onPatientChange: (patientId: string | undefined) => void;
  onCategoryChange: (category: MRDDocumentCategory | undefined) => void;
  onDateFromChange: (dateFrom: string | undefined) => void;
  onDateToChange: (dateTo: string | undefined) => void;
  defaultPatientId?: string;
}

export function MRDFilters({
  patientId,
  category,
  dateFrom,
  dateTo,
  onPatientChange,
  onCategoryChange,
  onDateFromChange,
  onDateToChange,
  defaultPatientId,
}: MRDFiltersProps) {
  const [dropdownSearchTerm, setDropdownSearchTerm] = useState("");
  const [dropdownResults, setDropdownResults] = useState<Patient[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedPatientData, setSelectedPatientData] = useState<Patient | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Map API response to Patient type
  const mapApiPatientToPatient = (apiPatient: PatientApiResponse): Patient => {
    const fullName = `${apiPatient.first_name} ${apiPatient.last_name || ""}`.trim();
    const gender = apiPatient.gender.charAt(0).toUpperCase() + apiPatient.gender.slice(1).toLowerCase();
    const today = new Date();
    const birthDate = new Date(apiPatient.date_of_birth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return {
      id: apiPatient.id,
      name: fullName,
      age,
      gender: (gender === "Male" || gender === "Female" ? gender : "Other") as "Male" | "Female" | "Other",
      mobile: apiPatient.mobile,
      healthId: apiPatient.uhid || apiPatient.abha_id || "",
      doctor: "",
      lastVisit: apiPatient.updated_at || apiPatient.created_at,
      outstanding: 0,
      status: "Active" as const,
    };
  };

  // Search patients
  const searchPatients = useCallback(async (searchTerm: string) => {
    if (searchTerm.trim().length < 2) {
      setDropdownResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
      const response = await patientsApi.searchGlobal({
        q: searchTerm.trim(),
        page: 1,
        page_size: 10,
        tenant_id: tenantId || undefined,
      });

      const patients = response.items.map(mapApiPatientToPatient);
      setDropdownResults(patients);
    } catch (error) {
      console.error("Failed to search patients:", error);
      setDropdownResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (dropdownSearchTerm.trim().length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        searchPatients(dropdownSearchTerm);
      }, 300);
    } else {
      setDropdownResults([]);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [dropdownSearchTerm, searchPatients]);

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

  // Load patient if defaultPatientId or patientId is provided
  useEffect(() => {
    const targetPatientId = defaultPatientId || patientId;
    if (targetPatientId && !selectedPatientData) {
      const loadPatient = async () => {
        try {
          const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
          const apiPatient = await patientsApi.getById(targetPatientId, tenantId || undefined);
          const patient = mapApiPatientToPatient(apiPatient);
          setSelectedPatientData(patient);
          setDropdownSearchTerm(patient.name);
          if (!patientId) {
            onPatientChange(patient.id);
          }
        } catch (error) {
          console.error("Failed to load patient:", error);
        }
      };
      loadPatient();
    }
  }, [defaultPatientId, patientId, selectedPatientData, onPatientChange]);

  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatientData(patient);
    setDropdownSearchTerm(patient.name);
    setShowDropdown(false);
    onPatientChange(patient.id);
  };

  const handleClearPatient = () => {
    setSelectedPatientData(null);
    setDropdownSearchTerm("");
    setDropdownResults([]);
    onPatientChange(undefined);
  };

  const handleClearFilters = () => {
    handleClearPatient();
    onCategoryChange(undefined);
    onDateFromChange(undefined);
    onDateToChange(undefined);
  };

  const hasActiveFilters = patientId || category || dateFrom || dateTo;

  const shouldShowDropdown = showDropdown && (isSearching || dropdownResults.length > 0 || dropdownSearchTerm.trim().length >= 2);

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Filters</h3>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleClearFilters}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
          >
            <X className="h-3 w-3" />
            Clear All
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Patient Filter */}
        <div ref={searchRef} className="space-y-2">
          <label className="text-xs font-medium text-slate-600">Patient</label>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={dropdownSearchTerm}
              onChange={(e) => {
                setDropdownSearchTerm(e.target.value);
                if (selectedPatientData && e.target.value !== selectedPatientData.name) {
                  setSelectedPatientData(null);
                  onPatientChange(undefined);
                }
                if (e.target.value.trim().length >= 2) {
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
              placeholder="Search patient..."
              className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-8 py-1.5 text-xs outline-none focus:border-sky-400"
              disabled={!!defaultPatientId}
            />
            {selectedPatientData && (
              <button
                type="button"
                onClick={handleClearPatient}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                disabled={!!defaultPatientId}
              >
                <X className="h-3 w-3" />
              </button>
            )}
            {shouldShowDropdown && (
              <div className="absolute left-0 top-full z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl">
                {isSearching ? (
                  <div className="flex items-center justify-center p-3">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-500" />
                    <span className="ml-2 text-xs text-slate-500">Searching...</span>
                  </div>
                ) : dropdownResults.length > 0 ? (
                  dropdownResults.map((patient) => (
                    <button
                      key={patient.id}
                      type="button"
                      onClick={() => handlePatientSelect(patient)}
                      className="w-full border-b border-slate-100 px-3 py-2 text-left transition hover:bg-sky-50"
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                          <User className="h-3 w-3" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-slate-900">{patient.name}</p>
                          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                            <span>{patient.mobile}</span>
                            <span>•</span>
                            <span>{patient.healthId || "No Health ID"}</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))
                ) : dropdownSearchTerm.trim().length >= 2 ? (
                  <div className="p-3 text-center text-xs text-slate-500">No patients found</div>
                ) : null}
              </div>
            )}
          </div>
        </div>

        {/* Category Filter */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-600">Category</label>
          <select
            value={category || ""}
            onChange={(e) => onCategoryChange(e.target.value ? (e.target.value as MRDDocumentCategory) : undefined)}
            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-sky-400"
          >
            {DOCUMENT_CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        {/* Date From Filter */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-600">Date From</label>
          <div className="relative">
            <Calendar className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="date"
              value={dateFrom || ""}
              onChange={(e) => onDateFromChange(e.target.value || undefined)}
              className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-2 py-1.5 text-xs outline-none focus:border-sky-400"
            />
          </div>
        </div>

        {/* Date To Filter */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-600">Date To</label>
          <div className="relative">
            <Calendar className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="date"
              value={dateTo || ""}
              onChange={(e) => onDateToChange(e.target.value || undefined)}
              min={dateFrom || undefined}
              className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-2 py-1.5 text-xs outline-none focus:border-sky-400"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

