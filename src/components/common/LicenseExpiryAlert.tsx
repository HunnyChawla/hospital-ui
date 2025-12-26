"use client";

import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { useTenant } from "@/hooks/useTenant";
import { isExpiringSoon, isExpired, getExpiryMessage, getDaysUntilExpiry } from "@/utils/license";
import { formatDate } from "@/utils/format";

export function LicenseExpiryAlert() {
  const { tenant } = useTenant();
  const [dismissed, setDismissed] = useState(false);
  
  // Early returns after hooks
  if (!tenant?.license_valid_till || dismissed) {
    return null;
  }
  
  const daysUntil = getDaysUntilExpiry(tenant.license_valid_till);
  const expired = isExpired(tenant.license_valid_till);
  const expiringSoon = isExpiringSoon(tenant.license_valid_till);
  
  // Only show alert if expired or expiring within 7 days
  if (!expired && !expiringSoon) {
    return null;
  }
  
  const message = getExpiryMessage(tenant.license_valid_till);
  const expiryDate = formatDate(tenant.license_valid_till);
  
  // Determine styling based on urgency
  const isUrgent = expired || (daysUntil !== null && daysUntil <= 3);
  const bgColor = isUrgent ? "bg-rose-50 border-rose-200" : "bg-amber-50 border-amber-200";
  const textColor = isUrgent ? "text-rose-800" : "text-amber-800";
  const iconColor = isUrgent ? "text-rose-600" : "text-amber-600";
  
  return (
    <div className={`mx-4 mb-4 rounded-xl border ${bgColor} p-4 shadow-sm`}>
      <div className="flex items-start gap-3">
        <AlertTriangle className={`h-5 w-5 shrink-0 ${iconColor} mt-0.5`} />
        <div className="flex-1 min-w-0">
          <h3 className={`font-semibold ${textColor} mb-1`}>
            {expired ? "License Expired" : "License Expiring Soon"}
          </h3>
          <p className={`text-sm ${textColor} mb-2`}>
            {message && <span className="font-medium">{message}.</span>}
            {!expired && <span className="ml-1">Expiry date: {expiryDate}</span>}
            {expired && <span className="ml-1">Expired on: {expiryDate}</span>}
          </p>
          <p className={`text-xs ${textColor} opacity-90`}>
            Please renew your license to continue using all features.
          </p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className={`shrink-0 rounded-lg p-1 transition hover:bg-white/50 ${textColor}`}
          aria-label="Dismiss alert"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

