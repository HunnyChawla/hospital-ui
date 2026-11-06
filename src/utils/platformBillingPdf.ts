import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Quote, PlatformInvoice } from "@/types/platformBilling";
import { TECHNESIAN_LOGO_BASE64 } from "./technesianLogoBase64";

/** Format currency in Indian numbering system (e.g. ₹1,50,000.00) */
function formatCurrency(amount: number | undefined | null): string {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);
}

/** Format ISO date into DD-MMM-YYYY (e.g. 06-Nov-2026) */
function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

interface CommonPdfOptions {
  title: string;
  docNumber: string;
  metaDateLabel: string;
  metaDateValue: string;
  secondaryDateLabel?: string;
  secondaryDateValue?: string;
  status?: string;
  showStatus?: boolean;
  recipientLabel: string;
  hospitalName: string;
  hospitalAddress?: string | null;
  hospitalEmail?: string | null;
  hospitalPhone?: string | null;
  partyGst?: string | null;
  lineItems: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount?: number;
  notes?: string | null;
  terms?: string | null;
  outputFilename: string;
}

/**
 * Render a professional A4 Quote or Invoice document directly in the browser using jsPDF.
 * Uses logo ONLY as image and renders crisp vector text for contact details with phone +91 9896333664.
 * The header covers the top of the page horizontally (0 to pageWidth) with zero margin on left or right.
 */
function renderPlatformBillingDocument(options: CommonPdfOptions): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;
  const contentWidth = pageWidth - margin * 2; // 180mm

  // =========================================================================
  // 1. Full-Bleed Prominent Header (covers top page horizontally, 0 to 210mm)
  // =========================================================================
  const headerHeight = 44; // Increased size to cover the top page generously

  // Full-bleed top accent rule (1.0mm) from x = 0 to pageWidth (no margin)
  doc.setDrawColor(2, 132, 199); // Sky-600
  doc.setLineWidth(1.0);
  doc.line(0, 0.5, pageWidth, 0.5);

  // Full-bleed bottom accent rule (1.2mm) across the entire width (0 to pageWidth)
  doc.setLineWidth(1.2);
  doc.line(0, headerHeight, pageWidth, headerHeight);

  // Header content: Logo (as image only) on the left
  // Aspect ratio of Technesian logo: 473 x 106 (~4.462 : 1)
  // Larger scaled dimensions: width 62mm, height 13.89mm
  const logoW = 62;
  const logoH = 62 * (106 / 473);
  const logoX = 14;
  const logoY = 15;

  try {
    doc.addImage(TECHNESIAN_LOGO_BASE64, "PNG", logoX, logoY, logoW, logoH);
  } catch (err) {
    // Fallback vector typography
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(10, 37, 64);
    doc.text("Technesian", logoX, 22);
    doc.setFontSize(9);
    doc.setTextColor(2, 132, 199);
    doc.text("SOFTWARE SOLUTIONS LLP", logoX, 28);
  }

  // Vertical divider line between logo and company contact info
  const dividerX = 84;
  doc.setDrawColor(2, 132, 199);
  doc.setLineWidth(0.65);
  doc.line(dividerX, 8, dividerX, headerHeight - 6);

  // Right-side contact info with updated single phone number (+91 9896333664)
  const textX = 89;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85); // slate-700
  doc.text("contact@technesian.com   |   https://technesian.com", textX, 14.5);
  doc.text("32, New Friends Colony, Panipat, Haryana, 132103", textX, 20.5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text("Phone: +91 9896333664", textX, 26.5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(2, 132, 199); // sky-600
  doc.text("GSTIN: 06ABBFT0873C1ZH   |   LLPIN: ADD-3748", textX, 32.5);

  // =========================================================================
  // 2. Document Title & Document Number
  // =========================================================================
  let y = headerHeight + 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(options.title, margin, y);

  doc.setFontSize(12);
  doc.setTextColor(2, 132, 199);
  doc.text(options.docNumber, pageWidth - margin, y, { align: "right" });

  // Dates & Status line
  y += 5.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139); // slate-500
  const datesText = [
    `${options.metaDateLabel}: ${formatDate(options.metaDateValue)}`,
    options.secondaryDateLabel
      ? `${options.secondaryDateLabel}: ${formatDate(options.secondaryDateValue)}`
      : null,
    options.showStatus && options.status
      ? `Status: ${(options.status || "").toUpperCase()}`
      : null,
  ]
    .filter(Boolean)
    .join("   •   ");
  doc.text(datesText, margin, y);

  // =========================================================================
  // 3. Recipient Card Box ("PREPARED FOR" / "BILLED TO")
  // =========================================================================
  y += 5;
  const cardY = y;
  const cardPadding = 3.5;
  let textY = cardY + cardPadding + 2;

  let cardLines = 2; // label + hospital name
  if (options.hospitalAddress) cardLines += 1;
  if (options.hospitalEmail || options.hospitalPhone) cardLines += 1;
  if (options.partyGst) cardLines += 1;
  const cardHeight = Math.max(22, cardLines * 4.5 + 4);

  // Card background & border
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, cardY, contentWidth, cardHeight, 1.5, 1.5, "FD");

  // Recipient label
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(options.recipientLabel.toUpperCase(), margin + cardPadding, textY);
  textY += 4.5;

  // Hospital Name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(options.hospitalName || "Healthcare Client", margin + cardPadding, textY);
  textY += 4.2;

  // Address
  if (options.hospitalAddress) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(options.hospitalAddress, margin + cardPadding, textY);
    textY += 4;
  }

  // Contact details
  const contacts = [];
  if (options.hospitalEmail) contacts.push(`Email: ${options.hospitalEmail}`);
  if (options.hospitalPhone) contacts.push(`Phone: ${options.hospitalPhone}`);
  if (contacts.length) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(contacts.join("   |   "), margin + cardPadding, textY);
    textY += 4;
  }

  // Party GSTIN
  if (options.partyGst) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(2, 132, 199);
    doc.text(`Party GSTIN: ${options.partyGst}`, margin + cardPadding, textY);
  }

  // =========================================================================
  // 4. Line Items Table (via autoTable)
  // =========================================================================
  const tableStartY = cardY + cardHeight + 5;
  const tableBody = (options.lineItems || []).map((item, idx) => [
    (idx + 1).toString(),
    item.description || "",
    parseFloat(String(item.quantity || 1)).toString(),
    formatCurrency(item.unit_price || 0),
    formatCurrency(item.total_price || (item.quantity * item.unit_price) || 0),
  ]);

  autoTable(doc, {
    startY: tableStartY,
    margin: { left: margin, right: margin },
    head: [["#", "Item Description", "Qty", "Unit Price (INR)", "Amount (INR)"]],
    body: tableBody,
    theme: "grid",
    headStyles: {
      fillColor: [2, 132, 199], // sky-600
      textColor: [255, 255, 255],
      font: "helvetica",
      fontStyle: "bold",
      fontSize: 8.5,
      cellPadding: 2.8,
      halign: "left",
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 90, halign: "left" },
      2: { cellWidth: 20, halign: "right" },
      3: { cellWidth: 30, halign: "right" },
      4: { cellWidth: 30, halign: "right" },
    },
    styles: {
      font: "helvetica",
      fontSize: 8,
      cellPadding: 2.5,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  // Position after table
  let currentY = (doc as any).lastAutoTable
    ? (doc as any).lastAutoTable.finalY + 4
    : tableStartY + 20;

  // =========================================================================
  // 5. Financial Summary Block (Right-aligned)
  // =========================================================================
  const summaryBoxWidth = 80;
  const summaryX = pageWidth - margin - summaryBoxWidth;
  const rowHeight = 5;

  // Subtotal
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text("Subtotal:", summaryX, currentY + 4);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(`INR ${formatCurrency(options.subtotal)}`, pageWidth - margin, currentY + 4, {
    align: "right",
  });
  currentY += rowHeight;

  // GST
  if (options.taxRate > 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`GST (${options.taxRate}%):`, summaryX, currentY + 4);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(`INR ${formatCurrency(options.taxAmount)}`, pageWidth - margin, currentY + 4, {
      align: "right",
    });
    currentY += rowHeight;
  }

  // Total Accent Box
  currentY += 2;
  doc.setFillColor(240, 249, 255); // sky-50
  doc.setDrawColor(2, 132, 199); // sky-600
  doc.setLineWidth(0.4);
  doc.roundedRect(summaryX - 3, currentY, summaryBoxWidth + 3, 8.5, 1, 1, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(2, 132, 199);
  doc.text("Total Amount:", summaryX, currentY + 5.5);
  doc.setFontSize(10.5);
  doc.text(`INR ${formatCurrency(options.totalAmount)}`, pageWidth - margin, currentY + 5.5, {
    align: "right",
  });
  currentY += 12;

  // Paid / Balance for invoices
  if (
    options.paidAmount !== undefined &&
    options.paidAmount !== null &&
    options.paidAmount > 0
  ) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text("Paid Amount:", summaryX, currentY + 4);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(16, 185, 129); // emerald-600
    doc.text(`INR ${formatCurrency(options.paidAmount)}`, pageWidth - margin, currentY + 4, {
      align: "right",
    });
    currentY += rowHeight;

    const balance = Math.max(0, options.totalAmount - options.paidAmount);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(balance > 0 ? 225 : 71, balance > 0 ? 29 : 85, balance > 0 ? 72 : 105);
    doc.text("Balance Due:", summaryX, currentY + 4);
    doc.text(`INR ${formatCurrency(balance)}`, pageWidth - margin, currentY + 4, {
      align: "right",
    });
    currentY += 8;
  }

  // =========================================================================
  // 6. Notes & Terms
  // =========================================================================
  if (options.notes) {
    if (currentY > pageHeight - 45) {
      doc.addPage();
      currentY = 20;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text("Notes:", margin, currentY);
    currentY += 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    const splitNotes = doc.splitTextToSize(options.notes, contentWidth);
    doc.text(splitNotes, margin, currentY);
    currentY += splitNotes.length * 4 + 4;
  }

  if (options.terms) {
    if (currentY > pageHeight - 45) {
      doc.addPage();
      currentY = 20;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text("Terms & Conditions:", margin, currentY);
    currentY += 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    const splitTerms = doc.splitTextToSize(options.terms, contentWidth);
    doc.text(splitTerms, margin, currentY);
  }

  // =========================================================================
  // 7. Footer on all pages
  // =========================================================================
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(
      "This is a computer-generated document. Inquiries: contact@technesian.com  |  +91 9896333664",
      margin,
      pageHeight - 8
    );
    doc.text(`Page ${p} of ${totalPages}`, pageWidth - margin, pageHeight - 8, {
      align: "right",
    });
  }

  return doc;
}

/**
 * Generate and trigger download of a Quote PDF on the client/UI.
 */
export async function generateQuotePdf(quote: Quote): Promise<void> {
  const doc = renderPlatformBillingDocument({
    title: "COMMERCIAL QUOTATION",
    docNumber: quote.quote_number,
    metaDateLabel: "Quote Date",
    metaDateValue: quote.created_at,
    secondaryDateLabel: "Valid Until",
    secondaryDateValue: quote.valid_until,
    showStatus: false,
    recipientLabel: "Prepared For",
    hospitalName: quote.tenant_name || quote.hospital_name || "Healthcare Client",
    hospitalAddress: quote.hospital_address,
    hospitalEmail: quote.hospital_email,
    hospitalPhone: quote.hospital_phone,
    partyGst: quote.gst_number,
    lineItems: (quote.line_items || []).map((item) => ({
      description: item.description,
      quantity: Number(item.quantity),
      unit_price: Number(item.unit_price),
      total_price: Number(item.total_price),
    })),
    subtotal: Number(quote.subtotal),
    taxRate: Number(quote.tax_rate),
    taxAmount: Number(quote.tax_amount),
    totalAmount: Number(quote.total_amount),
    notes: quote.notes,
    terms: quote.terms_and_conditions,
    outputFilename: `${quote.quote_number}.pdf`,
  });

  doc.save(`${quote.quote_number}.pdf`);
}

/**
 * Generate and trigger download of an Invoice PDF on the client/UI.
 */
export async function generateInvoicePdf(invoice: PlatformInvoice): Promise<void> {
  const doc = renderPlatformBillingDocument({
    title: "TAX INVOICE",
    docNumber: invoice.invoice_number,
    metaDateLabel: "Invoice Date",
    metaDateValue: invoice.invoice_date,
    secondaryDateLabel: "Due Date",
    secondaryDateValue: invoice.due_date,
    status: invoice.status,
    showStatus: true,
    recipientLabel: "Billed To",
    hospitalName: invoice.tenant_name || invoice.hospital_name || "Healthcare Client",
    hospitalAddress: invoice.hospital_address,
    hospitalEmail: invoice.hospital_email,
    hospitalPhone: invoice.hospital_phone,
    partyGst: invoice.gst_number,
    lineItems: (invoice.line_items || []).map((item) => ({
      description: item.description,
      quantity: Number(item.quantity),
      unit_price: Number(item.unit_price),
      total_price: Number(item.total_price),
    })),
    subtotal: Number(invoice.subtotal),
    taxRate: Number(invoice.tax_rate),
    taxAmount: Number(invoice.tax_amount),
    totalAmount: Number(invoice.total_amount),
    paidAmount: Number(invoice.paid_amount || 0),
    notes: invoice.notes,
    terms: invoice.terms_and_conditions,
    outputFilename: `${invoice.invoice_number}.pdf`,
  });

  doc.save(`${invoice.invoice_number}.pdf`);
}
