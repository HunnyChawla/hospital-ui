import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { printLayoutApi } from "@/services/printLayoutApi";
import {
    DEFAULT_PRINT_LAYOUT,
    normalizePrintLayout,
    validatePrintLayout,
    type PrintDocumentType,
    type PrintLayoutConfig,
    type PrintLayoutResponse,
} from "@/types/printLayout";

/** Per-user, per-browser override of the hospital default. */
const OVERRIDE_STORAGE_KEY = "prescription_print_layout_override";

/** Pre-existing keys, migrated once into the new config shape. */
const LEGACY_HEADER_KEY = "prescription_print_with_header";
const LEGACY_SECTIONS_KEY = "prescription_print_preferences";
const LEGACY_ORDER_KEY = "prescription_section_order";
const LEGACY_MIGRATED_KEY = "prescription_print_layout_migrated";

export const printLayoutKeys = {
    all: ["print-layouts"] as const,
    detail: (documentType: PrintDocumentType) =>
        [...printLayoutKeys.all, documentType] as const,
};

/** Fetch the hospital-wide layout for a document type. */
export function usePrintLayout(documentType: PrintDocumentType) {
    return useQuery({
        queryKey: printLayoutKeys.detail(documentType),
        queryFn: () => printLayoutApi.get(documentType),
        // Letterhead geometry changes rarely; avoid refetching on every print.
        staleTime: 5 * 60 * 1000,
    });
}

/** Save the hospital-wide layout (Admin / PlatformOwner only). */
export function useSavePrintLayout(documentType: PrintDocumentType) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (config: PrintLayoutConfig) => printLayoutApi.set(documentType, config),
        onSuccess: (data: PrintLayoutResponse) => {
            queryClient.setQueryData(printLayoutKeys.detail(documentType), data);
            toast.success("Saved as the hospital default print layout");
        },
        onError: (error: unknown) => {
            toast.error(extractErrorMessage(error, "Failed to save print layout"));
        },
    });
}

/** Delete the stored layout, reverting the hospital to built-in defaults. */
export function useResetPrintLayout(documentType: PrintDocumentType) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => printLayoutApi.remove(documentType),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: printLayoutKeys.detail(documentType) });
            toast.success("Reverted to the built-in print layout");
        },
        onError: (error: unknown) => {
            toast.error(extractErrorMessage(error, "Failed to reset print layout"));
        },
    });
}

/**
 * Resolve the layout a print document should actually use.
 *
 * Resolution order is **session override → hospital default → built-in
 * default**. The override lets a doctor tweak one print (hide a section,
 * nudge the band) without changing the setting for the whole hospital;
 * "Save as hospital default" promotes the override to the tenant record.
 */
export function useResolvedPrintLayout(documentType: PrintDocumentType) {
    const { data: tenantLayout, isLoading } = usePrintLayout(documentType);
    const saveMutation = useSavePrintLayout(documentType);
    const [override, setOverride] = useState<Partial<PrintLayoutConfig> | null>(null);
    const [overrideLoaded, setOverrideLoaded] = useState(false);

    // Load the session override, migrating the legacy keys on first run.
    useEffect(() => {
        if (typeof window === "undefined") return;
        try {
            migrateLegacyPreferences();
            const raw = window.localStorage.getItem(OVERRIDE_STORAGE_KEY);
            setOverride(raw ? (JSON.parse(raw) as Partial<PrintLayoutConfig>) : null);
        } catch (e) {
            console.error("Failed to load print layout override:", e);
            setOverride(null);
        } finally {
            setOverrideLoaded(true);
        }
    }, []);

    const hospitalLayout = useMemo(
        () => normalizePrintLayout(tenantLayout?.config),
        [tenantLayout]
    );

    const layout = useMemo(
        () => normalizePrintLayout({ ...hospitalLayout, ...(override || {}) }),
        [hospitalLayout, override]
    );

    const persistOverride = useCallback((next: Partial<PrintLayoutConfig> | null) => {
        setOverride(next);
        try {
            if (next === null) {
                window.localStorage.removeItem(OVERRIDE_STORAGE_KEY);
            } else {
                window.localStorage.setItem(OVERRIDE_STORAGE_KEY, JSON.stringify(next));
            }
        } catch (e) {
            console.error("Failed to persist print layout override:", e);
        }
    }, []);

    /** Apply a partial change to the session override. */
    const updateLayout = useCallback(
        (patch: Partial<PrintLayoutConfig>) => {
            persistOverride({ ...(override || {}), ...patch });
        },
        [override, persistOverride]
    );

    /** Discard the session override and fall back to the hospital default. */
    const resetToHospitalDefault = useCallback(() => {
        persistOverride(null);
    }, [persistOverride]);

    /** Promote the current effective layout to the hospital-wide default. */
    const saveAsHospitalDefault = useCallback(async () => {
        const error = validatePrintLayout(layout);
        if (error) {
            toast.error(error);
            return false;
        }
        try {
            await saveMutation.mutateAsync(layout);
            // The override and the hospital default now agree; drop the override
            // so future changes to the hospital default flow through.
            persistOverride(null);
            return true;
        } catch {
            return false;
        }
    }, [layout, saveMutation, persistOverride]);

    return {
        /** Effective layout to render with. */
        layout,
        /** The hospital-wide default, before any session override. */
        hospitalLayout,
        /** True while the hospital default is still being fetched. */
        isLoading: isLoading || !overrideLoaded,
        /** True when the hospital has never saved a layout. */
        isHospitalDefault: tenantLayout?.is_default ?? true,
        hasSessionOverride: override !== null && Object.keys(override).length > 0,
        validationError: validatePrintLayout(layout),
        updateLayout,
        resetToHospitalDefault,
        saveAsHospitalDefault,
        isSaving: saveMutation.isPending,
    };
}

/** Convenience wrapper for the prescription document. */
export function usePrescriptionPrintLayout() {
    return useResolvedPrintLayout("prescription");
}

/**
 * Fold the pre-feature localStorage keys into the new override object once, so
 * a doctor's existing "no letterhead" / hidden-section choices survive upgrade.
 */
function migrateLegacyPreferences(): void {
    if (window.localStorage.getItem(LEGACY_MIGRATED_KEY) === "true") return;

    const patch: Partial<PrintLayoutConfig> = {};

    try {
        const rawHeader = window.localStorage.getItem(LEGACY_HEADER_KEY);
        if (rawHeader !== null) {
            patch.header_enabled = JSON.parse(rawHeader) === true;
        }

        const rawSections = window.localStorage.getItem(LEGACY_SECTIONS_KEY);
        if (rawSections !== null) {
            const parsed = JSON.parse(rawSections);
            if (Array.isArray(parsed)) {
                // "Header" was previously carried inside the section list; it is
                // now header_enabled, so it must not leak into visible_sections.
                patch.visible_sections = parsed.filter((s: string) => s !== "Header");
                if (patch.header_enabled === undefined) {
                    patch.header_enabled = parsed.includes("Header");
                }
            }
        }

        const rawOrder = window.localStorage.getItem(LEGACY_ORDER_KEY);
        if (rawOrder !== null) {
            const parsed = JSON.parse(rawOrder);
            if (Array.isArray(parsed)) {
                patch.section_order = parsed;
            }
        }

        if (Object.keys(patch).length > 0) {
            const existing = window.localStorage.getItem(OVERRIDE_STORAGE_KEY);
            const merged = existing
                ? { ...(JSON.parse(existing) as Partial<PrintLayoutConfig>), ...patch }
                : patch;
            window.localStorage.setItem(OVERRIDE_STORAGE_KEY, JSON.stringify(merged));
        }
    } catch (e) {
        console.error("Failed to migrate legacy print preferences:", e);
    } finally {
        // Mark migrated regardless: a second attempt would not do better, and
        // retrying every mount would overwrite later user changes.
        window.localStorage.setItem(LEGACY_MIGRATED_KEY, "true");
    }
}

function extractErrorMessage(error: unknown, fallback: string): string {
    const detail = (error as { response?: { data?: { detail?: unknown } } })?.response?.data
        ?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail) && detail.length > 0) {
        const first = detail[0] as { msg?: string };
        if (first?.msg) return first.msg;
    }
    return fallback;
}

export { DEFAULT_PRINT_LAYOUT, OVERRIDE_STORAGE_KEY };
