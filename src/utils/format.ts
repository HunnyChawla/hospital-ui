export const currency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

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

