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

export const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));

// Get today's date in YYYY-MM-DD format in local timezone (not UTC)
export const getTodayDateLocal = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

