"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ManageIPD } from "@/components/ipd/ManageIPD";
import { admissionKeys } from "@/hooks/queries/useAdmissions";

export default function AdmissionsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"wards" | "beds" | "admissions">("admissions");

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
        <ManageIPD defaultTab={activeTab} />
      </div>
    </div>
  );
}
