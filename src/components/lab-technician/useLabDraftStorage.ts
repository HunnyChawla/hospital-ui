"use client";

import { useCallback, useEffect, useState } from "react";
import type { BookingStatus, LabBooking } from "@/services/labBookingsApi";

export type ReportStage = "pending" | "draft" | "published" | "cancelled";

export interface DraftParameterEntry {
  result_numeric: string;
  result_value: string;
  notes: string;
  /** Temporary local File object for image parameters (never serialized to localStorage). */
  image_file?: File | null;
  /** Object URL or existing MRD document ID for preview. */
  image_url?: string;
}

/** Map of bookingItemId -> parameterId -> DraftParameterEntry */
export type BookingDraftMap = Record<string, Record<string, DraftParameterEntry>>;

interface StoredBookingDraft {
  updatedAt: string;
  items: Record<
    string,
    Record<
      string,
      {
        result_numeric: string;
        result_value: string;
        notes: string;
      }
    >
  >;
}

const DRAFT_KEY_PREFIX = "cura_lab_draft_v1";

function getDraftStorageKey(tenantId: string | null | undefined, bookingId: string): string {
  return `${DRAFT_KEY_PREFIX}:${tenantId || "default"}:${bookingId}`;
}

export function getActiveTenantStorageScope(): string {
  if (typeof window === "undefined") return "default";
  return localStorage.getItem("tenant_id") || "default";
}

/**
 * Derive the human-facing laboratory report stage from booking status,
 * whether server results exist, and whether local unsaved draft entries exist.
 */
export function deriveReportStage(
  booking: Pick<LabBooking, "status">,
  hasServerResults: boolean,
  hasLocalDraft: boolean
): ReportStage {
  if (booking.status === "cancelled") return "cancelled";
  if (booking.status === "completed") return "published";
  if (booking.status === "in_progress" || hasServerResults || hasLocalDraft) return "draft";
  return "pending";
}

export function getReportStageMeta(stage: ReportStage): {
  label: string;
  badgeClass: string;
  dotClass: string;
  description: string;
} {
  switch (stage) {
    case "pending":
      return {
        label: "Pending",
        badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
        dotClass: "bg-amber-500",
        description: "Awaiting sample collection or initial result entry",
      };
    case "draft":
      return {
        label: "Draft",
        badgeClass: "bg-sky-50 text-sky-800 border-sky-200",
        dotClass: "bg-sky-500",
        description: "Results entered/saved as draft — review and publish when ready",
      };
    case "published":
      return {
        label: "Published",
        badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
        dotClass: "bg-emerald-500",
        description: "Finalized and locked — report available for print & PDF",
      };
    case "cancelled":
      return {
        label: "Cancelled",
        badgeClass: "bg-rose-50 text-rose-800 border-rose-200",
        dotClass: "bg-rose-500",
        description: "Booking cancelled",
      };
  }
}

export function formatBookingSubStatus(status: BookingStatus): string {
  return status
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Shared abnormal value evaluator matching backend ResultsService._check_abnormal.
 */
export function evaluateParameterAbnormality(params: {
  parameterType: "number" | "dropdown" | "text" | "image";
  resultNumeric?: string;
  resultValue?: string;
  normalMin: number | null;
  normalMax: number | null;
  normalText: string | null;
}): "normal" | "low" | "high" | "abnormal" | "none" {
  const { parameterType, resultNumeric, resultValue, normalMin, normalMax, normalText } = params;

  if (parameterType === "number") {
    if (!resultNumeric || resultNumeric.trim() === "") return "none";
    const num = parseFloat(resultNumeric);
    if (Number.isNaN(num)) return "none";
    if (normalMin !== null && num < normalMin) return "low";
    if (normalMax !== null && num > normalMax) return "high";
    if (normalMin !== null || normalMax !== null) return "normal";
    return "none";
  }

  if (parameterType === "text" || parameterType === "dropdown") {
    if (!resultValue || resultValue.trim() === "") return "none";
    if (normalText && normalText.trim() !== "") {
      return resultValue.trim().toUpperCase() === normalText.trim().toUpperCase()
        ? "normal"
        : "abnormal";
    }
    return "none";
  }

  return "none";
}

function hasAnyMeaningfulValue(items: StoredBookingDraft["items"]): boolean {
  return Object.values(items).some((paramMap) =>
    Object.values(paramMap).some(
      (entry) =>
        entry.result_numeric.trim() !== "" ||
        entry.result_value.trim() !== "" ||
        entry.notes.trim() !== ""
    )
  );
}

/**
 * Manages tenant-scoped localStorage draft persistence for unsaved parameter edits.
 * Only stores parameter IDs and values (no patient PHI/PII).
 */
export function useLabDraftStorage(tenantId?: string | null) {
  const scope = tenantId || getActiveTenantStorageScope();
  const [draftBookingIds, setDraftBookingIds] = useState<Set<string>>(new Set());

  const scanDrafts = useCallback(() => {
    if (typeof window === "undefined") return;
    const prefix = `${DRAFT_KEY_PREFIX}:${scope}:`;
    const ids = new Set<string>();
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          ids.add(key.slice(prefix.length));
        }
      }
    } catch {
      // Ignore storage access errors in restricted environments
    }
    setDraftBookingIds(ids);
  }, [scope]);

  useEffect(() => {
    scanDrafts();
  }, [scanDrafts]);

  const loadBookingDraft = useCallback(
    (bookingId: string): StoredBookingDraft | null => {
      if (typeof window === "undefined") return null;
      try {
        const raw = localStorage.getItem(getDraftStorageKey(scope, bookingId));
        if (!raw) return null;
        const parsed = JSON.parse(raw) as StoredBookingDraft;
        if (!parsed || typeof parsed !== "object" || !parsed.items) return null;
        return parsed;
      } catch {
        return null;
      }
    },
    [scope]
  );

  const saveBookingDraft = useCallback(
    (bookingId: string, draftMap: BookingDraftMap): string | null => {
      if (typeof window === "undefined") return null;
      const serializableItems: StoredBookingDraft["items"] = {};
      for (const [itemId, paramMap] of Object.entries(draftMap)) {
        serializableItems[itemId] = {};
        for (const [paramId, entry] of Object.entries(paramMap)) {
          if (
            entry.result_numeric.trim() !== "" ||
            entry.result_value.trim() !== "" ||
            entry.notes.trim() !== ""
          ) {
            serializableItems[itemId][paramId] = {
              result_numeric: entry.result_numeric,
              result_value: entry.result_value,
              notes: entry.notes,
            };
          }
        }
      }

      const key = getDraftStorageKey(scope, bookingId);
      if (!hasAnyMeaningfulValue(serializableItems)) {
        try {
          localStorage.removeItem(key);
        } catch {
          // ignore
        }
        setDraftBookingIds((prev) => {
          if (!prev.has(bookingId)) return prev;
          const next = new Set(prev);
          next.delete(bookingId);
          return next;
        });
        return null;
      }

      const updatedAt = new Date().toISOString();
      const payload: StoredBookingDraft = {
        updatedAt,
        items: serializableItems,
      };
      try {
        localStorage.setItem(key, JSON.stringify(payload));
        setDraftBookingIds((prev) => {
          if (prev.has(bookingId)) return prev;
          const next = new Set(prev);
          next.add(bookingId);
          return next;
        });
        return updatedAt;
      } catch {
        return null;
      }
    },
    [scope]
  );

  const clearBookingDraft = useCallback(
    (bookingId: string) => {
      if (typeof window === "undefined") return;
      try {
        localStorage.removeItem(getDraftStorageKey(scope, bookingId));
      } catch {
        // ignore
      }
      setDraftBookingIds((prev) => {
        if (!prev.has(bookingId)) return prev;
        const next = new Set(prev);
        next.delete(bookingId);
        return next;
      });
    },
    [scope]
  );

  return {
    draftBookingIds,
    loadBookingDraft,
    saveBookingDraft,
    clearBookingDraft,
    refreshDraftIndex: scanDrafts,
  };
}
