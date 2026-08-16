"use client";

import { useForm } from "react-hook-form";
import { useEffect } from "react";
import { usersApi, User, CreateUserRequest, UpdateUserRequest, UserRole, UserStatus } from "@/services/usersApi";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";

interface UserFormProps {
  defaultValues?: User;
  onSuccess?: () => void;
}

export function UserForm({ defaultValues, onSuccess }: UserFormProps) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateUserRequest & UpdateUserRequest & { password?: string }>();

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

        // Dispatch custom event to refresh users list
        window.dispatchEvent(new CustomEvent("user:created"));
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

        // Dispatch custom event to refresh users list
        window.dispatchEvent(new CustomEvent("user:created"));
      }

      onSuccess?.();
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="space-y-1">
          <span className="text-slate-600">Full Name <span className="text-rose-500">*</span></span>
          <input
            type="text"
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
            {...register("cabin")}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
            placeholder="Room 101"
          />
        </label>

        <label className="space-y-1">
          <span className="text-slate-600">Email <span className="text-rose-500">*</span></span>
          <input
            type="email"
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
          <label className="space-y-1">
            <span className="text-slate-600">Password <span className="text-rose-500">*</span></span>
            <input
              type="password"
              {...register("password", {
                required: !defaultValues ? "Password is required" : false,
                minLength: {
                  value: 6,
                  message: "Password must be at least 6 characters"
                }
              })}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
              placeholder="Enter password"
            />
            {errors.password && (
              <p className="text-xs text-rose-500">{errors.password.message as string}</p>
            )}
          </label>
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

