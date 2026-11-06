"use client";

import { useEffect, useState, useCallback, useId } from "react";
import { useAppSelector } from "@/redux/hooks";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  PlatformEmailSettings,
  PlatformEmailTemplate,
  UpdatePlatformEmailSettingsRequest,
  CreateEmailTemplateRequest,
  UpdateEmailTemplateRequest,
} from "@/types/platformBilling";
import { platformBillingApi } from "@/services/platformBillingApi";
import { toast } from "sonner";
import {
  ArrowLeft,
  Mail,
  Server,
  FileCode2,
  Send,
  Save,
  CheckCircle2,
  AlertCircle,
  Eye,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Lock,
  Globe,
  ShieldCheck,
  X,
  Code,
} from "lucide-react";

function sanitizePreviewHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/cid:technesian_mark/g, "https://technesian.com/technesian-mark.png")
    .replace(/cid:technesian_logo/g, "https://technesian.com/technesian-logo.png");
}

export default function PlatformEmailSettingsPage() {
  const { user } = useAppSelector((state) => state.auth);
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"smtp" | "templates">("smtp");

  // SMTP Settings State
  const [settings, setSettings] = useState<PlatformEmailSettings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  // Form Fields
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpUsername, setSmtpUsername] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [useTls, setUseTls] = useState(true);
  const [useSsl, setUseSsl] = useState(false);
  const [fromEmail, setFromEmail] = useState("contact@technesian.com");
  const [fromName, setFromName] = useState("Technesian Software Solutions");
  const [replyTo, setReplyTo] = useState("contact@technesian.com");
  const [bccAll, setBccAll] = useState("");

  // Test Email State
  const [testRecipient, setTestRecipient] = useState("");
  const [sendingTest, setSendingTest] = useState(false);

  // Templates State
  const [templates, setTemplates] = useState<PlatformEmailTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [templateTypeFilter, setTemplateTypeFilter] = useState<string>("all");

  // Template Modal State
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PlatformEmailTemplate | null>(null);
  const [tmplName, setTmplName] = useState("");
  const [tmplType, setTmplType] = useState<string>("quote");
  const [tmplSubject, setTmplSubject] = useState("");
  const [tmplHtml, setTmplHtml] = useState("");
  const [tmplText, setTmplText] = useState("");
  const [tmplIsDefault, setTmplIsDefault] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [tmplModalTab, setTmplModalTab] = useState<"code" | "preview">("code");

  // Quick Preview Modal
  const [previewTemplate, setPreviewTemplate] = useState<PlatformEmailTemplate | null>(null);

  const previewFrameId = useId();

  // RBAC: Only platform_owner allowed
  useEffect(() => {
    if (user && user.role !== "platform_owner") {
      router.replace("/");
    }
  }, [user, router]);

  // Load Settings
  const loadSettings = useCallback(async () => {
    setLoadingSettings(true);
    try {
      const data = await platformBillingApi.emailSettings.get();
      setSettings(data);
      setSmtpHost(data.smtp_host || "");
      setSmtpPort(data.smtp_port || 587);
      setSmtpUsername(data.smtp_username || "");
      setUseTls(data.use_tls);
      setUseSsl(data.use_ssl);
      setFromEmail(data.from_email || "contact@technesian.com");
      setFromName(data.from_name || "Technesian Software Solutions");
      setReplyTo(data.reply_to || "contact@technesian.com");
      setBccAll(data.bcc_all || "");
    } catch (err) {
      console.error("Failed to load email settings:", err);
      toast.error("Failed to load SMTP settings");
    } finally {
      setLoadingSettings(false);
    }
  }, []);

  // Load Templates
  const loadTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    try {
      const data = await platformBillingApi.emailTemplates.list();
      setTemplates(data);
    } catch (err) {
      console.error("Failed to load email templates:", err);
      toast.error("Failed to load email templates");
    } finally {
      setLoadingTemplates(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
    loadTemplates();
  }, [loadSettings, loadTemplates]);

  if (user?.role !== "platform_owner") {
    return null;
  }

  // Save SMTP Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const payload: UpdatePlatformEmailSettingsRequest = {
        smtp_host: smtpHost.trim() || undefined,
        smtp_port: Number(smtpPort),
        smtp_username: smtpUsername.trim() || undefined,
        smtp_password: smtpPassword.trim() || undefined,
        use_tls: useTls,
        use_ssl: useSsl,
        from_email: fromEmail.trim(),
        from_name: fromName.trim(),
        reply_to: replyTo.trim() || undefined,
        bcc_all: bccAll.trim() || undefined,
      };

      const updated = await platformBillingApi.emailSettings.update(payload);
      setSettings(updated);
      setSmtpPassword(""); // Clear local password field after saving
      toast.success("SMTP settings saved and encrypted successfully");
    } catch (err: any) {
      toast.error("Failed to save settings: " + (err?.response?.data?.detail || err.message));
    } finally {
      setSavingSettings(false);
    }
  };

  // Test Email
  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testRecipient || !testRecipient.includes("@")) {
      toast.error("Please enter a valid test recipient email address.");
      return;
    }

    setSendingTest(true);
    try {
      const res = await platformBillingApi.emailSettings.test(testRecipient.trim());
      toast.success(res.message);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      const msg = typeof detail === "string" ? detail : detail?.message || "Failed to send test email. Check SMTP host and credentials.";
      toast.error(msg);
    } finally {
      setSendingTest(false);
    }
  };

  // Open Template Modal
  const handleOpenCreateTemplate = () => {
    setEditingTemplate(null);
    setTmplName("");
    setTmplType("quote");
    setTmplSubject("");
    setTmplHtml("");
    setTmplText("");
    setTmplIsDefault(false);
    setTmplModalTab("code");
    setIsTemplateModalOpen(true);
  };

  const handleOpenEditTemplate = (tmpl: PlatformEmailTemplate) => {
    setEditingTemplate(tmpl);
    setTmplName(tmpl.name);
    setTmplType(tmpl.template_type);
    setTmplSubject(tmpl.subject);
    setTmplHtml(tmpl.body_html);
    setTmplText(tmpl.body_text || "");
    setTmplIsDefault(tmpl.is_default);
    setTmplModalTab("code");
    setIsTemplateModalOpen(true);
  };

  // Save Template
  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tmplName.trim() || !tmplSubject.trim() || !tmplHtml.trim()) {
      toast.error("Please fill in template name, subject, and HTML body.");
      return;
    }

    setSavingTemplate(true);
    try {
      if (editingTemplate) {
        const payload: UpdateEmailTemplateRequest = {
          name: tmplName.trim(),
          template_type: tmplType,
          subject: tmplSubject.trim(),
          body_html: tmplHtml,
          body_text: tmplText || undefined,
          is_default: tmplIsDefault,
        };
        await platformBillingApi.emailTemplates.update(editingTemplate.id, payload);
        toast.success(`Template "${tmplName}" updated successfully`);
      } else {
        const payload: CreateEmailTemplateRequest = {
          name: tmplName.trim(),
          template_type: tmplType,
          subject: tmplSubject.trim(),
          body_html: tmplHtml,
          body_text: tmplText || undefined,
          is_default: tmplIsDefault,
        };
        await platformBillingApi.emailTemplates.create(payload);
        toast.success(`Template "${tmplName}" created successfully`);
      }

      setIsTemplateModalOpen(false);
      loadTemplates();
    } catch (err: any) {
      toast.error("Failed to save template: " + (err?.response?.data?.detail || err.message));
    } finally {
      setSavingTemplate(false);
    }
  };

  // Delete Template
  const handleDeleteTemplate = async (tmpl: PlatformEmailTemplate) => {
    if (tmpl.is_default) {
      toast.error("Cannot delete default template. Designate another default first.");
      return;
    }
    if (!confirm(`Are you sure you want to delete template "${tmpl.name}"?`)) {
      return;
    }

    try {
      await platformBillingApi.emailTemplates.delete(tmpl.id);
      toast.success("Template deleted successfully");
      loadTemplates();
    } catch (err: any) {
      toast.error("Failed to delete template: " + (err?.response?.data?.detail || err.message));
    }
  };

  const filteredTemplates = templates.filter((t) => {
    if (templateTypeFilter === "all") return true;
    return t.template_type === templateTypeFilter;
  });

  const placeholders = [
    { tag: "{{hospital_name}}", desc: "Hospital / Client Name" },
    { tag: "{{quote_number}}", desc: "Quote # (e.g. TCQ2026101)" },
    { tag: "{{invoice_number}}", desc: "Invoice # (e.g. TCI2026101)" },
    { tag: "{{valid_until}}", desc: "Validity date of quote" },
    { tag: "{{due_date}}", desc: "Payment due date" },
    { tag: "{{total_amount_formatted}}", desc: "Total amount formatted (₹1,50,000.00)" },
    { tag: "{{subtotal_formatted}}", desc: "Subtotal formatted" },
    { tag: "{{tax_amount_formatted}}", desc: "GST tax amount formatted" },
    { tag: "{{tax_rate}}", desc: "GST percentage rate" },
    { tag: "{{items_table}}", desc: "Formatted HTML Line Items Table" },
    { tag: "{{custom_message_block}}", desc: "Personal message highlight box" },
    { tag: "{{notes_block}}", desc: "Special notes section" },
    { tag: "{{quote_pdf_name}}", desc: "Attached quote PDF filename" },
    { tag: "{{invoice_pdf_name}}", desc: "Attached invoice PDF filename" },
  ];

  const insertPlaceholder = (tag: string) => {
    setTmplHtml((prev) => prev + tag);
    toast.info(`Inserted ${tag} into template body`);
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              href="/platform-billing"
              className="rounded-lg p-1.5 hover:bg-slate-100 transition text-slate-500"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Platform Email Settings & Templates
            </h1>
          </div>
          <p className="text-sm text-slate-500 pl-8">
            Manage outgoing mail server (SMTP), sender identity, and custom AWS-styled HTML email templates.
          </p>
        </div>

        {activeTab === "templates" && (
          <button
            onClick={handleOpenCreateTemplate}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:shadow-md transition"
          >
            <Plus className="h-4 w-4" /> Create Template
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-2xl px-6 pt-3 shadow-sm">
        <button
          onClick={() => setActiveTab("smtp")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition ${
            activeTab === "smtp"
              ? "border-sky-600 text-sky-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Server className="h-4 w-4" /> SMTP Server & Sender
        </button>
        <button
          onClick={() => setActiveTab("templates")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition ${
            activeTab === "templates"
              ? "border-sky-600 text-sky-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <FileCode2 className="h-4 w-4" /> Email Templates ({templates.length})
        </button>
      </div>

      {/* Tab 1: SMTP Settings */}
      {activeTab === "smtp" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Outgoing Mail Server (SMTP)</h2>
                <p className="text-xs text-slate-500">Configure your email provider (AWS SES, Google Workspace, Mailgun, or custom SMTP).</p>
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 border border-sky-100">
                <ShieldCheck className="h-3.5 w-3.5" /> AES-256 Encrypted
              </div>
            </div>

            {loadingSettings ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
              </div>
            ) : (
              <form onSubmit={handleSaveSettings} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      SMTP Host / Server
                    </label>
                    <input
                      type="text"
                      value={smtpHost}
                      onChange={(e) => setSmtpHost(e.target.value)}
                      placeholder="e.g. smtp.gmail.com, email-smtp.us-east-1.amazonaws.com"
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Port
                    </label>
                    <input
                      type="number"
                      value={smtpPort}
                      onChange={(e) => setSmtpPort(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      SMTP Username
                    </label>
                    <input
                      type="text"
                      value={smtpUsername}
                      onChange={(e) => setSmtpUsername(e.target.value)}
                      placeholder="e.g. contact@technesian.com"
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        SMTP Password
                      </label>
                      {settings?.is_password_set && (
                        <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Password Encrypted
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type="password"
                        value={smtpPassword}
                        onChange={(e) => setSmtpPassword(e.target.value)}
                        placeholder={settings?.is_password_set ? "•••••••••••• (Leave blank to keep)" : "Enter SMTP password"}
                        className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                      />
                      <Lock className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
                    </div>
                  </div>
                </div>

                {/* Security Flags */}
                <div className="flex flex-wrap gap-6 p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useTls}
                      onChange={(e) => {
                        setUseTls(e.target.checked);
                        if (e.target.checked) setUseSsl(false);
                      }}
                      className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                    />
                    <span className="text-xs font-semibold text-slate-800">Use STARTTLS (Port 587 recommended)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useSsl}
                      onChange={(e) => {
                        setUseSsl(e.target.checked);
                        if (e.target.checked) setUseTls(false);
                      }}
                      className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                    />
                    <span className="text-xs font-semibold text-slate-800">Use SSL / Direct TLS (Port 465)</span>
                  </label>
                </div>

                {/* Sender Identity */}
                <div className="pt-4 border-t border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900 mb-3">Sender Identity & Branding</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                        From Email Address
                      </label>
                      <input
                        type="email"
                        required
                        value={fromEmail}
                        onChange={(e) => setFromEmail(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                        From Display Name
                      </label>
                      <input
                        type="text"
                        required
                        value={fromName}
                        onChange={(e) => setFromName(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Reply-To Email
                      </label>
                      <input
                        type="email"
                        value={replyTo}
                        onChange={(e) => setReplyTo(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                        BCC Archive (Optional)
                      </label>
                      <input
                        type="email"
                        value={bccAll}
                        onChange={(e) => setBccAll(e.target.value)}
                        placeholder="billing@technesian.com"
                        className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-3">
                  <button
                    type="submit"
                    disabled={savingSettings}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-slate-800 transition disabled:opacity-50"
                  >
                    {savingSettings ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" /> Save Configuration
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Test Email Card */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2.5 mb-3 text-slate-900">
                <div className="rounded-lg bg-sky-50 p-2 text-sky-600">
                  <Send className="h-5 w-5" />
                </div>
                <h2 className="text-base font-bold">Verify SMTP Connection</h2>
              </div>
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                Send a quick test message to verify that your SMTP host, port, username, password, and TLS handshake work properly.
              </p>

              <form onSubmit={handleSendTestEmail} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Test Recipient Email
                  </label>
                  <input
                    type="email"
                    required
                    value={testRecipient}
                    onChange={(e) => setTestRecipient(e.target.value)}
                    placeholder="your.email@technesian.com"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                  />
                </div>
                <button
                  type="submit"
                  disabled={sendingTest}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:from-sky-600 hover:to-indigo-700 transition disabled:opacity-50"
                >
                  {sendingTest ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Connecting & Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" /> Send Test Email
                    </>
                  )}
                </button>
              </form>
            </div>

            <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/60 to-sky-50/60 p-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-950 mb-2 flex items-center gap-1.5">
                <Globe className="h-4 w-4 text-indigo-600" /> Default Platform Sender
              </h3>
              <p className="text-xs text-indigo-900/80 leading-relaxed">
                All platform quotes and invoices are emailed directly from <strong>contact@technesian.com</strong>.
                If you use Google Workspace or AWS SES, make sure to generate an App Password or SMTP Credentials.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Email Templates */}
      {activeTab === "templates" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-2">
            {["all", "quote", "invoice", "custom"].map((type) => (
              <button
                key={type}
                onClick={() => setTemplateTypeFilter(type)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${
                  templateTypeFilter === type
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                {type === "all" ? "All Templates" : `${type}s`}
              </button>
            ))}
          </div>

          {loadingTemplates ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center bg-white">
              <FileCode2 className="mx-auto h-12 w-12 text-slate-400" />
              <h3 className="mt-2 text-sm font-semibold text-slate-900">No templates found</h3>
              <p className="mt-1 text-sm text-slate-500">Create a new HTML email template to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTemplates.map((tmpl) => (
                <div
                  key={tmpl.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="rounded-lg bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-700 capitalize">
                          {tmpl.template_type}
                        </span>
                        {tmpl.is_default && (
                          <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Default
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        Updated {new Date(tmpl.updated_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-slate-900">{tmpl.name}</h3>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                        <span className="font-semibold text-slate-700">Subject:</span> {tmpl.subject}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-xs text-slate-600 font-mono line-clamp-3">
                      {tmpl.body_html.slice(0, 200)}...
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100">
                    <button
                      onClick={() => setPreviewTemplate(tmpl)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-700"
                    >
                      <Eye className="h-3.5 w-3.5" /> Preview HTML
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditTemplate(tmpl)}
                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </button>
                      {!tmpl.is_default && (
                        <button
                          onClick={() => handleDeleteTemplate(tmpl)}
                          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Template Create / Edit Modal */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <Code className="h-5 w-5 text-sky-400" />
                <h2 className="text-lg font-bold">
                  {editingTemplate ? `Edit Template: ${editingTemplate.name}` : "Create New Email Template"}
                </h2>
              </div>
              <button
                onClick={() => setIsTemplateModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-2">
              <button
                type="button"
                onClick={() => setTmplModalTab("code")}
                className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition ${
                  tmplModalTab === "code"
                    ? "border-sky-600 text-sky-600 bg-white rounded-t-lg"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Code className="h-3.5 w-3.5" /> HTML Template Code
              </button>
              <button
                type="button"
                onClick={() => setTmplModalTab("preview")}
                className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition ${
                  tmplModalTab === "preview"
                    ? "border-sky-600 text-sky-600 bg-white rounded-t-lg"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Eye className="h-3.5 w-3.5" /> Live Rendered Preview
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {tmplModalTab === "code" ? (
                <form id="template-editor-form" onSubmit={handleSaveTemplate} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Template Name
                      </label>
                      <input
                        type="text"
                        required
                        value={tmplName}
                        onChange={(e) => setTmplName(e.target.value)}
                        placeholder="e.g. Platform Quote - Technesian Standard"
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Type
                      </label>
                      <select
                        value={tmplType}
                        onChange={(e) => setTmplType(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white focus:border-sky-500 focus:outline-none"
                      >
                        <option value="quote">Quote</option>
                        <option value="invoice">Invoice</option>
                        <option value="receipt">Receipt</option>
                        <option value="custom">Custom Notice</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Subject Line (Supports Placeholders)
                    </label>
                    <input
                      type="text"
                      required
                      value={tmplSubject}
                      onChange={(e) => setTmplSubject(e.target.value)}
                      placeholder="e.g. Commercial Quotation {{quote_number}} - Technesian Software Solutions"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
                    />
                  </div>

                  {/* Placeholders Toolbar */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Available Placeholders (Click to Insert)
                    </label>
                    <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-slate-50 border border-slate-200 max-h-24 overflow-y-auto">
                      {placeholders.map((p) => (
                        <button
                          key={p.tag}
                          type="button"
                          onClick={() => insertPlaceholder(p.tag)}
                          title={p.desc}
                          className="rounded-md bg-white border border-slate-300 px-2 py-0.5 text-[11px] font-mono text-slate-700 hover:border-sky-500 hover:text-sky-600 transition"
                        >
                          {p.tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* HTML Code Editor */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      HTML Email Code
                    </label>
                    <textarea
                      rows={14}
                      required
                      value={tmplHtml}
                      onChange={(e) => setTmplHtml(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 p-3 font-mono text-xs text-slate-800 bg-slate-900 text-slate-100 focus:outline-none"
                    />
                  </div>

                  {/* Is Default Checkbox */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tmplIsDefault}
                      onChange={(e) => setTmplIsDefault(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                    />
                    <span className="text-xs font-semibold text-slate-800">
                      Set as default template for &quot;{tmplType}&quot;
                    </span>
                  </label>
                </form>
              ) : (
                <div className="rounded-xl border border-slate-300 overflow-hidden shadow-inner bg-slate-100">
                  <iframe
                    id={previewFrameId}
                    title="Template Preview"
                    srcDoc={sanitizePreviewHtml(tmplHtml)}
                    className="w-full h-[520px] border-0 bg-white"
                    sandbox="allow-same-origin"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-3.5">
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(false)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="template-editor-form"
                disabled={savingTemplate}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
              >
                {savingTemplate ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Template Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-sky-400" />
                <h2 className="text-base font-bold">Preview: {previewTemplate.name}</h2>
              </div>
              <button
                onClick={() => setPreviewTemplate(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
              <span className="font-semibold text-slate-800">Subject:</span> {previewTemplate.subject}
            </div>
            <div className="flex-1 overflow-y-auto p-4 bg-slate-100">
              <iframe
                title="Quick Preview"
                srcDoc={sanitizePreviewHtml(previewTemplate.body_html)}
                className="w-full h-[500px] rounded-xl border border-slate-300 bg-white shadow-sm"
                sandbox="allow-same-origin"
              />
            </div>
            <div className="flex justify-end p-4 bg-slate-50 border-t border-slate-200">
              <button
                onClick={() => setPreviewTemplate(null)}
                className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
