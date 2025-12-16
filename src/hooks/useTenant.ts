"use client";

import { useEffect, useState } from "react";
import { tenantsApi, Tenant } from "@/services/tenantsApi";

export function useTenant() {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTenant = async () => {
      try {
        setLoading(true);
        const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
        
        if (!tenantId) {
          setError("No tenant ID found");
          setLoading(false);
          return;
        }

        const tenantData = await tenantsApi.getById(tenantId);
        setTenant(tenantData);
        setError(null);
      } catch (err) {
        console.error("Failed to fetch tenant:", err);
        setError("Failed to load tenant information");
      } finally {
        setLoading(false);
      }
    };

    fetchTenant();
  }, []);

  return {
    tenant,
    hospitalName: tenant?.name || "Hospital",
    loading,
    error,
  };
}

