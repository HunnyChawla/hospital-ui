"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { mrdApi, CreateMRDDocumentRequest, MRDDocumentCategory } from "@/services/mrdApi";
import { patientsApi, PatientApiResponse } from "@/services/patientsApi";
import { admissionsApi, Admission } from "@/services/admissionsApi";
import { labBookingsApi, LabBooking } from "@/services/labBookingsApi";
import { opdVisitsApi, Visit } from "@/services/opdVisitsApi";
import { Patient } from "@/types";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { getTenantIdForApi } from "@/utils/auth";
import { Search, User, Upload, X, FileText, Loader2, BedDouble, FlaskConical, Activity, ShieldCheck, Sparkles, Info } from "lucide-react";
import { formatDate } from "@/utils/format";

const DOCUMENT_CATEGORIES: { value: MRDDocumentCategory; label: string }[] = [
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

interface MRDUploadFormProps {
  defaultPatientId?: string;
  defaultAdmissionId?: string;
  defaultLabBookingId?: string;
  defaultVisitId?: string;
  onSuccess?: () => void;
  onOpenPatientModal?: () => void;
}

export function MRDUploadForm({
  defaultPatientId,
  defaultAdmissionId,
  defaultLabBookingId,
  defaultVisitId,
  onSuccess,
  onOpenPatientModal,
}: MRDUploadFormProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentName, setDocumentName] = useState("");
  const [category, setCategory] = useState<MRDDocumentCategory>("OTHER");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [patientId, setPatientId] = useState(defaultPatientId || "");
  const [admissionId, setAdmissionId] = useState(defaultAdmissionId || "");
  const [labBookingId, setLabBookingId] = useState(defaultLabBookingId || "");
  const [visitId, setVisitId] = useState(defaultVisitId || "");

  // Encounter link mode: "none" creates an independent care context, others link to specific encounters
  const initialMode = defaultVisitId
    ? "opd"
    : defaultAdmissionId
    ? "ipd"
    : defaultLabBookingId
    ? "lab"
    : "none";
  const [linkMode, setLinkMode] = useState<"none" | "opd" | "ipd" | "lab">(initialMode);

  // Patient search
  const [dropdownSearchTerm, setDropdownSearchTerm] = useState("");
  const [dropdownResults, setDropdownResults] = useState<Patient[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedPatientData, setSelectedPatientData] = useState<Patient | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Related records state
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [labBookings, setLabBookings] = useState<LabBooking[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loadingAdmissions, setLoadingAdmissions] = useState(false);
  const [loadingLabBookings, setLoadingLabBookings] = useState(false);
  const [loadingVisits, setLoadingVisits] = useState(false);

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
        tenant_id: getTenantIdForApi(tenantId),
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

  // Load patient if defaultPatientId is provided
  useEffect(() => {
    if (defaultPatientId && !selectedPatientData) {
      const loadPatient = async () => {
        try {
          const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
          const apiPatient = await patientsApi.getById(defaultPatientId, tenantId || undefined);
          const patient = mapApiPatientToPatient(apiPatient);
          setSelectedPatientData(patient);
          setPatientId(patient.id);
          setDropdownSearchTerm(patient.name);
        } catch (error) {
          console.error("Failed to load patient:", error);
        }
      };
      loadPatient();
    }
  }, [defaultPatientId, selectedPatientData]);

  // Fetch admissions when patient is selected
  useEffect(() => {
    if (!patientId) {
      setAdmissions([]);
      setAdmissionId("");
      return;
    }

    const fetchAdmissions = async () => {
      setLoadingAdmissions(true);
      try {
        const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
        const response = await admissionsApi.list({
          patient_id: patientId,
          page_size: 100,
          tenant_id: getTenantIdForApi(tenantId),
        });
        setAdmissions(response.items);
        // If defaultAdmissionId is provided and exists in the list, keep it selected
        if (defaultAdmissionId && response.items.some((a) => a.id === defaultAdmissionId)) {
          setAdmissionId(defaultAdmissionId);
        } else if (!defaultAdmissionId) {
          setAdmissionId("");
        }
      } catch (error) {
        console.error("Failed to fetch admissions:", error);
        setAdmissions([]);
      } finally {
        setLoadingAdmissions(false);
      }
    };

    fetchAdmissions();
  }, [patientId, defaultAdmissionId]);

  // Fetch lab bookings when patient is selected
  useEffect(() => {
    if (!patientId) {
      setLabBookings([]);
      setLabBookingId("");
      return;
    }

    const fetchLabBookings = async () => {
      setLoadingLabBookings(true);
      try {
        const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
        const response = await labBookingsApi.list({
          patient_id: patientId,
          page_size: 100,
          tenant_id: getTenantIdForApi(tenantId),
        });
        setLabBookings(response.items);
        // If defaultLabBookingId is provided and exists in the list, keep it selected
        if (defaultLabBookingId && response.items.some((b) => b.id === defaultLabBookingId)) {
          setLabBookingId(defaultLabBookingId);
        } else if (!defaultLabBookingId) {
          setLabBookingId("");
        }
      } catch (error) {
        console.error("Failed to fetch lab bookings:", error);
        setLabBookings([]);
      } finally {
        setLoadingLabBookings(false);
      }
    };

    fetchLabBookings();
  }, [patientId, defaultLabBookingId]);

  // Fetch visits when patient is selected
  useEffect(() => {
    if (!patientId) {
      setVisits([]);
      setVisitId("");
      return;
    }

    const fetchVisits = async () => {
      setLoadingVisits(true);
      try {
        const response = await opdVisitsApi.list({
          patient_id: patientId,
          page_size: 100,
          sort_by: "created_at",
          sort_order: "desc",
        });
        setVisits(response.items);
        // If defaultVisitId is provided and exists in the list, keep it selected
        if (defaultVisitId && response.items.some((v) => v.id === defaultVisitId)) {
          setVisitId(defaultVisitId);
        } else if (!defaultVisitId) {
          setVisitId("");
        }
      } catch (error) {
        console.error("Failed to fetch visits:", error);
        setVisits([]);
      } finally {
        setLoadingVisits(false);
      }
    };

    fetchVisits();
  }, [patientId, defaultVisitId]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (e.g., 10MB limit)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        toast.error("File size must be less than 10MB");
        return;
      }
      setSelectedFile(file);
      // Auto-fill document name from filename if not set
      if (!documentName) {
        setDocumentName(file.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatientData(patient);
    setPatientId(patient.id);
    setDropdownSearchTerm(patient.name);
    setShowDropdown(false);
  };

  const handleClearPatient = () => {
    setSelectedPatientData(null);
    setPatientId("");
    setDropdownSearchTerm("");
    // Clear related records
    setAdmissions([]);
    setLabBookings([]);
    setVisits([]);
    setAdmissionId("");
    setLabBookingId("");
    setVisitId("");
    setLinkMode("none");
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile) {
      toast.error("Please select a file to upload");
      return;
    }

    if (!documentName.trim()) {
      toast.error("Please enter a document name");
      return;
    }

    if (!patientId) {
      toast.error("Please select a patient");
      return;
    }

    if (!category) {
      toast.error("Please select a category");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const uploadData: CreateMRDDocumentRequest = {
        file: selectedFile,
        document_name: documentName.trim(),
        category,
        patient_id: patientId,
        description: description.trim() || undefined,
        tags: tags.trim() ? tags.split(",").map((t) => t.trim()).filter(Boolean) : undefined,
        admission_id: linkMode === "ipd" ? admissionId || undefined : undefined,
        lab_booking_id: linkMode === "lab" ? labBookingId || undefined : undefined,
        visit_id: linkMode === "opd" ? visitId || undefined : undefined,
      };

      await mrdApi.upload(uploadData, undefined, (progress) => {
        setUploadProgress(progress);
      });

      toast.success("Document uploaded and care context linked successfully!");

      // Reset form
      setSelectedFile(null);
      setDocumentName("");
      setDescription("");
      setTags("");
      if (!defaultAdmissionId && !defaultLabBookingId && !defaultVisitId) {
        setAdmissionId("");
        setLabBookingId("");
        setVisitId("");
        setLinkMode("none");
      }
      // Don't reset patient if defaultPatientId is provided
      if (!defaultPatientId) {
        handleClearPatient();
      }

      // Reset file input
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = "";
      }

      onSuccess?.();
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const shouldShowDropdown = showDropdown && (isSearching || dropdownResults.length > 0 || dropdownSearchTerm.trim().length >= 2);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* File Upload */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">
          Document File <span className="text-rose-500">*</span>
        </label>
        <div className="relative">
          <input
            type="file"
            onChange={handleFileSelect}
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.xls,.xlsx"
            className="hidden"
            id="file-upload"
            disabled={isUploading}
          />
          <label
            htmlFor="file-upload"
            className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-4 transition hover:border-sky-400 hover:bg-sky-50"
          >
            <Upload className="h-5 w-5 text-slate-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-700">
                {selectedFile ? selectedFile.name : "Click to upload or drag and drop"}
              </p>
              <p className="text-xs text-slate-500">
                {selectedFile
                  ? `${formatFileSize(selectedFile.size)} • ${selectedFile.type || "Unknown type"}`
                  : "PDF, DOC, DOCX, Images, Excel (Max 10MB)"}
              </p>
            </div>
            {selectedFile && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSelectedFile(null);
                  const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
                  if (fileInput) fileInput.value = "";
                }}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </label>
        </div>
      </div>

      {/* Patient Selection */}
      <div ref={searchRef} className="space-y-2">
        <label className="text-sm font-medium text-slate-700">
          Patient <span className="text-rose-500">*</span>
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={dropdownSearchTerm}
            onChange={(e) => {
              setDropdownSearchTerm(e.target.value);
              if (selectedPatientData && e.target.value !== selectedPatientData.name) {
                setSelectedPatientData(null);
                setPatientId("");
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
            placeholder="Search patient by name, mobile, UHID, or ABHA..."
            className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 py-2 text-sm outline-none focus:border-sky-400"
            disabled={isUploading || !!defaultPatientId}
          />
          {selectedPatientData && (
            <button
              type="button"
              onClick={handleClearPatient}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              disabled={!!defaultPatientId}
            >
              <X className="h-4 w-4" />
            </button>
          )}
          {shouldShowDropdown && (
            <div className="absolute left-0 top-full z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
              {isSearching ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-4 w-4 animate-spin text-sky-500" />
                  <span className="ml-2 text-sm text-slate-500">Searching...</span>
                </div>
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
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900">{patient.name}</p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
                          <span>{patient.mobile}</span>
                          <span>•</span>
                          <span>{patient.healthId || "No Health ID"}</span>
                          {(patient.abhaAddress || patient.abhaNumber) && (
                            <span className="rounded bg-teal-50 px-1.5 py-0.5 font-medium text-teal-700 border border-teal-200">
                              ABHA: {patient.abhaAddress || patient.abhaNumber}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              ) : dropdownSearchTerm.trim().length >= 2 ? (
                <div className="p-3 text-center text-sm text-slate-500">No patients found</div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* Document Name */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">
          Document Name <span className="text-rose-500">*</span>
        </label>
        <input
          type="text"
          value={documentName}
          onChange={(e) => setDocumentName(e.target.value)}
          placeholder="Enter document name"
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
          required
          disabled={isUploading}
        />
      </div>

      {/* Category */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">
          Category <span className="text-rose-500">*</span>
        </label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as MRDDocumentCategory)}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
          required
          disabled={isUploading}
        >
          {DOCUMENT_CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter description (optional)"
          rows={3}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
          disabled={isUploading}
        />
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">Tags</label>
        <input
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="Enter tags separated by commas (optional)"
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
          disabled={isUploading}
        />
        <p className="text-xs text-slate-500">e.g., id-proof, aadhaar, insurance</p>
      </div>

      {/* Encounter Linking & ABDM Care Context Mode - Only show when patient is selected */}
      {patientId && (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          <div className="flex flex-wrap items-center justify-between gap-1">
            <label className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-sky-600" />
              Link to Hospital Encounter (Care Context)
            </label>
            <span className="text-[11px] text-slate-500">Mutually exclusive encounter linking</span>
          </div>

          {/* Mode Selector Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => {
                setLinkMode("none");
                setVisitId("");
                setAdmissionId("");
                setLabBookingId("");
              }}
              disabled={isUploading || !!defaultVisitId || !!defaultAdmissionId || !!defaultLabBookingId}
              className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-medium transition cursor-pointer ${
                linkMode === "none"
                  ? "border-sky-500 bg-sky-50 text-sky-800 shadow-xs ring-1 ring-sky-500 font-semibold"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <Sparkles className="h-4 w-4 mb-1 text-sky-600" />
              <span>Independent</span>
              <span className="text-[10px] text-slate-400 font-normal">New Care Context</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setLinkMode("opd");
                setAdmissionId("");
                setLabBookingId("");
                if (!visitId && visits.length > 0) {
                  setVisitId(visits[0].id);
                }
              }}
              disabled={isUploading || !!defaultAdmissionId || !!defaultLabBookingId}
              className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-medium transition cursor-pointer ${
                linkMode === "opd"
                  ? "border-sky-500 bg-sky-50 text-sky-800 shadow-xs ring-1 ring-sky-500 font-semibold"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <Activity className="h-4 w-4 mb-1 text-teal-600" />
              <span>OPD Visit</span>
              <span className="text-[10px] text-slate-400 font-normal">
                {visits.length > 0 ? `${visits.length} available` : "No visits"}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setLinkMode("ipd");
                setVisitId("");
                setLabBookingId("");
                if (!admissionId && admissions.length > 0) {
                  setAdmissionId(admissions[0].id);
                }
              }}
              disabled={isUploading || !!defaultVisitId || !!defaultLabBookingId}
              className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-medium transition cursor-pointer ${
                linkMode === "ipd"
                  ? "border-sky-500 bg-sky-50 text-sky-800 shadow-xs ring-1 ring-sky-500 font-semibold"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <BedDouble className="h-4 w-4 mb-1 text-indigo-600" />
              <span>IPD Admission</span>
              <span className="text-[10px] text-slate-400 font-normal">
                {admissions.length > 0 ? `${admissions.length} available` : "No admissions"}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setLinkMode("lab");
                setVisitId("");
                setAdmissionId("");
                if (!labBookingId && labBookings.length > 0) {
                  setLabBookingId(labBookings[0].id);
                }
              }}
              disabled={isUploading || !!defaultVisitId || !!defaultAdmissionId}
              className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-medium transition cursor-pointer ${
                linkMode === "lab"
                  ? "border-sky-500 bg-sky-50 text-sky-800 shadow-xs ring-1 ring-sky-500 font-semibold"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <FlaskConical className="h-4 w-4 mb-1 text-amber-600" />
              <span>Lab Booking</span>
              <span className="text-[10px] text-slate-400 font-normal">
                {labBookings.length > 0 ? `${labBookings.length} available` : "No bookings"}
              </span>
            </button>
          </div>

          {/* Contextual Dropdowns / Guidance */}
          {linkMode === "none" && (
            <div className="rounded-xl border border-sky-100 bg-white p-3 text-xs text-sky-900 flex items-start gap-2">
              <Info className="h-4 w-4 text-sky-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Standalone Independent Document</p>
                <p className="text-slate-600 mt-0.5">
                  {category === "ID_PROOF"
                    ? "Administrative ID proof will be stored securely. It is excluded from ABDM health records."
                    : "This document will be assigned a new ABDM Care Context (DOC-...) and published directly to the patient's ABHA account."}
                </p>
              </div>
            </div>
          )}

          {linkMode === "opd" && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-slate-400" />
                Select OPD Visit <span className="text-rose-500">*</span>
              </label>
              <select
                value={visitId}
                onChange={(e) => setVisitId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 disabled:opacity-50"
                disabled={isUploading || loadingVisits || !!defaultVisitId}
                required
              >
                <option value="">Select OPD visit...</option>
                {loadingVisits ? (
                  <option value="" disabled>Loading visits...</option>
                ) : visits.length === 0 ? (
                  <option value="" disabled>No visits found for this patient</option>
                ) : (
                  visits.map((visit) => {
                    const statusLabel = visit.status.charAt(0).toUpperCase() + visit.status.slice(1).replace(/_/g, " ");
                    const dateStr = formatDate(visit.created_at);
                    return (
                      <option key={visit.id} value={visit.id}>
                        {visit.visit_number} - {dateStr} ({statusLabel})
                      </option>
                    );
                  })
                )}
              </select>
              <p className="text-[11px] text-slate-500">
                Document will be linked to the OPD visit's Care Context (VN-...).
              </p>
            </div>
          )}

          {linkMode === "ipd" && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                <BedDouble className="h-3.5 w-3.5 text-slate-400" />
                Select IPD Admission <span className="text-rose-500">*</span>
              </label>
              <select
                value={admissionId}
                onChange={(e) => setAdmissionId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 disabled:opacity-50"
                disabled={isUploading || loadingAdmissions || !!defaultAdmissionId}
                required
              >
                <option value="">Select admission...</option>
                {loadingAdmissions ? (
                  <option value="" disabled>Loading admissions...</option>
                ) : admissions.length === 0 ? (
                  <option value="" disabled>No admissions found for this patient</option>
                ) : (
                  admissions.map((admission) => {
                    const statusLabel = admission.status.charAt(0).toUpperCase() + admission.status.slice(1).replace(/_/g, " ");
                    const dateStr = formatDate(admission.admission_date);
                    return (
                      <option key={admission.id} value={admission.id}>
                        {admission.admission_number} - {dateStr} ({statusLabel})
                      </option>
                    );
                  })
                )}
              </select>
              <p className="text-[11px] text-slate-500">
                Document will be linked to the IPD Admission's Care Context (ADM-...).
              </p>
            </div>
          )}

          {linkMode === "lab" && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                <FlaskConical className="h-3.5 w-3.5 text-slate-400" />
                Select Lab Booking <span className="text-rose-500">*</span>
              </label>
              <select
                value={labBookingId}
                onChange={(e) => setLabBookingId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 disabled:opacity-50"
                disabled={isUploading || loadingLabBookings || !!defaultLabBookingId}
                required
              >
                <option value="">Select lab booking...</option>
                {loadingLabBookings ? (
                  <option value="" disabled>Loading lab bookings...</option>
                ) : labBookings.length === 0 ? (
                  <option value="" disabled>No lab bookings found for this patient</option>
                ) : (
                  labBookings.map((booking) => {
                    const statusLabel = booking.status.charAt(0).toUpperCase() + booking.status.slice(1).replace(/_/g, " ");
                    const dateStr = formatDate(booking.scheduled_date);
                    return (
                      <option key={booking.id} value={booking.id}>
                        {booking.booking_number} - {dateStr} ({statusLabel})
                      </option>
                    );
                  })
                )}
              </select>
              <p className="text-[11px] text-slate-500">
                Document will be linked to the Lab Booking's Care Context (LB-...).
              </p>
            </div>
          )}
        </div>
      )}

      {/* Upload Progress */}
      {isUploading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Uploading...</span>
            <span className="font-medium text-sky-600">{uploadProgress}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full bg-gradient-to-r from-sky-500 to-teal-500 transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Submit Button */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isUploading || !selectedFile || !documentName.trim() || !patientId || !category}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-6 py-2.5 font-semibold text-white shadow-sm transition hover:shadow disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Uploading...</span>
            </>
          ) : (
            <>
              <FileText className="h-4 w-4" />
              <span>Upload Document</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}

