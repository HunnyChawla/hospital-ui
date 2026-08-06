"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShieldOff } from "lucide-react";
import { AbdmConfigSettings } from "@/components/abha/AbdmConfigSettings";
import { usePermissions } from "@/hooks/usePermissions";
import { useAbhaFlags } from "@/hooks/useFeatureFlags";

export default function AbdmSettingsPage() {
  const { isAdmin, initialized } = usePermissions();
  const { enabled: abhaEnabled, isLoading: abhaLoading } = useAbhaFlags();
  const router = useRouter();

  // Redirect non-admin users
  useEffect(() => {
    if (initialized && !isAdmin) {
      router.push("/");
    }
  }, [isAdmin, initialized, router]);

  if (!initialized || abhaLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-sky-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  if (!abhaEnabled) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
        <ShieldOff className="mx-auto h-8 w-8 text-slate-400" />
        <h2 className="mt-3 text-sm font-semibold text-slate-900">
          ABHA / ABDM module is disabled
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Consult Cura Team to enable the ABDM module.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <AbdmConfigSettings />
    </div>
  );
}
