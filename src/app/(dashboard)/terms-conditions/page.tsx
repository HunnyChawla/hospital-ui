"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { isPlatformOwner } from "@/utils/auth";
import {
  legalApi,
  LegalDocumentResponse,
  LegalDocumentDetailResponse,
  LegalDocumentType,
  LegalDocumentStatus,
  UserConsentAuditItem,
  LegalGrievanceResponse,
  GrievanceRequestStatus,
} from "@/services/legalApi";
import { LegalDocumentRenderer } from "@/components/legal/LegalDocumentRenderer";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import {
  Scale,
  FileText,
  ShieldCheck,
  Users,
  Plus,
  Eye,
  Send,
  Edit3,
  Copy,
  Download,
  MessageSquareWarning,
  CheckCircle2,
  Clock,
  Archive,
  AlertTriangle,
  History,
  X,
  Search,
  Filter,
  Check,
  Building2,
  UserCheck,
} from "lucide-react";

const DOC_TYPE_META: Record<
  LegalDocumentType,
  { label: string; badgeClass: string; Icon: typeof FileText }
> = {
  TERMS_AND_CONDITIONS: {
    label: "Terms of Service",
    badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-100",
    Icon: FileText,
  },
  PRIVACY_POLICY: {
    label: "Privacy Notice",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-100",
    Icon: ShieldCheck,
  },
  PATIENT_PRIVACY_NOTICE: {
    label: "Patient Intake Notice",
    badgeClass: "bg-teal-50 text-teal-700 border-teal-100",
    Icon: Users,
  },
};

function suggestNextVersion(version: string): string {
  const parts = version.split(".");
  if (parts.length === 2 && !Number.isNaN(Number(parts[1]))) {
    return `${parts[0]}.${Number(parts[1]) + 1}`;
  }
  return `${version}.1`;
}

export default function TermsConditionsPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [activeTab, setActiveTab] = useState<"documents" | "audit" | "grievances">("documents");

  // Documents state
  const [documents, setDocuments] = useState<LegalDocumentResponse[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  // Audit state
  const [auditLogs, setAuditLogs] = useState<UserConsentAuditItem[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [auditSearch, setAuditSearch] = useState("");

  // Grievances state
  const [grievances, setGrievances] = useState<LegalGrievanceResponse[]>([]);
  const [loadingGrievances, setLoadingGrievances] = useState(false);
  const [grievanceStatusFilter, setGrievanceStatusFilter] = useState<string>("all");
  const [grievanceTarget, setGrievanceTarget] = useState<LegalGrievanceResponse | null>(null);
  const [grievanceNewStatus, setGrievanceNewStatus] = useState<GrievanceRequestStatus>("in_review");
  const [grievanceNotes, setGrievanceNotes] = useState("");
  const [isUpdatingGrievance, setIsUpdatingGrievance] = useState(false);

  // Modal states
  const [viewDoc, setViewDoc] = useState<LegalDocumentDetailResponse | null>(null);
  const [loadingView, setLoadingView] = useState(false);

  const [publishTarget, setPublishTarget] = useState<LegalDocumentResponse | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editTarget, setEditTarget] = useState<LegalDocumentResponse | null>(null);

  // Form state for Create / Edit
  const [formData, setFormData] = useState({
    document_type: "TERMS_AND_CONDITIONS" as LegalDocumentType,
    version: "",
    title: "",
    content: "",
    summary_of_changes: "",
    is_mandatory: true,
  });
  const [formPreviewTab, setFormPreviewTab] = useState<"write" | "preview">("write");
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  useEffect(() => {
    if (!isPlatformOwner()) {
      router.push("/");
      return;
    }
    setAuthorized(true);
  }, [router]);

  // Load documents
  const fetchDocuments = async () => {
    setLoadingDocs(true);
    try {
      const typeFilter = selectedType !== "all" ? (selectedType as LegalDocumentType) : undefined;
      const statusFilter = selectedStatus !== "all" ? (selectedStatus as LegalDocumentStatus) : undefined;
      const docs = await legalApi.listDocuments(typeFilter, statusFilter);
      setDocuments(docs);
    } catch (err) {
      toast.error("Failed to load legal documents: " + getErrorMessage(err));
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => {
    if (authorized && activeTab === "documents") {
      fetchDocuments();
    }
  }, [authorized, activeTab, selectedType, selectedStatus]);

  // Load audit logs
  const fetchAuditLogs = async () => {
    setLoadingAudit(true);
    try {
      const logs = await legalApi.listAuditConsents({ limit: 100 });
      setAuditLogs(logs);
    } catch (err) {
      toast.error("Failed to load audit logs: " + getErrorMessage(err));
    } finally {
      setLoadingAudit(false);
    }
  };

  useEffect(() => {
    if (authorized && activeTab === "audit") {
      fetchAuditLogs();
    }
  }, [authorized, activeTab]);

  // Load DPDP grievances queue
  const fetchGrievances = async () => {
    setLoadingGrievances(true);
    try {
      const statusParam =
        grievanceStatusFilter !== "all"
          ? (grievanceStatusFilter as GrievanceRequestStatus)
          : undefined;
      const items = await legalApi.listAdminGrievances({ status: statusParam, limit: 100 });
      setGrievances(items);
    } catch (err) {
      toast.error("Failed to load DPDP grievances: " + getErrorMessage(err));
    } finally {
      setLoadingGrievances(false);
    }
  };

  useEffect(() => {
    if (authorized && activeTab === "grievances") {
      fetchGrievances();
    }
  }, [authorized, activeTab, grievanceStatusFilter]);

  const handleOpenGrievanceManage = (item: LegalGrievanceResponse) => {
    setGrievanceTarget(item);
    setGrievanceNewStatus(item.status === "open" ? "in_review" : item.status);
    setGrievanceNotes(item.resolution_notes || "");
  };

  const handleUpdateGrievanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grievanceTarget) return;
    setIsUpdatingGrievance(true);
    try {
      await legalApi.updateGrievanceStatus(grievanceTarget.id, {
        status: grievanceNewStatus,
        resolution_notes: grievanceNotes.trim() || undefined,
      });
      toast.success(`Updated grievance ${grievanceTarget.reference_number} to ${grievanceNewStatus}.`);
      setGrievanceTarget(null);
      await fetchGrievances();
    } catch (err) {
      toast.error("Failed to update grievance: " + getErrorMessage(err));
    } finally {
      setIsUpdatingGrievance(false);
    }
  };

  const handleOpenView = async (docId: string) => {
    setLoadingView(true);
    try {
      const detail = await legalApi.getDocument(docId);
      setViewDoc(detail);
    } catch (err) {
      toast.error("Failed to fetch document content: " + getErrorMessage(err));
    } finally {
      setLoadingView(false);
    }
  };

  const handlePublishConfirm = async () => {
    if (!publishTarget) return;
    setIsPublishing(true);
    try {
      await legalApi.publishDocument(publishTarget.id);
      toast.success(`Published and activated Version ${publishTarget.version} successfully!`);
      setPublishTarget(null);
      await fetchDocuments();
    } catch (err) {
      toast.error("Failed to publish document: " + getErrorMessage(err));
    } finally {
      setIsPublishing(false);
    }
  };

  const handleOpenCreate = () => {
    setEditTarget(null);
    setFormData({
      document_type: "TERMS_AND_CONDITIONS",
      version: "",
      title: "",
      content: "",
      summary_of_changes: "",
      is_mandatory: true,
    });
    setFormPreviewTab("write");
    setShowCreateModal(true);
  };

  const handleOpenEdit = async (doc: LegalDocumentResponse) => {
    setEditTarget(doc);
    try {
      const detail = await legalApi.getDocument(doc.id);
      setFormData({
        document_type: detail.document_type,
        version: detail.version,
        title: detail.title,
        content: detail.content,
        summary_of_changes: detail.summary_of_changes || "",
        is_mandatory: detail.is_mandatory,
      });
      setFormPreviewTab("write");
      setShowCreateModal(true);
    } catch (err) {
      toast.error("Failed to load draft for editing: " + getErrorMessage(err));
    }
  };

  const handleCloneToDraft = async (doc: LegalDocumentResponse) => {
    setEditTarget(null);
    try {
      const detail = await legalApi.getDocument(doc.id);
      const nextVersion = suggestNextVersion(detail.version);
      setFormData({
        document_type: detail.document_type,
        version: nextVersion,
        title: detail.title.replace(`v${detail.version}`, `v${nextVersion}`),
        content: detail.content,
        summary_of_changes: "",
        is_mandatory: detail.is_mandatory,
      });
      setFormPreviewTab("write");
      setShowCreateModal(true);
      toast.info(`Cloned v${detail.version} into new draft v${nextVersion}.`);
    } catch (err) {
      toast.error("Failed to clone document: " + getErrorMessage(err));
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.content) {
      toast.error("Please fill in the title and document content.");
      return;
    }

    if (!editTarget && !formData.version) {
      toast.error("Please specify a version number.");
      return;
    }

    setIsSubmittingForm(true);
    try {
      if (editTarget) {
        await legalApi.updateDocument(editTarget.id, {
          title: formData.title,
          content: formData.content,
          summary_of_changes: formData.summary_of_changes,
          is_mandatory: formData.is_mandatory,
        });
        toast.success("Draft updated successfully.");
      } else {
        await legalApi.createDocument({
          document_type: formData.document_type,
          version: formData.version,
          title: formData.title,
          content: formData.content,
          summary_of_changes: formData.summary_of_changes,
          is_mandatory: formData.is_mandatory,
        });
        toast.success("New draft version created successfully.");
      }
      setShowCreateModal(false);
      fetchDocuments();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsSubmittingForm(false);
    }
  };

  if (!authorized) return null;

  // Active terms & privacy for KPI cards
  const activeTerms = documents.find(
    (d) => d.document_type === "TERMS_AND_CONDITIONS" && d.is_active
  );
  const activePrivacy = documents.find(
    (d) => d.document_type === "PRIVACY_POLICY" && d.is_active
  );

  const filteredAudit = auditLogs.filter(
    (log) =>
      log.user_email?.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.tenant_name?.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.version.includes(auditSearch)
  );

  const handleExportAuditCsv = () => {
    if (filteredAudit.length === 0) {
      toast.info("No audit records to export.");
      return;
    }
    const headers = [
      "User Name",
      "User Email",
      "Tenant",
      "Document Type",
      "Version",
      "Status",
      "Accepted At",
      "IP Address",
    ];
    const escapeCell = (val: string) => `"${String(val || "").replace(/"/g, '""')}"`;
    const rows = filteredAudit.map((log) =>
      [
        log.user_full_name || "User",
        log.user_email || "",
        log.tenant_name || log.tenant_id,
        log.document_type,
        `v${log.version}`,
        log.status,
        log.accepted_at,
        log.ip_address || "",
      ]
        .map(escapeCell)
        .join(",")
    );
    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `cura-legal-consent-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const dpdpChecklist = [
    {
      label: "DPDP Act 2023 & DPDP Rules 2025 cited",
      passed: /dpdp/i.test(formData.content) && /2025/i.test(formData.content),
    },
    {
      label: "Grievance Officer (Hunny / contact@technesian.com) & 90-day SLA",
      passed:
        /contact@technesian\.com/i.test(formData.content) && /90\s*day/i.test(formData.content),
    },
    {
      label: "Sec. 6(4) Consent Withdrawal & Data Principal Rights",
      passed: /withdraw/i.test(formData.content) && /erasure|nomination/i.test(formData.content),
    },
    {
      label: "Rule 7 Breach Notification (72 hours / CERT-In)",
      passed: /72\s*hour/i.test(formData.content),
    },
    {
      label: "Panipat, Haryana jurisdiction & Technesian Software Solutions LLP",
      passed:
        /technesian software solutions llp/i.test(formData.content) &&
        /panipat/i.test(formData.content),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-50 rounded-xl border border-sky-100 text-sky-600">
              <Scale className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Terms & Privacy Management
              </h1>
              <p className="text-sm text-slate-500">
                Author, version, and enforce Terms of Service and Privacy Notices across all hospital tenants.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl text-sm transition shadow-sm cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Create New Version
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Active Terms */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Active Terms of Service
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-slate-900">
                {activeTerms ? `v${activeTerms.version}` : "Not Active"}
              </span>
              {activeTerms && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                  <Check className="h-3 w-3" /> Active
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              {activeTerms?.published_at
                ? `Published ${new Date(activeTerms.published_at).toLocaleDateString()}`
                : "No active terms"}
            </p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <FileText className="h-6 w-6" />
          </div>
        </div>

        {/* Active Privacy Notice */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Active Privacy Notice
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-slate-900">
                {activePrivacy ? `v${activePrivacy.version}` : "Not Active"}
              </span>
              {activePrivacy && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                  <Check className="h-3 w-3" /> Active
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              {activePrivacy?.published_at
                ? `Published ${new Date(activePrivacy.published_at).toLocaleDateString()}`
                : "No active notice"}
            </p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
            <ShieldCheck className="h-6 w-6" />
          </div>
        </div>

        {/* Total Consents Recorded */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Legal Compliance Status
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-slate-900">DPDP &amp; ABDM</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-800">
                Compliance Active
              </span>
            </div>
            <p className="text-xs text-slate-500">Technesian Software Solutions LLP</p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <UserCheck className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab("documents")}
          className={`flex items-center gap-2 min-h-[44px] px-5 py-3 text-sm font-semibold border-b-2 transition cursor-pointer ${
            activeTab === "documents"
              ? "border-sky-600 text-sky-700"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <FileText className="h-4 w-4" />
          Document Versions ({documents.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("audit")}
          className={`flex items-center gap-2 min-h-[44px] px-5 py-3 text-sm font-semibold border-b-2 transition cursor-pointer ${
            activeTab === "audit"
              ? "border-sky-600 text-sky-700"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <History className="h-4 w-4" />
          User Consents Audit Trail
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("grievances")}
          className={`flex items-center gap-2 min-h-[44px] px-5 py-3 text-sm font-semibold border-b-2 transition cursor-pointer ${
            activeTab === "grievances"
              ? "border-sky-600 text-sky-700"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <MessageSquareWarning className="h-4 w-4" />
          DPDP Grievances Queue
        </button>
      </div>

      {/* TAB 1: Document Versions */}
      {activeTab === "documents" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Filter className="h-4 w-4 text-slate-400" />
              <span>Type:</span>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="min-h-[40px] bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="all">All Types</option>
                <option value="TERMS_AND_CONDITIONS">Terms &amp; Conditions</option>
                <option value="PRIVACY_POLICY">Privacy Notice</option>
                <option value="PATIENT_PRIVACY_NOTICE">Patient Intake Notice</option>
              </select>
            </div>

            <div className="flex items-center gap-2 text-sm text-slate-600">
              <span>Status:</span>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="all">All Statuses</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          {/* Documents Table */}
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
            {loadingDocs ? (
              <div className="text-center py-16 text-slate-500">Loading versions...</div>
            ) : documents.length === 0 ? (
              <div className="text-center py-16 text-slate-500">No legal documents found.</div>
            ) : (
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200/80 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Document Type</th>
                    <th className="py-3.5 px-4">Version</th>
                    <th className="py-3.5 px-4">Title</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Mandatory</th>
                    <th className="py-3.5 px-4">Published Date</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {documents.map((doc) => {
                    const meta = DOC_TYPE_META[doc.document_type] || DOC_TYPE_META.TERMS_AND_CONDITIONS;
                    const TypeIcon = meta.Icon;
                    return (
                    <tr key={doc.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3.5 px-4 font-medium">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${meta.badgeClass}`}>
                          <TypeIcon className="h-3.5 w-3.5" /> {meta.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">v{doc.version}</td>
                      <td className="py-3.5 px-4 font-medium text-slate-900 max-w-xs truncate">
                        {doc.title}
                      </td>
                      <td className="py-3.5 px-4">
                        {doc.is_active ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Active
                          </span>
                        ) : doc.status === "draft" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                            <Clock className="h-3.5 w-3.5" /> Draft
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                            <Archive className="h-3.5 w-3.5" /> Archived
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {doc.is_mandatory ? (
                          <span className="text-xs font-medium text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                            Yes
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-slate-500">Optional</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        {doc.published_at ? new Date(doc.published_at).toLocaleString() : "—"}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            title="View Full Content"
                            aria-label={`View ${doc.title} v${doc.version}`}
                            onClick={() => handleOpenView(doc.id)}
                            className="inline-flex items-center justify-center min-h-[36px] min-w-[36px] p-2 rounded-lg text-slate-500 hover:text-sky-600 hover:bg-sky-50 transition cursor-pointer"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {doc.status === "draft" ? (
                            <button
                              type="button"
                              title="Edit Draft"
                              aria-label={`Edit draft ${doc.title} v${doc.version}`}
                              onClick={() => handleOpenEdit(doc)}
                              className="inline-flex items-center justify-center min-h-[36px] min-w-[36px] p-2 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition cursor-pointer"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              title="Clone into New Draft"
                              aria-label={`Clone ${doc.title} v${doc.version} into new draft`}
                              onClick={() => handleCloneToDraft(doc)}
                              className="inline-flex items-center justify-center min-h-[36px] min-w-[36px] p-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                          )}
                          {!doc.is_active && (
                            <button
                              type="button"
                              title="Publish & Activate Version"
                              aria-label={`Publish ${doc.title} v${doc.version}`}
                              onClick={() => setPublishTarget(doc)}
                              className="inline-flex items-center justify-center min-h-[36px] min-w-[36px] p-2 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition cursor-pointer"
                            >
                              <Send className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: User Consents Audit Trail */}
      {activeTab === "audit" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by user email, hospital name, version..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportAuditCsv}
                className="inline-flex items-center gap-1.5 min-h-[40px] px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </button>
              <button
                type="button"
                onClick={fetchAuditLogs}
                className="min-h-[40px] px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Refresh Logs
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
            {loadingAudit ? (
              <div className="text-center py-16 text-slate-500">Loading audit records...</div>
            ) : filteredAudit.length === 0 ? (
              <div className="text-center py-16 text-slate-500">No consent audit logs recorded yet.</div>
            ) : (
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200/80 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Hospital / Tenant</th>
                    <th className="py-3 px-4">Document</th>
                    <th className="py-3 px-4">Version</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Accepted At</th>
                    <th className="py-3 px-4">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredAudit.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{log.user_full_name || "User"}</div>
                        <div className="text-xs text-slate-500">{log.user_email}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                          <Building2 className="h-3.5 w-3.5 text-slate-400" />
                          {log.tenant_name || log.tenant_id}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs font-medium">
                        {DOC_TYPE_META[log.document_type]?.label || log.document_type}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 text-xs">v{log.version}</td>
                      <td className="py-3 px-4 text-xs">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 font-semibold ${
                            log.status === "accepted"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-rose-50 text-rose-700"
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500">
                        {new Date(log.accepted_at).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-xs font-mono text-slate-600">
                        {log.ip_address || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: DPDP Grievances Queue */}
      {activeTab === "grievances" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Filter className="h-4 w-4 text-slate-400" />
              <span>Status:</span>
              <select
                value={grievanceStatusFilter}
                onChange={(e) => setGrievanceStatusFilter(e.target.value)}
                className="min-h-[40px] bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="all">All Statuses</option>
                <option value="open">Open</option>
                <option value="in_review">In Review</option>
                <option value="resolved">Resolved</option>
                <option value="rejected">Declined / Closed</option>
              </select>
            </div>
            <button
              type="button"
              onClick={fetchGrievances}
              className="min-h-[40px] px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Refresh Queue
            </button>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
            {loadingGrievances ? (
              <div className="text-center py-16 text-slate-500">Loading DPDP grievance requests...</div>
            ) : grievances.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                No DPDP rights requests or grievances found.
              </div>
            ) : (
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200/80 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Reference</th>
                    <th className="py-3 px-4">Requester &amp; Hospital</th>
                    <th className="py-3 px-4">Category &amp; Subject</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">90-Day SLA Due</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {grievances.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4 font-mono text-xs font-bold text-sky-800">
                        {item.reference_number}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">
                          {item.user_full_name || "User"}
                        </div>
                        <div className="text-xs text-slate-500">{item.user_email}</div>
                        <div className="text-[11px] text-slate-400">
                          {item.tenant_name || item.tenant_id}
                        </div>
                      </td>
                      <td className="py-3 px-4 max-w-sm">
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          {item.request_type.replace(/_/g, " ")}
                        </div>
                        <div className="font-medium text-slate-900 truncate">{item.subject}</div>
                      </td>
                      <td className="py-3 px-4 text-xs">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 font-semibold ${
                            item.status === "resolved"
                              ? "bg-emerald-100 text-emerald-800"
                              : item.status === "in_review"
                              ? "bg-amber-100 text-amber-800"
                              : item.status === "rejected"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-sky-100 text-sky-800"
                          }`}
                        >
                          {item.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600">
                        {new Date(item.due_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenGrievanceManage(item)}
                          className="min-h-[36px] rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-sky-50 hover:text-sky-700 cursor-pointer"
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: View Full Content */}
      {viewDoc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="view-legal-doc-title"
        >
          <div className="w-full max-w-4xl max-h-[88vh] flex flex-col bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 id="view-legal-doc-title" className="text-lg font-bold text-slate-900">
                  {viewDoc.title}
                </h3>
                <p className="text-xs text-slate-500">
                  Version {viewDoc.version} • {DOC_TYPE_META[viewDoc.document_type]?.label || viewDoc.document_type} • Status: {viewDoc.status}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close document preview"
                onClick={() => setViewDoc(null)}
                className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 bg-white">
              <LegalDocumentRenderer
                title={viewDoc.title}
                version={viewDoc.version}
                documentType={viewDoc.document_type}
                content={viewDoc.content}
                summaryOfChanges={viewDoc.summary_of_changes}
                publishedAt={viewDoc.published_at}
                contentHash={viewDoc.content_hash}
                showToc
                showPrintButton
                showBilingualSummary
              />
            </div>
            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 text-right">
              <button
                type="button"
                onClick={() => setViewDoc(null)}
                className="min-h-[40px] px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold hover:bg-slate-900 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Publish Confirmation */}
      {publishTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-100 rounded-full text-amber-700">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Publish Legal Version?</h3>
                <p className="text-xs text-slate-500">
                  {publishTarget.title} (v{publishTarget.version})
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              Publishing this version will set it as <strong>ACTIVE</strong> for all hospital tenants and automatically archive the previous version. If marked mandatory, all hospital users will be prompted to accept this new version upon their next request.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => setPublishTarget(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={isPublishing}
                onClick={handlePublishConfirm}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition cursor-pointer"
              >
                {isPublishing ? "Publishing..." : "Confirm & Publish"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Create / Edit Version */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <form
            onSubmit={handleFormSubmit}
            className="w-full max-w-3xl max-h-[90vh] flex flex-col bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900">
                {editTarget ? `Edit Draft v${editTarget.version}` : "Author New Legal Version"}
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Document Type
                  </label>
                  <select
                    disabled={!!editTarget}
                    value={formData.document_type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        document_type: e.target.value as LegalDocumentType,
                      })
                    }
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="TERMS_AND_CONDITIONS">Terms of Service</option>
                    <option value="PRIVACY_POLICY">Privacy Notice</option>
                    <option value="PATIENT_PRIVACY_NOTICE">Patient Intake Notice (OPD Template)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Version Number
                  </label>
                  <input
                    type="text"
                    disabled={!!editTarget}
                    placeholder="e.g. 1.1 or 2.0"
                    value={formData.version}
                    onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  placeholder="e.g. Master Terms of Service (v1.1)"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Summary of Changes
                </label>
                <input
                  type="text"
                  placeholder="Briefly describe what changed in this version..."
                  value={formData.summary_of_changes}
                  onChange={(e) =>
                    setFormData({ ...formData, summary_of_changes: e.target.value })
                  }
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_mandatory"
                  checked={formData.is_mandatory}
                  onChange={(e) => setFormData({ ...formData, is_mandatory: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                />
                <label htmlFor="is_mandatory" className="text-sm font-medium text-slate-700 cursor-pointer">
                  Mandatory Acceptance (Users must accept before using the platform)
                </label>
              </div>

              {/* Markdown Content Area */}
              <div>
                <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2">
                  <label className="text-xs font-semibold text-slate-700">Document Text</label>
                  <div className="flex gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setFormPreviewTab("write")}
                      className={`px-3 py-1 rounded-lg font-medium transition ${
                        formPreviewTab === "write"
                          ? "bg-sky-100 text-sky-700"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      Write
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormPreviewTab("preview")}
                      className={`px-3 py-1 rounded-lg font-medium transition ${
                        formPreviewTab === "preview"
                          ? "bg-sky-100 text-sky-700"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      Preview
                    </button>
                  </div>
                </div>

                {formPreviewTab === "write" ? (
                  <textarea
                    rows={12}
                    placeholder="Enter full legal document text (Markdown supported)..."
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl p-3 text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                ) : (
                  <div className="w-full border border-slate-200 rounded-xl p-4 bg-slate-50 max-h-80 overflow-y-auto">
                    {formData.content ? (
                      <LegalDocumentRenderer
                        title={formData.title || "Untitled Draft"}
                        version={formData.version || "draft"}
                        documentType={formData.document_type}
                        content={formData.content}
                        summaryOfChanges={formData.summary_of_changes}
                        showToc={false}
                        showPrintButton={false}
                        showBilingualSummary={false}
                      />
                    ) : (
                      <p className="text-xs text-slate-500">(No content entered yet)</p>
                    )}
                  </div>
                )}
              </div>

              {/* DPDP Rules 2025 Readiness Checklist */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-2">
                <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  DPDP Act 2023 &amp; Rules 2025 Readiness Check
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {dpdpChecklist.map((chk) => (
                    <div
                      key={chk.label}
                      className={`flex items-center gap-2 text-xs ${
                        chk.passed ? "text-emerald-800" : "text-slate-500"
                      }`}
                    >
                      <CheckCircle2
                        className={`h-3.5 w-3.5 shrink-0 ${
                          chk.passed ? "text-emerald-600" : "text-slate-300"
                        }`}
                      />
                      <span>{chk.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingForm}
                className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-sm font-semibold transition cursor-pointer"
              >
                {isSubmittingForm ? "Saving..." : editTarget ? "Update Draft" : "Save as Draft"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 4: Manage DPDP Grievance */}
      {grievanceTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="manage-grievance-title"
        >
          <form
            onSubmit={handleUpdateGrievanceSubmit}
            className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 id="manage-grievance-title" className="text-base font-bold text-slate-900">
                  Manage {grievanceTarget.reference_number}
                </h3>
                <p className="text-xs text-slate-500">
                  {grievanceTarget.request_type.replace(/_/g, " ")} · Due{" "}
                  {new Date(grievanceTarget.due_at).toLocaleDateString()}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close grievance modal"
                onClick={() => setGrievanceTarget(null)}
                className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-sm">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-1">
                <p className="font-semibold text-slate-900">{grievanceTarget.subject}</p>
                <p className="text-xs text-slate-600 whitespace-pre-line">
                  {grievanceTarget.description}
                </p>
                {grievanceTarget.nominee_name && (
                  <p className="text-xs text-slate-700 pt-1">
                    <strong>Nominee:</strong> {grievanceTarget.nominee_name} (
                    {grievanceTarget.nominee_contact})
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Resolution Status
                </label>
                <select
                  value={grievanceNewStatus}
                  onChange={(e) => setGrievanceNewStatus(e.target.value as GrievanceRequestStatus)}
                  className="w-full min-h-[42px] border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="open">Open</option>
                  <option value="in_review">In Review</option>
                  <option value="resolved">Resolved</option>
                  <option value="rejected">Declined / Closed</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Official Resolution Notes (visible to requester)
                </label>
                <textarea
                  rows={4}
                  value={grievanceNotes}
                  onChange={(e) => setGrievanceNotes(e.target.value)}
                  placeholder="Document statutory action taken under DPDP Act 2023 / Rules 2025..."
                  className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setGrievanceTarget(null)}
                className="min-h-[40px] px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUpdatingGrievance}
                className="min-h-[40px] px-5 py-2 bg-sky-700 hover:bg-sky-800 text-white rounded-xl text-sm font-semibold transition cursor-pointer disabled:opacity-50"
              >
                {isUpdatingGrievance ? "Updating..." : "Save Status"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
