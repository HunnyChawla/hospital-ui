/**
 * Print layout types.
 *
 * Mirrors the backend DTOs in
 * `hms/tenant_management/dto/print_layout.py`. Keep the two in sync — the
 * config object is round-tripped through a JSONB column verbatim.
 */

/** Documents that support a configurable print layout. */
export type PrintDocumentType =
    | "prescription"
    | "opd_slip"
    | "invoice"
    | "discharge_summary"
    | "lab_report";

/** Page edge the letterhead band occupies. */
export type HeaderPosition = "top" | "left" | "right";

/**
 * Whether the application draws the letterhead or merely reserves the space.
 * `reserved` is for hospitals printing onto pre-printed stationery.
 */
export type HeaderMode = "rendered" | "reserved";

export type HeaderAlign = "left" | "center" | "right";

export interface PageMarginsMm {
    top: number;
    right: number;
    bottom: number;
    left: number;
}

export interface PrintLayoutConfig {
    header_enabled: boolean;
    header_position: HeaderPosition;
    header_mode: HeaderMode;
    /** Band height when position is "top", band width when "left"/"right". */
    band_size_mm: number;
    repeat_on_every_page: boolean;
    header_align: HeaderAlign;
    margins_mm: PageMarginsMm;

    show_logo: boolean;
    show_address: boolean;
    show_contact: boolean;
    show_divider: boolean;

    /** Null means "all sections". */
    visible_sections: string[] | null;
    /** Null means the built-in section order. */
    section_order: string[] | null;
}

export interface PrintLayoutResponse {
    id: string;
    tenant_id: string;
    document_type: PrintDocumentType;
    config: PrintLayoutConfig;
    /** True when the tenant has no stored layout and defaults were returned. */
    is_default: boolean;
    created_at: string;
    updated_at: string;
    created_by?: string | null;
    updated_by?: string | null;
}

export interface SetPrintLayoutRequest {
    config: PrintLayoutConfig;
}

/** A4 portrait, in millimetres. Matches the backend constants. */
export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;

/** Backend rejects configurations that leave less room than this. */
export const MIN_CONTENT_WIDTH_MM = 100;
export const MIN_CONTENT_HEIGHT_MM = 120;

export const DEFAULT_PAGE_MARGINS_MM: PageMarginsMm = {
    top: 10,
    right: 15,
    bottom: 25,
    left: 15,
};

/**
 * Built-in defaults. These reproduce the layout that was hard-coded before this
 * feature existed, so an unconfigured tenant sees no visual change.
 */
export const DEFAULT_PRINT_LAYOUT: PrintLayoutConfig = {
    header_enabled: true,
    header_position: "top",
    header_mode: "rendered",
    band_size_mm: 32,
    repeat_on_every_page: false,
    header_align: "center",
    margins_mm: { ...DEFAULT_PAGE_MARGINS_MM },
    show_logo: true,
    show_address: true,
    show_contact: true,
    show_divider: true,
    visible_sections: null,
    section_order: null,
};

/** Sensible band size when switching between a top band and a side band. */
export const DEFAULT_BAND_SIZE_MM: Record<HeaderPosition, number> = {
    top: 32,
    left: 45,
    right: 45,
};

/**
 * Normalise a possibly-partial config (older localStorage payload, partial API
 * response) into a complete one, so callers never deal with undefined fields.
 */
export function normalizePrintLayout(
    partial?: Partial<PrintLayoutConfig> | null
): PrintLayoutConfig {
    if (!partial) return { ...DEFAULT_PRINT_LAYOUT, margins_mm: { ...DEFAULT_PAGE_MARGINS_MM } };
    return {
        ...DEFAULT_PRINT_LAYOUT,
        ...partial,
        margins_mm: { ...DEFAULT_PAGE_MARGINS_MM, ...(partial.margins_mm || {}) },
    };
}

/**
 * Client-side mirror of the backend's usable-content-area validator, so the UI
 * can disable "Save" and explain why instead of surfacing a 400.
 */
export function validatePrintLayout(config: PrintLayoutConfig): string | null {
    const sideBand =
        config.header_enabled && config.header_position !== "top" ? config.band_size_mm : 0;
    const topBand =
        config.header_enabled && config.header_position === "top" ? config.band_size_mm : 0;

    const usableWidth =
        A4_WIDTH_MM - config.margins_mm.left - config.margins_mm.right - sideBand;
    if (usableWidth < MIN_CONTENT_WIDTH_MM) {
        return `Content area would be only ${Math.round(usableWidth)}mm wide (minimum ${MIN_CONTENT_WIDTH_MM}mm). Reduce the band size or the left/right page margins.`;
    }

    const usableHeight =
        A4_HEIGHT_MM - config.margins_mm.top - config.margins_mm.bottom - topBand;
    if (usableHeight < MIN_CONTENT_HEIGHT_MM) {
        return `Content area would be only ${Math.round(usableHeight)}mm tall (minimum ${MIN_CONTENT_HEIGHT_MM}mm). Reduce the band size or the top/bottom page margins.`;
    }

    return null;
}
