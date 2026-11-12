"use client";

import { useState, useEffect } from "react";
import { LogIn, ShieldAlert, X, Building2, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { User } from "@/services/usersApi";
import { authApi } from "@/services/authApi";
import { ROLE_LABELS } from "@/constants/screens";
import { getErrorMessage } from "@/utils/errorHandler";

interface ImpersonateConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  tenantId: string;
  tenantName?: string;
}

export function ImpersonateConfirmModal({
  isOpen,
  onClose,
  user,
  tenantId,
  tenantName,
}: ImpersonateConfirmModalProps) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setReason("");
      setSubmitting(false);
    }
  }, [isOpen, user.id]);

  if (!isOpen) return null;

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    // Open blank window synchronously during click gesture to prevent popup blocking
    const newTab = window.open("", "_blank");
    if (!newTab) {
      toast.error("Popup blocked. Please allow popups for this site and try again.");
      return;
    }
    try {
      newTab.opener = null;
    } catch {
      // Ignore strict cross-context opener assignment warnings
    }

    setSubmitting(true);
    try {
      const res = await authApi.impersonate({
        user_id: user.id,
        tenant_id: tenantId,
        reason: reason.trim() || undefined,
      });

      const basePath = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/$/, "");
      const targetUrl = `${window.location.origin}${basePath}/impersonate#code=${encodeURIComponent(
        res.code
      )}`;
      newTab.location.replace(targetUrl);
      toast.success(`Opened isolated session for ${user.full_name} in a new tab`);
      onClose();
    } catch (err: any) {
      try {
        newTab.close();
      } catch {
        // Ignore close errors
      }
      toast.error(getErrorMessage(err) || "Failed to start impersonation session");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 bg-indigo-50/70 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <LogIn className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Login As Staff User</h2>
              <p className="text-xs text-slate-500">Audited single-use tab impersonation</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 transition hover:bg-white hover:text-slate-600"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleConfirm} className="p-5 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-slate-700">
              <UserCheck className="h-4 w-4 text-indigo-600 shrink-0" />
              <span className="font-semibold text-slate-900">{user.full_name}</span>
              <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
                {ROLE_LABELS[user.role] || user.role}
              </span>
            </div>
            <p className="pl-6 text-slate-500 truncate">{user.email}</p>
            {tenantName && (
              <div className="flex items-center gap-2 text-slate-600 pt-1 border-t border-slate-200/80">
                <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span>
                  Tenant: <strong className="text-slate-800">{tenantName}</strong>
                </span>
              </div>
            )}
          </div>

          <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900">
            <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <ul className="space-y-1 list-disc list-inside">
              <li>Opens in a new tab isolated from your Platform Owner session.</li>
              <li>Session is audit-logged and expires automatically after 30 minutes.</li>
              <li>Real user sessions and password settings remain protected.</li>
            </ul>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Audit Reason / Support Ticket <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              type="text"
              maxLength={250}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Support ticket #412 - verify queue view"
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
            >
              <LogIn className="h-4 w-4" />
              <span>{submitting ? "Opening Session..." : "Open User Session"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
