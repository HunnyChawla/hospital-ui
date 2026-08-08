/**
 * The section vocabulary of a printed prescription.
 *
 * ⚠️ SHARED CONTRACT — the server renderer uses these exact keys.
 *
 * `hms/health_record/service/renderers/documents.py::prescription_sections`
 * builds the same list, and `tenant_print_layouts.section_order` /
 * `visible_sections` are stored against these strings. A hospital that
 * reorders its prescription has these keys saved in its configuration, so
 * renaming one is a breaking change to their data, not a refactor.
 *
 * A test in the backend reads THIS FILE and asserts the two lists match —
 * see `tests/health_record/test_section_order_parity.py`. That is the C6
 * golden-file check: the two renderers may lay a page out differently, but
 * they may not disagree about which sections exist or what order the
 * configuration puts them in.
 */
export const PRESCRIPTION_PRINT_SECTIONS = [
    "diagnosis",
    "medicines",
    "tests",
    "advice",
    "notes",
    "followup",
] as const;

export type PrescriptionSectionKey = (typeof PRESCRIPTION_PRINT_SECTIONS)[number];

/**
 * Apply a hospital's `section_order` and `visible_sections` to a section list.
 *
 * Mirrors `BaseRenderer.order_sections` on the server, including the part that
 * is easy to get wrong: sections the configuration does not mention are KEPT
 * and appended in their natural order, never dropped. A hospital that reorders
 * two sections must not silently lose every section the product adds later.
 */
export function orderPrescriptionSections(
    keys: readonly string[],
    sectionOrder: string[] | null | undefined,
    visibleSections: string[] | null | undefined
): string[] {
    let result = [...keys];

    if (visibleSections) {
        const allowed = new Set(visibleSections);
        result = result.filter((key) => allowed.has(key));
    }

    if (!sectionOrder || sectionOrder.length === 0) return result;

    const position = new Map(sectionOrder.map((key, index) => [key, index]));
    // Stable sort: unmentioned sections keep their natural sequence after the
    // configured ones.
    return result
        .map((key, index) => ({ key, index }))
        .sort((a, b) => {
            const pa = position.get(a.key) ?? position.size + 1;
            const pb = position.get(b.key) ?? position.size + 1;
            return pa === pb ? a.index - b.index : pa - pb;
        })
        .map((entry) => entry.key);
}
