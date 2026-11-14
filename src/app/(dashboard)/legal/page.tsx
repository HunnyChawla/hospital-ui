"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  Scale,
  FileText,
  ShieldCheck,
  Users,
  History,
  MessageSquareWarning,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Send,
  Loader2,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { useAppDispatch } from "@/redux/hooks";
import { logout } from "@/redux/authSlice";
import { getErrorMessage } from "@/utils/errorHandler";
import {
  legalApi,
  ActiveDocumentsResponse,
  MyConsentItem,
  LegalGrievanceResponse,
  GrievanceRequestType,
  GrievanceRequestStatus,
  LegalDocumentType,
} from "@/services/legalApi";
import { LegalDocumentRenderer } from "@/components/legal/LegalDocumentRenderer";

type PortalTab = "policies" | "consents" | "grievances";
type PolicySubTab = "privacy" | "terms" | "patient";

const DOC_TYPE_LABELS: Record<LegalDocumentType, string> = {
  TERMS_AND_CONDITIONS: "Terms of Service",
  PRIVACY_POLICY: "Privacy Notice",
  PATIENT_PRIVACY_NOTICE: "Patient Intake Notice",
};

const REQUEST_TYPE_OPTIONS: {
  value: GrievanceRequestType;
  label: string;
  hint: string;
}[] = [
  {
    value: "ACCESS_SUMMARY",
    label: "Access & Summary of Personal Data (DPDP Sec. 11)",
    hint: "Request a summary of personal data processed and identities of Data Processors.",
  },
  {
    value: "CORRECTION_COMPLETION",
    label: "Correction / Completion / Updating (DPDP Sec. 12)",
    hint: "Request correction of inaccurate or incomplete personal data held in Cura.",
  },
  {
    value: "ERASURE_REQUEST",
    label: "Erasure Request (DPDP Sec. 12 & Rule 8)",
    hint: "Request deletion where processing purpose is fulfilled (subject to clinical retention laws).",
  },
  {
    value: "NOMINATION_UPDATE",
    label: "Nominate Representative (DPDP Sec. 14)",
    hint: "Appoint an authorised individual to exercise DPDP rights in case of incapacity or death.",
  },
  {
    value: "CONSENT_WITHDRAWAL",
    label: "Consent Withdrawal Follow-Up (DPDP Sec. 6(4))",
    hint: "Raise a follow-up query on consent withdrawal or offboarding timelines.",
  },
  {
    value: "PRIVACY_GRIEVANCE",
    label: "Privacy Grievance / Complaint (DPDP Sec. 13 & Rule 9)",
    hint: "Report a privacy concern, unauthorised access, or grievance to Grievance Officer Hunny.",
  },
];

const STATUS_BADGE_MAP: Record<
  GrievanceRequestStatus,
  { label: string; classes: string }
> = {
  open: {
    label: "Open",
    classes: "bg-sky-50 text-sky-800 border-sky-200",
  },
  in_review: {
    label: "In Review",
    classes: "bg-amber-50 text-amber-800 border-amber-200",
  },
  resolved: {
    label: "Resolved",
    classes: "bg-emerald-50 text-emerald-800 border-emerald-200",
  },
  rejected: {
    label: "Declined / Closed",
    classes: "bg-rose-50 text-rose-800 border-rose-200",
  },
};

export default function LegalPortalPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<PortalTab>("policies");
  const [policySubTab, setPolicySubTab] = useState<PolicySubTab>("privacy");

  const [activeDocs, setActiveDocs] = useState<ActiveDocumentsResponse | null>(null);
  const [myConsents, setMyConsents] = useState<MyConsentItem[]>([]);
  const [myGrievances, setMyGrievances] = useState<LegalGrievanceResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Withdraw Consent confirmation dialog state
  const [withdrawTarget, setWithdrawTarget] = useState<MyConsentItem | null>(null);
  const [withdrawReason, setWithdrawReason] = useState("");
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  // Submit Grievance form state
  const [requestType, setRequestType] = useState<GrievanceRequestType>("ACCESS_SUMMARY");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [nomineeName, setNomineeName] = useState("");
  const [nomineeContact, setNomineeContact] = useState("");
  const [isSubmittingGrievance, setIsSubmittingGrievance] = useState(false);

  const loadPortalData = async (silent = false) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const [docsRes, consentsRes, grievancesRes] = await Promise.all([
        legalApi.getActiveDocuments(),
        legalApi.getMyConsents().catch(() => []),
        legalApi.getMyGrievances().catch(() => []),
      ]);
      setActiveDocs(docsRes);
      setMyConsents(consentsRes);
      setMyGrievances(grievancesRes);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "Failed to load legal portal data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPortalData();
  }, []);

  const currentPolicyDoc = useMemo(() => {
    if (!activeDocs) return null;
    if (policySubTab === "privacy") return activeDocs.privacy;
    if (policySubTab === "terms") return activeDocs.terms;
    return activeDocs.patient_notice || null;
  }, [activeDocs, policySubTab]);

  const handleConfirmWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!withdrawTarget) return;
    setIsWithdrawing(true);
    try {
      const res = await legalApi.withdrawConsent({
        document_id: withdrawTarget.document_id,
        reason: withdrawReason.trim() || undefined,
      });
      toast.success(res.message);
      setWithdrawTarget(null);
      setWithdrawReason("");

      if (res.requires_account_offboarding) {
        queryClient.clear();
        await dispatch(logout());
        router.push("/login");
        return;
      }

      await loadPortalData(true);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "Could not withdraw consent.");
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleSubmitGrievance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (subject.trim().length < 5) {
      toast.error("Please enter a subject of at least 5 characters.");
      return;
    }
    if (description.trim().length < 10) {
      toast.error("Please provide at least 10 characters describing your request.");
      return;
    }
    if (requestType === "NOMINATION_UPDATE" && (!nomineeName.trim() || !nomineeContact.trim())) {
      toast.error("Please provide both your nominee's full name and contact detail.");
      return;
    }

    setIsSubmittingGrievance(true);
    try {
      const created = await legalApi.submitGrievance({
        request_type: requestType,
        subject: subject.trim(),
        description: description.trim(),
        nominee_name: nomineeName.trim() || undefined,
        nominee_contact: nomineeContact.trim() || undefined,
      });
      toast.success(
        `Request ${created.reference_number} submitted. Statutory 90-day resolution SLA starts today.`
      );
      setSubject("");
      setDescription("");
      setNomineeName("");
      setNomineeContact("");
      await loadPortalData(true);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "Failed to submit DPDP request.");
    } finally {
      setIsSubmittingGrievance(false);
    }
  };

  const selectedRequestHint = REQUEST_TYPE_OPTIONS.find(
    (opt) => opt.value === requestType
  )?.hint;

  return (
    <div className="space-y-6 pb-20">
      {/* Header Banner */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 border border-sky-200 text-sky-700 shrink-0">
              <Scale className="h-6 w-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                  Legal, Privacy &amp; Data Rights
                </h1>
                <span className="inline-flex items-center rounded-full bg-sky-50 border border-sky-200 px-2.5 py-0.5 text-[11px] font-semibold text-sky-800">
                  Privacy &amp; Compliance
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-600 max-w-2xl">
                Review active legal agreements, manage or withdraw your recorded consents,
                and exercise your data privacy rights with Technesian Software Solutions LLP.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => loadPortalData(true)}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 min-h-[44px] rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-600"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "policies"}
            onClick={() => setActiveTab("policies")}
            className={`inline-flex items-center gap-2 min-h-[44px] rounded-xl px-4 py-2 text-sm font-semibold transition cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 ${
              activeTab === "policies"
                ? "bg-gradient-to-r from-sky-600 to-teal-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <FileText className="h-4 w-4" />
            Active Policies (v2.0)
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "consents"}
            onClick={() => setActiveTab("consents")}
            className={`inline-flex items-center gap-2 min-h-[44px] rounded-xl px-4 py-2 text-sm font-semibold transition cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 ${
              activeTab === "consents"
                ? "bg-gradient-to-r from-sky-600 to-teal-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <History className="h-4 w-4" />
            My Consent History ({myConsents.length})
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "grievances"}
            onClick={() => setActiveTab("grievances")}
            className={`inline-flex items-center gap-2 min-h-[44px] rounded-xl px-4 py-2 text-sm font-semibold transition cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 ${
              activeTab === "grievances"
                ? "bg-gradient-to-r from-sky-600 to-teal-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <MessageSquareWarning className="h-4 w-4" />
            Privacy Rights &amp; Grievances ({myGrievances.length})
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-20 text-slate-600">
          <Loader2 className="h-8 w-8 animate-spin text-sky-700 mb-3" />
          <p className="text-sm font-medium">Loading legal records and DPDP portal...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: ACTIVE POLICIES */}
          {activeTab === "policies" && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setPolicySubTab("privacy")}
                  className={`inline-flex items-center gap-2 min-h-[44px] rounded-xl border px-4 py-2 text-sm font-semibold transition cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 ${
                    policySubTab === "privacy"
                      ? "border-sky-600 bg-sky-50 text-sky-900"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <ShieldCheck className="h-4 w-4 text-sky-700" />
                  Privacy Notice {activeDocs?.privacy ? `v${activeDocs.privacy.version}` : ""}
                </button>
                <button
                  type="button"
                  onClick={() => setPolicySubTab("terms")}
                  className={`inline-flex items-center gap-2 min-h-[44px] rounded-xl border px-4 py-2 text-sm font-semibold transition cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 ${
                    policySubTab === "terms"
                      ? "border-sky-600 bg-sky-50 text-sky-900"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <FileText className="h-4 w-4 text-sky-700" />
                  Terms of Service {activeDocs?.terms ? `v${activeDocs.terms.version}` : ""}
                </button>
                {activeDocs?.patient_notice && (
                  <button
                    type="button"
                    onClick={() => setPolicySubTab("patient")}
                    className={`inline-flex items-center gap-2 min-h-[44px] rounded-xl border px-4 py-2 text-sm font-semibold transition cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 ${
                      policySubTab === "patient"
                        ? "border-sky-600 bg-sky-50 text-sky-900"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <Users className="h-4 w-4 text-teal-700" />
                    Patient Intake Notice (English / हिन्दी) v{activeDocs.patient_notice.version}
                  </button>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
                {currentPolicyDoc ? (
                  <LegalDocumentRenderer
                    title={currentPolicyDoc.title}
                    version={currentPolicyDoc.version}
                    documentType={currentPolicyDoc.document_type}
                    content={currentPolicyDoc.content}
                    summaryOfChanges={currentPolicyDoc.summary_of_changes}
                    publishedAt={currentPolicyDoc.published_at}
                    contentHash={currentPolicyDoc.content_hash}
                    showToc
                    showPrintButton
                    showBilingualSummary
                  />
                ) : (
                  <p className="py-12 text-center text-sm text-slate-500">
                    No active document found for this category.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: MY CONSENT HISTORY & WITHDRAWAL */}
          {activeTab === "consents" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-4 text-xs sm:text-sm text-sky-950">
                <p className="font-semibold flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-sky-700 shrink-0" />
                  Right to Withdraw Consent (DPDP Act Sec. 6(4))
                </p>
                <p className="mt-1 text-sky-900">
                  Withdrawing consent is as easy as giving it. Please note: if you withdraw consent for a{" "}
                  <strong>mandatory</strong> agreement (Terms of Service or Platform Privacy Notice), your
                  active login session will end immediately and an offboarding/erasure workflow will be logged
                  subject to mandatory Indian healthcare retention laws (ABDM / Clinical Establishments Act / Income Tax Act).
                </p>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
                {myConsents.length === 0 ? (
                  <div className="p-12 text-center text-sm text-slate-500">
                    No consent records found for your account yet.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {myConsents.map((item) => {
                      const isActiveConsent = item.status === "accepted";
                      return (
                        <div
                          key={item.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 hover:bg-slate-50/60 transition"
                        >
                          <div className="space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-slate-900">{item.title}</span>
                              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-mono font-semibold text-slate-700">
                                v{item.version}
                              </span>
                              <span className="rounded-full bg-sky-50 border border-sky-200 px-2.5 py-0.5 text-xs font-medium text-sky-800">
                                {DOC_TYPE_LABELS[item.document_type]}
                              </span>
                              {item.is_mandatory && (
                                <span className="rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                                  Mandatory
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                              <span className="inline-flex items-center gap-1">
                                {isActiveConsent ? (
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                ) : (
                                  <XCircle className="h-3.5 w-3.5 text-rose-600" />
                                )}
                                Status:{" "}
                                <strong className={isActiveConsent ? "text-emerald-700" : "text-rose-700"}>
                                  {isActiveConsent ? "Accepted / Active" : "Withdrawn"}
                                </strong>
                              </span>
                              <span>·</span>
                              <span>Recorded: {new Date(item.accepted_at).toLocaleString()}</span>
                            </div>
                          </div>

                          {isActiveConsent && (
                            <button
                              type="button"
                              onClick={() => setWithdrawTarget(item)}
                              className="inline-flex items-center justify-center gap-2 min-h-[44px] rounded-xl border border-rose-200 bg-rose-50/60 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100 transition cursor-pointer shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                            >
                              <XCircle className="h-4 w-4" />
                              Withdraw Consent
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: DPDP RIGHTS & GRIEVANCE REDRESSAL */}
          {activeTab === "grievances" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Grievance Officer Card + Submit Form */}
              <div className="lg:col-span-5 space-y-5">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-base font-bold text-slate-900">
                      Designated Grievance Officer
                    </h2>
                    <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 border border-sky-200 px-2.5 py-0.5 text-[11px] font-semibold text-sky-800">
                      <Clock className="h-3 w-3" />
                      90-Day SLA
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Requests are acknowledged promptly with a tracking reference and resolved within 90 days.
                  </p>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5 space-y-2 text-xs text-slate-700">
                    <p className="font-semibold text-slate-900">
                      Hunny — Grievance Officer, Technesian Software Solutions LLP
                    </p>
                    <p className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-sky-700 shrink-0" />
                      <a href="mailto:contact@technesian.com" className="text-sky-700 font-medium hover:underline">
                        contact@technesian.com
                      </a>
                    </p>
                    <p className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-sky-700 shrink-0" />
                      <a href="tel:+919896333664" className="text-sky-700 font-medium hover:underline">
                        +91-9896333664
                      </a>
                    </p>
                    <p className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-sky-700 shrink-0" />
                      Panipat, Haryana, India
                    </p>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    If you are dissatisfied with our resolution, you may escalate your complaint to the{" "}
                    <strong>Data Protection Board of India (DPBI)</strong>{" "}
                    <a
                      href="https://www.meity.gov.in"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-0.5 text-sky-700 hover:underline font-medium"
                    >
                      (MeitY Portal <ExternalLink className="h-3 w-3" />)
                    </a>
                    .
                  </p>
                </div>

                {/* Submit Form */}
                <form
                  onSubmit={handleSubmitGrievance}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4"
                >
                  <h2 className="text-base font-bold text-slate-900">
                    Exercise a DPDP Right or File Grievance
                  </h2>

                  <div>
                    <label
                      htmlFor="grievance-type"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Request Category *
                    </label>
                    <select
                      id="grievance-type"
                      value={requestType}
                      onChange={(e) => setRequestType(e.target.value as GrievanceRequestType)}
                      className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-600/20"
                    >
                      {REQUEST_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    {selectedRequestHint && (
                      <p className="mt-1.5 text-xs text-slate-500">{selectedRequestHint}</p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="grievance-subject"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Subject *
                    </label>
                    <input
                      id="grievance-subject"
                      type="text"
                      required
                      minLength={5}
                      maxLength={255}
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Brief summary of your request or concern"
                      className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-600/20"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="grievance-desc"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Details *
                    </label>
                    <textarea
                      id="grievance-desc"
                      required
                      minLength={10}
                      maxLength={4000}
                      rows={4}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Provide relevant details (avoid entering sensitive patient clinical notes or Aadhaar numbers)."
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-600/20"
                    />
                  </div>

                  {requestType === "NOMINATION_UPDATE" && (
                    <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-3.5 space-y-3">
                      <p className="text-xs font-semibold text-sky-900">
                        DPDP Sec. 14 Authorised Nominee Details
                      </p>
                      <div>
                        <label
                          htmlFor="nominee-name"
                          className="block text-xs font-medium text-slate-700 mb-1"
                        >
                          Nominee Full Name *
                        </label>
                        <input
                          id="nominee-name"
                          type="text"
                          value={nomineeName}
                          onChange={(e) => setNomineeName(e.target.value)}
                          placeholder="Full legal name of nominee"
                          className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="nominee-contact"
                          className="block text-xs font-medium text-slate-700 mb-1"
                        >
                          Nominee Email or Mobile *
                        </label>
                        <input
                          id="nominee-contact"
                          type="text"
                          value={nomineeContact}
                          onChange={(e) => setNomineeContact(e.target.value)}
                          placeholder="Email address or +91 phone number"
                          className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                        />
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmittingGrievance}
                    className="w-full inline-flex items-center justify-center gap-2 min-h-[44px] rounded-xl bg-sky-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-800 transition cursor-pointer disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-600"
                  >
                    {isSubmittingGrievance ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Submitting Request...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Submit Request to Grievance Officer
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Right Column: My Requests List */}
              <div className="lg:col-span-7">
                <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                  <div className="border-b border-slate-100 px-5 py-4 flex items-center justify-between">
                    <h2 className="text-base font-bold text-slate-900">
                      My DPDP Requests &amp; Grievances
                    </h2>
                    <span className="text-xs font-medium text-slate-500">
                      {myGrievances.length} total
                    </span>
                  </div>

                  {myGrievances.length === 0 ? (
                    <div className="p-12 text-center text-sm text-slate-500">
                      You have not submitted any DPDP rights requests or grievances yet.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {myGrievances.map((item) => {
                        const badge = STATUS_BADGE_MAP[item.status] || STATUS_BADGE_MAP.open;
                        return (
                          <div key={item.id} className="p-5 space-y-2.5">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-mono text-xs font-bold text-sky-800 bg-sky-50 border border-sky-200 rounded-md px-2 py-0.5">
                                  {item.reference_number}
                                </span>
                                <span className="text-xs font-medium text-slate-500">
                                  {item.request_type.replace(/_/g, " ")}
                                </span>
                              </div>
                              <span
                                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badge.classes}`}
                              >
                                {badge.label}
                              </span>
                            </div>

                            <h3 className="text-sm font-semibold text-slate-900">{item.subject}</h3>
                            <p className="text-xs text-slate-600 whitespace-pre-line">
                              {item.description}
                            </p>

                            {item.nominee_name && (
                              <p className="text-xs text-slate-600">
                                <strong>Nominated Representative:</strong> {item.nominee_name} (
                                {item.nominee_contact})
                              </p>
                            )}

                            {item.resolution_notes && (
                              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-950">
                                <p className="font-semibold">Grievance Officer Resolution Notes:</p>
                                <p className="mt-1">{item.resolution_notes}</p>
                              </div>
                            )}

                            <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-500">
                              <span>Submitted: {new Date(item.created_at).toLocaleString()}</span>
                              <span>·</span>
                              <span>
                                90-Day SLA Due: {new Date(item.due_at).toLocaleDateString()}
                              </span>
                              {item.resolved_at && (
                                <>
                                  <span>·</span>
                                  <span>
                                    Closed: {new Date(item.resolved_at).toLocaleDateString()}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Withdraw Consent Dialog */}
      {withdrawTarget && (
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="withdraw-dialog-title"
        >
          <form
            onSubmit={handleConfirmWithdraw}
            className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden"
          >
            <div className="border-b border-slate-100 px-5 py-4 flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h2 id="withdraw-dialog-title" className="text-base font-bold text-slate-900">
                  Withdraw Consent — {withdrawTarget.title}
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  Version {withdrawTarget.version} · DPDP Act Section 6(4)
                </p>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {withdrawTarget.is_mandatory ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-950 leading-relaxed">
                  <strong>Important Consequences of Withdrawal:</strong> Because this is a mandatory
                  platform governance/privacy notice, withdrawing consent will immediately end your active
                  login session and generate an offboarding/erasure tracking ticket. Legally mandated
                  clinical records (ABDM / Clinical Establishments Act / Income Tax Act) remain archived
                  as required by law.
                </div>
              ) : (
                <p className="text-xs text-slate-600 leading-relaxed">
                  Withdrawing this optional consent takes effect immediately without affecting your core
                  platform login.
                </p>
              )}

              <div>
                <label
                  htmlFor="withdraw-reason"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Reason for Withdrawal (optional)
                </label>
                <textarea
                  id="withdraw-reason"
                  rows={3}
                  value={withdrawReason}
                  onChange={(e) => setWithdrawReason(e.target.value)}
                  placeholder="Optional feedback for Grievance Officer Hunny..."
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-600/20"
                />
              </div>
            </div>

            <div className="border-t border-slate-100 bg-slate-50 px-5 py-3.5 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setWithdrawTarget(null);
                  setWithdrawReason("");
                }}
                disabled={isWithdrawing}
                className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                Keep Consent Active
              </button>
              <button
                type="submit"
                disabled={isWithdrawing}
                className="inline-flex items-center justify-center gap-2 min-h-[44px] rounded-xl bg-rose-600 px-5 py-2 text-sm font-semibold text-white hover:bg-rose-700 transition cursor-pointer disabled:opacity-50"
              >
                {isWithdrawing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Confirm Withdrawal"
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
