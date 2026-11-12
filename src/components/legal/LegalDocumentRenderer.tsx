"use client";

import React, { useMemo, useState } from "react";
import {
  BookOpen,
  Languages,
  ListTree,
  Printer,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { LegalDocumentType } from "@/services/legalApi";

interface LegalDocumentRendererProps {
  title: string;
  version: string;
  documentType: LegalDocumentType;
  content: string;
  summaryOfChanges?: string | null;
  publishedAt?: string | null;
  contentHash?: string;
  showToc?: boolean;
  showPrintButton?: boolean;
  showBilingualSummary?: boolean;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
}

interface TocItem {
  id: string;
  level: number;
  text: string;
}

type MdBlock =
  | { type: "heading"; level: number; text: string; id: string }
  | { type: "hr" }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "paragraph"; text: string };

function slugifyHeading(text: string, idx: number): string {
  const clean = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
  return `sec-${clean || "item"}-${idx}`;
}

function parseInlineNodes(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|https:\/\/[^\s)]+)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let keyCounter = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    const key = `inl-${keyCounter++}`;
    if (token.startsWith("**") && token.endsWith("**")) {
      nodes.push(
        <strong key={key} className="font-semibold text-slate-900">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith("*") && token.endsWith("*")) {
      nodes.push(
        <em key={key} className="italic text-slate-700">
          {token.slice(1, -1)}
        </em>
      );
    } else if (token.startsWith("`") && token.endsWith("`")) {
      nodes.push(
        <code
          key={key}
          className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[0.85em] text-sky-900 border border-slate-200/70"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith("https://")) {
      nodes.push(
        <a
          key={key}
          href={token}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-sky-700 underline decoration-sky-300 underline-offset-2 hover:text-sky-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 rounded"
        >
          {token}
        </a>
      );
    }
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }
  return nodes;
}

function parseMarkdownBlocks(content: string): { blocks: MdBlock[]; toc: TocItem[] } {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: MdBlock[] = [];
  const toc: TocItem[] = [];
  let i = 0;
  let headingCounter = 0;

  while (i < lines.length) {
    const raw = lines[i];
    const trimmed = raw.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    if (/^-{3,}$/.test(trimmed)) {
      blocks.push({ type: "hr" });
      i += 1;
      continue;
    }

    const headingMatch = /^(#{1,4})\s+(.+)$/.exec(trimmed);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2].replace(/\*\*/g, "").trim();
      const id = slugifyHeading(text, headingCounter++);
      blocks.push({ type: "heading", level, text: headingMatch[2].trim(), id });
      if (level >= 2 && level <= 4) {
        toc.push({ id, level, text });
      }
      i += 1;
      continue;
    }

    // GFM Table
    if (
      trimmed.startsWith("|") &&
      i + 1 < lines.length &&
      /^\|[\s:|-]+\|?$/.test(lines[i + 1].trim())
    ) {
      const splitRow = (row: string) =>
        row
          .trim()
          .replace(/^\|/, "")
          .replace(/\|$/, "")
          .split("|")
          .map((c) => c.trim());

      const headers = splitRow(trimmed);
      i += 2; // skip header + separator
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        rows.push(splitRow(lines[i]));
        i += 1;
      }
      blocks.push({ type: "table", headers, rows });
      continue;
    }

    // Unordered list
    if (/^[-*]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, ""));
        i += 1;
      }
      blocks.push({ type: "ul", items });
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ""));
        i += 1;
      }
      blocks.push({ type: "ol", items });
      continue;
    }

    // Paragraph (combine contiguous non-special lines)
    const paraLines: string[] = [trimmed];
    i += 1;
    while (i < lines.length) {
      const next = lines[i].trim();
      if (
        !next ||
        /^-{3,}$/.test(next) ||
        /^(#{1,4})\s+/.test(next) ||
        next.startsWith("|") ||
        /^[-*]\s+/.test(next) ||
        /^\d+\.\s+/.test(next)
      ) {
        break;
      }
      paraLines.push(next);
      i += 1;
    }
    blocks.push({ type: "paragraph", text: paraLines.join(" ") });
  }

  return { blocks, toc };
}

const DPDP_PLAIN_SUMMARY = {
  en: {
    heading: "Key Privacy Highlights (English)",
    points: [
      "What we collect: Staff login and profile details, security and consent audit logs, and patient health records processed strictly under your Hospital's direction.",
      "Why we collect it: Clinical and hospital operations, consented ABDM/telemedicine workflows, cybersecurity protection, and statutory compliance.",
      "Cookies & Storage: Only one essential security cookie (hms_device_id) and strictly necessary session storage. No third-party advertising or tracking cookies.",
      "Security & Retention: Security logs are retained for cybersecurity compliance; advance notice is provided prior to scheduled account deletion; breach notifications are coordinated promptly.",
      "Your Rights & Grievance Officer: Access, correct, erase, nominate a representative, or withdraw consent anytime via Legal, Privacy & Rights. Officer: Hunny (contact@technesian.com | +91-9896333664).",
    ],
  },
  hi: {
    heading: "मुख्य गोपनीयता बिंदु (हिन्दी)",
    points: [
      "हम क्या डेटा एकत्र करते हैं: स्टाफ लॉगिन व प्रोफ़ाइल विवरण, सुरक्षा व सहमति ऑडिट लॉग, और अस्पताल के निर्देशानुसार संसाधित रोगी स्वास्थ्य रिकॉर्ड।",
      "उपयोग का उद्देश्य: अस्पताल के क्लिनिकल एवं बिलिंग कार्य, सहमति-आधारित ABDM व टेलीमेडिसिन सेवाएं, साइबर सुरक्षा और वैधानिक अनुपालन।",
      "कुकीज़ एवं स्टोरेज: केवल एक आवश्यक सुरक्षा कुकी (hms_device_id) और अनिवार्य सेशन स्टोरेज। कोई विज्ञापन या थर्ड-पार्टी ट्रैकिंग कुकी नहीं।",
      "सुरक्षा व अवधि: साइबर सुरक्षा हेतु आवश्यक लॉग संरक्षण, निर्धारित खाता हटाने से पूर्व सूचना, एवं किसी भी डेटा सुरक्षा घटना की त्वरित सूचना।",
      "आपके अधिकार एवं शिकायत अधिकारी: Legal, Privacy & Rights के माध्यम से डेटा देखें, सुधारें, नामांकित (Nominee) करें या सहमति वापस लें। अधिकारी: Hunny (contact@technesian.com | +91-9896333664)।",
    ],
  },
};

export function LegalDocumentRenderer({
  title,
  version,
  documentType,
  content,
  summaryOfChanges,
  publishedAt,
  contentHash,
  showToc = true,
  showPrintButton = true,
  showBilingualSummary = true,
  scrollContainerRef,
}: LegalDocumentRendererProps) {
  const [summaryLang, setSummaryLang] = useState<"en" | "hi">("en");
  const [tocOpenMobile, setTocOpenMobile] = useState(false);

  const { blocks, toc } = useMemo(() => parseMarkdownBlocks(content), [content]);

  const handleJump = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (scrollContainerRef?.current) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    setTocOpenMobile(false);
  };

  const handlePrint = () => {
    if (typeof window === "undefined") return;
    const printWin = window.open("", "_blank", "noopener,noreferrer,width=900,height=700");
    if (!printWin) {
      window.print();
      return;
    }
    const escapedTitle = title.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const escapedContent = content
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    printWin.document.write(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapedTitle} (v${version})</title>
  <style>
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; color: #0f172a; line-height: 1.6; max-width: 820px; margin: 32px auto; padding: 0 20px; }
    header { border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 20px; }
    h1 { font-size: 20px; margin: 0 0 4px 0; }
    .meta { font-size: 12px; color: #475569; }
    pre { white-space: pre-wrap; font-family: inherit; font-size: 13px; margin: 0; }
    @media print { body { margin: 12mm; } }
  </style>
</head>
<body>
  <header>
    <h1>${escapedTitle}</h1>
    <div class="meta">Version ${version} • Technesian Software Solutions LLP (Cura HMS) • Published: ${
      publishedAt ? new Date(publishedAt).toLocaleDateString("en-IN") : "Active"
    }${contentHash ? ` • SHA-256: ${contentHash.slice(0, 16)}...` : ""}</div>
  </header>
  <pre>${escapedContent}</pre>
</body>
</html>`);
    printWin.document.close();
    printWin.focus();
    printWin.print();
  };

  const isPrivacyOrPatient =
    documentType === "PRIVACY_POLICY" || documentType === "PATIENT_PRIVACY_NOTICE";
  const summaryData = DPDP_PLAIN_SUMMARY[summaryLang];

  return (
    <div className="space-y-4">
      {/* Document Header Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-sky-600 px-2.5 py-0.5 text-xs font-bold text-white shadow-2xs">
                v{version}
              </span>
              <span className="inline-flex items-center rounded-full bg-teal-50 border border-teal-200 px-2.5 py-0.5 text-xs font-semibold text-teal-800">
                Active Policy
              </span>
              {publishedAt && (
                <span className="text-xs text-slate-500">
                  Effective: {new Date(publishedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                </span>
              )}
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
              {title}
            </h3>
            {contentHash && (
              <p className="text-[11px] font-mono text-slate-500">
                Document Checksum (SHA-256): {contentHash.slice(0, 20)}...
              </p>
            )}
          </div>

          {showPrintButton && (
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 hover:border-slate-400 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 shrink-0"
            >
              <Printer className="h-4 w-4 text-sky-600" aria-hidden="true" />
              <span>Print / Save PDF</span>
            </button>
          )}
        </div>

        {/* Summary of Updates */}
        {summaryOfChanges && (
          <div className="mt-4 rounded-xl border border-sky-100 bg-gradient-to-r from-sky-50/70 via-teal-50/35 to-sky-50/70 p-3.5 text-xs sm:text-sm text-slate-800">
            <div className="flex items-start gap-2.5">
              <Sparkles className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="font-semibold text-slate-900">Summary of Updates (v{version})</p>
                <p className="mt-0.5 text-slate-700 leading-relaxed">{summaryOfChanges}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Plain-Language Bilingual DPDP Rule 3 Summary */}
      {showBilingualSummary && isPrivacyOrPatient && (
        <div className="rounded-xl border border-teal-200 bg-teal-50/60 p-4 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-teal-950">
              <Languages className="h-4 w-4 text-teal-700 shrink-0" aria-hidden="true" />
              <span>{summaryData.heading}</span>
            </div>
            <div
              className="inline-flex rounded-lg border border-teal-200 bg-white p-0.5"
              role="group"
              aria-label="Summary language selector"
            >
              <button
                type="button"
                onClick={() => setSummaryLang("en")}
                className={`min-h-[32px] px-2.5 py-1 text-xs font-semibold rounded-md transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 ${
                  summaryLang === "en"
                    ? "bg-teal-700 text-white"
                    : "text-slate-700 hover:bg-teal-50"
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setSummaryLang("hi")}
                className={`min-h-[32px] px-2.5 py-1 text-xs font-semibold rounded-md transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 ${
                  summaryLang === "hi"
                    ? "bg-teal-700 text-white"
                    : "text-slate-700 hover:bg-teal-50"
                }`}
              >
                हिन्दी (Hindi)
              </button>
            </div>
          </div>
          <ul className="space-y-1.5 text-xs sm:text-sm text-teal-950 list-disc pl-5">
            {summaryData.points.map((pt, idx) => (
              <li key={idx} className="leading-relaxed">
                {pt}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Mobile Collapsible TOC */}
      {showToc && toc.length > 0 && (
        <div className="lg:hidden rounded-xl border border-slate-200 bg-white">
          <button
            type="button"
            onClick={() => setTocOpenMobile((prev) => !prev)}
            aria-expanded={tocOpenMobile}
            className="w-full min-h-[44px] flex items-center justify-between px-4 py-2.5 text-xs font-semibold text-slate-800 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 rounded-xl"
          >
            <span className="flex items-center gap-2">
              <ListTree className="h-4 w-4 text-sky-700" aria-hidden="true" />
              Jump to Section ({toc.length})
            </span>
            {tocOpenMobile ? (
              <ChevronUp className="h-4 w-4 text-slate-500" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-500" aria-hidden="true" />
            )}
          </button>
          {tocOpenMobile && (
            <nav aria-label="Document sections" className="border-t border-slate-100 p-2 space-y-1 max-h-60 overflow-y-auto">
              {toc.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleJump(item.id)}
                  className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-sky-50 hover:text-sky-900 rounded-lg transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600"
                >
                  {item.text}
                </button>
              ))}
            </nav>
          )}
        </div>
      )}

      {/* Main Two-Column Body + Desktop TOC */}
      <div className={`grid grid-cols-1 ${showToc && toc.length > 0 ? "lg:grid-cols-4 gap-5" : ""}`}>
        {showToc && toc.length > 0 && (
          <aside className="hidden lg:block lg:col-span-1">
            <div className="sticky top-2 rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 pb-2.5 mb-2 border-b border-slate-100">
                <BookOpen className="h-3.5 w-3.5 text-sky-700" aria-hidden="true" />
                <span>Sections</span>
              </div>
              <nav aria-label="Document sections" className="space-y-1 max-h-[55vh] overflow-y-auto pr-1">
                {toc.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleJump(item.id)}
                    className={`w-full text-left rounded-lg px-2.5 py-2 text-xs leading-snug transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 ${
                      item.level >= 4
                        ? "pl-5 text-slate-600 hover:bg-sky-50 hover:text-sky-900"
                        : "font-medium text-slate-800 hover:bg-sky-50 hover:text-sky-900"
                    }`}
                  >
                    {item.text}
                  </button>
                ))}
              </nav>
            </div>
          </aside>
        )}

        <article
          className={`${
            showToc && toc.length > 0 ? "lg:col-span-3" : ""
          } rounded-xl border border-slate-200 bg-white p-5 sm:p-7 shadow-2xs space-y-4 text-sm text-slate-800 leading-relaxed select-text`}
        >
          {blocks.map((block, idx) => {
            if (block.type === "hr") {
              return <hr key={idx} className="border-slate-200 my-4" />;
            }
            if (block.type === "heading") {
              if (block.level === 1) {
                return (
                  <h2
                    key={idx}
                    id={block.id}
                    className="text-lg sm:text-xl font-bold text-slate-950 tracking-tight scroll-mt-4"
                  >
                    {parseInlineNodes(block.text)}
                  </h2>
                );
              }
              if (block.level === 2 || block.level === 3) {
                return (
                  <h3
                    key={idx}
                    id={block.id}
                    className="text-base font-bold text-slate-900 pt-2 border-b border-slate-100 pb-1.5 scroll-mt-4"
                  >
                    {parseInlineNodes(block.text)}
                  </h3>
                );
              }
              return (
                <h4
                  key={idx}
                  id={block.id}
                  className="text-sm font-bold text-sky-900 pt-1 scroll-mt-4"
                >
                  {parseInlineNodes(block.text)}
                </h4>
              );
            }
            if (block.type === "table") {
              return (
                <div
                  key={idx}
                  className="overflow-x-auto rounded-xl border border-slate-200 my-3"
                >
                  <table className="w-full border-collapse text-left text-xs sm:text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-900 font-semibold">
                      <tr>
                        {block.headers.map((h, hIdx) => (
                          <th key={hIdx} className="px-3.5 py-2.5 align-top">
                            {parseInlineNodes(h)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {block.rows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-50/70">
                          {row.map((cell, cIdx) => (
                            <td
                              key={cIdx}
                              className="px-3.5 py-2.5 align-top text-slate-700 leading-relaxed"
                            >
                              {parseInlineNodes(cell)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            }
            if (block.type === "ul") {
              return (
                <ul key={idx} className="list-disc pl-5 space-y-1.5 text-slate-700">
                  {block.items.map((item, iIdx) => (
                    <li key={iIdx} className="leading-relaxed">
                      {parseInlineNodes(item)}
                    </li>
                  ))}
                </ul>
              );
            }
            if (block.type === "ol") {
              return (
                <ol key={idx} className="list-decimal pl-5 space-y-1.5 text-slate-700">
                  {block.items.map((item, iIdx) => (
                    <li key={iIdx} className="leading-relaxed">
                      {parseInlineNodes(item)}
                    </li>
                  ))}
                </ol>
              );
            }
            return (
              <p key={idx} className="text-slate-700 leading-relaxed">
                {parseInlineNodes(block.text)}
              </p>
            );
          })}
        </article>
      </div>
    </div>
  );
}
