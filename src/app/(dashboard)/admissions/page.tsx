"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ManageIPD } from "@/components/ipd/ManageIPD";
import { admissionKeys } from "@/hooks/queries/useAdmissions";

export default function AdmissionsPage() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"wards" | "beds" | "admissions">("admissions");
  const [action, setAction] = useState<string | null>(null);

  // Handle query parameters for tabs and action
  useEffect(() => {
    const tab = searchParams.get("tab");
    const actionParam = searchParams.get("action");

    // Set active tab if provided
    if (tab === "wards" || tab === "beds" || tab === "admissions") {
      setActiveTab(tab);
    }

    // Set action if provided
    if (actionParam) {
      setAction(actionParam);
    }
  }, [searchParams]);

  const handleTabChange = (tab: "wards" | "beds" | "admissions") => {
    setActiveTab(tab);

    // Invalidate queries to refetch data when switching tabs
    if (tab === "admissions") {
      queryClient.invalidateQueries({ queryKey: admissionKeys.lists() });
    }
    // Note: Wards and Beds will use their own query hooks when migrated
  };

  return (
    <div className="mt-6">
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="mb-4">
          <p className="text-lg font-semibold text-slate-900">IPD Management</p>
          <p className="text-xs text-slate-500">Manage wards, beds, and patient admissions</p>
        </div>
        <ManageIPD defaultTab={activeTab} action={action} />
      </div>
    </div>
  );
}
