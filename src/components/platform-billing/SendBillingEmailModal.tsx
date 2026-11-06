"use client";

import { useEffect, useState, useId } from "react";
import { Quote, PlatformInvoice, PlatformEmailTemplate, EmailPreviewResponse } from "@/types/platformBilling";
import { platformBillingApi } from "@/services/platformBillingApi";
import { toast } from "sonner";
import { Mail, Send, Eye, FileText, CheckCircle2, AlertCircle, Loader2, X, Paperclip } from "lucide-react";

interface SendBillingEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "quote" | "invoice";
  document: Quote | PlatformInvoice | null;
  onSuccess: () => void;
}

function sanitizePreviewHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/cid:technesian_mark/g, "https://technesian.com/technesian-mark.png")
    .replace(/cid:technesian_logo/g, "https://technesian.com/technesian-logo.png");
}

export function SendBillingEmailModal({
  isOpen,
  onClose,
  type,
  document,
  onSuccess,
}: SendBillingEmailModalProps) {
  const [recipientEmail, setRecipientEmail] = useState("");
  const [ccEmails, setCcEmails] = useState("");
  const [subject, setSubject] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [attachPdf, setAttachPdf] = useState(true);
  const [templates, setTemplates] = useState<PlatformEmailTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"compose" | "preview">("compose");

  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [previewData, setPreviewData] = useState<EmailPreviewResponse | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [sending, setSending] = useState(false);

  const previewFrameId = useId();

  const docNumber = document
    ? "quote_number" in document
      ? document.quote_number
      : document.invoice_number
    : "";

  const hospitalName = document
    ? document.hospital_name || document.tenant_name || "Client"
    : "";

  // Reset and pre-populate fields when opened
  useEffect(() => {
    if (isOpen && document) {
      setRecipientEmail(document.hospital_email || "");
      setCcEmails("");
      setCustomMessage("");
      setAttachPdf(true);
      setActiveTab("compose");
      setPreviewData(null);

      // Fetch templates
      async function fetchTemplates() {
        setLoadingTemplates(true);
        try {
          const list = await platformBillingApi.emailTemplates.list(type);
          setTemplates(list);
          const defaultTmpl = list.find((t) => t.is_default) || list[0];
          if (defaultTmpl) {
            setSelectedTemplateId(defaultTmpl.id);
            setSubject(
              defaultTmpl.subject
                .replace("{{quote_number}}", docNumber)
                .replace("{{invoice_number}}", docNumber)
                .replace("{{hospital_name}}", hospitalName)
            );
          }
        } catch (err) {
          console.error("Failed to fetch email templates:", err);
        } finally {
          setLoadingTemplates(false);
        }
      }

      fetchTemplates();
    }
  }, [isOpen, document, type, docNumber, hospitalName]);

  // When template changes, update default subject
  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const tmpl = templates.find((t) => t.id === templateId);
    if (tmpl) {
      setSubject(
        tmpl.subject
          .replace("{{quote_number}}", docNumber)
          .replace("{{invoice_number}}", docNumber)
          .replace("{{hospital_name}}", hospitalName)
      );
    }
    // Refresh preview if preview tab active
    if (activeTab === "preview") {
      loadPreview(templateId);
    }
  };

  const loadPreview = async (templateId?: string) => {
    if (!document) return;
    setLoadingPreview(true);
    try {
      const tmplId = templateId || selectedTemplateId || undefined;
      let res: EmailPreviewResponse;
      if (type === "quote") {
        res = await platformBillingApi.quotes.previewEmail(document.id, {
          template_id: tmplId,
          custom_message: customMessage,
        });
      } else {
        res = await platformBillingApi.invoices.previewEmail(document.id, {
          template_id: tmplId,
          custom_message: customMessage,
        });
      }
      setPreviewData(res);
    } catch (err) {
      toast.error("Failed to load email preview");
      console.error(err);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleTabSwitch = (tab: "compose" | "preview") => {
    setActiveTab(tab);
    if (tab === "preview" && !previewData) {
      loadPreview();
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!document) return;

    if (!recipientEmail || !recipientEmail.trim() || !recipientEmail.includes("@")) {
      toast.error("Please enter a valid recipient email address.");
      return;
    }

    setSending(true);
    try {
      const parsedCc = ccEmails
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && s.includes("@"));

      const payload = {
        recipient_email: recipientEmail.trim(),
        cc_emails: parsedCc.length > 0 ? parsedCc : undefined,
        subject: subject.trim() || undefined,
        template_id: selectedTemplateId || undefined,
        custom_message: customMessage.trim() || undefined,
        attach_pdf: attachPdf,
      };

      if (type === "quote") {
        await platformBillingApi.quotes.sendEmail(document.id, payload);
        toast.success(`Quote ${docNumber} sent successfully to ${recipientEmail.trim()}`);
      } else {
        await platformBillingApi.invoices.sendEmail(document.id, payload);
        toast.success(`Invoice ${docNumber} sent successfully to ${recipientEmail.trim()}`);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Failed to send email:", err);
      const detail = err?.response?.data?.detail;
      const msg = typeof detail === "string" ? detail : detail?.message || "Failed to send email. Check SMTP settings.";
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  if (!isOpen || !document) return null;

  const pdfFileName = type === "quote" ? `quote_${docNumber}.pdf` : `invoice_${docNumber}.pdf`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-sky-400">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">
                  Send {type === "quote" ? "Quotation" : "Invoice"} over Email
                </h2>
                <span className="rounded-md bg-sky-500/20 px-2 py-0.5 text-xs font-semibold text-sky-300 font-mono">
                  {docNumber}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                To: <span className="font-semibold text-white">{hospitalName}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={sending}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Bar */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-2">
          <button
            type="button"
            onClick={() => handleTabSwitch("compose")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition ${
              activeTab === "compose"
                ? "border-sky-600 text-sky-600 bg-white rounded-t-lg"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Mail className="h-3.5 w-3.5" /> Compose Email
          </button>
          <button
            type="button"
            onClick={() => handleTabSwitch("preview")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition ${
              activeTab === "preview"
                ? "border-sky-600 text-sky-600 bg-white rounded-t-lg"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Eye className="h-3.5 w-3.5" /> Live HTML Preview
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "compose" ? (
            <form id="send-billing-email-form" onSubmit={handleSend} className="space-y-4">
              {/* Recipient Email */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Recipient Email <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="e.g. accounts@hospital.com, director@clinic.com"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                  />
                  {document.hospital_email && recipientEmail === document.hospital_email && (
                    <span className="absolute right-3 top-2.5 inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                      <CheckCircle2 className="h-3 w-3" /> Contact Email
                    </span>
                  )}
                </div>
              </div>

              {/* CC Emails */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  CC Recipient(s) <span className="text-slate-400 font-normal lowercase">(optional, comma-separated)</span>
                </label>
                <input
                  type="text"
                  value={ccEmails}
                  onChange={(e) => setCcEmails(e.target.value)}
                  placeholder="billing@hospital.com, cfo@hospital.com"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                />
              </div>

              {/* Template Selector & Subject */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Template
                  </label>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => handleTemplateChange(e.target.value)}
                    disabled={loadingTemplates}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                  >
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} {t.is_default ? "(Default)" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Subject Line
                  </label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                  />
                </div>
              </div>

              {/* Custom Message / Personal Note */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Personal Message / Callout <span className="text-slate-400 font-normal lowercase">(optional highlight box)</span>
                </label>
                <textarea
                  rows={3}
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="e.g. As discussed over the call, we have included the complimentary 3-month onboarding support..."
                  className="w-full rounded-xl border border-slate-300 p-3 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                />
              </div>

              {/* Attachment Card */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={attachPdf}
                    onChange={(e) => setAttachPdf(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                  />
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Paperclip className="h-4 w-4 text-slate-500" />
                      <span className="text-sm font-semibold text-slate-800">
                        Attach official ReportLab PDF document
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-mono">
                      File: {pdfFileName} (Technesian Letterhead, GSTIN, & verified line items)
                    </p>
                  </div>
                </label>
              </div>

              {/* Info Banner */}
              <div className="rounded-xl bg-sky-50 border border-sky-100 p-3.5 flex items-start gap-3 text-sky-900 text-xs leading-relaxed">
                <AlertCircle className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />
                <div>
                  Emails will be dispatched from <strong>contact@technesian.com</strong> with AWS-style professional HTML branding and your company footer. Status will be updated to <strong>SENT</strong>.
                </div>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              {loadingPreview ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-sky-600 mb-2" />
                  <p className="text-sm text-slate-500 font-medium">Rendering AWS-style email preview...</p>
                </div>
              ) : previewData ? (
                <div className="space-y-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 space-y-1">
                    <div>
                      <span className="font-semibold text-slate-700">Subject:</span> {previewData.subject}
                    </div>
                    <div>
                      <span className="font-semibold text-slate-700">Sender:</span> Technesian Software Solutions &lt;contact@technesian.com&gt;
                    </div>
                    <div>
                      <span className="font-semibold text-slate-700">Recipient:</span> {recipientEmail || "recipient@hospital.com"}
                    </div>
                  </div>

                  {/* Rendered HTML in iframe */}
                  <div className="rounded-xl border border-slate-300 overflow-hidden shadow-inner bg-slate-100">
                    <iframe
                      id={previewFrameId}
                      title="Email Preview"
                      srcDoc={sanitizePreviewHtml(previewData.html_content)}
                      className="w-full h-[450px] border-0 bg-white"
                      sandbox="allow-same-origin"
                    />
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400">
                  Click preview to load rendered email template.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3.5">
          <div className="text-xs text-slate-500">
            {activeTab === "compose" ? (
              <button
                type="button"
                onClick={() => handleTabSwitch("preview")}
                className="inline-flex items-center gap-1.5 font-semibold text-sky-600 hover:text-sky-700"
              >
                <Eye className="h-3.5 w-3.5" /> Preview before sending
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleTabSwitch("compose")}
                className="font-semibold text-slate-600 hover:text-slate-800"
              >
                ← Back to compose
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={sending}
              className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="send-billing-email-form"
              onClick={(e) => {
                if (activeTab === "preview") {
                  handleSend(e);
                }
              }}
              disabled={sending}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:from-sky-600 hover:to-indigo-700 transition disabled:opacity-50"
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Sending Email...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" /> Send Email Now
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
