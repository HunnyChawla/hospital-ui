"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AbdmConfigSettings } from "@/components/abha/AbdmConfigSettings";
import { CounterManagement } from "@/components/abha/CounterManagement";
import { usePermissions } from "@/hooks/usePermissions";

export default function AbdmSettingsPage() {
  const { isAdmin, initialized } = usePermissions();
  const router = useRouter();

  // Redirect non-admin users
  useEffect(() => {
    if (initialized && !isAdmin) {
      router.push("/");
    }
  }, [isAdmin, initialized, router]);

  if (!initialized) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-sky-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="grid gap-3">
      <AbdmConfigSettings />
      <CounterManagement />
    </div>
  );
}
