export const currency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

export const formatCurrency = currency;

// Format currency for PDF exports (using "Rs." prefix instead of ₹ symbol for better PDF compatibility)
export const formatCurrencyForPDF = (value: number): string => {
  const formattedNumber = new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(value);
  // Use "Rs." prefix instead of ₹ symbol to avoid font encoding issues in jsPDF
  return `Rs. ${formattedNumber}`;
};

export const formatDate = (value: string | null | undefined) => {
  if (!value) return "N/A";
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) return "Invalid Date";
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  } catch (e) {
    return "Invalid Date";
  }
};

// Get today's date in YYYY-MM-DD format in local timezone (not UTC)
export const getTodayDateLocal = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Get past date (N days ago) in YYYY-MM-DD format in local timezone
export const getPastDateLocal = (daysAgo: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatDateTime = (value: string | null | undefined) => {
  if (!value) return "N/A";
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) return "Invalid Date";
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  } catch (e) {
    return "Invalid Date";
  }
};

// Format a "Link Existing ABHA" input as the user types: supports 14-digit ABHA
// (XX-XXXX-XXXX-XXXX), 12-digit Aadhaar (XXXX XXXX XXXX), 10-digit mobile (plain digits),
// or ABHA address (name@abdm / name@sbx).
export const formatAbhaLinkInput = (value: string): string => {
  if (!value) return "";
  const trimmed = value.trim();
  if (/[a-zA-Z@]/.test(trimmed)) {
    return trimmed.replace(/\s+/g, "").toLowerCase();
  }
  const digits = trimmed.replace(/\D/g, "").slice(0, 14);
  if (digits.length <= 10) {
    return digits;
  }
  if (digits.length <= 12) {
    return digits.match(/.{1,4}/g)?.join(" ") ?? digits;
  }
  return [digits.slice(0, 2), digits.slice(2, 6), digits.slice(6, 10), digits.slice(10, 14)]
    .filter(Boolean)
    .join("-");
};

// Format an ABHA or mobile input: if ABHA address (has letters/@), preserves text;
// if 14-digit ABHA number, groups as XX-XXXX-XXXX-XXXX; if 10-digit mobile, leaves as plain digits.
export const formatAbhaOrMobileInput = (value: string): string => {
  if (!value) return "";
  if (/[a-zA-Z@]/.test(value)) {
    return value.trim().replace(/\s+/g, "").toLowerCase();
  }
  const digits = value.replace(/\D/g, "").slice(0, 14);
  if (digits.length <= 10) {
    return digits;
  }
  return [digits.slice(0, 2), digits.slice(2, 6), digits.slice(6, 10), digits.slice(10, 14)]
    .filter(Boolean)
    .join("-");
};

// Display-only formatting for a 12-digit Aadhaar number, grouped as
// "XXXX XXXX XXXX". The underlying value stays plain digits (no spaces)
// so it can be passed straight to the backend.
export const formatAadhaarDisplay = (value: string): string => {
  const digits = value.replace(/\D/g, "").slice(0, 12);
  return digits.match(/.{1,4}/g)?.join(" ") ?? digits;
};

export const timeAgo = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    // Future dates
    if (seconds < 0) return "just now";

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";

    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";

    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";

    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";

    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";

    return Math.floor(seconds) + " seconds ago";
  } catch (e) {
    return dateString;
  }
};

