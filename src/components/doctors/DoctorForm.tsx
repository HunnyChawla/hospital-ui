"use client";

import { useForm } from "react-hook-form";
import { useEffect, useState, useRef } from "react";
import { useAppDispatch } from "@/redux/hooks";
import { createDoctor, updateDoctor, fetchDoctors } from "@/redux/doctorsSlice";
import { Doctor, CreateDoctorRequest, doctorsApi } from "@/services/doctorsApi";
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
  
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<CreateDoctorRequest & { user_id: string }>();
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedUserDetails, setSelectedUserDetails] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const specializationRef = useRef<HTMLDivElement>(null);
  const specializationButtonRef = useRef<HTMLButtonElement>(null);
  const [showSpecializationDropdown, setShowSpecializationDropdown] = useState(false);
  const selectedUserId = watch("user_id");
  const specializationValue = watch("specialization") || "";
  const justSelectedRef = useRef(false);

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

  // Fetch full doctor details when editing
  useEffect(() => {
    if (defaultValues?.id) {
      // Fetch full doctor details from API to get all fields
      doctorsApi.getById(defaultValues.id)
        .then(async (apiDoctor) => {
          // Fetch user details to show name
          if (apiDoctor.user_id) {
            try {
              const user = await usersApi.getById(apiDoctor.user_id);
              setSelectedUserDetails(user);
            } catch (error) {
              console.error("Failed to fetch user details:", error);
              setSelectedUserDetails(null);
            }
          }
          // Set form values with full API data
          reset({
            user_id: apiDoctor.user_id,
            specialization: apiDoctor.specialization || "",
            qualification: apiDoctor.qualification || "",
            registration_number: apiDoctor.registration_number || "",
            consultation_fee: apiDoctor.consultation_fee ? parseFloat(apiDoctor.consultation_fee) : undefined,
          });
        })
        .catch((error) => {
          console.error("Failed to fetch doctor details:", error);
          // Fallback to defaultValues if API call fails
          reset({
            user_id: defaultValues.user_id,
            specialization: defaultValues.specialization || "",
            qualification: defaultValues.qualification || "",
            registration_number: defaultValues.registration_number || "",
            consultation_fee: defaultValues.consultation_fee ? parseFloat(defaultValues.consultation_fee) : undefined,
          });
        });
    } else {
      // Reset form for new doctor
      reset({
        user_id: "",
        specialization: "",
        qualification: "",
        registration_number: "",
        consultation_fee: undefined,
      });
      setSearchTerm("");
      setSelectedUserDetails(null);
    }
  }, [defaultValues?.id, reset]);

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
    try {
      const doctorData: CreateDoctorRequest = {
        user_id: values.user_id,
        specialization: values.specialization || undefined,
        qualification: values.qualification || undefined,
        registration_number: values.registration_number || undefined,
        consultation_fee: values.consultation_fee ? parseFloat(String(values.consultation_fee)) : undefined,
      };

      if (defaultValues) {
        // Update doctor
        await dispatch(
          updateDoctor({
            doctorId: defaultValues.id,
            updates: {
              specialization: doctorData.specialization,
              qualification: doctorData.qualification,
              registration_number: doctorData.registration_number,
              consultation_fee: doctorData.consultation_fee,
            },
          })
        ).unwrap();
        toast.success("Doctor updated");
        // Refresh doctors list
        dispatch(fetchDoctors());
      } else {
        // Create doctor
        await dispatch(createDoctor(doctorData)).unwrap();
        toast.success("Doctor created");
        reset();
        // Refresh doctors list
        dispatch(fetchDoctors());
        // Dispatch custom event
        window.dispatchEvent(new CustomEvent("doctor:created"));
      }
      onSuccess?.();
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage);
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
                      <span className={`pill px-2 py-0.5 text-xs font-normal ${
                        user.status === "active" 
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
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-sky-50 transition ${
                    specializationValue === spec ? "bg-sky-50 font-semibold text-slate-900" : "text-slate-700"
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

      {/* Consultation Fee */}
      <label className="space-y-1">
        <span className="text-slate-600">Consultation Fee (₹)</span>
        <input
          type="number"
          step="0.01"
          min="0"
          {...register("consultation_fee", {
            valueAsNumber: true,
            min: { value: 0, message: "Fee must be positive" },
          })}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
          placeholder="0.00"
        />
        {errors.consultation_fee && (
          <span className="text-xs text-rose-500">{errors.consultation_fee.message}</span>
        )}
      </label>

      {/* Submit Button */}
      <div className="col-span-2 flex justify-end gap-3">
        <button
          type="submit"
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 font-semibold text-white shadow-sm hover:shadow"
        >
          {defaultValues ? "Update Doctor" : "Create Doctor"}
        </button>
      </div>
    </form>
  );
}

