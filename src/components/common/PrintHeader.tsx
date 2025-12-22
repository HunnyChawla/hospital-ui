"use client";

import { Tenant } from "@/services/tenantsApi";
import { useTenant } from "@/hooks/useTenant";

interface PrintHeaderProps {
  tenant: Tenant | null;
  documentType: string;
}

export function PrintHeader({ tenant, documentType }: PrintHeaderProps) {
  const { logoDataUrl } = useTenant();

  // Format address
  const formatAddress = () => {
    if (!tenant) return null;
    const parts = [
      tenant.address,
      tenant.city,
      tenant.state,
      tenant.pincode,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : null;
  };

  const address = formatAddress();

  return (
    <div className="mb-6 border-b-2 border-slate-800 pb-4">
      {/* Logo and Hospital Name */}
      <div className="flex flex-col items-center justify-center">
        {logoDataUrl && (
          <div className="mb-3 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoDataUrl}
              alt={`${tenant?.name || "Hospital"} Logo`}
              className="h-auto max-h-24 w-auto max-w-24 object-contain"
            />
          </div>
        )}
        <h1 className="text-3xl font-bold text-slate-900">
          {tenant?.name?.toUpperCase() || "HOSPITAL"}
        </h1>
      </div>

      {/* Address and Contact Information */}
      {(address || tenant?.phone_no || tenant?.email || tenant?.website) && (
        <div className="mt-3 space-y-1 text-center text-xs text-slate-700">
          {address && (
            <p className="font-medium">{address}</p>
          )}
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
            {tenant?.phone_no && (
              <span>Phone: {tenant.phone_no}</span>
            )}
            {tenant?.email && (
              <span>Email: {tenant.email}</span>
            )}
            {tenant?.website && (
              <span>Website: {tenant.website}</span>
            )}
          </div>
        </div>
      )}

      {/* Document Type */}
      <p className="mt-2 text-center text-sm text-slate-600">{documentType}</p>
    </div>
  );
}

