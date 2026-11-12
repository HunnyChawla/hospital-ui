/**
 * Which working panel a user belongs on. One resolver shared by the layout
 * gate and the sidebar so the two can never drift.
 *
 * - optometrists always get the optometrist panel (/optometrist-panel)
 * - examiners always get the clinic panel (/clinic-panel)
 * - ophthalmologist doctors get the doctor panel (/doctor-panel)
 * - other doctors get the clinic panel (/clinic-panel)
 */

export const PANEL_PATHS = ["/optometrist-panel", "/doctor-panel", "/clinic-panel"] as const;

export function resolvePanelPathForUser(
  role: string | null | undefined,
  specialization: string | null | undefined,
  clinicPanelEnabled: boolean = true
): string | null {
  if (role === "optometrist") return "/optometrist-panel";
  if (role === "examiner") return "/clinic-panel";
  if (role !== "doctor") return null; // not panel-gated

  const isOphthalmologist = Boolean(
    specialization && specialization.toLowerCase().includes("ophth")
  );
  if (isOphthalmologist) return "/doctor-panel";
  return "/clinic-panel";
}
