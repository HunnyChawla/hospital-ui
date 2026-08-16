/**
 * Which working panel a user belongs on. One resolver shared by the layout
 * gate and the sidebar so the two can never drift.
 *
 * - examiners always get the clinic panel
 * - ophthalmologists keep the optometrist (eye) panel
 * - other doctors get the clinic panel when the tenant has opted in via the
 *   `clinic_panel` feature flag, else the legacy doctor panel
 */

export const PANEL_PATHS = ["/optometrist-panel", "/doctor-panel", "/clinic-panel"] as const;

export function resolvePanelPathForUser(
  role: string | null | undefined,
  specialization: string | null | undefined,
  clinicPanelEnabled: boolean
): string | null {
  if (role === "examiner") return "/clinic-panel";
  if (role !== "doctor") return null; // not panel-gated
  if (specialization === "Ophthalmology") return "/optometrist-panel";
  return clinicPanelEnabled ? "/clinic-panel" : "/doctor-panel";
}
