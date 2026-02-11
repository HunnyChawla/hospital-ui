"use client";

import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import { useCreatePatient, useUpdatePatient, usePatient } from "@/hooks/queries/usePatients";
import { Patient } from "@/types";
import { CreatePatientRequest, patientsApi } from "@/services/patientsApi";
import { Calendar, Clock, User, CalendarDays, Phone, Mail, MapPin, Hash } from "lucide-react";

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

  const { register, handleSubmit, reset, formState: { errors }, setValue, watch } = useForm<CreatePatientRequest>({
    mode: "onChange",
    reValidateMode: "onChange",
  });

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

      reset({
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
      });

      // Populate age fields from DOB
      setDobValue(dob);
      if (dob) {
        const age = calculateAgeFromDob(dob);
        setAgeYears(age.years.toString());
        setAgeMonths(age.months.toString());
        setAgeDays(age.days.toString());
      }
    } else if (!defaultValues) {
      // Reset form for new patient
      reset({
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
      });

      // Clear age fields
      setDobValue("");
      setAgeYears("");
      setAgeMonths("");
      setAgeDays("");
      setAgeError("");
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

    const patientData: CreatePatientRequest = {
      first_name: values.first_name,
      last_name: values.last_name || undefined,
      mobile: values.mobile,
      email: values.email || undefined,
      date_of_birth: values.date_of_birth,
      gender,
      abha_id: values.abha_id || undefined,
      address: values.address || undefined,
      city: values.city || undefined,
      state: values.state || undefined,
      pincode: values.pincode || undefined,
    };

    if (defaultValues) {
      // Update existing patient
      await updatePatient.mutateAsync({
        patientId: defaultValues.id,
        updates: patientData,
      });
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

      // React Query mutation already shows toast and invalidates cache!
      reset();
      onSuccess?.(newPatient);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2"
    >
      {/* UHID Display (read-only, shown only when editing) */}
      {defaultValues && apiData?.uhid && (
        <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-3 sm:col-span-2">
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

      {/* Required Fields Section */}
      <div className="grid grid-cols-1 gap-5 sm:col-span-2 sm:grid-cols-2">
        <div className="sm:col-span-2 flex items-center gap-2 pb-1 border-b border-slate-100">
          <div className="p-1.5 rounded-lg bg-sky-50 text-sky-600">
            <User className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Basic Information</h2>
        </div>

        <label className="space-y-1.5 group">
          <span className="text-[10px] font-bold text-slate-500 uppercase ml-1 transition-colors group-focus-within:text-sky-600">
            First Name <span className="text-rose-500">*</span>
          </span>
          <div className="relative">
            <input
              {...register("first_name", { required: "First name is required" })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/30 pl-3 pr-4 py-2.5 text-sm outline-none transition-all focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-500/5"
              placeholder="e.g. John"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-slate-100 group-focus-within:bg-sky-400 transition-colors" />
          </div>
          {errors.first_name && (
            <span className="flex items-center gap-1.5 text-[10px] font-semibold text-rose-500 ml-1">
              <span className="w-1 h-1 rounded-full bg-rose-500" />
              {errors.first_name.message}
            </span>
          )}
        </label>

        <label className="space-y-1.5 group">
          <span className="text-[10px] font-bold text-slate-500 uppercase ml-1 transition-colors group-focus-within:text-sky-600">Last Name</span>
          <input
            {...register("last_name")}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/30 px-4 py-2.5 text-sm outline-none transition-all focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-500/5"
            placeholder="e.g. Doe"
          />
        </label>

        <label className="space-y-1.5 group">
          <span className="text-[10px] font-bold text-slate-500 uppercase ml-1 transition-colors group-focus-within:text-sky-600">
            Mobile Number <span className="text-rose-500">*</span>
          </span>
          <div className="relative">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
              <Phone className="w-4 h-4" />
            </div>
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
              className="w-full rounded-xl border border-slate-200 bg-slate-50/30 pl-10 pr-4 py-2.5 text-sm outline-none transition-all focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-500/5"
              placeholder="9876543210"
            />
          </div>
          {errors.mobile && (
            <span className="flex items-center gap-1.5 text-[10px] font-semibold text-rose-500 ml-1">
              <span className="w-1 h-1 rounded-full bg-rose-500" />
              {errors.mobile.message}
            </span>
          )}
        </label>

        <label className="space-y-1.5 group">
          <span className="text-[10px] font-bold text-slate-500 uppercase ml-1 transition-colors group-focus-within:text-sky-600">Email Address <span className="text-slate-400 normal-case">(Optional)</span></span>
          <div className="relative">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
              <Mail className="w-4 h-4" />
            </div>
            <input
              type="email"
              {...register("email")}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/30 pl-10 pr-4 py-2.5 text-sm outline-none transition-all focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-500/5"
              placeholder="john.doe@example.com"
            />
          </div>
        </label>
      </div>

      {/* Date of Birth / Age Section */}
      <div className="mt-2 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden sm:col-span-2 group focus-within:border-sky-400 transition-all duration-300">
        <div className="flex border-b border-slate-100 bg-slate-50/50">
          <button
            type="button"
            onClick={() => setInputMode('age')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold uppercase tracking-wider transition-all ${inputMode === 'age'
              ? 'bg-white text-sky-600 border-b-2 border-sky-500 shadow-[0_1px_2px_rgba(0,0,0,0.05)]'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'}`}
          >
            <Clock className={`w-4 h-4 ${inputMode === 'age' ? 'text-sky-500' : 'text-slate-400'}`} />
            Enter Age
          </button>
          <button
            type="button"
            onClick={() => setInputMode('dob')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold uppercase tracking-wider transition-all ${inputMode === 'dob'
              ? 'bg-white text-sky-600 border-b-2 border-sky-500 shadow-[0_1px_2px_rgba(0,0,0,0.05)]'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'}`}
          >
            <Calendar className={`w-4 h-4 ${inputMode === 'dob' ? 'text-sky-500' : 'text-slate-400'}`} />
            Enter Date of Birth
          </button>
        </div>

        <div className="p-5">
          {inputMode === 'age' ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-300">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-4 w-1 bg-sky-500 rounded-full"></div>
                <span className="text-xs font-semibold text-slate-700">How old is the patient?</span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5 focus-within:z-10">
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Years</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="120"
                      value={ageYears}
                      onChange={(e) => handleAgeChange('years', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/30 px-4 py-2.5 text-sm outline-none transition-all focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-500/5"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Months</label>
                  <input
                    type="number"
                    min="0"
                    max="11"
                    value={ageMonths}
                    onChange={(e) => handleAgeChange('months', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/30 px-4 py-2.5 text-sm outline-none transition-all focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-500/5"
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Days</label>
                  <input
                    type="number"
                    min="0"
                    max="31"
                    value={ageDays}
                    onChange={(e) => handleAgeChange('days', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/30 px-4 py-2.5 text-sm outline-none transition-all focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-500/5"
                    placeholder="0"
                  />
                </div>
              </div>

              {dobValue && !ageError && (
                <div className="flex items-center gap-3 rounded-xl bg-indigo-50/50 border border-indigo-100 p-3 transition-all">
                  <CalendarDays className="w-5 h-5 text-indigo-500" />
                  <div>
                    <p className="text-[10px] font-bold text-indigo-600 uppercase leading-none mb-1">Calculated DOB</p>
                    <p className="text-sm font-semibold text-indigo-900">
                      {new Date(dobValue).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-300">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-4 w-1 bg-sky-500 rounded-full"></div>
                <span className="text-xs font-semibold text-slate-700">When was the patient born?</span>
              </div>
              <div className="relative">
                <input
                  type="date"
                  value={dobValue}
                  onChange={(e) => handleDobChange(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/30 px-4 py-3 text-sm outline-none transition-all focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-500/5 appearance-none"
                />
                <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
              </div>

              {dobValue && !ageError && (
                <div className="flex items-center gap-3 rounded-xl bg-emerald-50/50 border border-emerald-100 p-3 transition-all">
                  <User className="w-5 h-5 text-emerald-500" />
                  <div>
                    <p className="text-[10px] font-bold text-emerald-600 uppercase leading-none mb-1">Calculated Age</p>
                    <p className="text-sm font-semibold text-emerald-900">
                      {ageYears}y {ageMonths}m {ageDays}d
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error Messages */}
          {(ageError || errors.date_of_birth) && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-100 px-3 py-2 animate-in shake duration-500">
              <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
              <p className="text-xs text-rose-600 font-medium">
                {ageError || errors.date_of_birth?.message}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Gender Section */}
      <div className="sm:col-span-2">
        <label className="space-y-1.5 group">
          <span className="text-[10px] font-bold text-slate-500 uppercase ml-1 transition-colors group-focus-within:text-sky-600">
            Gender <span className="text-rose-500">*</span>
          </span>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'male', label: 'Male', icon: '♂' },
              { id: 'female', label: 'Female', icon: '♀' },
              { id: 'other', label: 'Other', icon: '⚪' }
            ].map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setValue('gender', g.id as any, { shouldValidate: true })}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border transition-all ${watch('gender') === g.id
                  ? 'bg-sky-50 border-sky-200 text-sky-700 font-bold ring-2 ring-sky-500/10'
                  : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
              >
                <span className="text-sm">{g.icon}</span>
                <span className="text-xs">{g.label}</span>
              </button>
            ))}
          </div>
          {/* Hidden input for react-hook-form */}
          <input type="hidden" {...register("gender", { required: "Gender is required" })} />
          {errors.gender && (
            <span className="flex items-center gap-1.5 text-[10px] font-semibold text-rose-500 ml-1">
              <span className="w-1 h-1 rounded-full bg-rose-500" />
              {errors.gender.message}
            </span>
          )}
        </label>
      </div>

      {/* Optional Fields Section */}
      <div className="mt-2 rounded-2xl border border-slate-100 bg-slate-50/30 p-5 sm:col-span-2 space-y-5">
        <div className="flex items-center gap-2 pb-1 border-b border-slate-200/50">
          <div className="p-1.5 rounded-lg bg-slate-100 text-slate-600">
            <Hash className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-bold text-slate-600 uppercase tracking-tight">Optional Details</h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="space-y-1.5 group">
            <span className="text-[10px] font-bold text-slate-500 uppercase ml-1 transition-colors group-focus-within:text-sky-600">ABHA/Health ID</span>
            <input
              {...register("abha_id")}
              className="w-full rounded-xl border border-slate-200 bg-white/70 px-4 py-2.5 text-sm outline-none transition-all focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-500/5"
              placeholder="Enter ABHA ID"
            />
          </label>
          <label className="space-y-1.5 group">
            <span className="text-[10px] font-bold text-slate-500 uppercase ml-1 transition-colors group-focus-within:text-sky-600">Full Address</span>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                <MapPin className="w-4 h-4" />
              </div>
              <input
                {...register("address")}
                className="w-full rounded-xl border border-slate-200 bg-white/70 pl-10 pr-4 py-2.5 text-sm outline-none transition-all focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-500/5"
                placeholder="Street address"
              />
            </div>
          </label>
          <label className="space-y-1.5 group">
            <span className="text-[10px] font-bold text-slate-500 uppercase ml-1 transition-colors group-focus-within:text-sky-600">City</span>
            <input
              {...register("city")}
              className="w-full rounded-xl border border-slate-200 bg-white/70 px-4 py-2.5 text-sm outline-none transition-all focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-500/5"
              placeholder="City name"
            />
          </label>
          <label className="space-y-1.5 group">
            <span className="text-[10px] font-bold text-slate-500 uppercase ml-1 transition-colors group-focus-within:text-sky-600">State & Pincode</span>
            <div className="flex gap-2">
              <input
                {...register("state")}
                className="flex-[2] rounded-xl border border-slate-200 bg-white/70 px-4 py-2.5 text-sm outline-none transition-all focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-500/5"
                placeholder="State"
              />
              <input
                {...register("pincode")}
                className="flex-1 rounded-xl border border-slate-200 bg-white/70 px-4 py-2.5 text-sm outline-none transition-all focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-500/5"
                placeholder="Pincode"
              />
            </div>
          </label>
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-3 sm:col-span-2 border-t border-slate-100 pt-6">
        <button
          type="button"
          onClick={() => reset()}
          disabled={createPatient.isPending || updatePatient.isPending}
          className="rounded-xl border border-slate-200 px-6 py-2.5 text-sm font-bold text-slate-500 transition-all hover:bg-slate-50 hover:text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Reset
        </button>
        <button
          type="submit"
          disabled={createPatient.isPending || updatePatient.isPending}
          className="relative overflow-hidden rounded-xl bg-slate-900 px-8 py-2.5 text-sm font-bold text-white shadow-lg shadow-slate-200 transition-all hover:bg-slate-800 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed group"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-sky-500/10 to-teal-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          <span className="relative flex items-center gap-2">
            {createPatient.isPending || updatePatient.isPending ? (
              <>
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : defaultValues ? (
              "Save Changes"
            ) : (
              "Register Patient"
            )}
          </span>
        </button>
      </div>
    </form >
  );
}

