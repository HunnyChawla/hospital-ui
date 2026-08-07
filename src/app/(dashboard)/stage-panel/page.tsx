"use client";

import { useEffect, useState } from "react";
import { ClipboardList } from "lucide-react";
import { StagePanel } from "@/components/pathways/StagePanel";

/**
 * The panel a non-doctor clinical role works from.
 *
 * The role comes from the logged-in user rather than a picker: a nurse's panel
 * is the nurse's queue, and letting someone choose whose queue to work would
 * only create ways to record an observation under the wrong role.
 */
export default function StagePanelPage() {
    // After mount, not during render: localStorage does not exist on the server,
    // so reading it while rendering breaks hydration and is an impure render.
    const [role, setRole] = useState<string | null>(null);
    const [resolved, setResolved] = useState(false);
    useEffect(() => {
        setRole(localStorage.getItem("role"));
        setResolved(true);
    }, []);

    return (
        <div className="grid gap-4">
            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-teal-500">
                        <ClipboardList className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-lg font-semibold text-slate-900">My Patients</h1>
                        <p className="text-sm text-slate-500">
                            Patients waiting at a stage you are responsible for
                        </p>
                    </div>
                </div>
            </div>

            {!resolved ? (
                <p className="py-8 text-center text-sm text-slate-500">Loading…</p>
            ) : role ? (
                <StagePanel role={role} />
            ) : (
                <p className="py-8 text-center text-sm text-slate-500">
                    Could not determine your role. Try signing in again.
                </p>
            )}
        </div>
    );
}
