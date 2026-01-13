"use client";

import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import {
  tenantsApi,
  Tenant,
  CreateTenantRequest,
  UpdateTenantRequest,
  TenantPlan,
  TenantStatus,
} from "@/services/tenantsApi";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { Building2, Upload } from "lucide-react";

interface TenantFormProps {
  defaultValues?: Tenant;
  onSuccess?: () => void;
}

interface FormData {
  name: string;
  subdomain: string;
  plan: TenantPlan | "";
  status: TenantStatus;
  license_valid_till: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  email: string;
  website: string;
  phone_no: string;
}

export function TenantForm({ defaultValues, onSuccess }: TenantFormProps) {
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>();

  // Load existing logo for edit mode
  useEffect(() => {
    if (defaultValues?.logo) {
      tenantsApi
        .getLogo(defaultValues.id)
        .then((blob) => {
          const reader = new FileReader();
          reader.onloadend = () => setLogoPreview(reader.result as string);
          reader.readAsDataURL(blob);
        })
        .catch(() => {
          // Logo fetch failed
        });
    }
  }, [defaultValues]);

  useEffect(() => {
    if (defaultValues) {
      reset({
        name: defaultValues.name,
        subdomain: defaultValues.subdomain,
        plan: defaultValues.plan || "",
        status: defaultValues.status,
        license_valid_till: defaultValues.license_valid_till
          ? defaultValues.license_valid_till.split("T")[0]
          : "",
        address: defaultValues.address || "",
        city: defaultValues.city || "",
        state: defaultValues.state || "",
        pincode: defaultValues.pincode || "",
        email: defaultValues.email || "",
        website: defaultValues.website || "",
        phone_no: defaultValues.phone_no || "",
      });
    } else {
      reset({
        name: "",
        subdomain: "",
        plan: "basic",
        status: "active",
        license_valid_till: "",
        address: "",
        city: "",
        state: "",
        pincode: "",
        email: "",
        website: "",
        phone_no: "",
      });
    }
  }, [defaultValues, reset]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Logo file must be less than 2MB");
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (values: FormData) => {
    setSubmitting(true);
    try {
      if (defaultValues) {
        // Update tenant
        const updateData: UpdateTenantRequest = {
          name: values.name,
          status: values.status,
          plan: values.plan as TenantPlan || undefined,
          license_valid_till: values.license_valid_till || undefined,
          address: values.address || undefined,
          city: values.city || undefined,
          state: values.state || undefined,
          pincode: values.pincode || undefined,
          email: values.email || undefined,
          website: values.website || undefined,
          phone_no: values.phone_no || undefined,
        };

        if (logoFile) {
          await tenantsApi.updateWithLogo(defaultValues.id, updateData, logoFile);
        } else {
          await tenantsApi.update(defaultValues.id, updateData);
        }
        toast.success("Tenant updated successfully");
      } else {
        // Create tenant
        const createData: CreateTenantRequest = {
          name: values.name,
          subdomain: values.subdomain,
          plan: values.plan as TenantPlan || undefined,
          license_valid_till: values.license_valid_till || undefined,
        };

        const created = await tenantsApi.create(createData);

        // Upload logo if provided
        if (logoFile) {
          await tenantsApi.uploadLogo(created.id, logoFile);
        }

        // Update additional fields if provided
        const additionalFields: UpdateTenantRequest = {};
        if (values.address) additionalFields.address = values.address;
        if (values.city) additionalFields.city = values.city;
        if (values.state) additionalFields.state = values.state;
        if (values.pincode) additionalFields.pincode = values.pincode;
        if (values.email) additionalFields.email = values.email;
        if (values.website) additionalFields.website = values.website;
        if (values.phone_no) additionalFields.phone_no = values.phone_no;

        if (Object.keys(additionalFields).length > 0) {
          await tenantsApi.update(created.id, additionalFields);
        }

        toast.success("Tenant created successfully");
      }

      // Dispatch event with tenant ID to allow cache invalidation
      window.dispatchEvent(
        new CustomEvent("tenant:updated", {
          detail: { tenantId: defaultValues?.id },
        })
      );
      onSuccess?.();
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Logo Upload */}
      <div className="flex items-start gap-6">
        <div className="flex-shrink-0">
          {logoPreview ? (
            <img
              src={logoPreview}
              alt="Logo preview"
              className="h-24 w-24 rounded-xl border border-slate-200 object-contain"
            />
          ) : (
            <div className="h-24 w-24 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-200">
              <Building2 className="h-10 w-10 text-slate-400" />
            </div>
          )}
        </div>
        <div className="flex-1">
          <label className="space-y-1">
            <span className="text-slate-600 font-medium">Logo</span>
            <div className="flex items-center gap-3">
              <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200">
                <Upload className="h-4 w-4" />
                {logoPreview ? "Change Logo" : "Upload Logo"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="hidden"
                />
              </label>
              {logoPreview && (
                <button
                  type="button"
                  onClick={() => {
                    setLogoFile(null);
                    setLogoPreview(null);
                  }}
                  className="text-sm text-rose-600 hover:text-rose-700"
                >
                  Remove
                </button>
              )}
            </div>
            <p className="text-xs text-slate-500">PNG, JPG up to 2MB</p>
          </label>
        </div>
      </div>

      {/* Basic Info */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="space-y-1">
          <span className="text-slate-600">
            Name <span className="text-rose-500">*</span>
          </span>
          <input
            type="text"
            {...register("name", { required: "Name is required" })}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
            placeholder="Hospital Name"
          />
          {errors.name && (
            <p className="text-xs text-rose-500">{errors.name.message as string}</p>
          )}
        </label>

        <label className="space-y-1">
          <span className="text-slate-600">
            Subdomain <span className="text-rose-500">*</span>
          </span>
          <input
            type="text"
            {...register("subdomain", {
              required: "Subdomain is required",
              pattern: {
                value: /^[a-z0-9-]+$/,
                message: "Only lowercase letters, numbers, and hyphens allowed",
              },
            })}
            disabled={!!defaultValues}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400 disabled:bg-slate-50 disabled:text-slate-500"
            placeholder="my-hospital"
          />
          {errors.subdomain && (
            <p className="text-xs text-rose-500">{errors.subdomain.message as string}</p>
          )}
        </label>

        <label className="space-y-1">
          <span className="text-slate-600">Plan</span>
          <select
            {...register("plan")}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
          >
            <option value="">No Plan</option>
            <option value="basic">Basic</option>
            <option value="standard">Standard</option>
            <option value="premium">Premium</option>
          </select>
        </label>

        {defaultValues && (
          <label className="space-y-1">
            <span className="text-slate-600">Status</span>
            <select
              {...register("status")}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </label>
        )}

        <label className="space-y-1">
          <span className="text-slate-600">License Valid Till</span>
          <input
            type="date"
            {...register("license_valid_till")}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
          />
        </label>

        <label className="space-y-1">
          <span className="text-slate-600">Email</span>
          <input
            type="email"
            {...register("email", {
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: "Invalid email address",
              },
            })}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
            placeholder="contact@hospital.com"
          />
          {errors.email && (
            <p className="text-xs text-rose-500">{errors.email.message as string}</p>
          )}
        </label>

        <label className="space-y-1">
          <span className="text-slate-600">Phone</span>
          <input
            type="tel"
            {...register("phone_no")}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
            placeholder="+91 98765 43210"
          />
        </label>

        <label className="space-y-1">
          <span className="text-slate-600">Website</span>
          <input
            type="url"
            {...register("website")}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
            placeholder="https://hospital.com"
          />
        </label>
      </div>

      {/* Address Info */}
      <div className="border-t border-slate-200 pt-4">
        <h3 className="mb-3 text-sm font-medium text-slate-700">Address Information</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="space-y-1 md:col-span-2">
            <span className="text-slate-600">Address</span>
            <input
              type="text"
              {...register("address")}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
              placeholder="123 Healthcare Street"
            />
          </label>

          <label className="space-y-1">
            <span className="text-slate-600">City</span>
            <input
              type="text"
              {...register("city")}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
              placeholder="Mumbai"
            />
          </label>

          <label className="space-y-1">
            <span className="text-slate-600">State</span>
            <input
              type="text"
              {...register("state")}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
              placeholder="Maharashtra"
            />
          </label>

          <label className="space-y-1">
            <span className="text-slate-600">Pincode</span>
            <input
              type="text"
              {...register("pincode")}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
              placeholder="400001"
            />
          </label>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow-md disabled:opacity-50"
        >
          {submitting
            ? defaultValues
              ? "Updating..."
              : "Creating..."
            : defaultValues
            ? "Update Tenant"
            : "Create Tenant"}
        </button>
      </div>
    </form>
  );
}
