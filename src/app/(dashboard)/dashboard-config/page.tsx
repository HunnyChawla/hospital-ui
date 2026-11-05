"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/hooks/usePermissions";
import { RoleDashboardConfigEditor } from "@/components/dashboard-config/RoleDashboardConfigEditor";
import { ShieldAlert } from "lucide-react";

export default function DashboardConfigPage() {
  const router = useRouter();
  const { isAdmin, isPlatformOwner, initialized, loading } = usePermissions();

  const isAuthorized = isAdmin || isPlatformOwner;

  if (loading || !initialized) {
    return (
      <div className="flex h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <ShieldAlert className="h-12 w-12 text-rose-500 mb-3" />
        <h2 className="text-lg font-bold text-slate-900">Access Denied</h2>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          Only platform administrators and hospital managers have permission to configure dashboard widget layouts.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-2">
      <RoleDashboardConfigEditor />
    </div>
  );
}
