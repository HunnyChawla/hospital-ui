"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AbdmConfigSettings } from "@/components/abha/AbdmConfigSettings";
import { CounterManagement } from "@/components/abha/CounterManagement";
import { usePermissions } from "@/hooks/usePermissions";
import { useAbdmFlags } from "@/hooks/useFeatureFlags";
import { ShieldAlert } from "lucide-react";

export default function AbdmSettingsPage() {
  const { isAdmin, initialized } = usePermissions();
  const { enabled: abdmEnabled, isLoading: flagsLoading } = useAbdmFlags();
  const router = useRouter();

  // Redirect non-admin users
  useEffect(() => {
    if (initialized && !isAdmin) {
      router.push("/");
    }
  }, [isAdmin, initialized, router]);

  if (!initialized || flagsLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-sky-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  if (!abdmEnabled) {
    return (
      <div className="max-w-2xl mx-auto mt-12 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xs">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 mb-4">
          <ShieldAlert className="h-7 w-7 text-slate-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">ABDM Integration Disabled</h2>
        <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
          Ayushman Bharat Digital Mission (ABDM) features are currently turned off for this hospital. Please contact your Platform Owner to enable ABDM in Feature Flags.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl pb-10">
      <AbdmConfigSettings />
      <CounterManagement />
    </div>
  );
}
