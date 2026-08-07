import type { PathwayStage } from "@/services/pathwaysApi";

/**
 * Which screen does the work for a given stage.
 *
 * The plan said "the optometrist panel becomes a configuration of the generic
 * panel". Having read it, that is not the right shape. `components/optometrist`
 * is ~35,000 lines across 87 files — refraction, IOP, AR data, vision, specs,
 * ophthalmic history — and none of it has a counterpart in a general hospital.
 * Folding it into a generic component would produce one component rendering two
 * unrelated things, and the eye hospital would pay for it in regressions.
 *
 * What generalises is the *shell*: find the patients this role is responsible
 * for, pick one, do the stage's work, move them on. What does not generalise is
 * the work itself. So the shell is generic and the body is looked up here —
 * eye stages hand off to the panel that already exists, and a stage nobody has
 * written a form for gets a body that does the universal things.
 *
 * Adding a speciality panel later means one entry here, not a rewrite.
 */

export type StagePanelKind =
    | { kind: "generic" }
    /** Hand off to a purpose-built screen that already exists. */
    | { kind: "redirect"; href: string; label: string };

/**
 * Stage codes served by the existing optometrist panel.
 *
 * Listed by code rather than detected by role: `dilation_in_progress` has no
 * assigned role but is unmistakably eye work, and a general hospital that
 * happens to employ an optometrist should not be silently routed into
 * refraction forms it never configured.
 */
const EYE_STAGE_CODES = new Set([
    "awaiting_optometrist",
    "optometrist_assigned",
    "optometrist_investigation_in_progress",
    "optometrist_investigation_completed",
    "dilation_in_progress",
    "dilation_completed",
]);

export function panelForStage(stage: PathwayStage | null): StagePanelKind {
    if (stage && EYE_STAGE_CODES.has(stage.code)) {
        return {
            kind: "redirect",
            href: "/optometrist-panel",
            label: "Open the eye examination panel",
        };
    }
    return { kind: "generic" };
}

/** True when every stage a role handles is served by a purpose-built screen. */
export function allStagesRedirect(stages: PathwayStage[]): boolean {
    return stages.length > 0 && stages.every((s) => panelForStage(s).kind === "redirect");
}
