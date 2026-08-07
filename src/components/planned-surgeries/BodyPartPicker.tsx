import clsx from "clsx";
import { Eye, Bone } from "lucide-react";
import type { BodyPartSummary } from "@/types";

interface BodyPartPickerProps {
    bodyParts: BodyPartSummary[];
    value: string | null;
    onChange: (id: string | null) => void;
    disabled?: boolean;
    department?: string | null;
}

const LATERALITY_ACTIVE_COLOR: Record<string, string> = {
    left: "bg-emerald-600 text-white border-emerald-600",
    right: "bg-blue-600 text-white border-blue-600",
    bilateral: "bg-purple-600 text-white border-purple-600",
    na: "bg-slate-600 text-white border-slate-600",
};

/**
 * Generic body-part picker replacing the hardcoded OD/OS/OU 3-button rows
 * previously duplicated in PlannedSurgerySection.tsx (doctor prescription
 * panel) and PlannedSurgeryFormModal.tsx. Data-driven from the selected
 * surgery's `body_parts` - works for any department, not just eyes.
 *
 * Follows the 0/1/2+ selection-count convention set by SurgeryFormModal's
 * BodyPartMultiSelect: callers should not render this at all when
 * bodyParts.length <= 1 (auto-apply the single one silently instead).
 */
export function BodyPartPicker({ bodyParts, value, onChange, disabled, department }: BodyPartPickerProps) {
    if (bodyParts.length === 0) return null;

    const Icon = department === "Ophthalmology" ? Eye : Bone;

    return (
        <div className="flex flex-wrap gap-2">
            {bodyParts.map((bp) => {
                const isActive = value === bp.id;
                const activeColor = LATERALITY_ACTIVE_COLOR[bp.laterality] || LATERALITY_ACTIVE_COLOR.na;
                return (
                    <button
                        key={bp.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => onChange(bp.id)}
                        className={clsx(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed",
                            isActive ? activeColor : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                        )}
                        title={bp.name}
                    >
                        <Icon className="h-3.5 w-3.5" />
                        {bp.name}
                    </button>
                );
            })}
        </div>
    );
}
