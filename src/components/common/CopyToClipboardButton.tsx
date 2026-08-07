"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface CopyToClipboardButtonProps {
  value: string;
  label?: string;
  successMessage?: string;
  size?: "sm" | "md";
  className?: string;
}

/**
 * Small icon button that copies `value` to the clipboard, toasts, and
 * briefly swaps to a checkmark. Reusable for any copyable identifier
 * (ABHA number, UHID, invoice number, ...).
 */
export function CopyToClipboardButton({
  value,
  label = "Copy",
  successMessage = "Copied to clipboard",
  size = "md",
  className = "",
}: CopyToClipboardButtonProps) {
  const [copied, setCopied] = useState(false);
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success(successMessage);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`transition-colors focus:outline-none ${className}`}
      title={label}
    >
      {copied ? <Check className={`${iconSize} text-emerald-700`} /> : <Copy className={iconSize} />}
    </button>
  );
}
