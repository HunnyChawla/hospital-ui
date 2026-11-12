import jsPDF from "jspdf";
import { CURA_LOGO_BASE64 } from "./curaLogoBase64";

export interface DoctorStandeePdfOptions {
  hospitalName: string;
  hospitalLogoUrl?: string | null;
  hospitalAddress?: string | null;
  hospitalPhone?: string | null;
  doctorName: string;
  specialization?: string | null;
  counterCode: string;
  counterName?: string | null;
  shareUrl?: string | null; // Optional, omitted from print output
  qrDataUrl: string; // The QR code data URL or blob URL
}

export interface PreparedImage {
  dataUrl: string;
  width: number;
  height: number;
  format: "PNG" | "JPEG";
}

/**
 * Universal image pre-processor for jsPDF.
 * Converts ANY image format (JPEG, WebP, SVG, PNG, blob) into a pure, clean PNG data URL
 * through an off-screen canvas, guaranteeing 100% reliable rendering without format mismatch errors.
 */
export async function prepareImageForPdf(src: string): Promise<PreparedImage> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const w = img.naturalWidth || img.width || 200;
      const h = img.naturalHeight || img.height || 200;
      try {
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const pngData = canvas.toDataURL("image/png");
          resolve({
            dataUrl: pngData,
            width: w,
            height: h,
            format: "PNG",
          });
          return;
        }
      } catch (err) {
        console.warn("Canvas conversion fallback:", err);
      }
      const format = src.includes("image/jpeg") || src.includes("image/jpg") ? "JPEG" : "PNG";
      resolve({ dataUrl: src, width: w, height: h, format });
    };
    img.onerror = () => {
      const format = src.includes("image/jpeg") || src.includes("image/jpg") ? "JPEG" : "PNG";
      resolve({ dataUrl: src, width: 100, height: 100, format });
    };
    img.src = src;
  });
}

/**
 * Render a beautiful, museum-quality A4 Desk Standee PDF for ABDM Scan & Share.
 * Evenly distributed across the full A4 canvas with a large 96mm QR code,
 * properly rendered Hospital Logo as the main hero, and subtle Cura footer.
 */
export async function renderDoctorStandeePdf(
  options: DoctorStandeePdfOptions
): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageWidth = 210;
  const centerX = pageWidth / 2;

  // Resolve QR code to clean data URL and format
  const qrPrep = await prepareImageForPdf(options.qrDataUrl);

  // =========================================================================
  // 1. Top Decorative Brand Accent Bars
  // =========================================================================
  doc.setFillColor(2, 132, 199); // #0284c7 (Sky)
  doc.rect(0, 0, 70, 2.5, "F");

  doc.setFillColor(13, 148, 136); // #0d9488 (Teal)
  doc.rect(70, 0, 70, 2.5, "F");

  doc.setFillColor(16, 185, 129); // #10b981 (Emerald)
  doc.rect(140, 0, 70, 2.5, "F");

  let currentY = 10;

  // =========================================================================
  // 2. Hospital Logo (The MAIN Hero Brand)
  // =========================================================================
  if (options.hospitalLogoUrl) {
    try {
      const logoPrep = await prepareImageForPdf(options.hospitalLogoUrl);
      const aspect = logoPrep.width / logoPrep.height;

      // Allow up to 28mm height and 75mm width to look prominent and clear
      let logoH = Math.min(28, logoPrep.height * 0.264583);
      if (logoH < 18) logoH = 18; // Ensure minimum visibility
      let logoW = logoH * aspect;
      if (logoW > 75) {
        logoW = 75;
        logoH = logoW / aspect;
      }
      if (logoH > 28) {
        logoH = 28;
        logoW = logoH * aspect;
      }
      const lx = (pageWidth - logoW) / 2;
      doc.addImage(logoPrep.dataUrl, logoPrep.format, lx, currentY, logoW, logoH);
      currentY += logoH + 4;
    } catch (e) {
      console.warn("Could not render hospital logo in PDF:", e);
      currentY += 4;
    }
  } else {
    currentY += 6;
  }

  // Hospital Name (Bold, Uppercase, Prominent)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16.5);
  doc.setTextColor(15, 23, 42); // #0f172a
  const hospitalTitle = (options.hospitalName || "HOSPITAL CLINIC").toUpperCase();
  doc.text(hospitalTitle, centerX, currentY, { align: "center" });
  currentY += 5.5;

  // Hospital Address & Phone
  if (options.hospitalAddress || options.hospitalPhone) {
    const contactParts = [
      options.hospitalAddress,
      options.hospitalPhone ? `Tel: ${options.hospitalPhone}` : null,
    ].filter(Boolean);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139); // #64748b
    doc.text(contactParts.join(" • "), centerX, currentY, { align: "center" });
    currentY += 5.5;
  }

  // ABDM Scan & Share Accreditation Pill
  const pillW = 82;
  const pillH = 8;
  const pillX = centerX - pillW / 2;
  const pillY = currentY;

  doc.setFillColor(236, 253, 245); // #ecfdf5 (emerald-50)
  doc.setDrawColor(167, 243, 208); // #a7f3d0 (emerald-200)
  doc.setLineWidth(0.35);
  doc.roundedRect(pillX, pillY, pillW, pillH, 4, 4, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(4, 120, 87); // #047857 (emerald-700)
  doc.text("ABDM SCAN & SHARE • NHA COMPLIANT", centerX, pillY + 5.3, { align: "center" });
  currentY += pillH + 6;

  // Divider line
  doc.setDrawColor(226, 232, 240); // #e2e8f0
  doc.setLineWidth(0.3);
  doc.line(16, currentY, 194, currentY);
  currentY += 5.5;

  // =========================================================================
  // 3. Doctor Credentials Hero Card
  // =========================================================================
  const cardW = 172;
  const cardH = 28;
  const cardX = (pageWidth - cardW) / 2;
  const cardY = currentY;

  // Card background
  doc.setFillColor(248, 250, 252); // #f8fafc (slate-50)
  doc.setDrawColor(203, 213, 225); // #cbd5e1 (slate-300)
  doc.setLineWidth(0.4);
  doc.roundedRect(cardX, cardY, cardW, cardH, 3.5, 3.5, "FD");

  // Subtle left accent bar on card
  doc.setFillColor(2, 132, 199); // #0284c7
  doc.roundedRect(cardX, cardY, 3.5, cardH, 2, 2, "F");

  // Tag
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(2, 132, 199); // #0284c7
  doc.text("DOCTOR CONSULTATION & OPD APPOINTMENTS", centerX, cardY + 7, { align: "center" });

  // Doctor Name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15.5);
  doc.setTextColor(15, 23, 42); // #0f172a
  doc.text(options.doctorName, centerX, cardY + 15, { align: "center" });

  // Specialization
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(71, 85, 105); // #475569
  const specText = options.specialization ? `Department of ${options.specialization}` : "Outpatient Department (OPD)";
  doc.text(specText, centerX, cardY + 22, { align: "center" });
  currentY = cardY + cardH + 7;

  // =========================================================================
  // 4. The Centerpiece: Large Branded QR Code Frame (96mm x 96mm QR!)
  // =========================================================================
  const qrBoxW = 126;
  const qrBoxH = 120;
  const qrBoxX = (pageWidth - qrBoxW) / 2;
  const qrBoxY = currentY;

  // Outer QR card frame
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225); // #cbd5e1
  doc.setLineWidth(0.6);
  doc.roundedRect(qrBoxX, qrBoxY, qrBoxW, qrBoxH, 4.5, 4.5, "FD");

  // Large QR Code: 96mm x 96mm
  const qrSize = 96;
  const qrX = (pageWidth - qrSize) / 2;
  const qrY = qrBoxY + 6.5;

  try {
    doc.addImage(qrPrep.dataUrl, qrPrep.format, qrX, qrY, qrSize, qrSize);
  } catch (err) {
    console.error("Failed to add QR image to PDF:", err);
  }

  // Counter Code Badge below the large QR
  const counterBadgeW = 84;
  const counterBadgeH = 8.5;
  const counterBadgeX = (pageWidth - counterBadgeW) / 2;
  const counterBadgeY = qrBoxY + 105.5;

  doc.setFillColor(241, 245, 249); // #f1f5f9
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(counterBadgeX, counterBadgeY, counterBadgeW, counterBadgeH, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85); // #334155
  doc.text(`Counter Code: ${options.counterCode}`, centerX, counterBadgeY + 5.8, {
    align: "center",
  });
  currentY = qrBoxY + qrBoxH + 7.5;

  // =========================================================================
  // 5. Patient 3-Step Scanning Guide
  // =========================================================================
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11.5);
  doc.setTextColor(15, 23, 42);
  doc.text("HOW TO GET YOUR APPOINTMENT & TOKEN", centerX, currentY + 4, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("Supported Apps: ABHA App • Aarogya Setu • Paytm • Any ABDM PHR App", centerX, currentY + 9, {
    align: "center",
  });

  // 3 Step horizontal cards
  const stepW = 56;
  const stepH = 24;
  const stepGap = 6;
  const startStepX = (pageWidth - (stepW * 3 + stepGap * 2)) / 2;
  const stepCardY = currentY + 12.5;

  const steps = [
    {
      num: "1",
      numBg: [2, 132, 199], // sky-600
      title: "Open Any App",
      desc: "Open ABHA, Aarogya Setu or Paytm on your phone.",
    },
    {
      num: "2",
      numBg: [13, 148, 136], // teal-600
      title: "Scan this QR",
      desc: "Tap Scan & Share and point camera at the QR code.",
    },
    {
      num: "3",
      numBg: [16, 185, 129], // emerald-600
      title: "Share & Done",
      desc: "Tap 'Share' to get your instant token with doctor.",
    },
  ];

  steps.forEach((step, idx) => {
    const sx = startStepX + idx * (stepW + stepGap);

    // Card background
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.roundedRect(sx, stepCardY, stepW, stepH, 2.5, 2.5, "FD");

    // Number circle
    const circleX = sx + 7;
    const circleY = stepCardY + 6.5;
    doc.setFillColor(step.numBg[0], step.numBg[1], step.numBg[2]);
    doc.circle(circleX, circleY, 3.2, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text(step.num, circleX, circleY + 1.1, { align: "center" });

    // Step Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(step.title, sx + 12.5, stepCardY + 7.5);

    // Step Desc
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    const splitDesc = doc.splitTextToSize(step.desc, stepW - 6);
    doc.text(splitDesc, sx + 3.5, stepCardY + 13.5);
  });

  // =========================================================================
  // 6. Footer & Subtle Small Cura Branding (Evenly anchored at the bottom)
  // =========================================================================
  const footerY = 277;

  // Thin line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(16, footerY, 194, footerY);

  // Small Cura Logo (5.5mm x 5.5mm) + "Powered by Cura • Technesian"
  const footerLabel = "Powered by Cura • Technesian";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  const textWidth = doc.getTextWidth(footerLabel);
  const logoSize = 5.5;
  const gap = 2.5;
  const totalFooterWidth = logoSize + gap + textWidth;
  const footerStartX = centerX - totalFooterWidth / 2;

  try {
    doc.addImage(CURA_LOGO_BASE64, "PNG", footerStartX, footerY + 2.5, logoSize, logoSize);
  } catch (e) {
    // Ignore fallback
  }

  doc.text(footerLabel, footerStartX + logoSize + gap, footerY + 6.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184); // #94a3b8
  doc.text(
    "Ayushman Bharat Digital Mission (ABDM) • For help, ask at the reception desk",
    centerX,
    footerY + 11,
    { align: "center" }
  );

  // Bottom 1.5mm accent line
  doc.setFillColor(2, 132, 199);
  doc.rect(0, 295.5, pageWidth, 1.5, "F");

  return doc;
}

/**
 * Trigger print dialog with high-fidelity PDF standee.
 * Opens in new tab with autoPrint() so browser native PDF print dialog is triggered cleanly.
 */
export async function printDoctorStandee(options: DoctorStandeePdfOptions): Promise<void> {
  // Pre-open window synchronously to prevent popup blocker interception during async render
  let printWindow: Window | null = null;
  try {
    printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(
        `<!DOCTYPE html>
<html>
<head>
  <title>Cura ABDM Standee — ${options.doctorName}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      background: #f8fafc;
      color: #0f172a;
    }
    .card {
      text-align: center;
      padding: 32px 48px;
      background: white;
      border-radius: 16px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.06);
      border: 1px solid #e2e8f0;
    }
    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid #e2e8f0;
      border-top-color: #0284c7;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 16px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="card">
    <div class="spinner"></div>
    <div style="font-size: 16px; font-weight: 700; margin-bottom: 6px;">Rendering ABDM Standee PDF</div>
    <div style="font-size: 13px; color: #64748b;">Opening print dialog for ${options.doctorName}...</div>
  </div>
</body>
</html>`
      );
    }
  } catch {
    // Popup window was blocked or denied
  }

  try {
    const doc = await renderDoctorStandeePdf(options);
    doc.autoPrint();
    const blobUrl = doc.output("bloburl");
    const blobUrlString = typeof blobUrl === "string" ? blobUrl : blobUrl.toString();
    if (printWindow && !printWindow.closed) {
      printWindow.location.href = blobUrlString;
    } else {
      // Direct download fallback if popup blocker prevented opening tab
      const filename = `cura-abdm-standee-${options.counterCode.toLowerCase()}.pdf`;
      doc.save(filename);
    }
  } catch (err) {
    if (printWindow && !printWindow.closed) {
      printWindow.close();
    }
    throw err;
  }
}

/**
 * Trigger download of the Doctor Standee PDF.
 */
export async function downloadDoctorStandeePdf(options: DoctorStandeePdfOptions): Promise<void> {
  const doc = await renderDoctorStandeePdf(options);
  const sanitizedDocName = options.doctorName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-");
  const filename = `cura-abdm-standee-${sanitizedDocName}.pdf`;
  doc.save(filename);
}
