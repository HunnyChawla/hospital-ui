"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch } from "@/redux/hooks";
import {
  clearConsentRequired,
  logout,
  postConsentBootstrap,
  updateToken,
} from "@/redux/authSlice";
import {
  legalApi,
  ActiveDocumentsResponse,
  PendingConsentsResponse,
} from "@/services/legalApi";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import {
  ShieldCheck,
  Scale,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  LogOut,
  Phone,
} from "lucide-react";
import { LegalDocumentRenderer } from "./LegalDocumentRenderer";

interface ForceAcceptTermsModalProps {
  isOpen: boolean;
}

export function ForceAcceptTermsModal({ isOpen }: ForceAcceptTermsModalProps) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"privacy" | "terms">("privacy");
  const [activeDocs, setActiveDocs] = useState<ActiveDocumentsResponse | null>(null);
  const [pendingDocs, setPendingDocs] = useState<PendingConsentsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);

  // Explicit, unbundled, never pre-checked affirmative consent states (DPDP Sec 6 & CCPA 2023)
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

          const pendingTypes = new Set(
            pendingRes?.pending_consents.map((p) => p.document_type) || []
          );
          if (pendingRes && !pendingTypes.has("TERMS_AND_CONDITIONS")) {
            setTermsAccepted(true);
          } else {
            setTermsAccepted(false);
          }
          if (pendingRes && !pendingTypes.has("PRIVACY_POLICY")) {
            setPrivacyAccepted(true);
          } else {
            setPrivacyAccepted(false);
          }

          if (pendingRes && !pendingTypes.has("PRIVACY_POLICY") && pendingTypes.has("TERMS_AND_CONDITIONS")) {
            setActiveTab("terms");
          } else {
            setActiveTab("privacy");
          }
        }
      } catch (err) {
        console.error("Failed to load legal documents:", err);
        toast.error("Failed to load legal documents. Please refresh the page.");
      } finally {
        if (isSubscribed) setLoading(false);
      }
    };

    fetchData();

    return () => {
      isSubscribed = false;
    };
  }, [isOpen]);

  const handleTabChange = (tab: "privacy" | "terms") => {
    setActiveTab(tab);
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleDeclineSignOut = async () => {
    setIsDeclining(true);
    try {
      await dispatch(logout());
    } finally {
      setIsDeclining(false);
      router.push("/login?reason=consent_declined");
    }
  };

  const handleSubmit = async () => {
    if (!privacyAccepted || !termsAccepted) {
      toast.error(
        "Please review and separately confirm both the Privacy Notice and Terms of Service."
      );
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
          screen_resolution:
            typeof window !== "undefined"
              ? `${window.innerWidth}x${window.innerHeight}`
              : "",
          dpdp_notice_reviewed: true,
        },
      });

      if (res.token?.access_token) {
        dispatch(updateToken(res.token.access_token));
      }

      dispatch(clearConsentRequired());
      await dispatch(postConsentBootstrap());
      toast.success("Legal consent recorded. Welcome back to Cura.");
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      toast.error(msg || "Failed to submit consent. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !mounted) return null;

  const termsDoc = activeDocs?.terms;
  const privacyDoc = activeDocs?.privacy;
  const currentDoc = activeTab === "privacy" ? privacyDoc : termsDoc;
  const pendingSummary = pendingDocs?.pending_consents.find(
    (p) => p.document_type === currentDoc?.document_type
  )?.summary_of_changes;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-2 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="consent-modal-title"
    >
      <div className="w-full max-w-5xl h-[92vh] max-h-[880px] flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-2xl">
        {/* Cura Light Clinical Header */}
        <div className="bg-white px-5 sm:px-6 pt-4 pb-0 shrink-0 border-b border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3.5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600 ring-1 ring-sky-200/70 shrink-0">
                <Scale className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h2
                  id="consent-modal-title"
                  className="text-base sm:text-lg font-bold tracking-tight text-slate-900"
                >
                  Updated Privacy Notice &amp; Terms of Service
                </h2>
                <p className="text-xs text-slate-500">
                  Technesian Software Solutions LLP • Panipat, Haryana, India
                </p>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200/90 px-3 py-1.5 text-xs text-slate-600 self-start sm:self-auto shrink-0">
              <Phone className="h-3.5 w-3.5 text-sky-600 shrink-0" aria-hidden="true" />
              <span className="whitespace-nowrap">
                Grievance Officer: <strong className="font-semibold text-slate-800">Hunny</strong> • contact@technesian.com • +91-9896333664
              </span>
            </div>
          </div>

          {/* Standalone Document Tabs */}
          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Legal documents">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "privacy"}
              onClick={() => handleTabChange("privacy")}
              className={`min-h-[42px] flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-t-xl transition border-b-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 ${
                activeTab === "privacy"
                  ? "bg-sky-50/70 text-sky-900 border-sky-600"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 border-transparent"
              }`}
            >
              <ShieldCheck className="h-4 w-4 text-sky-600" aria-hidden="true" />
              <span>Privacy Notice {privacyDoc ? `(v${privacyDoc.version})` : ""}</span>
              {privacyAccepted && (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-label="Accepted" />
              )}
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "terms"}
              onClick={() => handleTabChange("terms")}
              className={`min-h-[42px] flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-t-xl transition border-b-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 ${
                activeTab === "terms"
                  ? "bg-sky-50/70 text-sky-900 border-sky-600"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 border-transparent"
              }`}
            >
              <FileText className="h-4 w-4 text-teal-600" aria-hidden="true" />
              <span>Terms of Service &amp; DPA {termsDoc ? `(v${termsDoc.version})` : ""}</span>
              {termsAccepted && (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-label="Accepted" />
              )}
            </button>
          </div>
        </div>

        {/* Subtle Cura Sky-Teal Role Clarification Strip */}
        <div className="border-b border-sky-100 bg-gradient-to-r from-sky-50/80 via-teal-50/40 to-sky-50/80 px-5 sm:px-6 py-2.5 flex items-start sm:items-center gap-2.5 text-xs text-slate-700 shrink-0">
          <AlertCircle className="h-4 w-4 text-sky-600 shrink-0 mt-0.5 sm:mt-0" aria-hidden="true" />
          <span>
            <strong className="text-slate-900">Hospital &amp; Platform Roles:</strong> Your Hospital acts as the Data Fiduciary for patient medical records. Technesian Software Solutions LLP provides the Cura platform and processes clinical data solely on your Hospital&apos;s behalf.
          </span>
        </div>

        {/* Formatted Document Body */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full py-16 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-sky-600" aria-hidden="true" />
              <p className="text-slate-600 font-medium text-sm">
                Loading active legal agreements...
              </p>
            </div>
          ) : currentDoc ? (
            <LegalDocumentRenderer
              title={currentDoc.title}
              version={currentDoc.version}
              documentType={currentDoc.document_type}
              content={currentDoc.content}
              summaryOfChanges={pendingSummary || currentDoc.summary_of_changes}
              publishedAt={currentDoc.published_at}
              contentHash={currentDoc.content_hash}
              scrollContainerRef={scrollRef}
            />
          ) : (
            <div className="text-center py-12 text-slate-600 text-sm">
              Document content unavailable.
            </div>
          )}
        </div>

        {/* Unbundled Affirmative Consent & Symmetrical Controls Footer */}
        <div className="border-t border-slate-200 bg-white px-5 sm:px-6 py-4 shrink-0 space-y-3 shadow-lg">
          <div className="space-y-2">
            <label
              htmlFor="consent-privacy-checkbox"
              className="flex items-start gap-3 cursor-pointer select-none rounded-lg p-1.5 hover:bg-slate-50 transition"
            >
              <input
                id="consent-privacy-checkbox"
                type="checkbox"
                checked={privacyAccepted}
                onChange={(e) => setPrivacyAccepted(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-400 text-sky-600 focus:ring-2 focus:ring-sky-600 cursor-pointer shrink-0"
              />
              <span className="text-xs sm:text-sm text-slate-700 leading-snug">
                I acknowledge the standalone{" "}
                <strong className="text-slate-900">Master Privacy Notice (v{privacyDoc?.version || "2.0"})</strong>, including data collection purposes, essential security/session storage, retention practices, and my privacy rights (access, correction, erasure, nomination, and consent withdrawal anytime).
              </span>
            </label>

            <label
              htmlFor="consent-terms-checkbox"
              className="flex items-start gap-3 cursor-pointer select-none rounded-lg p-1.5 hover:bg-slate-50 transition"
            >
              <input
                id="consent-terms-checkbox"
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-400 text-sky-600 focus:ring-2 focus:ring-sky-600 cursor-pointer shrink-0"
              />
              <span className="text-xs sm:text-sm text-slate-700 leading-snug">
                I have read and agree to the{" "}
                <strong className="text-slate-900">Master Terms of Service &amp; Data Processing Schedule (v{termsDoc?.version || "2.0"})</strong>, including Cura&apos;s role as a software provider, clinical responsibilities, and data security obligations.
              </span>
            </label>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2.5 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              Review these documents, view consent history, or withdraw consent anytime in{" "}
              <strong className="text-slate-700">Legal, Privacy &amp; Rights</strong>.
            </p>

            <div className="flex items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                disabled={isDeclining || isSubmitting}
                onClick={handleDeclineSignOut}
                className="min-h-[42px] inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 font-semibold text-xs sm:text-sm transition cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600"
              >
                {isDeclining ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <LogOut className="h-4 w-4 text-slate-500" aria-hidden="true" />
                )}
                <span>Decline &amp; Sign Out</span>
              </button>

              <button
                type="button"
                disabled={!termsAccepted || !privacyAccepted || isSubmitting || loading || isDeclining}
                onClick={handleSubmit}
                className={`min-h-[42px] inline-flex items-center justify-center gap-2 px-5 py-2 rounded-xl font-semibold text-xs sm:text-sm transition shadow-sm whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 ${
                  termsAccepted && privacyAccepted && !isSubmitting && !loading && !isDeclining
                    ? "bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-700 hover:to-teal-700 text-white cursor-pointer"
                    : "bg-slate-200 text-slate-500 cursor-not-allowed"
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    <span>Recording Consent...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    <span>Accept &amp; Continue</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
