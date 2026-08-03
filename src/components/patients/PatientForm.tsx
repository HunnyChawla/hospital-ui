"use client";

import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import { useCreatePatient, useUpdatePatient, usePatient } from "@/hooks/queries/usePatients";
import { Patient } from "@/types";
import { CreatePatientRequest, patientsApi } from "@/services/patientsApi";
import { patientCategoriesApi } from "@/services/patientCategoriesApi";
import { Calendar, Clock, User, CalendarDays, Phone, Mail, MapPin, Hash } from "lucide-react";
import { AbhaStatusBadge, AbhaEnrollmentModal } from "@/components/abha";
import { useAbhaFlags } from "@/hooks/useFeatureFlags";
import { abhaApi } from "@/services/abhaApi";
import { toast } from "sonner";


interface PatientFormProps {
  defaultValues?: Patient;
  onSuccess?: (patient?: Patient) => void;
}

export function PatientForm({ defaultValues, onSuccess }: PatientFormProps) {
  // React Query mutations - automatic cache invalidation and optimistic updates!
  const createPatient = useCreatePatient();
  const updatePatient = useUpdatePatient();

  // Fetch full patient details when editing (React Query auto-deduplicates this!)
  const { data: fullPatientData } = usePatient(defaultValues?.id || null);
  const apiData = fullPatientData as any;

  // Age-based input state
  const [ageYears, setAgeYears] = useState<string>("");
  const [ageMonths, setAgeMonths] = useState<string>("");
  const [ageDays, setAgeDays] = useState<string>("");
  const [dobValue, setDobValue] = useState<string>("");
  const [ageError, setAgeError] = useState<string>("");
  const [inputMode, setInputMode] = useState<'dob' | 'age'>('age');
  const [isNewborn, setIsNewborn] = useState<boolean>(false);
  const [parentName, setParentName] = useState<string>(defaultValues?.title === "Baby of" && defaultValues?.name ? (defaultValues.name.startsWith("Baby of ") ? defaultValues.name.substring(8) : defaultValues.name) : "");

  const [categories, setCategories] = useState<string[]>([
    "General",
    "Staff",
    "NFL",
    "ECHS",
    "Haryana Govt.",
    "Central Govt.",
    "Ayushman Bharat",
    "ESI",
    "EX_SERVICEMAN",
    "STAFF_FAMILY",
  ]);

  // ABHA Integration State (Optional feature behind feature toggle)
  const { enabled: abhaEnabled } = useAbhaFlags();
  const [isAbhaModalOpen, setIsAbhaModalOpen] = useState(false);
  const [abhaProfile, setAbhaProfile] = useState<any>(null);
  const [aadhaarNum, setAadhaarNum] = useState<string | undefined>(undefined);

  const handleAbhaSuccess = (profile: any, aadhaar?: string) => {
    setAbhaProfile(profile);
    if (aadhaar) setAadhaarNum(aadhaar);

    // Auto-populate form fields from ABHA profile
    if (profile.name) {
      const parts = profile.name.trim().split(" ");
      const first = parts[0];
      const last = parts.slice(1).join(" ");
      if (first) setValue("first_name", first, { shouldValidate: true });
      if (last) setValue("last_name", last, { shouldValidate: true });
    }
    if (profile.mobile) {
      setValue("mobile", profile.mobile, { shouldValidate: true });
    }
    if (profile.gender) {
      const g = profile.gender.toLowerCase().startsWith("f") ? "female" : profile.gender.toLowerCase().startsWith("m") ? "male" : "other";
      setValue("gender", g, { shouldValidate: true });
    }
    if (profile.dob) {
      handleDobChange(profile.dob);
    }
    const abhaVal = profile.abha_number || profile.abha_address || "";
    if (abhaVal) {
      setValue("abha_id", abhaVal, { shouldValidate: true });
    }
    toast.success("Patient details auto-populated from ABHA profile!");
  };

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await patientCategoriesApi.list();
        setCategories(data.map((c) => c.name));
      } catch (err) {
        console.error("Failed to load patient categories:", err);
      }
    };
    fetchCategories();
  }, []);

  const { register, handleSubmit, reset, formState: { errors }, setValue, watch } = useForm<CreatePatientRequest>({
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      gender: "male",
      category: "General",
    }
  });



  // Watch newborn state to autofill fields
  useEffect(() => {
    if (isNewborn) {
      setValue("title", "Baby of");
      // Set default DOB to today
      const today = new Date().toISOString().split('T')[0];
      setDobValue(today);
      setValue("date_of_birth", today);
      setAgeYears("0");
      setAgeMonths("0");
      setAgeDays("0");
    } else {
      // Only clear if not editing an existing patient
      if (!defaultValues) {
        setValue("title", "");
        setValue("first_name", "");
        setDobValue("");
        setValue("date_of_birth", "");
        setAgeYears("");
        setAgeMonths("");
        setAgeDays("");
        setParentName("");
      }
    }
  }, [isNewborn, setValue, defaultValues]);

  // Helper function: Calculate DOB from age
  const calculateDobFromAge = (years: number, months: number, days: number): string => {
    const today = new Date();
    const calculatedDate = new Date(
      today.getFullYear() - years,
      today.getMonth() - months,
      today.getDate() - days
    );

    // Format as YYYY-MM-DD
    const year = calculatedDate.getFullYear();
    const month = String(calculatedDate.getMonth() + 1).padStart(2, '0');
    const day = String(calculatedDate.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  };

  // Helper function: Calculate age from DOB
  const calculateAgeFromDob = (dob: string): { years: number; months: number; days: number } => {
    const birthDate = new Date(dob);
    const today = new Date();

    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    let days = today.getDate() - birthDate.getDate();

    // Adjust for negative days
    if (days < 0) {
      months--;
      const lastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      days += lastMonth.getDate();
    }

    // Adjust for negative months
    if (months < 0) {
      years--;
      months += 12;
    }

    return { years, months, days };
  };

  // Validate age input
  const validateAge = (years: number, months: number, days: number): string => {
    if (years < 0 || months < 0 || days < 0) {
      return "Age cannot be negative";
    }

    if (years > 120) {
      return "Age must be within 0-120 years";
    }

    if (months > 11) {
      return "Months must be between 0-11";
    }

    if (days > 31) {
      return "Days must be between 0-31";
    }

    // Check if calculated DOB is in the future
    const calculatedDob = calculateDobFromAge(years, months, days);
    const dobDate = new Date(calculatedDob);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (dobDate > today) {
      return "Calculated date of birth cannot be in the future";
    }

    return "";
  };

  // Handle age input change
  const handleAgeChange = (field: 'years' | 'months' | 'days', value: string) => {
    const numValue = value === "" ? 0 : parseInt(value, 10);

    if (value !== "" && (isNaN(numValue) || numValue < 0)) {
      return; // Ignore invalid input
    }

    // Update state
    if (field === 'years') setAgeYears(value);
    if (field === 'months') setAgeMonths(value);
    if (field === 'days') setAgeDays(value);

    // Get current values
    const years = field === 'years' ? numValue : (ageYears === "" ? 0 : parseInt(ageYears, 10));
    const months = field === 'months' ? numValue : (ageMonths === "" ? 0 : parseInt(ageMonths, 10));
    const days = field === 'days' ? numValue : (ageDays === "" ? 0 : parseInt(ageDays, 10));

    // Validate
    const error = validateAge(years, months, days);
    setAgeError(error);

    if (!error && (years > 0 || months > 0 || days > 0)) {
      // Calculate and set DOB
      const calculatedDob = calculateDobFromAge(years, months, days);
      setDobValue(calculatedDob);
      setValue("date_of_birth", calculatedDob, { shouldValidate: true });
    } else if (years === 0 && months === 0 && days === 0) {
      // Clear DOB if all age fields are empty/zero
      setDobValue("");
      setValue("date_of_birth", "", { shouldValidate: true });
    }
  };

  // Handle DOB input change
  const handleDobChange = (dob: string) => {
    setDobValue(dob);
    setValue("date_of_birth", dob, { shouldValidate: true });

    if (dob) {
      // Validate future date
      const dobDate = new Date(dob);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (dobDate > today) {
        setAgeError("Date of birth cannot be in the future");
        setAgeYears("");
        setAgeMonths("");
        setAgeDays("");
        return;
      }

      // Calculate and set age
      const age = calculateAgeFromDob(dob);
      setAgeYears(age.years.toString());
      setAgeMonths(age.months.toString());
      setAgeDays(age.days.toString());
      setAgeError("");
    } else {
      // Clear age fields if DOB is cleared
      setAgeYears("");
      setAgeMonths("");
      setAgeDays("");
      setAgeError("");
    }
  };

  // Populate form when full patient data is loaded
  useEffect(() => {
    if (fullPatientData && defaultValues?.id) {
      // React Query fetched the full data - no manual API call needed!
      // fullPatientData is now PatientApiResponse with all fields preserved
      const apiData = fullPatientData as any;
      const dob = apiData.date_of_birth || "";
      const isBabyOf = apiData.title === "Baby of";

      reset({
        title: apiData.title || "",
        first_name: apiData.first_name || "",
        last_name: apiData.last_name || "",
        mobile: apiData.mobile || "",
        email: apiData.email || "",
        date_of_birth: dob,
        gender: apiData.gender?.toLowerCase() as "male" | "female" | "other",
        abha_id: apiData.abha_id || "",
        address: apiData.address || "",
        city: apiData.city || "",
        state: apiData.state || "",
        pincode: apiData.pincode || "",
        category: apiData.category || "General",
      });



      // Populate age fields from DOB
      setDobValue(dob);
      if (dob) {
        const age = calculateAgeFromDob(dob);
        setAgeYears(age.years.toString());
        setAgeMonths(age.months.toString());
        setAgeDays(age.days.toString());
      }

      if (isBabyOf) {
        setIsNewborn(true);
        const namePart = apiData.first_name?.startsWith("Baby of ") 
          ? apiData.first_name.substring(8) 
          : apiData.first_name || "";
        setParentName(namePart);
      } else {
        setIsNewborn(false);
        setParentName("");
      }
    } else if (!defaultValues) {
      // Reset form for new patient
      reset({
        title: "",
        first_name: "",
        last_name: "",
        mobile: "",
        email: "",
        date_of_birth: "",
        gender: "male",
        abha_id: "",
        address: "",
        city: "",
        state: "",
        pincode: "",
        category: "General",
      });



      // Clear age fields
      setDobValue("");
      setAgeYears("");
      setAgeMonths("");
      setAgeDays("");
      setAgeError("");
      setIsNewborn(false);
      setParentName("");
    }
  }, [fullPatientData, defaultValues, reset]);

  const onSubmit = async (values: CreatePatientRequest) => {
    // Validate that either DOB or age is provided
    if (!dobValue || dobValue.trim() === "") {
      setAgeError("Please enter either Date of Birth or Age");
      return;
    }

    // Clear any previous validation errors
    setAgeError("");

    // Ensure gender is lowercase
    const gender = (values.gender || "male").toLowerCase() as "male" | "female" | "other";

    let patientData: any;
    if (isNewborn) {
      if (!parentName.trim()) {
        setAgeError("Mother's/Parent's name is required for a newborn baby.");
        return;
      }
      patientData = {
        title: "Baby of",
        first_name: `Baby of ${parentName.trim()}`,
        last_name: null,
        mobile: values.mobile,
        email: values.email?.trim() || null,
        date_of_birth: dobValue,
        gender,
        abha_id: values.abha_id?.trim() || null,
        address: values.address?.trim() || null,
        city: values.city?.trim() || null,
        state: values.state?.trim() || null,
        pincode: values.pincode?.trim() || null,
        category: values.category || "General",
      };
    } else {
      patientData = {
        title: values.title?.trim() || null,
        first_name: values.first_name,
        last_name: values.last_name?.trim() || null,
        mobile: values.mobile,
        email: values.email?.trim() || null,
        date_of_birth: values.date_of_birth,
        gender,
        abha_id: values.abha_id?.trim() || null,
        address: values.address?.trim() || null,
        city: values.city?.trim() || null,
        state: values.state?.trim() || null,
        pincode: values.pincode?.trim() || null,
        category: values.category || "General",
      };
    }

    // Include optional ABHA details if enrolled or linked
    if (abhaProfile) {
      patientData.abha_number = abhaProfile.abha_number || null;
      patientData.abha_address = abhaProfile.abha_address || null;
      patientData.abha_verified = true;
      patientData.photo_base64 = abhaProfile.photo_base64 || null;
    }
    if (aadhaarNum) {
      patientData.aadhaar_number = aadhaarNum;
    }


    if (defaultValues) {
      // Update existing patient
      await updatePatient.mutateAsync({
        patientId: defaultValues.id,
        updates: patientData,
      });
      if (abhaProfile) {
        try {
          await abhaApi.syncToPatient(defaultValues.id, {
            profile: abhaProfile,
            aadhaar_number: aadhaarNum || null,
          });
        } catch (e) {
          console.error("Failed to sync ABHA to patient:", e);
        }
      }
      // React Query mutation already shows toast and invalidates cache!
      onSuccess?.();
    } else {
      // Create new patient
      const newPatientApi = await createPatient.mutateAsync(patientData);
      const newPatient = patientsApi.mapToPatients([newPatientApi])[0];

      // Dispatch event for auto-selection
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent("patient:created", {
          detail: {
            patientId: newPatient.id,
            patient: newPatient
          }
        }));
      }

      if (abhaProfile) {
        try {
          await abhaApi.syncToPatient(newPatient.id, {
            profile: abhaProfile,
            aadhaar_number: aadhaarNum || null,
          });
        } catch (e) {
          console.error("Failed to sync ABHA to new patient:", e);
        }
      }

      // React Query mutation already shows toast and invalidates cache!
      reset();
      setIsNewborn(false);
      setParentName("");
      onSuccess?.(newPatient);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4"
    >
      {/* UHID Display (read-only, shown only when editing) */}
      {defaultValues && apiData?.uhid && (
        <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-3">
          <label className="space-y-1">
            <span className="text-xs font-semibold text-sky-700">Patient ID (UHID)</span>
            <input
              value={apiData.uhid}
              disabled
              className="w-full rounded-xl border border-sky-200 bg-white px-3 py-2 font-mono text-sm font-semibold text-sky-900 opacity-75"
            />
          </label>
        </div>
      )}

      {/* ABHA Profile Photo Banner */}
      {(abhaProfile?.photo_base64 || apiData?.photo_base64) && (
        <div className="flex items-center gap-3 rounded-xl border border-sky-100 bg-gradient-to-r from-sky-50 to-indigo-50/40 p-3">
          <img
            src={(abhaProfile?.photo_base64 || apiData?.photo_base64).startsWith("data:")
              ? (abhaProfile?.photo_base64 || apiData?.photo_base64)
              : `data:image/jpeg;base64,${abhaProfile?.photo_base64 || apiData?.photo_base64}`}
            alt="ABHA Patient Profile"
            className="h-12 w-12 rounded-full border-2 border-white shadow-sm object-cover"
          />
          <div>
            <div className="text-sm font-semibold text-sky-900">ABHA Verified Profile Photo</div>
            <div className="text-xs text-sky-700">Photo received from ABDM / Aadhaar KYC</div>
          </div>
        </div>
      )}

      {/* Newborn Checkbox */}
      <div className="flex items-center gap-2 pb-2">
        <input
          type="checkbox"
          id="is_newborn"
          checked={isNewborn}
          onChange={(e) => setIsNewborn(e.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
        />
        <label htmlFor="is_newborn" className="text-sm font-semibold text-slate-700 select-none cursor-pointer">
          Newborn Baby (Name not decided yet)
        </label>
      </div>

      {/* Basic Information */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {!isNewborn ? (
          <div className="grid grid-cols-4 gap-2 col-span-1 md:col-span-2">
            <label className="col-span-1 space-y-1">
              <span className="text-slate-600 text-sm">Title</span>
              <select
                {...register("title")}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400 text-sm"
              >
                <option value="">Select</option>
                <option value="Mr.">Mr.</option>
                <option value="Mrs.">Mrs.</option>
                <option value="Ms.">Ms.</option>
                <option value="Dr.">Dr.</option>
                <option value="Baby">Baby</option>
                <option value="Baby of">Baby of</option>
              </select>
            </label>

            <label className="col-span-2 space-y-1">
              <span className="text-slate-600 text-sm">First Name <span className="text-rose-500">*</span></span>
              <input
                {...register("first_name", { required: "First name is required" })}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400 text-sm"
                placeholder="e.g. John"
              />
              {errors.first_name && (
                <p className="text-xs text-rose-500">{errors.first_name.message}</p>
              )}
            </label>

            <label className="col-span-1 space-y-1">
              <span className="text-slate-600 text-sm">Last Name</span>
              <input
                {...register("last_name")}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400 text-sm"
                placeholder="e.g. Doe"
              />
            </label>
          </div>
        ) : (
          <label className="col-span-1 md:col-span-2 space-y-1">
            <span className="text-slate-600 text-sm">Mother's/Parent's Name <span className="text-rose-500">*</span></span>
            <input
              value={parentName}
              onChange={(e) => setParentName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400 text-sm"
              placeholder="e.g. Jane Doe"
            />
          </label>
        )}

        <label className="space-y-1">
          <span className="text-slate-600">Mobile Number <span className="text-rose-500">*</span></span>
          <input
            type="tel"
            {...register("mobile", {
              required: "Mobile is required",
              minLength: { value: 10, message: "Mobile must be at least 10 digits" },
              maxLength: { value: 20, message: "Mobile must be at most 20 digits" },
              pattern: {
                value: /^(\+91[\-\s]?|0)?[6-9]\d{9}$/,
                message: "Enter a valid 10-digit mobile number"
              }
            })}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
            placeholder="9876543210"
          />
          {errors.mobile && (
            <p className="text-xs text-rose-500">{errors.mobile.message}</p>
          )}
        </label>

        <label className="space-y-1">
          <span className="text-slate-600">Email Address <span className="text-slate-400 text-xs">(Optional)</span></span>
          <input
            type="email"
            {...register("email")}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
            placeholder="john.doe@example.com"
          />
        </label>
      </div>

      {/* Date of Birth / Age Section */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex border-b border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={() => setInputMode('age')}
            className={`flex-1 py-2.5 text-sm font-medium transition ${inputMode === 'age'
              ? 'bg-white text-sky-600 border-b-2 border-sky-500'
              : 'text-slate-600 hover:text-slate-900'}`}
          >
            Enter Age
          </button>
          <button
            type="button"
            onClick={() => setInputMode('dob')}
            className={`flex-1 py-2.5 text-sm font-medium transition ${inputMode === 'dob'
              ? 'bg-white text-sky-600 border-b-2 border-sky-500'
              : 'text-slate-600 hover:text-slate-900'}`}
          >
            Enter Date of Birth
          </button>
        </div>

        <div className="p-4">
          {inputMode === 'age' ? (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <label className="space-y-1">
                  <span className="text-xs text-slate-600">Years</span>
                  <input
                    type="number"
                    min="0"
                    max="120"
                    value={ageYears}
                    onChange={(e) => handleAgeChange('years', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
                    placeholder="0"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-slate-600">Months</span>
                  <input
                    type="number"
                    min="0"
                    max="11"
                    value={ageMonths}
                    onChange={(e) => handleAgeChange('months', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
                    placeholder="0"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-slate-600">Days</span>
                  <input
                    type="number"
                    min="0"
                    max="31"
                    value={ageDays}
                    onChange={(e) => handleAgeChange('days', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
                    placeholder="0"
                  />
                </label>
              </div>

              {dobValue && !ageError && (
                <div className="rounded-lg bg-sky-50 border border-sky-100 p-3">
                  <p className="text-xs text-sky-600 mb-1">Calculated Date of Birth</p>
                  <p className="text-sm font-semibold text-sky-900">
                    {new Date(dobValue).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <label className="space-y-1">
                <span className="text-xs text-slate-600">Date of Birth</span>
                <input
                  type="date"
                  value={dobValue}
                  onChange={(e) => handleDobChange(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
                />
              </label>

              {dobValue && !ageError && (
                <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3">
                  <p className="text-xs text-emerald-600 mb-1">Calculated Age</p>
                  <p className="text-sm font-semibold text-emerald-900">
                    {ageYears} years, {ageMonths} months, {ageDays} days
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Error Messages */}
          {(ageError || errors.date_of_birth) && (
            <div className="mt-3 rounded-lg bg-rose-50 border border-rose-100 px-3 py-2">
              <p className="text-xs text-rose-600">
                {ageError || errors.date_of_birth?.message}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Gender */}
      <label className="space-y-1">
        <span className="text-slate-600">Gender <span className="text-rose-500">*</span></span>
        <div className="grid grid-cols-3 gap-3">
          {[
            { id: 'male', label: 'Male' },
            { id: 'female', label: 'Female' },
            { id: 'other', label: 'Other' }
          ].map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setValue('gender', g.id as any, { shouldValidate: true })}
              className={`py-2 rounded-xl border text-sm font-medium transition ${watch('gender') === g.id
                ? 'bg-sky-50 border-sky-300 text-sky-700'
                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
            >
              {g.label}
            </button>
          ))}
        </div>
        <input type="hidden" {...register("gender", { required: "Gender is required" })} />
        {errors.gender && (
          <p className="text-xs text-rose-500">{errors.gender.message}</p>
        )}
      </label>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
        <h3 className="text-sm font-semibold text-slate-700">Optional Details</h3>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Category */}
          <label className="space-y-1">
            <span className="text-slate-600">Category</span>
            <select
              {...register("category")}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400 text-sm appearance-none"
              style={{ backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 0.75rem center", backgroundSize: "1rem" }}
            >
              <option value="">Select Category</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">ABHA/Health ID</span>
              <AbhaStatusBadge
                abhaNumber={abhaProfile?.abha_number || defaultValues?.abhaNumber || watch("abha_id")}
                abhaAddress={abhaProfile?.abha_address || defaultValues?.abhaAddress}
                abhaVerified={abhaProfile ? true : (defaultValues?.abhaVerified || false)}
                showEnrollButton={abhaEnabled}
                onEnrollClick={() => setIsAbhaModalOpen(true)}
                size="sm"
              />
            </div>
            <input
              {...register("abha_id")}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400 text-sm"
              placeholder="Enter ABHA ID"
            />
          </label>

          <label className="space-y-1">
            <span className="text-slate-600">Address</span>
            <input
              {...register("address")}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400 text-sm"
              placeholder="Street address"
            />
          </label>


          <label className="space-y-1">
            <span className="text-slate-600">City</span>
            <input
              {...register("city")}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400 text-sm"
              placeholder="City name"
            />
          </label>

          <label className="space-y-1">
            <span className="text-slate-600">State</span>
            <input
              {...register("state")}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400 text-sm"
              placeholder="State"
            />
          </label>

          <label className="space-y-1">
            <span className="text-slate-600">Pincode</span>
            <input
              {...register("pincode")}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400 text-sm"
              placeholder="Pincode"
            />
          </label>
        </div>

      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={() => reset()}
          disabled={createPatient.isPending || updatePatient.isPending}
          className="rounded-xl border border-slate-200 px-6 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
        >
          Reset
        </button>
        <button
          type="submit"
          disabled={createPatient.isPending || updatePatient.isPending}
          className="rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow-md disabled:opacity-50"
        >
          {createPatient.isPending || updatePatient.isPending ? (
            <span className="flex items-center gap-2">
              <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Saving...
            </span>
          ) : defaultValues ? (
            "Update Patient"
          ) : (
            "Add Patient"
          )}
        </button>
      </div>

      {/* Optional ABHA Enrollment Modal */}
      <AbhaEnrollmentModal
        isOpen={isAbhaModalOpen}
        onClose={() => setIsAbhaModalOpen(false)}
        onSuccess={handleAbhaSuccess}
        patientId={defaultValues?.id}
        initialMobile={watch("mobile") || defaultValues?.mobile || ""}
        initialName={`${watch("first_name") || ""} ${watch("last_name") || ""}`.trim() || defaultValues?.name || ""}
      />
    </form>
  );
}

