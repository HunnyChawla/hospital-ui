"use client";

import { useForm } from "react-hook-form";
import { useEffect, useState, useRef } from "react";
import { useDoctor } from "@/hooks/queries/useDoctors";
import { useAppDispatch } from "@/redux/hooks";
import { createDoctor, updateDoctor, fetchDoctors } from "@/redux/doctorsSlice";
import { Doctor, CreateDoctorRequest } from "@/services/doctorsApi";
import { usersApi, User } from "@/services/usersApi";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { Search, User as UserIcon } from "lucide-react";

interface DoctorFormProps {
  defaultValues?: Doctor;
  onSuccess?: () => void;
}

// Common specializations list (hardcoded as requested)
const SPECIALIZATIONS = [
  "General Medicine",
  "Internal Medicine",
  "Cardiology",
  "Orthopedics",
  "Pediatrics",
  "Gynecology",
  "Dermatology",
  "ENT",
  "Ophthalmology",
  "Psychiatry",
  "Neurology",
  "Nephrology",
  "Gastroenterology",
  "Pulmonology",
  "Endocrinology",
  "Oncology",
  "Urology",
  "Dentistry",
  "Radiology",
  "Anesthesiology",
  "Physiotherapy",
  "General Surgery",
  "Plastic Surgery",
  "Emergency Medicine",
];

export function DoctorForm({ defaultValues, onSuccess }: DoctorFormProps) {
  const dispatch = useAppDispatch();

  // Fetch full doctor details when editing (React Query auto-deduplicates this!)
  const { data: fullDoctorData } = useDoctor(defaultValues?.id || null);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<CreateDoctorRequest & { user_id: string }>();
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedUserDetails, setSelectedUserDetails] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const specializationRef = useRef<HTMLDivElement>(null);
  const specializationButtonRef = useRef<HTMLButtonElement>(null);
  const [showSpecializationDropdown, setShowSpecializationDropdown] = useState(false);
  const selectedUserId = watch("user_id");
  const specializationValue = watch("specialization") || "";
  const justSelectedRef = useRef(false);

  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 2MB limit
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Signature file size must be less than 2MB");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setSignaturePreview(base64String);
        setValue("signature", base64String, { shouldDirty: true, shouldTouch: true });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveSignature = () => {
    setSignaturePreview(null);
    setValue("signature", "", { shouldDirty: true, shouldTouch: true });
    // Also clear the file input
    const fileInput = document.getElementById('signature-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  // Fetch available users (doctors without doctor records) when creating new doctor
  useEffect(() => {
    if (!defaultValues) {
      const fetchUsers = async () => {
        setIsLoadingUsers(true);
        try {
          const users = await usersApi.getDoctorsWithoutDoctorRecord();
          setAvailableUsers(users);
        } catch (error) {
          console.error("Failed to fetch available users:", error);
          setAvailableUsers([]);
        } finally {
          setIsLoadingUsers(false);
        }
      };
      fetchUsers();
    }
  }, [defaultValues]);

  // Populate form when full doctor data is loaded
  useEffect(() => {
    if (fullDoctorData && defaultValues?.id) {
      // React Query fetched the full data - no manual API call needed!
      // Fetch user details to show name
      if (fullDoctorData.user_id) {
        usersApi.getById(fullDoctorData.user_id)
          .then((user) => setSelectedUserDetails(user))
          .catch((error) => {
            console.error("Failed to fetch user details:", error);
            setSelectedUserDetails(null);
          });
      }
      // Set form values with full API data
      reset({
        user_id: fullDoctorData.user_id,
        specialization: fullDoctorData.specialization || "",
        qualification: fullDoctorData.qualification || "",
        registration_number: fullDoctorData.registration_number || "",
        opd_revisit_validity_days: fullDoctorData.opd_revisit_validity_days || undefined,
        surgery_revisit_validity_days: fullDoctorData.surgery_revisit_validity_days || undefined,
        max_free_revisits: fullDoctorData.max_free_revisits || undefined,
      });
      if (fullDoctorData.signature) {
        setSignaturePreview(fullDoctorData.signature);
      }
    } else if (!defaultValues) {
      // Reset form for new doctor
      reset({
        user_id: "",
        specialization: "",
        qualification: "",
        registration_number: "",
        opd_revisit_validity_days: undefined,
        surgery_revisit_validity_days: undefined,
        max_free_revisits: undefined,
      });
      setSearchTerm("");
      setSelectedUserDetails(null);
      setSignaturePreview(null);
    }
  }, [fullDoctorData, defaultValues, reset]);

  // Filter users based on search term
  useEffect(() => {
    if (justSelectedRef.current) {
      return;
    }

    // If a user is already selected and the search text matches that user,
    // keep the dropdown closed unless the user clears/changes the text.
    const selectedUser = availableUsers.find((u) => u.id === selectedUserId);
    if (selectedUser && searchTerm.trim() === selectedUser.full_name) {
      setShowDropdown(false);
      return;
    }

    if (searchTerm.trim().length >= 1) {
      const filtered = availableUsers.filter(
        (user) =>
          user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setShowDropdown(filtered.length > 0);
    } else {
      // Show all users when search is empty
      setShowDropdown(availableUsers.length > 0);
    }
  }, [searchTerm, availableUsers, selectedUserId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (defaultValues) return; // Don't add listener when editing

    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [defaultValues]);

  // Close specialization dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (specializationRef.current && !specializationRef.current.contains(event.target as Node)) {
        setShowSpecializationDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleUserSelect = (user: User) => {
    justSelectedRef.current = true;
    setValue("user_id", user.id);
    setSearchTerm(user.full_name);
    setShowDropdown(false);
    // Blur input so dropdown does not immediately re-open
    searchInputRef.current?.blur();
    setTimeout(() => {
      justSelectedRef.current = false;
    }, 100);
  };

  const filteredUsers = searchTerm.trim().length > 0
    ? availableUsers.filter(
      (user) =>
        user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
    )
    : availableUsers;

  const handleSpecializationSelect = (spec: string) => {
    setValue("specialization", spec, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
    setShowSpecializationDropdown(false);
    // Blur to prevent immediate re-open on focus
    specializationButtonRef.current?.blur();
  };

  // Ensure dropdown closes whenever a specialization value is set/changed
  useEffect(() => {
    if (specializationValue) {
      setShowSpecializationDropdown(false);
    }
  }, [specializationValue]);

  const onSubmit = async (values: CreateDoctorRequest & { user_id: string }) => {
    const doctorData: CreateDoctorRequest = {
      user_id: values.user_id,
      specialization: values.specialization || undefined,
      qualification: values.qualification || undefined,
      registration_number: values.registration_number || undefined,
      signature: values.signature || undefined,
      opd_revisit_validity_days: values.opd_revisit_validity_days ? Number(values.opd_revisit_validity_days) : undefined,
      surgery_revisit_validity_days: values.surgery_revisit_validity_days ? Number(values.surgery_revisit_validity_days) : undefined,
      max_free_revisits: values.max_free_revisits !== undefined && values.max_free_revisits !== null ? Number(values.max_free_revisits) : undefined,
    };

    setIsSubmitting(true);
    try {
      if (defaultValues) {
        // Update existing doctor via Redux
        await dispatch(updateDoctor({
          doctorId: defaultValues.id,
          updates: {
            specialization: doctorData.specialization,
            qualification: doctorData.qualification,
            registration_number: doctorData.registration_number,
            signature: doctorData.signature,
            opd_revisit_validity_days: doctorData.opd_revisit_validity_days,
            surgery_revisit_validity_days: doctorData.surgery_revisit_validity_days,
            max_free_revisits: doctorData.max_free_revisits,
          },
        })).unwrap();
        toast.success("Doctor updated successfully");
        // Refresh doctors list with enriched user data
        dispatch(fetchDoctors());
        onSuccess?.();
      } else {
        // Create new doctor via Redux
        await dispatch(createDoctor(doctorData)).unwrap();
        toast.success("Doctor created successfully");
        // Refresh doctors list with enriched user data
        dispatch(fetchDoctors());
        reset();
        setSignaturePreview(null);
        // Dispatch custom event
        window.dispatchEvent(new CustomEvent("doctor:created"));
        onSuccess?.();
      }
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage || (defaultValues ? "Failed to update doctor" : "Failed to create doctor"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="grid grid-cols-2 gap-3 text-sm"
    >
      {/* User Selection */}
      <label className="col-span-2 space-y-1">
        <span className="text-slate-600">
          Select Doctor User <span className="text-rose-500">*</span>
        </span>
        {defaultValues ? (
          <div className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            {selectedUserDetails ? (
              <div>
                <p className="font-semibold text-slate-900">{selectedUserDetails.full_name}</p>
                <p className="text-xs text-slate-500">{selectedUserDetails.email}</p>
              </div>
            ) : (
              <p className="text-slate-500">Loading user details...</p>
            )}
          </div>
        ) : (
          <div className="relative" ref={searchRef}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                ref={searchInputRef}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  // Clear selection so a new pick can be made and dropdown can reopen.
                  setValue("user_id", "");
                  setShowDropdown(true);
                }}
                onFocus={() => {
                  const selectedUser = availableUsers.find((u) => u.id === selectedUserId);
                  const hasDifferentText = selectedUser ? searchTerm !== selectedUser.full_name : true;
                  if (availableUsers.length > 0 && hasDifferentText) {
                    setShowDropdown(true);
                  }
                }}
                className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2 outline-none focus:border-sky-400"
                placeholder="Search by name or email..."
              />
            </div>
            {showDropdown && filteredUsers.length > 0 && (
              <div className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => handleUserSelect(user)}
                    className="cursor-pointer px-4 py-2 text-sm hover:bg-sky-50 transition"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900">{user.full_name}</p>
                        <p className="text-xs text-slate-500">{user.email}</p>
                      </div>
                      <span className={`pill px-2 py-0.5 text-xs font-normal ${user.status === "active"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-rose-50 text-rose-700"
                        }`}>
                        {user.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {isLoadingUsers && (
              <p className="mt-1 text-xs text-slate-500">Loading available users...</p>
            )}
            {!isLoadingUsers && availableUsers.length === 0 && !defaultValues && (
              <p className="mt-1 text-xs text-slate-500">No available users found</p>
            )}
          </div>
        )}
        <input
          type="hidden"
          {...register("user_id", { required: "Please select a user" })}
        />
        {errors.user_id && (
          <span className="text-xs text-rose-500">{errors.user_id.message}</span>
        )}
        {defaultValues && (
          <p className="text-xs text-slate-500">User cannot be changed when editing</p>
        )}
      </label>

      {/* Specialization */}
      <label className="space-y-1">
        <span className="text-slate-600">Specialization</span>
        <div className="relative" ref={specializationRef}>
          <input type="hidden" {...register("specialization")} />
          <button
            type="button"
            ref={specializationButtonRef}
            onClick={() => setShowSpecializationDropdown((prev) => !prev)}
            className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-left outline-none focus:border-sky-400"
          >
            <span className={specializationValue ? "text-slate-900" : "text-slate-400"}>
              {specializationValue || "Select specialization"}
            </span>
            <span className="text-slate-400">▾</span>
          </button>
          {showSpecializationDropdown && (
            <div className="absolute z-20 mt-1 w-full max-h-56 overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg">
              {SPECIALIZATIONS.map((spec) => (
                <button
                  key={spec}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault(); // avoid focus/blur races
                    e.stopPropagation();
                    handleSpecializationSelect(spec);
                  }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-sky-50 transition ${specializationValue === spec ? "bg-sky-50 font-semibold text-slate-900" : "text-slate-700"
                    }`}
                >
                  {spec}
                </button>
              ))}
            </div>
          )}
        </div>
      </label>

      {/* Qualification */}
      <label className="space-y-1">
        <span className="text-slate-600">Qualification</span>
        <input
          {...register("qualification")}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
          placeholder="e.g., MBBS, MD, MS"
        />
      </label>

      {/* Registration Number */}
      <label className="space-y-1">
        <span className="text-slate-600">Registration Number</span>
        <input
          {...register("registration_number")}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
          placeholder="Medical council registration number"
        />
      </label>

      {/* Submit Button */}

      {/* Revisit Policy Section */}
      <div className="col-span-2 border-t border-slate-100 pt-3 mt-1">
        <p className="text-sm font-semibold text-slate-900 mb-3">Revisit Policy</p>
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className="text-slate-600">OPD Revisit Validity (Days)</span>
            <input
              type="number"
              {...register("opd_revisit_validity_days")}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
              placeholder="e.g., 7"
              min="0"
            />
          </label>
          <label className="space-y-1">
            <span className="text-slate-600">Surgery Revisit Validity (Days)</span>
            <input
              type="number"
              {...register("surgery_revisit_validity_days")}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
              placeholder="e.g., 30"
              min="0"
            />
          </label>
          <label className="space-y-1">
            <span className="text-slate-600">Max Free Revisits</span>
            <input
              type="number"
              {...register("max_free_revisits")}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
              placeholder="e.g., 2"
              min="0"
            />
          </label>
        </div>
      </div>

      {/* Signature Upload */}
      <div className="col-span-2 border-t border-slate-100 pt-3 mt-1">
        <label className="space-y-2 block">
          <span className="text-slate-600 font-medium">Doctor's Signature</span>
          <div className="flex items-start gap-4">
            {signaturePreview ? (
              <div className="relative group">
                <div className="h-24 px-4 border border-slate-200 rounded-lg bg-white flex items-center justify-center overflow-hidden">
                  <img src={signaturePreview} alt="Doctor Signature" className="max-h-20 max-w-full object-contain" />
                </div>
                <button
                  type="button"
                  onClick={handleRemoveSignature}
                  className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Remove signature"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                </button>
              </div>
            ) : (
              <div className="flex-1">
                <input
                  type="file"
                  id="signature-upload"
                  accept="image/*"
                  onChange={handleSignatureUpload}
                  className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100"
                />
                <p className="mt-1 text-xs text-slate-400">Supported formats: PNG, JPG. Max size: 2MB.</p>
              </div>
            )}
          </div>
        </label>
      </div>
      <div className="col-span-2 flex justify-end gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 font-semibold text-white shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting
            ? "Saving..."
            : defaultValues
              ? "Update Doctor"
              : "Create Doctor"}
        </button>
      </div>
    </form>
  );
}

