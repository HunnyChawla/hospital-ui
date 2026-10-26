"use client";

import { useEffect, useState, useCallback } from "react";
import { ActiveSession, authApi } from "@/services/authApi";
import {
  Laptop,
  Smartphone,
  Tablet,
  Monitor,
  LogOut,
  X,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

interface ActiveSessionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ActiveSessionsModal({ isOpen, onClose }: ActiveSessionsModalProps) {
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await authApi.getActiveSessions();
      setSessions(data);
    } catch (err) {
      toast.error("Failed to load active sessions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchSessions();
    }
  }, [isOpen, fetchSessions]);

  if (!isOpen) return null;

  const currentSession = sessions.find((s) => s.is_current);
  const otherSessions = sessions.filter((s) => !s.is_current);

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

  const handleInvalidateSingle = async (sessionId: string) => {
    setActionInProgress(sessionId);
    try {
      await authApi.invalidateSessions([sessionId]);
      toast.success("Device session terminated");
      await fetchSessions();
    } catch (err) {
      toast.error("Failed to terminate session");
    } finally {
      setActionInProgress(null);
    }
  };

  const handleInvalidateOthers = async () => {
    setActionInProgress("all_others");
    try {
      await authApi.invalidateOtherSessions();
      toast.success("All other device sessions terminated");
      await fetchSessions();
    } catch (err) {
      toast.error("Failed to terminate other sessions");
    } finally {
      setActionInProgress(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-900/10">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-600">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Active Sessions</h3>
              <p className="text-xs text-slate-500">Manage devices currently logged into your account</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={fetchSessions}
              disabled={loading}
              title="Refresh sessions"
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="mt-4 max-h-96 space-y-4 overflow-y-auto pr-1">
          {/* Current Session */}
          {currentSession && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Current Device</p>
              <div className="mt-2 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                    {getDeviceIcon(currentSession.device_type)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900">{currentSession.device_name}</p>
                      <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                        This Device
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      IP: {currentSession.ip_address} • Active now
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Other Sessions */}
          <div>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Other Devices ({otherSessions.length})
              </p>
              {otherSessions.length > 0 && (
                <button
                  type="button"
                  onClick={handleInvalidateOthers}
                  disabled={actionInProgress !== null}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-700 disabled:opacity-50"
                >
                  Sign Out All Others
                </button>
              )}
            </div>

            {otherSessions.length === 0 ? (
              <div className="mt-2 rounded-xl border border-dashed border-slate-200 p-6 text-center">
                <p className="text-xs text-slate-400">No other active device sessions found</p>
              </div>
            ) : (
              <div className="mt-2 space-y-2">
                {otherSessions.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-xl border border-slate-200 p-3 transition hover:border-slate-300"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                        {getDeviceIcon(s.device_type)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{s.device_name}</p>
                        <p className="text-xs text-slate-500">
                          IP: {s.ip_address} • {formatLastActive(s.last_active_at)}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleInvalidateSingle(s.id)}
                      disabled={actionInProgress === s.id}
                      className="flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      {actionInProgress === s.id ? "Signing Out..." : "Sign Out"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
