"use client";

import { useAppSelector } from "@/redux/hooks";

export function useTenant() {
  const { tenant, logoDataUrl, loading, error } = useAppSelector((s) => s.tenant);

  return {
    tenant,
    hospitalName: tenant?.name || "Hospital",
    logoDataUrl,
    loading,
    error,
  };
}

