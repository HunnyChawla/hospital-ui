"use client";

import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import { useAppDispatch } from "@/redux/hooks";
import { fetchDoctors } from "@/redux/doctorsSlice";
import { usersApi, User, CreateUserRequest, UpdateUserRequest, UserRole, UserStatus } from "@/services/usersApi";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { Eye, EyeOff } from "lucide-react";
import { validatePassword } from "@/utils/passwordPolicy";
import { PasswordRequirements } from "@/components/password/PasswordRequirements";

interface UserFormProps {
  defaultValues?: User;
  onSuccess?: () => void;
}

export function UserForm({ defaultValues, onSuccess }: UserFormProps) {
  const dispatch = useAppDispatch();
  const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<CreateUserRequest & UpdateUserRequest & { password?: string }>();
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
    try {
      if (defaultValues) {
        // Update user
        const updateData: UpdateUserRequest = {
          full_name: values.full_name,
          status: values.status,
          cabin: values.cabin,
        };
        await usersApi.update(defaultValues.id, updateData);
        toast.success("User updated successfully");

        // Dispatch custom event to refresh users list and doctors cache
        window.dispatchEvent(new CustomEvent("user:created"));
        dispatch(fetchDoctors());
      } else {
        // Create new user
        if (!values.password) {
          toast.error("Password is required");
          return;
        }
        const createData: CreateUserRequest = {
          email: values.email,
          password: values.password,
          full_name: values.full_name,
          role: values.role as UserRole,
          status: values.status as UserStatus,
          cabin: values.cabin,
        };
        await usersApi.create(createData);
        toast.success("User created successfully");

        // Dispatch custom event to refresh users list and doctors cache
        window.dispatchEvent(new CustomEvent("user:created"));
        dispatch(fetchDoctors());
      }

      onSuccess?.();
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} autoComplete="off" className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="space-y-1">
          <span className="text-slate-600">Full Name <span className="text-rose-500">*</span></span>
          <input
            type="text"
            autoComplete="off"
            {...register("full_name", { required: "Full name is required" })}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
            placeholder="Dr. John Smith"
          />
          {errors.full_name && (
            <p className="text-xs text-rose-500">{errors.full_name.message as string}</p>
          )}
        </label>

        <label className="space-y-1">
          <span className="text-slate-600">Cabin</span>
          <input
            type="text"
            autoComplete="off"
            {...register("cabin")}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
            placeholder="Room 101"
          />
        </label>

        <label className="space-y-1">
          <span className="text-slate-600">Email <span className="text-rose-500">*</span></span>
          <input
            type="email"
            autoComplete="off"
            {...register("email", {
              required: "Email is required",
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: "Invalid email address"
              }
            })}
            disabled={!!defaultValues}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400 disabled:bg-slate-50 disabled:text-slate-500"
            placeholder="doctor@hospital.com"
          />
          {errors.email && (
            <p className="text-xs text-rose-500">{errors.email.message as string}</p>
          )}
        </label>

        {!defaultValues && (
          <div className="space-y-1">
            <label className="block text-slate-600">
              Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                {...register("password", {
                  required: !defaultValues ? "Password is required" : false,
                  minLength: {
                    value: 12,
                    message: "Password must be at least 12 characters"
                  },
                  validate: (value) => {
                    if (!value && defaultValues) return true;
                    const res = validatePassword(value || "", {
                      email: emailValue,
                      name: nameValue,
                    });
                    return res.isValid || res.errors[0];
                  }
                })}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 pr-10 outline-none focus:border-sky-400"
                placeholder="Enter password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors p-0.5 rounded"
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

        <label className="space-y-1">
          <span className="text-slate-600">Role <span className="text-rose-500">*</span></span>
          <select
            {...register("role", { required: "Role is required" })}
            disabled={!!defaultValues}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400 disabled:bg-slate-50 disabled:text-slate-500"
          >
            <option value="admin">Admin</option>
            <option value="doctor">Doctor</option>
            <option value="nurse">Nurse</option>
            <option value="receptionist">Receptionist</option>
            <option value="optometrist">Optometrist</option>
            <option value="examiner">Examiner</option>
            <option value="lab_technician">Lab Technician</option>
          </select>
          {errors.role && (
            <p className="text-xs text-rose-500">{errors.role.message as string}</p>
          )}
        </label>

        <label className="space-y-1">
          <span className="text-slate-600">Status <span className="text-rose-500">*</span></span>
          <select
            {...register("status", { required: "Status is required" })}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          {errors.status && (
            <p className="text-xs text-rose-500">{errors.status.message as string}</p>
          )}
        </label>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <button
          type="submit"
          className="rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow-md"
        >
          {defaultValues ? "Update User" : "Create User"}
        </button>
      </div>
    </form>
  );
}

