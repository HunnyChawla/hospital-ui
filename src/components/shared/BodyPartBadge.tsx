import { Eye, Bone } from "lucide-react";
import clsx from "clsx";

type LateralityLike = "left" | "right" | "bilateral" | "na" | string | null | undefined;

interface BodyPartBadgeProps {
    /** Preferred: pass the resolved name directly (works for legacy `eye`-only records too). */
    name?: string | null;
    laterality?: LateralityLike;
    department?: string | null;
    className?: string;
}

const LATERALITY_STYLE: Record<string, string> = {
    left: "bg-emerald-100 text-emerald-700 border-emerald-200",
    right: "bg-blue-100 text-blue-700 border-blue-200",
    bilateral: "bg-purple-100 text-purple-700 border-purple-200",
    na: "bg-slate-100 text-slate-700 border-slate-200",
};

/**
 * Generic body-part badge replacing the eye-only getEyeBadge()/getEyeBadgeColor()
 * implementations previously duplicated across PlannedSurgeriesList.tsx,
 * SurgeryDetailModal.tsx, and PlannedSurgerySection.tsx. Color/icon are driven
 * by laterality + department, not by any specific body part, so it scales to
 * new departments without new component variants.
 */
export function BodyPartBadge({ name, laterality, department, className }: BodyPartBadgeProps) {
    if (!name) {
        return (
            <span className={clsx("inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium border", LATERALITY_STYLE.na, className)}>
                Unspecified
            </span>
        );
    }

    const style = (laterality && LATERALITY_STYLE[laterality]) || LATERALITY_STYLE.na;
    const Icon = department === "Ophthalmology" ? Eye : Bone;

    return (
        <span
            className={clsx(
                "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium border",
                style,
                className
            )}
        >
            <Icon className="h-3 w-3" />
            {name}
        </span>
    );
}
