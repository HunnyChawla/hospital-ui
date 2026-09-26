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
} from "@/services/legalApi";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import {
  Scale,
  FileText,
  ShieldCheck,
  Plus,
  Eye,
  Send,
  Edit3,
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

export default function TermsConditionsPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [activeTab, setActiveTab] = useState<"documents" | "audit">("documents");

  // Documents state
  const [documents, setDocuments] = useState<LegalDocumentResponse[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  // Audit state
  const [auditLogs, setAuditLogs] = useState<UserConsentAuditItem[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [auditSearch, setAuditSearch] = useState("");

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
              <span className="text-xl font-bold text-slate-900">DPDP & ABDM</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-800">
                Enforced
              </span>
            </div>
            <p className="text-xs text-slate-500">Technesian Software Solutions</p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <UserCheck className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab("documents")}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition ${
            activeTab === "documents"
              ? "border-sky-600 text-sky-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <FileText className="h-4 w-4" />
          Document Versions ({documents.length})
        </button>
        <button
          onClick={() => setActiveTab("audit")}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition ${
            activeTab === "audit"
              ? "border-sky-600 text-sky-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <History className="h-4 w-4" />
          User Consents Audit Trail
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
                className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="all">All Types</option>
                <option value="TERMS_AND_CONDITIONS">Terms & Conditions</option>
                <option value="PRIVACY_POLICY">Privacy Policy</option>
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
                  {documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3.5 px-4 font-medium">
                        {doc.document_type === "TERMS_AND_CONDITIONS" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                            <FileText className="h-3.5 w-3.5" /> Terms of Service
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100">
                            <ShieldCheck className="h-3.5 w-3.5" /> Privacy Notice
                          </span>
                        )}
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
                            title="View Full Content"
                            onClick={() => handleOpenView(doc.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-sky-600 hover:bg-sky-50 transition"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {doc.status === "draft" && (
                            <button
                              title="Edit Draft"
                              onClick={() => handleOpenEdit(doc)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                          )}
                          {!doc.is_active && (
                            <button
                              title="Publish & Activate Version"
                              onClick={() => setPublishTarget(doc)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition"
                            >
                              <Send className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
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
            <button
              onClick={fetchAuditLogs}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Refresh Logs
            </button>
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
                        {log.document_type === "TERMS_AND_CONDITIONS" ? "Terms of Service" : "Privacy Notice"}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 text-xs">v{log.version}</td>
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

      {/* MODAL 1: View Full Content */}
      {viewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl max-h-[85vh] flex flex-col bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{viewDoc.title}</h3>
                <p className="text-xs text-slate-500">
                  Version {viewDoc.version} • {viewDoc.document_type} • Status: {viewDoc.status}
                </p>
              </div>
              <button
                onClick={() => setViewDoc(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 bg-white text-xs sm:text-sm text-slate-800 leading-relaxed font-sans whitespace-pre-wrap select-text">
              {viewDoc.content}
            </div>
            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 text-right">
              <button
                onClick={() => setViewDoc(null)}
                className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold hover:bg-slate-900"
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
                    placeholder="Enter full legal document text..."
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl p-3 text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                ) : (
                  <div className="w-full border border-slate-200 rounded-xl p-4 bg-slate-50 text-xs sm:text-sm text-slate-800 leading-relaxed font-sans whitespace-pre-wrap max-h-72 overflow-y-auto">
                    {formData.content || "(No content entered yet)"}
                  </div>
                )}
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
    </div>
  );
}
