"use client";

import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import { useAppDispatch } from "@/redux/hooks";
import { fetchDoctors } from "@/redux/doctorsSlice";
import {
  usersApi,
  User,
  CreateUserRequest,
  UpdateUserRequest,
  UserRole,
  UserStatus,
} from "@/services/usersApi";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import {
  Eye,
  EyeOff,
  User as UserIcon,
  Mail,
  DoorClosed,
  Shield,
  Activity,
  Lock,
  Info,
  Loader2,
} from "lucide-react";
import { validatePassword } from "@/utils/passwordPolicy";
import { PasswordRequirements } from "@/components/password/PasswordRequirements";

interface UserFormProps {
  defaultValues?: User;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function UserForm({ defaultValues, onSuccess, onCancel }: UserFormProps) {
  const dispatch = useAppDispatch();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<CreateUserRequest & UpdateUserRequest & { password?: string }>();

  const passwordValue = watch("password");
  const emailValue = watch("email");
  const nameValue = watch("full_name");

  useEffect(() => {
    if (defaultValues) {
      // Editing existing user
      reset({
        email: defaultValues.email,
        full_name: defaultValues.full_name,
        role: defaultValues.role,
        status: defaultValues.status,
        cabin: defaultValues.cabin || "",
        password: "", // Don't pre-fill password
      });
    } else {
      // New user
      reset({
        email: "",
        password: "",
        full_name: "",
        role: "doctor",
        status: "active",
        cabin: "",
      });
    }
  }, [defaultValues, reset]);

  const onSubmit = async (values: CreateUserRequest & UpdateUserRequest & { password?: string }) => {
    setIsSubmitting(true);
    try {
      if (defaultValues) {
        // Update user
        const updateData: UpdateUserRequest = {
          full_name: values.full_name,
          status: values.status,
          cabin: values.cabin || undefined,
        };
        await usersApi.update(defaultValues.id, updateData);
        toast.success("Staff profile updated successfully");

        // Refresh cache and trigger event
        window.dispatchEvent(new CustomEvent("user:created"));
        dispatch(fetchDoctors());
      } else {
        // Create new user
        if (!values.password) {
          toast.error("Password is required for new staff members");
          setIsSubmitting(false);
          return;
        }
        const createData: CreateUserRequest = {
          email: values.email,
          password: values.password,
          full_name: values.full_name,
          role: values.role as UserRole,
          status: values.status as UserStatus,
          cabin: values.cabin || undefined,
        };
        await usersApi.create(createData);
        toast.success("Staff account created successfully");

        // Refresh cache and trigger event
        window.dispatchEvent(new CustomEvent("user:created"));
        dispatch(fetchDoctors());
      }

      onSuccess?.();
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} autoComplete="off" className="space-y-4">
      {/* Informational Alert for Existing Users */}
      {defaultValues && (
        <div className="flex items-start gap-2.5 rounded-xl border border-sky-100 bg-sky-50/70 p-3 text-xs text-sky-800">
          <Info className="h-4 w-4 shrink-0 text-sky-600 mt-0.5" />
          <div>
            <p className="font-semibold">Clinical Audit Trail Policy</p>
            <p className="text-sky-700 mt-0.5">
              Email address and role cannot be changed directly on active staff to protect prescription
              and health record traceability. Contact system owner for reassignment.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Full Name */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
            <UserIcon className="h-3.5 w-3.5 text-slate-400" />
            <span>Full Name</span>
            <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            autoComplete="off"
            {...register("full_name", { required: "Full name is required" })}
            className="w-full min-h-[42px] rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
            placeholder="Dr. John Smith"
          />
          {errors.full_name && (
            <p className="text-xs text-rose-500">{errors.full_name.message as string}</p>
          )}
        </div>

        {/* Cabin / Room */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
            <DoorClosed className="h-3.5 w-3.5 text-slate-400" />
            <span>Cabin / Room Number</span>
          </label>
          <input
            type="text"
            autoComplete="off"
            {...register("cabin")}
            className="w-full min-h-[42px] rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
            placeholder="Room 101, OPD Wing B"
          />
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
            <Mail className="h-3.5 w-3.5 text-slate-400" />
            <span>Email Address</span>
            <span className="text-rose-500">*</span>
          </label>
          <input
            type="email"
            autoComplete="off"
            {...register("email", {
              required: "Email is required",
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: "Please enter a valid email address",
              },
            })}
            disabled={!!defaultValues}
            className="w-full min-h-[42px] rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
            placeholder="doctor@hospital.com"
          />
          {errors.email && (
            <p className="text-xs text-rose-500">{errors.email.message as string}</p>
          )}
        </div>

        {/* Role */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
            <Shield className="h-3.5 w-3.5 text-slate-400" />
            <span>Assigned Role</span>
            <span className="text-rose-500">*</span>
          </label>
          <select
            {...register("role", { required: "Role is required" })}
            disabled={!!defaultValues}
            className="w-full min-h-[42px] rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
          >
            <option value="doctor">Doctor</option>
            <option value="nurse">Nurse</option>
            <option value="receptionist">Receptionist</option>
            <option value="pharmacist">Pharmacist</option>
            <option value="pharmacy_manager">Pharmacy Manager</option>
            <option value="optometrist">Optometrist</option>
            <option value="examiner">Examiner</option>
            <option value="lab_technician">Lab Technician</option>
            <option value="admin">Administrator</option>
          </select>
          {errors.role && (
            <p className="text-xs text-rose-500">{errors.role.message as string}</p>
          )}
        </div>

        {/* Status */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
            <Activity className="h-3.5 w-3.5 text-slate-400" />
            <span>Account Status</span>
            <span className="text-rose-500">*</span>
          </label>
          <select
            {...register("status", { required: "Status is required" })}
            className="w-full min-h-[42px] rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
          >
            <option value="active">Active (Access Granted)</option>
            <option value="inactive">Inactive (Access Suspended)</option>
          </select>
          {errors.status && (
            <p className="text-xs text-rose-500">{errors.status.message as string}</p>
          )}
        </div>

        {/* Password (Only in Create Mode) */}
        {!defaultValues && (
          <div className="space-y-1.5 md:col-span-2">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <Lock className="h-3.5 w-3.5 text-slate-400" />
              <span>Initial Password</span>
              <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                {...register("password", {
                  required: !defaultValues ? "Password is required" : false,
                  minLength: {
                    value: 12,
                    message: "Password must be at least 12 characters",
                  },
                  validate: (value) => {
                    if (!value && defaultValues) return true;
                    const res = validatePassword(value || "", {
                      email: emailValue,
                      name: nameValue,
                    });
                    return res.isValid || res.errors[0];
                  },
                })}
                className="w-full min-h-[42px] rounded-xl border border-slate-200 bg-white py-2.5 pl-3.5 pr-10 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                placeholder="Set secure password (min 12 chars)"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors p-1 rounded"
                aria-label={showPassword ? "Hide password" : "Show password"}
                title={showPassword ? "Hide password" : "Show password"}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-rose-500">{errors.password.message as string}</p>
            )}
            <PasswordRequirements
              password={passwordValue || ""}
              context={{ email: emailValue, name: nameValue }}
            />
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 pt-4 border-t border-slate-100">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="min-h-[42px] rounded-xl border border-slate-200 bg-white px-5 py-2 text-xs sm:text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-6 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-md shadow-sky-500/20 transition hover:shadow-lg hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Saving...</span>
            </>
          ) : defaultValues ? (
            "Save Changes"
          ) : (
            "Create Staff Member"
          )}
        </button>
      </div>
    </form>
  );
}
