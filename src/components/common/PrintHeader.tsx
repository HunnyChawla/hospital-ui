"use client";

import { Tenant } from "@/services/tenantsApi";
import { useTenant } from "@/hooks/useTenant";
import type { HeaderAlign, HeaderPosition } from "@/types/printLayout";

interface PrintHeaderProps {
  tenant: Tenant | null;
  documentType: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  /**
   * "horizontal" is the full-width band across the top of the page (the
   * default, and what every existing caller gets). "vertical" is the narrow
   * band used when the letterhead sits on the left or right edge.
   */
  variant?: "horizontal" | "vertical";
  align?: HeaderAlign;
  /** Which edge a vertical band sits on — decides which side the divider is on. */
  side?: Extract<HeaderPosition, "left" | "right">;
  showLogo?: boolean;
  showAddress?: boolean;
  showContact?: boolean;
  showDivider?: boolean;
}

const ALIGN_TEXT: Record<HeaderAlign, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

const ALIGN_ITEMS: Record<HeaderAlign, string> = {
  left: "items-start",
  center: "items-center",
  right: "items-end",
};

const ALIGN_JUSTIFY: Record<HeaderAlign, string> = {
  left: "justify-start",
  center: "justify-center",
  right: "justify-end",
};

export function PrintHeader({
  tenant,
  documentType,
  invoiceNumber,
  invoiceDate,
  variant = "horizontal",
  align = "center",
  side = "left",
  showLogo = true,
  showAddress = true,
  showContact = true,
  showDivider = true,
}: PrintHeaderProps) {
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

  if (variant === "vertical") {
    return (
      <VerticalPrintHeader
        tenant={tenant}
        documentType={documentType}
        address={showAddress ? address : null}
        logoDataUrl={showLogo ? logoDataUrl : null}
        align={align}
        side={side}
        showContact={showContact}
        showDivider={showDivider}
      />
    );
  }

  return (
    <div className={`mb-6 pb-4 ${showDivider ? "border-b-2 border-slate-800" : ""}`}>
      {/* Logo and Hospital Name */}
      <div className={`flex flex-col ${ALIGN_ITEMS[align]} ${ALIGN_JUSTIFY[align]}`}>
        {showLogo && logoDataUrl && (
          <div className={`mb-3 flex items-center ${ALIGN_JUSTIFY[align]}`}>
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
      {((showAddress && address) ||
        (showContact && (tenant?.phone_no || tenant?.email || tenant?.website))) && (
        <div className={`mt-3 space-y-1 ${ALIGN_TEXT[align]} text-xs text-slate-700`}>
          {showAddress && address && (
            <p className="font-medium">{address}</p>
          )}
          {showContact && (
            <div className={`flex flex-wrap items-center ${ALIGN_JUSTIFY[align]} gap-x-3 gap-y-1`}>
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
          )}
        </div>
      )}

      {/* Document Type */}
      <p className={`mt-2 ${ALIGN_TEXT[align]} text-sm text-slate-600`}>{documentType}</p>

      {/* Invoice Number & Date (if provided) */}
      {(invoiceNumber || invoiceDate) && (
        <div className="mt-3 flex justify-between text-xs">
          {invoiceNumber && (
            <div>
              <p className="text-[10px] text-slate-600">Invoice Number</p>
              <p className="text-sm font-bold text-slate-900">{invoiceNumber}</p>
            </div>
          )}
          {invoiceDate && (
            <div className="text-right">
              <p className="text-[10px] text-slate-600">Invoice Date</p>
              <p className="text-sm font-bold text-slate-900">{invoiceDate}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface VerticalPrintHeaderProps {
  tenant: Tenant | null;
  documentType: string;
  address: string | null;
  logoDataUrl: string | null;
  align: HeaderAlign;
  side: "left" | "right";
  showContact: boolean;
  showDivider: boolean;
}

/**
 * Narrow letterhead band for left/right layouts.
 *
 * Everything is stacked and typographically scaled down, because the band is
 * typically 45mm wide against ~180mm for the horizontal variant. The divider
 * sits on the edge facing the document content.
 */
function VerticalPrintHeader({
  tenant,
  documentType,
  address,
  logoDataUrl,
  align,
  side,
  showContact,
  showDivider,
}: VerticalPrintHeaderProps) {
  const dividerClass = showDivider
    ? side === "left"
      ? "border-r border-slate-300"
      : "border-l border-slate-300"
    : "";

  const hasContact = tenant?.phone_no || tenant?.email || tenant?.website;

  return (
    <div className={`flex h-full flex-col ${ALIGN_ITEMS[align]} ${dividerClass}`}>
      {logoDataUrl && (
        <div className={`mb-2 flex w-full ${ALIGN_JUSTIFY[align]}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoDataUrl}
            alt={`${tenant?.name || "Hospital"} Logo`}
            className="h-auto max-h-16 w-auto max-w-full object-contain"
          />
        </div>
      )}

      <h1
        className={`w-full ${ALIGN_TEXT[align]} text-base font-bold leading-tight text-slate-900 break-words`}
      >
        {tenant?.name?.toUpperCase() || "HOSPITAL"}
      </h1>

      {showDivider && <div className="my-2 h-px w-full bg-slate-300" />}

      {address && (
        <p
          className={`w-full ${ALIGN_TEXT[align]} text-[9px] font-medium leading-snug text-slate-700 break-words`}
        >
          {address}
        </p>
      )}

      {showContact && hasContact && (
        <div
          className={`mt-2 w-full space-y-0.5 ${ALIGN_TEXT[align]} text-[9px] leading-snug text-slate-700 break-words`}
        >
          {tenant?.phone_no && <p>Ph: {tenant.phone_no}</p>}
          {tenant?.email && <p className="break-all">{tenant.email}</p>}
          {tenant?.website && <p className="break-all">{tenant.website}</p>}
        </div>
      )}

      {documentType && (
        <p className={`mt-2 w-full ${ALIGN_TEXT[align]} text-[9px] text-slate-600`}>
          {documentType}
        </p>
      )}
    </div>
  );
}
