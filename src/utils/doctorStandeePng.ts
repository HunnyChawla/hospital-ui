import { CURA_LOGO_BASE64 } from "./curaLogoBase64";

export interface DoctorStandeeImageOptions {
  hospitalName: string;
  hospitalLogoUrl?: string | null;
  hospitalAddress?: string | null;
  hospitalPhone?: string | null;
  doctorName: string;
  specialization?: string | null;
  counterCode: string;
  counterName?: string | null;
  qrDataUrl: string; // The QR code data URL or blob URL
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src.slice(0, 30)}...`));
    img.src = src;
  });
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  if (typeof ctx.roundRect === "function") {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}

/**
 * Render a beautiful, museum-quality high-resolution (1200 x 1680) Standee Graphic Card PNG.
 * Features Hospital Logo prominently at the top, Doctor Credentials, High-Res QR,
 * 3-step patient scan guide, and subtle, small Cura by Technesian footer.
 */
export async function renderDoctorStandeePng(
  options: DoctorStandeeImageOptions
): Promise<string> {
  const width = 1200;
  const height = 1680;
  const centerX = width / 2;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not initialize 2D canvas context");
  }

  // Smooth font rendering
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // 1. Pure White Background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  // Outer border
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, width - 4, height - 4);

  // 2. Top Medical Gradient Accent Bar
  const grad = ctx.createLinearGradient(0, 0, width, 0);
  grad.addColorStop(0, "#0284c7"); // Sky
  grad.addColorStop(0.5, "#0d9488"); // Teal
  grad.addColorStop(1, "#10b981"); // Emerald
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, 10);

  let currentY = 50;

  // 3. Hospital Logo (The MAIN Hero Brand)
  if (options.hospitalLogoUrl) {
    try {
      const logoImg = await loadImage(options.hospitalLogoUrl);
      const maxW = 420;
      const maxH = 130;
      let lw = logoImg.naturalWidth || logoImg.width;
      let lh = logoImg.naturalHeight || logoImg.height;
      const scale = Math.min(maxW / lw, maxH / lh, 1);
      lw *= scale;
      lh *= scale;
      const lx = centerX - lw / 2;
      ctx.drawImage(logoImg, lx, currentY, lw, lh);
      currentY += lh + 20;
    } catch {
      // If logo fails to load, gracefully continue with hospital title
      currentY += 10;
    }
  } else {
    currentY += 15;
  }

  // 4. Hospital Name (Prominent, Bold, Dignified)
  ctx.font = "bold 34px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#0f172a"; // slate-900
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const hospitalTitle = (options.hospitalName || "HOSPITAL CLINIC").toUpperCase();
  ctx.fillText(hospitalTitle, centerX, currentY);
  currentY += 30;

  // Hospital Address & Phone
  if (options.hospitalAddress || options.hospitalPhone) {
    const parts = [
      options.hospitalAddress,
      options.hospitalPhone ? `Tel: ${options.hospitalPhone}` : null,
    ].filter(Boolean);
    ctx.font = "500 17px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillStyle = "#64748b"; // slate-500
    ctx.fillText(parts.join(" • "), centerX, currentY);
    currentY += 30;
  } else {
    currentY += 10;
  }

  // 5. ABDM Scan & Share Accreditation Pill
  const pillW = 410;
  const pillH = 40;
  const pillX = centerX - pillW / 2;
  const pillY = currentY;

  drawRoundedRect(ctx, pillX, pillY, pillW, pillH, 20);
  ctx.fillStyle = "#ecfdf5"; // emerald-50
  ctx.fill();
  ctx.strokeStyle = "#a7f3d0"; // emerald-200
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.font = "bold 15px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#047857"; // emerald-700
  ctx.fillText("ABDM SCAN & SHARE • NHA COMPLIANT", centerX, pillY + pillH / 2);
  currentY += pillH + 28;

  // Subtle divider
  ctx.strokeStyle = "#f1f5f9";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(100, currentY);
  ctx.lineTo(width - 100, currentY);
  ctx.stroke();
  currentY += 24;

  // 6. Doctor Consultation Card
  const cardW = 960;
  const cardH = 138;
  const cardX = (width - cardW) / 2;
  const cardY = currentY;

  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 18);
  ctx.fillStyle = "#f8fafc"; // slate-50
  ctx.fill();
  ctx.strokeStyle = "#cbd5e1"; // slate-300
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Left accent bar
  drawRoundedRect(ctx, cardX, cardY, 12, cardH, 6);
  ctx.fillStyle = "#0284c7"; // sky-600
  ctx.fill();

  // Consultation Tag
  ctx.font = "bold 14px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#0284c7";
  ctx.fillText("DOCTOR CONSULTATION & OPD APPOINTMENTS", centerX, cardY + 30);

  // Doctor Name
  ctx.font = "bold 32px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#0f172a";
  ctx.fillText(options.doctorName, centerX, cardY + 68);

  // Specialization
  ctx.font = "bold 18px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#475569";
  const specText = options.specialization
    ? `Department of ${options.specialization}`
    : "Outpatient Department (OPD)";
  ctx.fillText(specText, centerX, cardY + 104);

  currentY += cardH + 34;

  // 7. Centerpiece Large QR Code Frame (Enlarged to 480px QR!)
  const qrBoxW = 680;
  const qrBoxH = 620;
  const qrBoxX = (width - qrBoxW) / 2;
  const qrBoxY = currentY;

  // Shadow + card
  ctx.save();
  ctx.shadowColor = "rgba(15, 23, 42, 0.08)";
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 8;
  drawRoundedRect(ctx, qrBoxX, qrBoxY, qrBoxW, qrBoxH, 24);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 2;
  drawRoundedRect(ctx, qrBoxX, qrBoxY, qrBoxW, qrBoxH, 24);
  ctx.stroke();

  // Large QR Image: 480px x 480px
  const qrSize = 480;
  const qrX = centerX - qrSize / 2;
  const qrY = qrBoxY + 34;

  try {
    const qrImg = await loadImage(options.qrDataUrl);
    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
  } catch (err) {
    console.error("Failed to render QR on canvas:", err);
  }

  // Counter Code Badge below QR
  const badgeW = 420;
  const badgeH = 46;
  const badgeX = centerX - badgeW / 2;
  const badgeY = qrBoxY + 540;

  drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 12);
  ctx.fillStyle = "#f1f5f9";
  ctx.fill();
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.font = "bold 18px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace";
  ctx.fillStyle = "#334155";
  ctx.fillText(`Counter Code: ${options.counterCode}`, centerX, badgeY + badgeH / 2);

  currentY += qrBoxH + 36;

  // 8. Patient 3-Step Guide
  ctx.font = "bold 21px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#0f172a";
  ctx.fillText("HOW TO GET YOUR APPOINTMENT & TOKEN", centerX, currentY);
  currentY += 26;

  ctx.font = "500 15px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#64748b";
  ctx.fillText(
    "Supported Apps: ABHA App • Aarogya Setu • Paytm • Any ABDM PHR App",
    centerX,
    currentY
  );
  currentY += 26;

  // 3 Horizontal Step Cards
  const stepW = 300;
  const stepH = 118;
  const stepGap = 30;
  const totalStepsW = stepW * 3 + stepGap * 2;
  const startStepX = (width - totalStepsW) / 2;
  const stepY = currentY;

  const steps = [
    {
      num: "1",
      numBg: "#0284c7",
      title: "Open Any App",
      desc: "Open ABHA, Aarogya Setu or Paytm on your phone.",
    },
    {
      num: "2",
      numBg: "#0d9488",
      title: "Scan this QR",
      desc: "Tap 'Scan & Share' and point camera at the QR code.",
    },
    {
      num: "3",
      numBg: "#10b981",
      title: "Share & Done",
      desc: "Tap 'Share' to get your instant token with doctor.",
    },
  ];

  steps.forEach((step, idx) => {
    const sx = startStepX + idx * (stepW + stepGap);

    drawRoundedRect(ctx, sx, stepY, stepW, stepH, 14);
    ctx.fillStyle = "#f8fafc";
    ctx.fill();
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Step Number Circle
    const cx = sx + 34;
    const cy = stepY + 36;
    ctx.beginPath();
    ctx.arc(cx, cy, 18, 0, Math.PI * 2);
    ctx.fillStyle = step.numBg;
    ctx.fill();

    ctx.font = "bold 17px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.fillText(step.num, cx, cy);

    // Step Title
    ctx.font = "bold 18px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillStyle = "#0f172a";
    ctx.textAlign = "left";
    ctx.fillText(step.title, sx + 62, stepY + 38);

    // Step Desc
    ctx.font = "normal 14px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillStyle = "#64748b";
    // Word wrapped description inside card
    const words = step.desc.split(" ");
    let line = "";
    let descY = stepY + 74;
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + " ";
      const testWidth = ctx.measureText(testLine).width;
      if (testWidth > stepW - 32 && n > 0) {
        ctx.fillText(line, sx + 16, descY);
        line = words[n] + " ";
        descY += 20;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, sx + 16, descY);
  });

  currentY = 1590;

  // 9. Footer (Small, subtle Cura branding)
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(100, currentY);
  ctx.lineTo(width - 100, currentY);
  ctx.stroke();
  currentY += 26;

  // Small Cura logo + Powered by Cura
  try {
    const curaImg = await loadImage(CURA_LOGO_BASE64);
    const curaSize = 22;
    const label = "Powered by Cura • Technesian";
    ctx.font = "bold 15px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    const labelWidth = ctx.measureText(label).width;
    const totalW = curaSize + 10 + labelWidth;
    const startX = centerX - totalW / 2;

    ctx.drawImage(curaImg, startX, currentY - 11, curaSize, curaSize);
    ctx.fillStyle = "#64748b";
    ctx.textAlign = "left";
    ctx.fillText(label, startX + curaSize + 10, currentY);
  } catch {
    ctx.font = "bold 15px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillStyle = "#64748b";
    ctx.textAlign = "center";
    ctx.fillText("Powered by Cura • Technesian", centerX, currentY);
  }

  currentY += 24;
  ctx.font = "normal 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#94a3b8";
  ctx.textAlign = "center";
  ctx.fillText(
    "Ayushman Bharat Digital Mission (ABDM) • For help, ask at the reception desk",
    centerX,
    currentY
  );

  // Bottom gradient line
  ctx.fillStyle = grad;
  ctx.fillRect(0, height - 8, width, 8);

  return canvas.toDataURL("image/png");
}

/**
 * Trigger download of the beautiful Standee PNG Graphic Card.
 */
export async function downloadDoctorStandeePng(
  options: DoctorStandeeImageOptions
): Promise<void> {
  const dataUrl = await renderDoctorStandeePng(options);
  const link = document.createElement("a");
  link.href = dataUrl;
  const sanitizedDocName = options.doctorName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-");
  link.download = `cura-abdm-standee-${sanitizedDocName}.png`;
  link.click();
}
