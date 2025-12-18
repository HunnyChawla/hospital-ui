"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAppDispatch } from "@/redux/hooks";
import { admitPatient } from "@/redux/admissionsSlice";
import { admissionsApi, CreateAdmissionRequest, AdmissionType } from "@/services/admissionsApi";
import { wardsApi, Ward } from "@/services/wardsApi";
import { bedsApi, Bed } from "@/services/bedsApi";
import { doctorsApi } from "@/services/doctorsApi";
import { patientsApi } from "@/services/patientsApi";
import { Patient } from "@/types";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { Calendar, Clock, Search, User, Stethoscope, Plus, BedDouble, PlusCircle, Loader2, X } from "lucide-react";
import { PatientFormModal } from "@/components/patients/PatientFormModal";

interface AdmissionFormProps {
  defaultPatientId?: string;
  hidePatientSearch?: boolean;
  showDropdownSearch?: boolean;
  onSuccess?: () => void;
}

export function AdmissionForm({
  defaultPatientId,
  hidePatientSearch = false,
  showDropdownSearch = false,
  onSuccess,
}: AdmissionFormProps) {
  const dispatch = useAppDispatch();
  const [patientId, setPatientId] = useState(defaultPatientId || "");
  const [doctorId, setDoctorId] = useState("");
  const [wardId, setWardId] = useState("");
  const [bedId, setBedId] = useState("");
  const [admissionDate, setAdmissionDate] = useState("");
  const [admissionType, setAdmissionType] = useState<AdmissionType>("planned");
  const [reasonForAdmission, setReasonForAdmission] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [insuranceProvider, setInsuranceProvider] = useState("");
  const [insurancePolicyNumber, setInsurancePolicyNumber] = useState("");
  const [nextOfKinName, setNextOfKinName] = useState("");
  const [nextOfKinRelation, setNextOfKinRelation] = useState("");
  const [nextOfKinContact, setNextOfKinContact] = useState("");

  const [doctors, setDoctors] = useState<any[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [availableBeds, setAvailableBeds] = useState<Bed[]>([]);
  const [bedSearchTerm, setBedSearchTerm] = useState("");
  const [bedCurrentPage, setBedCurrentPage] = useState(1);
  const [bedLoading, setBedLoading] = useState(false);
  const [bedLoadingMore, setBedLoadingMore] = useState(false);
  const [bedHasMore, setBedHasMore] = useState(false);
  const [bedTotalPages, setBedTotalPages] = useState(1);
  const [showBedDropdown, setShowBedDropdown] = useState(false);
  const bedListRef = useRef<HTMLDivElement>(null);
  const bedSearchRef = useRef<HTMLDivElement>(null);
  const bedCurrentPageRef = useRef(1);
  const isFetchingRef = useRef(false);
  const isSettingBedProgrammatically = useRef(false);

  const [dropdownSearchTerm, setDropdownSearchTerm] = useState("");
  const [dropdownResults, setDropdownResults] = useState<Patient[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const justSelectedRef = useRef(false);

  useEffect(() => {
    const fetchDoctorsList = async () => {
      try {
        const response = await doctorsApi.list();
        setDoctors(response);
        if (response.length > 0 && !doctorId) {
          setDoctorId(response[0].id);
        }
      } catch (error) {
        console.error("Failed to fetch doctors:", error);
      }
    };
    fetchDoctorsList();
  }, [doctorId]);

  useEffect(() => {
    const fetchWards = async () => {
      try {
        const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
        const response = await wardsApi.list({
          page: 1,
          page_size: 100,
          tenant_id: tenantId || undefined,
        });
        setWards(response.items);
      } catch (error) {
        console.error("Failed to fetch wards:", error);
      }
    };
    fetchWards();
  }, []);

  // Fetch beds when ward is selected
  const fetchBedsForWard = useCallback(async (page: number, append: boolean, searchTerm: string) => {
    if (!wardId || isFetchingRef.current) {
      return;
    }

    isFetchingRef.current = true;
    bedCurrentPageRef.current = page;

    if (append) {
      setBedLoadingMore(true);
    } else {
      setBedLoading(true);
    }

    try {
      const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
      const response = await bedsApi.list({
        page,
        page_size: 20,
        ward_id: wardId,
        status: "available",
        search: searchTerm.trim() || undefined,
        tenant_id: tenantId || undefined,
      });

      if (append) {
        setAvailableBeds((prev) => [...prev, ...response.items]);
      } else {
        setAvailableBeds(response.items);
        // Don't auto-select - let user choose
      }

      setBedTotalPages(response.total_pages);
      setBedHasMore(page < response.total_pages);
      setBedCurrentPage(page);
    } catch (error) {
      console.error("Failed to fetch beds:", error);
      if (!append) {
        setAvailableBeds([]);
      }
    } finally {
      setBedLoading(false);
      setBedLoadingMore(false);
      isFetchingRef.current = false;
    }
  }, [wardId]);

  // Reset and fetch beds when ward changes
  useEffect(() => {
    if (wardId) {
      setBedSearchTerm("");
      setBedCurrentPage(1);
      bedCurrentPageRef.current = 1;
      setBedId("");
      setAvailableBeds([]);
      fetchBedsForWard(1, false, "");
    } else {
      setAvailableBeds([]);
      setBedId("");
      setBedSearchTerm("");
      setBedCurrentPage(1);
      bedCurrentPageRef.current = 1;
    }
  }, [wardId, fetchBedsForWard]);

  // Fetch beds when search term changes (with debounce)
  useEffect(() => {
    if (!wardId) return;
    // Avoid looped searches on render changes to availableBeds/bedId
    const timeoutId = setTimeout(() => {
      setBedCurrentPage(1);
      bedCurrentPageRef.current = 1;
      fetchBedsForWard(1, false, bedSearchTerm);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [bedSearchTerm, wardId, fetchBedsForWard]);

  // Handle infinite scroll
  useEffect(() => {
    const bedListElement = bedListRef.current;
    if (!bedListElement || !wardId || !showBedDropdown) return;

    const handleScroll = () => {
      if (isFetchingRef.current || bedLoadingMore || !bedHasMore) {
        return;
      }

      const { scrollTop, scrollHeight, clientHeight } = bedListElement;

      // If content isn't scrollable, avoid kicking off fetches
      if (scrollHeight <= clientHeight + 24) return;

      // Only load more after the user has actually scrolled
      if (scrollTop === 0) return;

      const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
      const isNearBottom = distanceFromBottom <= 50;
      
      if (isNearBottom) {
        const nextPage = bedCurrentPageRef.current + 1;
        if (nextPage <= bedTotalPages && !isFetchingRef.current) {
          fetchBedsForWard(nextPage, true, bedSearchTerm);
        }
      }
    };

    bedListElement.addEventListener("scroll", handleScroll);
    return () => bedListElement.removeEventListener("scroll", handleScroll);
  }, [bedHasMore, bedLoadingMore, bedTotalPages, wardId, bedSearchTerm, fetchBedsForWard, showBedDropdown]);

  // Close bed dropdown when clicking outside
  useEffect(() => {
    if (!showBedDropdown) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (bedSearchRef.current && !bedSearchRef.current.contains(event.target as Node)) {
        setShowBedDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showBedDropdown]);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setAdmissionDate(today);
  }, []);

  useEffect(() => {
    if (defaultPatientId) {
      setPatientId(defaultPatientId);
      // Fetch patient details to display the name in the search field
      const fetchPatientName = async () => {
        try {
          const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
          const patient = await patientsApi.getById(defaultPatientId, tenantId || undefined);
          const mappedPatient = patientsApi.mapToPatients([patient])[0];
          if (mappedPatient) {
            setDropdownSearchTerm(mappedPatient.name);
          }
        } catch (error) {
          console.error("Failed to fetch patient:", error);
        }
      };
      fetchPatientName();
    }
  }, [defaultPatientId]);

  useEffect(() => {
    if (justSelectedRef.current || patientId) {
      // Don't search if patient is already selected
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
  }, [dropdownSearchTerm, showDropdownSearch, patientId]);

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

  useEffect(() => {
    const handlePatientCreated = (event: CustomEvent) => {
      if (event.detail?.patientId) {
        setPatientId(event.detail.patientId);
        setShowDropdown(false);
        setDropdownSearchTerm("");
      }
    };

    window.addEventListener("patient:created", handlePatientCreated as EventListener);
    return () => {
      window.removeEventListener("patient:created", handlePatientCreated as EventListener);
    };
  }, []);

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

  // Hide dropdown if patient is already selected and search term matches
  const shouldShowDropdown = showDropdown && dropdownSearchTerm.trim().length >= 2 && !patientId;

  const selectedPatient = dropdownResults.find((p) => p.id === patientId) || 
    (patientId ? { id: patientId, name: "Selected Patient" } : null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check which fields are missing for better error message
    const missingFields: string[] = [];
    if (!patientId) missingFields.push("Patient");
    if (!doctorId) missingFields.push("Doctor");
    if (!bedId) missingFields.push("Bed");
    if (!admissionDate) missingFields.push("Admission Date");

    if (missingFields.length > 0) {
      toast.error(`Please fill all required fields: ${missingFields.join(", ")}`);
      console.error("Missing fields:", { patientId, doctorId, bedId, admissionDate });
      return;
    }

    try {
      const admissionData: CreateAdmissionRequest = {
        patient_id: patientId,
        doctor_id: doctorId,
        bed_id: bedId,
        admission_date: admissionDate,
        admission_type: admissionType,
        reason_for_admission: reasonForAdmission.trim() || null,
        diagnosis: diagnosis.trim() || null,
        insurance_provider: insuranceProvider.trim() || null,
        insurance_policy_number: insurancePolicyNumber.trim() || null,
        next_of_kin_name: nextOfKinName.trim() || null,
        next_of_kin_relation: nextOfKinRelation.trim() || null,
        next_of_kin_contact: nextOfKinContact.trim() || null,
      };

      await dispatch(admitPatient(admissionData)).unwrap();
      toast.success("Patient admitted successfully!");
      
      window.dispatchEvent(new CustomEvent("admission:created"));
      onSuccess?.();
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {!hidePatientSearch && showDropdownSearch && (
        <div className="md:col-span-2">
          <label className="space-y-1">
            <span className="text-slate-600 flex items-center gap-1">
              <User className="h-4 w-4" />
              Select Patient <span className="text-rose-500">*</span>
            </span>
            <div ref={searchRef} className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={dropdownSearchTerm}
                onChange={(e) => {
                  setDropdownSearchTerm(e.target.value);
                  // Clear patient selection if user starts typing a new search
                  if (e.target.value !== dropdownSearchTerm && patientId) {
                    setPatientId("");
                    setDropdownResults([]);
                  }
                }}
                onFocus={() => {
                  // Only show dropdown if no patient is selected or if user is searching
                  if (!patientId || dropdownSearchTerm.trim().length >= 2) {
                    setShowDropdown(true);
                  }
                }}
                placeholder="Search patient by name, mobile, or health ID"
                className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2 outline-none focus:border-sky-400"
              />
              {shouldShowDropdown && (
                <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-xl border border-slate-200 bg-white shadow-lg">
                  {isSearching ? (
                    <p className="p-3 text-sm text-slate-500">Searching...</p>
                  ) : dropdownResults.length > 0 ? (
                    dropdownResults.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handlePatientSelect(p)}
                        className="flex w-full items-center gap-2 p-3 text-left text-sm text-slate-700 hover:bg-slate-50"
                      >
                        <User className="h-4 w-4 shrink-0 text-slate-400" />
                        <div className="flex-1">
                          <p className="font-semibold">{p.name}</p>
                          <p className="text-xs text-slate-500">{p.mobile} • {p.healthId}</p>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="p-3 text-center text-sm text-slate-500">
                      No patients found.{" "}
                      <button
                        type="button"
                        onClick={() => {
                          setShowDropdown(false);
                          setShowPatientModal(true);
                        }}
                        className="text-sky-600 hover:underline"
                      >
                        Add new patient
                      </button>
                    </div>
                  )}
                </div>
              )}
              {patientId && !showDropdown && (
                <div className="mt-2 rounded-xl border border-sky-200 bg-sky-50 p-2">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-sky-600" />
                    <span className="font-semibold text-slate-900">Patient selected: {dropdownSearchTerm}</span>
                  </div>
                </div>
              )}
            </div>
          </label>
        </div>
      )}

      {hidePatientSearch && (
        <div className="col-span-2">
          {patientId ? (
            <div className="rounded-xl border border-slate-200 bg-sky-50 p-3">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-sky-600" />
                <span className="font-semibold text-slate-900">Patient selected</span>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <div className="flex items-center gap-2 text-sm text-amber-700">
                <User className="h-4 w-4" />
                <span>Please select a patient from the global search above to create an admission</span>
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
          required
        >
          <option value="">Select doctor</option>
          {doctors.map((doc) => {
            const doctorName = doc.user_name || doc.name || doc.user?.name || `Dr. ${doc.specialization || "Unknown"}`;
            return (
              <option key={doc.id} value={doc.id}>
                {doctorName} {doc.specialization ? `- ${doc.specialization}` : ""}
              </option>
            );
          })}
        </select>
      </label>

      <label className="space-y-1">
        <span className="text-slate-600 flex items-center gap-1">
          <BedDouble className="h-4 w-4" />
          Ward <span className="text-rose-500">*</span>
        </span>
        <select
          value={wardId}
          onChange={(e) => setWardId(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
          required
        >
          <option value="">Select ward</option>
          {wards.map((ward) => (
            <option key={ward.id} value={ward.id}>
              {ward.ward_name} ({ward.ward_code})
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-1">
        <span className="text-slate-600 flex items-center gap-1">
          <BedDouble className="h-4 w-4" />
          Bed <span className="text-rose-500">*</span>
        </span>
        <div ref={bedSearchRef} className="relative">
          <Search className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${bedId ? "text-sky-600" : "text-slate-400"}`} />
          <input
            type="text"
            value={bedSearchTerm}
            onChange={(e) => {
              const value = e.target.value;
              setBedSearchTerm(value);
              setShowBedDropdown(true);
            }}
            onFocus={() => {
              if (wardId) {
                setShowBedDropdown(true);
              }
            }}
            onClick={() => {
              if (wardId) {
                setShowBedDropdown(true);
              }
            }}
            placeholder={wardId ? "Search bed by number..." : "Select ward first"}
            className={`w-full rounded-xl border pl-10 pr-10 py-2 outline-none transition ${
              bedId && bedSearchTerm
                ? "border-sky-400 bg-sky-50 text-slate-900"
                : "border-slate-200 bg-white focus:border-sky-400"
            } disabled:bg-slate-50 disabled:cursor-not-allowed`}
            disabled={!wardId}
          />
          {bedId && !showBedDropdown && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setBedId("");
                setBedSearchTerm("");
                setShowBedDropdown(true);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              title="Clear selection"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          {/* Hidden input for form validation */}
          <input type="hidden" name="bed_id" value={bedId || ""} required={true} />
          {wardId && showBedDropdown && (
            <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-xl border border-slate-200 bg-white shadow-lg max-h-64 overflow-hidden flex flex-col">
              {bedLoading ? (
                <div className="p-4 text-center">
                  <Loader2 className="h-5 w-5 animate-spin text-sky-600 mx-auto" />
                  <p className="text-sm text-slate-500 mt-2">Loading beds...</p>
                </div>
              ) : availableBeds.length === 0 ? (
                <div className="p-4 text-center text-sm text-slate-500">
                  {bedSearchTerm ? "No beds found matching your search" : "No available beds in this ward"}
                </div>
              ) : (
                <>
                  <div
                    ref={bedListRef}
                    className="overflow-y-auto"
                    style={{ maxHeight: "240px" }}
                  >
                    {availableBeds.map((bed) => {
                      const isSelected = bedId === bed.id;
                      return (
                        <button
                          key={bed.id}
                          type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setBedId(bed.id);
                          setBedSearchTerm(bed.bed_number);
                          setShowBedDropdown(false);
                        }}
                          className={`w-full flex items-center gap-2 p-3 text-left text-sm transition ${
                            isSelected
                              ? "bg-sky-50 text-sky-700 font-semibold"
                              : "text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <BedDouble className={`h-4 w-4 shrink-0 ${isSelected ? "text-sky-600" : "text-slate-400"}`} />
                          <div className="flex-1">
                            <p className="font-semibold">{bed.bed_number}</p>
                            {bed.bed_type && (
                              <p className="text-xs text-slate-500 capitalize">{bed.bed_type.replace("_", " ")}</p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                    {bedLoadingMore && (
                      <div className="p-3 text-center">
                        <Loader2 className="h-4 w-4 animate-spin text-sky-600 mx-auto" />
                        <p className="text-xs text-slate-500 mt-1">Loading more...</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </label>

      <label className="space-y-1">
        <span className="text-slate-600 flex items-center gap-1">
          <Calendar className="h-4 w-4" />
          Admission Date <span className="text-rose-500">*</span>
        </span>
        <input
          type="date"
          value={admissionDate}
          onChange={(e) => setAdmissionDate(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
          required
        />
      </label>

      <label className="space-y-1">
        <span className="text-slate-600 flex items-center gap-1">
          Admission Type <span className="text-rose-500">*</span>
        </span>
        <select
          value={admissionType}
          onChange={(e) => setAdmissionType(e.target.value as AdmissionType)}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
          required
        >
          <option value="emergency">Emergency</option>
          <option value="planned">Planned</option>
          <option value="transfer">Transfer</option>
          <option value="day_care">Day Care</option>
        </select>
      </label>

      <label className="md:col-span-2 space-y-1">
        <span className="text-slate-600">Reason for Admission</span>
        <textarea
          value={reasonForAdmission}
          onChange={(e) => setReasonForAdmission(e.target.value)}
          rows={3}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
          placeholder="Enter reason for admission"
        />
      </label>

      <label className="md:col-span-2 space-y-1">
        <span className="text-slate-600">Initial Diagnosis</span>
        <textarea
          value={diagnosis}
          onChange={(e) => setDiagnosis(e.target.value)}
          rows={2}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
          placeholder="Optional initial diagnosis"
        />
      </label>

      <label className="space-y-1">
        <span className="text-slate-600">Insurance Provider</span>
        <input
          type="text"
          value={insuranceProvider}
          onChange={(e) => setInsuranceProvider(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
          placeholder="Optional"
        />
      </label>

      <label className="space-y-1">
        <span className="text-slate-600">Insurance Policy Number</span>
        <input
          type="text"
          value={insurancePolicyNumber}
          onChange={(e) => setInsurancePolicyNumber(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
          placeholder="Optional"
        />
      </label>

      <label className="space-y-1">
        <span className="text-slate-600">Next of Kin Name</span>
        <input
          type="text"
          value={nextOfKinName}
          onChange={(e) => setNextOfKinName(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
          placeholder="Optional"
        />
      </label>

      <label className="space-y-1">
        <span className="text-slate-600">Next of Kin Relation</span>
        <input
          type="text"
          value={nextOfKinRelation}
          onChange={(e) => setNextOfKinRelation(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
          placeholder="e.g., Spouse, Son, Daughter"
        />
      </label>

      <label className="space-y-1">
        <span className="text-slate-600">Next of Kin Contact</span>
        <input
          type="text"
          value={nextOfKinContact}
          onChange={(e) => setNextOfKinContact(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
          placeholder="Phone number"
        />
      </label>

      <div className="md:col-span-2 flex justify-end gap-3">
        <button
          type="submit"
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 font-semibold text-white shadow-sm hover:shadow"
        >
          <div className="relative flex items-center justify-center">
            <BedDouble className="h-4 w-4" />
            <PlusCircle className="h-3 w-3 absolute -bottom-0.5 -right-0.5 bg-sky-500 rounded-full" />
          </div>
          Admit Patient
        </button>
      </div>

      <PatientFormModal
        isOpen={showPatientModal}
        onClose={() => setShowPatientModal(false)}
      />
    </form>
  );
}

