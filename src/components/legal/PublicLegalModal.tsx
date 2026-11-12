"use client";

import { useEffect, useState } from "react";
import { X, FileText, ShieldCheck, Users, Phone, Mail, MapPin, Loader2, ExternalLink } from "lucide-react";
import { legalApi, ActiveDocumentsResponse } from "@/services/legalApi";
import { LegalDocumentRenderer } from "./LegalDocumentRenderer";

export type PublicLegalTab = "privacy" | "terms" | "patient" | "grievance";

interface PublicLegalModalProps {
  isOpen: boolean;
  initialTab?: PublicLegalTab;
  onClose: () => void;
}

export function PublicLegalModal({
  isOpen,
  initialTab = "privacy",
  onClose,
}: PublicLegalModalProps) {
  const [activeTab, setActiveTab] = useState<PublicLegalTab>(initialTab);
  const [docs, setDocs] = useState<ActiveDocumentsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || docs) return;
    let mounted = true;
    setLoading(true);
    setError(null);
    legalApi
      .getActiveDocuments()
      .then((res) => {
        if (mounted) setDocs(res);
      })
      .catch(() => {
        if (mounted) setError("Unable to load active legal documents right now.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [isOpen, docs]);

  if (!isOpen) return null;

  const currentDoc =
    activeTab === "privacy"
      ? docs?.privacy
      : activeTab === "terms"
      ? docs?.terms
      : activeTab === "patient"
      ? docs?.patient_notice
      : null;

  return (
    <div
      className="fixed inset-0 z-[180] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="public-legal-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-5xl h-[90vh] max-h-[860px] flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-2xl">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-5 sm:px-6 pt-4 pb-0 shrink-0">
          <div className="flex items-start justify-between gap-4 pb-3">
            <div>
              <h2
                id="public-legal-modal-title"
                className="text-lg sm:text-xl font-bold text-slate-900"
              >
                Legal, Privacy &amp; Data Protection
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                Technesian Software Solutions LLP • Panipat, Haryana, India
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close legal disclosures dialog"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Legal document tabs">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "privacy"}
              onClick={() => setActiveTab("privacy")}
              className={`min-h-[44px] inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-t-xl border-b-2 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 ${
                activeTab === "privacy"
                  ? "border-sky-700 text-sky-900 bg-sky-50/70"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <ShieldCheck className="h-4 w-4 text-sky-700" aria-hidden="true" />
              Privacy Notice {docs?.privacy ? `(v${docs.privacy.version})` : ""}
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "terms"}
              onClick={() => setActiveTab("terms")}
              className={`min-h-[44px] inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-t-xl border-b-2 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 ${
                activeTab === "terms"
                  ? "border-sky-700 text-sky-900 bg-sky-50/70"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <FileText className="h-4 w-4 text-sky-700" aria-hidden="true" />
              Terms of Service {docs?.terms ? `(v${docs.terms.version})` : ""}
            </button>

            {docs?.patient_notice && (
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "patient"}
                onClick={() => setActiveTab("patient")}
                className={`min-h-[44px] inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-t-xl border-b-2 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 ${
                  activeTab === "patient"
                    ? "border-sky-700 text-sky-900 bg-sky-50/70"
                    : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <Users className="h-4 w-4 text-teal-700" aria-hidden="true" />
                Patient Intake Notice
              </button>
            )}

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "grievance"}
              onClick={() => setActiveTab("grievance")}
              className={`min-h-[44px] inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-t-xl border-b-2 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 ${
                activeTab === "grievance"
                  ? "border-sky-700 text-sky-900 bg-sky-50/70"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <Phone className="h-4 w-4 text-sky-700" aria-hidden="true" />
              Grievance Officer
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {activeTab === "grievance" ? (
            <div className="max-w-3xl mx-auto space-y-5">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4">
                <span className="inline-flex items-center rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-900">
                  DPDP Rules, 2025 — Rule 9 &amp; Rule 14(3)
                </span>
                <h3 className="text-lg font-bold text-slate-900">
                  Grievance &amp; Data Protection Officer
                </h3>
                <p className="text-sm text-slate-700 leading-relaxed">
                  For questions regarding personal data processing, consent withdrawal, nomination, or privacy grievances relating to the Cura HMS platform:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-1.5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Designated Officer
                    </p>
                    <p className="text-base font-bold text-slate-900">Hunny</p>
                    <p className="text-xs text-slate-600">
                      Grievance &amp; Data Protection Officer, Technesian Software Solutions LLP
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2 text-sm text-slate-800">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-sky-700 shrink-0" aria-hidden="true" />
                      <a
                        href="mailto:contact@technesian.com"
                        className="font-semibold text-sky-800 hover:underline"
                      >
                        contact@technesian.com
                      </a>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-sky-700 shrink-0" aria-hidden="true" />
                      <a
                        href="tel:+919896333664"
                        className="font-semibold text-sky-800 hover:underline"
                      >
                        +91-9896333664
                      </a>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <MapPin className="h-4 w-4 text-slate-500 shrink-0" aria-hidden="true" />
                      <span>Panipat, Haryana, India</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs sm:text-sm text-amber-950 space-y-1.5">
                  <p className="font-semibold">Statutory Redressal Timeline &amp; DPBI Escalation</p>
                  <p className="leading-relaxed">
                    Initial acknowledgments are targeted within 24 hours, and substantive resolution is delivered within a reasonable period <strong>not exceeding 90 days</strong> (DPDP Rule 14(3)). If your grievance remains unresolved, you may escalate directly to the <strong>Data Protection Board of India (DPBI)</strong>.
                  </p>
                  <a
                    href="https://www.meity.gov.in"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 font-semibold text-sky-800 hover:underline pt-1"
                  >
                    <span>MeitY / DPDP Official Portal</span>
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                </div>
              </div>
            </div>
          ) : loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-sky-700" aria-hidden="true" />
              <p className="text-sm font-medium text-slate-600">Loading active legal document...</p>
            </div>
          ) : error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-sm text-rose-800">
              {error}
            </div>
          ) : currentDoc ? (
            <LegalDocumentRenderer
              title={currentDoc.title}
              version={currentDoc.version}
              documentType={currentDoc.document_type}
              content={currentDoc.content}
              summaryOfChanges={currentDoc.summary_of_changes}
              publishedAt={currentDoc.published_at}
              contentHash={currentDoc.content_hash}
            />
          ) : (
            <div className="text-center py-16 text-sm text-slate-600">
              Document is not available yet.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 bg-white px-5 sm:px-6 py-3 flex items-center justify-between gap-4 shrink-0">
          <p className="text-xs text-slate-600">
            Authenticated staff can also manage consents &amp; submit DPDP requests inside <strong>/legal</strong>.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
