/**
 * Print geometry engine.
 *
 * Turns a `PrintLayoutConfig` into the CSS a print document needs: the content
 * safe-area padding, the positioned letterhead band, and the `@page` rules.
 *
 * The whole feature rests on one CSS fact: **horizontal padding on a block
 * repeats on every printed page, whereas vertical padding applies only to the
 * first fragment.** So a left/right band reserved with `padding-left` /
 * `padding-right` is honoured on page 2, 3, ... automatically, while a top band
 * reserved with `padding-top` correctly affects page one only. That is why no
 * DOM restructuring of the document body is required.
 *
 * The band element itself is `position: absolute` (pinned to page one) or, when
 * `repeat_on_every_page` is set, `position: fixed` — which in paginated media
 * repeats the element on every page. `fixed` is applied under `@media print`
 * only, because on screen it would escape the preview and stick to the viewport.
 */

import type { CSSProperties } from "react";
import {
    A4_HEIGHT_MM,
    A4_WIDTH_MM,
    type HeaderPosition,
    type PrintLayoutConfig,
} from "@/types/printLayout";

/** Gap between the letterhead band and the document content, in mm. */
const BAND_CONTENT_GUTTER_MM = 4;

/** Label column width for clinical sections, at full width and when narrowed. */
const LABEL_COL_WIDE_PX = 120;
const LABEL_COL_NARROW_PX = 88;

export const BAND_CLASS = "rx-letterhead-band";
export const BAND_REPEAT_CLASS = "rx-letterhead-band--repeat";
export const PRINT_CONTAINER_CLASS = "prescription-print-container";

export interface PrintGeometry {
    /** True when the band sits on the left or right edge, narrowing the content. */
    isSideBand: boolean;
    /** True when a band exists and we are drawing it (as opposed to reserving space). */
    rendersBand: boolean;
    /** True when space is reserved but left blank for pre-printed stationery. */
    reservesBand: boolean;
    /** Width available to document content, in mm. */
    contentWidthMm: number;
    /** Height available to document content on page one, in mm. */
    contentHeightMm: number;
    /** Label column width for clinical sections, in px. */
    labelColPx: number;
    /** Inline styles for the print container (padding + CSS custom properties). */
    containerStyle: CSSProperties;
    /** Inline styles for the letterhead band, or null when there is nothing to draw. */
    bandStyle: CSSProperties | null;
    /** Class list for the band element. */
    bandClassName: string;
    /** Height of the in-flow spacer for a reserved top band, in mm (0 when unused). */
    topSpacerMm: number;
    /** Complete stylesheet: `@page` rules plus print-only overrides. */
    pageStyle: string;
}

/** Millimetres consumed on each edge by the band, including nothing when disabled. */
function bandExtent(config: PrintLayoutConfig): Record<HeaderPosition, number> {
    const size = config.header_enabled ? config.band_size_mm : 0;
    return {
        top: config.header_position === "top" ? size : 0,
        left: config.header_position === "left" ? size : 0,
        right: config.header_position === "right" ? size : 0,
    };
}

export function buildPrintGeometry(config: PrintLayoutConfig): PrintGeometry {
    const m = config.margins_mm;
    const band = bandExtent(config);
    const isSideBand = config.header_enabled && config.header_position !== "top";
    const rendersBand = config.header_enabled && config.header_mode === "rendered";
    const reservesBand = config.header_enabled && config.header_mode === "reserved";

    // A rendered top header sits in normal flow and sizes itself, so it must not
    // also be reserved via padding — that would double the gap. Every other case
    // reserves its band through padding.
    const topReserveMm = config.header_position === "top" && rendersBand ? 0 : band.top;

    const padTop = m.top + topReserveMm;
    const padRight = m.right + band.right;
    const padBottom = m.bottom;
    const padLeft = m.left + band.left;

    const contentWidthMm = A4_WIDTH_MM - padLeft - padRight;
    const contentHeightMm = A4_HEIGHT_MM - padTop - padBottom;
    const labelColPx = isSideBand ? LABEL_COL_NARROW_PX : LABEL_COL_WIDE_PX;

    const containerStyle: CSSProperties = {
        padding: `${padTop}mm ${padRight}mm ${padBottom}mm ${padLeft}mm`,
        // Consumed by the clinical section grids so they can shrink with the band.
        ["--rx-label-col" as string]: `${labelColPx}px`,
    };

    let bandStyle: CSSProperties | null = null;
    if (rendersBand && config.header_position !== "top") {
        const isLeft = config.header_position === "left";
        // The band spans the full reserved gutter (outer margin + band), then
        // insets its own content so text never touches the paper edge.
        const totalWidthMm = (isLeft ? m.left : m.right) + config.band_size_mm;
        bandStyle = {
            position: "absolute",
            top: 0,
            bottom: 0,
            [isLeft ? "left" : "right"]: 0,
            width: `${totalWidthMm}mm`,
            paddingTop: `${m.top}mm`,
            paddingBottom: `${m.bottom}mm`,
            paddingLeft: `${isLeft ? m.left : BAND_CONTENT_GUTTER_MM}mm`,
            paddingRight: `${isLeft ? BAND_CONTENT_GUTTER_MM : m.right}mm`,
            overflow: "hidden",
        };
    }

    const bandClassName = [BAND_CLASS, config.repeat_on_every_page ? BAND_REPEAT_CLASS : ""]
        .filter(Boolean)
        .join(" ");

    return {
        isSideBand,
        rendersBand,
        reservesBand,
        contentWidthMm,
        contentHeightMm,
        labelColPx,
        containerStyle,
        bandStyle,
        bandClassName,
        topSpacerMm: config.header_position === "top" && reservesBand ? band.top : 0,
        pageStyle: buildPageStyle(config, {
            padTop,
            padRight,
            padBottom,
            padLeft,
            labelColPx,
        }),
    };
}

interface PagePadding {
    padTop: number;
    padRight: number;
    padBottom: number;
    padLeft: number;
    labelColPx: number;
}

/**
 * The single print stylesheet for the document.
 *
 * `@page { margin: 0 }` plus container padding (rather than `@page` margins) is
 * kept from the original implementation: it keeps all geometry in one place and
 * lets the band be positioned relative to the paper edge.
 */
function buildPageStyle(config: PrintLayoutConfig, pad: PagePadding): string {
    return `
        @media print {
            @page {
                size: A4;
                margin: 0;
            }
            .${PRINT_CONTAINER_CLASS} {
                width: ${A4_WIDTH_MM}mm !important;
                min-height: ${A4_HEIGHT_MM}mm !important;
                padding: ${pad.padTop}mm ${pad.padRight}mm ${pad.padBottom}mm ${pad.padLeft}mm !important;
                margin: 0 !important;
                max-width: none !important;
                height: auto !important;
                display: block !important;
                position: relative !important;
                --rx-label-col: ${pad.labelColPx}px;
            }
            .break-inside-avoid {
                break-inside: avoid !important;
                page-break-inside: avoid !important;
            }
            /*
             * position: fixed repeats an element on every page in paginated
             * media. Applied only in print: on screen it would break out of the
             * preview and pin itself to the viewport.
             */
            .${BAND_REPEAT_CLASS} {
                position: fixed !important;
                top: 0 !important;
                bottom: 0 !important;
            }
            /* Backgrounds and rules must survive the browser's print defaults. */
            .${BAND_CLASS} {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
        }
    `;
}

/**
 * `pageStyle` for react-to-print. react-to-print injects this into the print
 * iframe, where it must agree with the document's own stylesheet — historically
 * the two disagreed (`@page { margin: 10mm }` here vs `margin: 0` in the
 * component), so both now come from this module.
 */
export function buildReactToPrintPageStyle(config: PrintLayoutConfig): string {
    return `
        @page {
            size: A4;
            margin: 0;
        }
        @media print {
            body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
                margin: 0 !important;
            }
        }
        ${buildPrintGeometry(config).pageStyle}
    `;
}

/**
 * Preview scale factor: how many screen pixels represent one millimetre so an
 * A4 page fits the given pixel width. Lets the preview mirror print geometry
 * instead of approximating it with a fixed pixel width.
 */
export function mmToPreviewPx(widthPx: number): number {
    return widthPx / A4_WIDTH_MM;
}
