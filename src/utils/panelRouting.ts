/**
 * Which working panel a user belongs on. One resolver shared by the layout
 * gate and the sidebar so the two can never drift.
 *
 * - optometrists always get the optometrist panel (/optometrist-panel)
 * - examiners always get the clinic panel (/clinic-panel)
 * - ophthalmologist doctors get the optometrist panel (/optometrist-panel)
 * - other doctors get the clinic panel (/clinic-panel)
 */

export const PANEL_PATHS = ["/optometrist-panel", "/clinic-panel"] as const;

export function resolvePanelPathForUser(
  role: string | null | undefined,
  specialization: string | null | undefined
): string | null {
  const normalizedRole = role?.toLowerCase();
  if (normalizedRole === "optometrist") return "/optometrist-panel";
  if (normalizedRole === "examiner") return "/clinic-panel";
  if (normalizedRole !== "doctor") return null; // not panel-gated

  const normalizedSpec = specialization?.toLowerCase() ?? "";
  const isEyeSpecialist =
    normalizedSpec.includes("ophth") || normalizedSpec.includes("optom");
  return isEyeSpecialist ? "/optometrist-panel" : "/clinic-panel";
}
