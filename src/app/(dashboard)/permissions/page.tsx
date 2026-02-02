"use client";

import { useState } from "react";
import { Shield, Users, UserCog } from "lucide-react";
import { RolePermissionsPanel } from "@/components/permissions/RolePermissionsPanel";
import { UserPermissionsPanel } from "@/components/permissions/UserPermissionsPanel";
import { usePermissions } from "@/hooks/usePermissions";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

type Tab = "roles" | "users";

export default function PermissionsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("roles");
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

  const tabs: Array<{ value: Tab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { value: "roles", label: "Role Permissions", icon: UserCog },
    { value: "users", label: "User Permissions", icon: Users },
  ];

  return (
    <div className="grid gap-3">
      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-sky-500" />
            <div>
              <p className="text-lg font-semibold text-slate-900">Screen Permissions</p>
              <p className="text-xs text-slate-500">
                Manage role-based and user-specific screen access
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-slate-200">
          <nav className="-mb-px flex space-x-1" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={`
                    flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition-colors
                    ${
                      activeTab === tab.value
                        ? "border-sky-500 text-sky-600"
                        : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
                    }
                  `}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === "roles" && <RolePermissionsPanel />}
        {activeTab === "users" && <UserPermissionsPanel />}
      </div>
    </div>
  );
}
