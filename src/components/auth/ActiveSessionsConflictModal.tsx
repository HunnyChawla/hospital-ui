"use client";

import { useState } from "react";
import { ActiveSession, SessionPolicyInfo, authApi } from "@/services/authApi";
import { Laptop, Smartphone, Tablet, ShieldAlert, Monitor, LogOut, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface ActiveSessionsConflictModalProps {
  isOpen: boolean;
  sessions: ActiveSession[];
  policy?: SessionPolicyInfo;
  token?: string;
  onProceed: () => void;
  onCancel: () => void;
}

export function ActiveSessionsConflictModal({
  isOpen,
  sessions,
  policy,
  token,
  onProceed,
  onCancel,
}: ActiveSessionsConflictModalProps) {
  const [terminating, setTerminating] = useState(false);
  const [invalidatedIds, setInvalidatedIds] = useState<string[]>([]);

  if (!isOpen) return null;

  const allowKeepAlive = policy?.allow_keep_alive ?? false;
  const isSingleSessionPolicy = policy?.max_concurrent_sessions === 1 || !allowKeepAlive;

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType.toLowerCase()) {
      case "mobile":
        return <Smartphone className="h-5 w-5 text-sky-600" />;
      case "tablet":
        return <Tablet className="h-5 w-5 text-purple-600" />;
      case "tv":
        return <Monitor className="h-5 w-5 text-amber-600" />;
      default:
        return <Laptop className="h-5 w-5 text-slate-700" />;
    }
  };

  const formatLastActive = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);

      if (diffMins < 1) return "Active just now";
      if (diffMins < 60) return `Active ${diffMins} min${diffMins > 1 ? "s" : ""} ago`;
      if (diffHours < 24) return `Active ${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
      return `Active on ${date.toLocaleDateString()}`;
    } catch {
      return "Active recently";
    }
  };

  const handleInvalidateAll = async () => {
    setTerminating(true);
    try {
      await authApi.invalidateOtherSessions(token);
      toast.success("Other device sessions signed out successfully");
      onProceed();
    } catch (err) {
      toast.error("Failed to invalidate other sessions. Continuing login.");
      onProceed();
    } finally {
      setTerminating(false);
    }
  };

  const handleInvalidateSingle = async (sessionId: string) => {
    try {
      await authApi.invalidateSessions([sessionId], token);
      setInvalidatedIds((prev) => [...prev, sessionId]);
      toast.success("Device signed out");
    } catch (err) {
      toast.error("Failed to sign out device");
    }
  };

  const remainingSessions = sessions.filter((s) => !invalidatedIds.includes(s.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-900/10">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
            isSingleSessionPolicy ? "bg-amber-100 text-amber-600" : "bg-sky-100 text-sky-600"
          }`}>
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {isSingleSessionPolicy
                ? "Single Active Session Policy Enforced"
                : "Active Sessions on Other Devices"}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {isSingleSessionPolicy
                ? "Your organization restricts your account to 1 active session. Signing in here will terminate your other session(s)."
                : `You currently have ${sessions.length} active session${sessions.length > 1 ? "s" : ""} on other devices.`}
            </p>
          </div>
        </div>

        {/* Sessions List */}
        <div className="mt-5 max-h-60 space-y-2.5 overflow-y-auto pr-1">
          {sessions.map((s) => {
            const isInvalidated = invalidatedIds.includes(s.id);
            return (
              <div
                key={s.id}
                className={`flex items-center justify-between rounded-xl border p-3 transition ${
                  isInvalidated
                    ? "border-slate-200 bg-slate-50 opacity-60"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                    {getDeviceIcon(s.device_type)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900">{s.device_name}</p>
                      {isInvalidated && (
                        <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                          <CheckCircle2 className="h-3 w-3" /> Signed out
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>IP: {s.ip_address}</span>
                      <span>•</span>
                      <span>{formatLastActive(s.last_active_at)}</span>
                    </div>
                  </div>
                </div>

                {!isSingleSessionPolicy && !isInvalidated && (
                  <button
                    type="button"
                    onClick={() => handleInvalidateSingle(s.id)}
                    className="flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Sign Out
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {isSingleSessionPolicy ? (
            <>
              <button
                type="button"
                onClick={onCancel}
                disabled={terminating}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel Login
              </button>
              <button
                type="button"
                onClick={handleInvalidateAll}
                disabled={terminating}
                className="flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-amber-700 disabled:opacity-50"
              >
                <LogOut className="h-4 w-4" />
                {terminating ? "Signing Out Others..." : "Sign Out Other Devices & Continue"}
              </button>
            </>
          ) : (
            <>
              {remainingSessions.length === 0 ? (
                <button
                  type="button"
                  onClick={onProceed}
                  className="rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-700"
                >
                  Continue to Dashboard
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={onProceed}
                    disabled={terminating}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                  >
                    Keep Other Sessions Active & Continue
                  </button>
                  <button
                    type="button"
                    onClick={handleInvalidateAll}
                    disabled={terminating}
                    className="flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-rose-700 disabled:opacity-50"
                  >
                    <LogOut className="h-4 w-4" />
                    {terminating ? "Signing Out..." : "Sign Out Other Devices & Continue"}
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
