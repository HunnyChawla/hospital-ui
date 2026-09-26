"use client";

import { useState, useEffect } from "react";
import { useAppDispatch } from "@/redux/hooks";
import { clearConsentRequired, updateToken } from "@/redux/authSlice";
import { legalApi, ActiveDocumentsResponse, PendingConsentsResponse } from "@/services/legalApi";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { ShieldCheck, Scale, FileText, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

interface ForceAcceptTermsModalProps {
  isOpen: boolean;
}

export function ForceAcceptTermsModal({ isOpen }: ForceAcceptTermsModalProps) {
  const dispatch = useAppDispatch();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"terms" | "privacy">("terms");
  const [activeDocs, setActiveDocs] = useState<ActiveDocumentsResponse | null>(null);
  const [pendingDocs, setPendingDocs] = useState<PendingConsentsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Separate acceptance states for each document
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen && mounted) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen, mounted]);

  // Fetch active documents and pending consents
  useEffect(() => {
    if (!isOpen) return;

    let isSubscribed = true;
    const fetchData = async () => {
      setLoading(true);
      try {
        const [docsRes, pendingRes] = await Promise.all([
          legalApi.getActiveDocuments(),
          legalApi.getPendingConsents().catch(() => null),
        ]);
        if (isSubscribed) {
          setActiveDocs(docsRes);
          setPendingDocs(pendingRes);

          // If terms is not pending, pre-check it
          if (pendingRes && !pendingRes.pending_consents.some(p => p.document_type === "TERMS_AND_CONDITIONS")) {
            setTermsAccepted(true);
          }
          if (pendingRes && !pendingRes.pending_consents.some(p => p.document_type === "PRIVACY_POLICY")) {
            setPrivacyAccepted(true);
          }
        }
      } catch (err) {
        console.error("Failed to load legal documents:", err);
        toast.error("Failed to load legal terms. Please refresh the page.");
      } finally {
        if (isSubscribed) setLoading(false);
      }
    };

    fetchData();

    return () => {
      isSubscribed = false;
    };
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!termsAccepted || !privacyAccepted) {
      toast.error("Please read and accept both the Terms & Conditions and Privacy Notice.");
      return;
    }

    if (!activeDocs) return;

    setIsSubmitting(true);
    try {
      const consentsToSubmit = [];
      if (activeDocs.terms) {
        consentsToSubmit.push({
          document_id: activeDocs.terms.id,
          document_type: activeDocs.terms.document_type,
          version: activeDocs.terms.version,
        });
      }
      if (activeDocs.privacy) {
        consentsToSubmit.push({
          document_id: activeDocs.privacy.id,
          document_type: activeDocs.privacy.document_type,
          version: activeDocs.privacy.version,
        });
      }

      const res = await legalApi.submitConsent({
        consents: consentsToSubmit,
        metadata: {
          client_platform: typeof navigator !== "undefined" ? navigator.platform : "web",
          screen_resolution: typeof window !== "undefined" ? `${window.innerWidth}x${window.innerHeight}` : "",
        },
      });

      if (res.token?.access_token) {
        dispatch(updateToken(res.token.access_token));
      }

      dispatch(clearConsentRequired());
      toast.success("Terms & Conditions and Privacy Notice accepted. You may now continue.");
    } catch (err: any) {
      const msg = getErrorMessage(err);
      toast.error(msg || "Failed to submit consent. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !mounted) return null;

  const termsDoc = activeDocs?.terms;
  const privacyDoc = activeDocs?.privacy;
  const currentDoc = activeTab === "terms" ? termsDoc : privacyDoc;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/85 backdrop-blur-md p-4 sm:p-6 animate-in fade-in duration-300">
      <div className="w-full max-w-4xl h-[90vh] max-h-[850px] flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-sky-600 to-indigo-700 px-6 py-4 shrink-0 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 shadow-inner">
              <Scale className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Terms of Service & Privacy Notice Update</h2>
              <p className="text-xs sm:text-sm text-sky-100">
                Please review and accept our updated legal terms to continue using the platform.
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-2 mt-4 border-b border-white/20 pb-0">
            <button
              type="button"
              onClick={() => setActiveTab("terms")}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-t-lg transition border-b-2 ${
                activeTab === "terms"
                  ? "bg-white text-sky-900 border-white shadow-sm"
                  : "text-white/80 hover:text-white hover:bg-white/10 border-transparent"
              }`}
            >
              <FileText className="h-4 w-4" />
              Terms of Service {termsDoc ? `(v${termsDoc.version})` : ""}
              {termsAccepted && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("privacy")}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-t-lg transition border-b-2 ${
                activeTab === "privacy"
                  ? "bg-white text-sky-900 border-white shadow-sm"
                  : "text-white/80 hover:text-white hover:bg-white/10 border-transparent"
              }`}
            >
              <ShieldCheck className="h-4 w-4" />
              Privacy Notice {privacyDoc ? `(v${privacyDoc.version})` : ""}
              {privacyAccepted && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
            </button>
          </div>
        </div>

        {/* Informational Callout */}
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-center gap-2.5 text-xs text-amber-900 shrink-0">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
          <span>
            <strong>Legal Notice:</strong> Technesian Software Solutions is strictly an administrative and operational technology provider. The Hospital and licensed clinicians retain sole responsibility for all clinical decisions, prescriptions, and patient care.
          </span>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50 text-slate-800 text-sm leading-relaxed space-y-4 font-sans select-text">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full py-16 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
              <p className="text-slate-500 font-medium">Loading document text...</p>
            </div>
          ) : currentDoc ? (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <div className="border-b border-slate-100 pb-3 mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">{currentDoc.title}</h3>
                  <p className="text-xs text-slate-500">
                    Version {currentDoc.version} • Published:{" "}
                    {currentDoc.published_at ? new Date(currentDoc.published_at).toLocaleDateString() : "Active"}
                  </p>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                  Active Legal Document
                </span>
              </div>
              <div className="whitespace-pre-wrap font-sans text-xs sm:text-sm text-slate-700 leading-relaxed max-w-none">
                {currentDoc.content}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500">Document content unavailable.</div>
          )}
        </div>

        {/* Footer with Checkboxes and Submit Button */}
        <div className="border-t border-slate-200 bg-white px-6 py-4 shrink-0 space-y-3 shadow-lg">
          <div className="space-y-2">
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
              />
              <span className="text-xs sm:text-sm text-slate-700">
                I have read, understood, and accept the <strong>Master Terms of Service & Terms of Use</strong> (Version {termsDoc?.version || "1.0"}), including the pure technology provider status, no-refund policy, and limitation of liability.
              </span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={privacyAccepted}
                onChange={(e) => setPrivacyAccepted(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
              />
              <span className="text-xs sm:text-sm text-slate-700">
                I have read, understood, and accept the <strong>Master Privacy Notice & DPDP Policy</strong> (Version {privacyDoc?.version || "1.0"}), acknowledging the Hospital's role as Data Fiduciary and the passive processor role of Technesian Software Solutions.
              </span>
            </label>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              Acceptance is required to access patient data and hospital records.
            </p>
            <button
              type="button"
              disabled={!termsAccepted || !privacyAccepted || isSubmitting || loading}
              onClick={handleSubmit}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition shadow-sm ${
                termsAccepted && privacyAccepted && !isSubmitting && !loading
                  ? "bg-sky-600 hover:bg-sky-700 text-white shadow-sky-200 cursor-pointer"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Recording Acceptance...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Accept & Continue
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
