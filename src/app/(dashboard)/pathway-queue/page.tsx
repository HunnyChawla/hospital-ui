"use client";

import { LayoutList } from "lucide-react";
import { PathwayQueueBoard } from "@/components/pathways/PathwayQueueBoard";

export default function PathwayQueuePage() {
    return (
        <div className="grid gap-4">
            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-teal-500">
                        <LayoutList className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-lg font-semibold text-slate-900">Patient Queue</h1>
                        <p className="text-sm text-slate-500">
                            Everyone waiting, by the stage they are at
                        </p>
                    </div>
                </div>
            </div>

            <PathwayQueueBoard />
        </div>
    );
}
