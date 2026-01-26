"use client";

import { useForm } from "react-hook-form";
import { useState } from "react";
import { Modal } from "@/components/common/Modal";
import { usersApi, CreateUserRequest } from "@/services/usersApi";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";

interface CreateTenantUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  tenantName: string;
}

export function CreateTenantUserModal({
  isOpen,
  onClose,
  tenantId,
  tenantName,
}: CreateTenantUserModalProps) {
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateUserRequest>({
    defaultValues: {
      email: "",
      password: "",
      full_name: "",
      role: "doctor",
      status: "active",
      cabin: "",
    },
  });

  const onSubmit = async (values: CreateUserRequest) => {
    setSubmitting(true);
    try {
      await usersApi.create(values, tenantId);
      toast.success(`User created successfully in ${tenantName}`);
      reset();
      onClose();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Create User in ${tenantName}`}
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="rounded-xl bg-sky-50 border border-sky-200 p-3 mb-4">
          <p className="text-sm text-sky-700">
            This user will be created in <strong>{tenantName}</strong> and will only have access to that tenant.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="space-y-1">
            <span className="text-slate-600">
              Full Name <span className="text-rose-500">*</span>
            </span>
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
            <span className="text-slate-600">
              Email <span className="text-rose-500">*</span>
            </span>
            <input
              type="email"
              {...register("email", {
                required: "Email is required",
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: "Invalid email address",
                },
              })}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
              placeholder="doctor@hospital.com"
            />
            {errors.email && (
              <p className="text-xs text-rose-500">{errors.email.message as string}</p>
            )}
          </label>

          <label className="space-y-1">
            <span className="text-slate-600">
              Password <span className="text-rose-500">*</span>
            </span>
            <input
              type="password"
              {...register("password", {
                required: "Password is required",
                minLength: {
                  value: 6,
                  message: "Password must be at least 6 characters",
                },
              })}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
              placeholder="Enter password"
            />
            {errors.password && (
              <p className="text-xs text-rose-500">{errors.password.message as string}</p>
            )}
          </label>

          <label className="space-y-1">
            <span className="text-slate-600">
              Role <span className="text-rose-500">*</span>
            </span>
            <select
              {...register("role", { required: "Role is required" })}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
            >
              <option value="admin">Admin</option>
              <option value="doctor">Doctor</option>
              <option value="nurse">Nurse</option>
              <option value="receptionist">Receptionist</option>
              <option value="optometrist">Optometrist</option>
            </select>
            {errors.role && (
              <p className="text-xs text-rose-500">{errors.role.message as string}</p>
            )}
          </label>

          <label className="space-y-1">
            <span className="text-slate-600">
              Status <span className="text-rose-500">*</span>
            </span>
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
            type="button"
            onClick={handleClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow-md disabled:opacity-50"
          >
            {submitting ? "Creating..." : "Create User"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
