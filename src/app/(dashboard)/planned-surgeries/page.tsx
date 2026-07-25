"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { PlannedSurgeriesList } from "@/components/planned-surgeries/PlannedSurgeriesList";
import { PlannedSurgeryFormModal } from "@/components/planned-surgeries/PlannedSurgeryFormModal";
import { Plus, RefreshCw, CalendarDays } from "lucide-react";
import { plannedSurgeryKeys } from "@/hooks/queries/usePlannedSurgeries";

export default function PlannedSurgeriesPage() {
    const queryClient = useQueryClient();
    const [showFormModal, setShowFormModal] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await queryClient.invalidateQueries({ queryKey: plannedSurgeryKeys.lists() });
        } finally {
            setTimeout(() => setIsRefreshing(false), 500);
        }
    };

    return (
        <div className="grid gap-3">
            <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
                {/* Header Bar */}
                <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <CalendarDays className="h-5 w-5 text-sky-500" />
                            <h1 className="text-lg font-bold text-slate-900">Planned Surgeries</h1>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                            View and manage scheduled surgical procedures
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900 disabled:opacity-70"
                        >
                            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                            <span className="hidden sm:inline">Refresh Data</span>
                        </button>
                        <button
                            onClick={() => setShowFormModal(true)}
                            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-sky-500/30 transition hover:from-sky-600 hover:to-teal-600 hover:shadow-md"
                        >
                            <Plus className="h-4 w-4" />
                            <span>Plan New Surgery</span>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-4 sm:p-6">
                    <PlannedSurgeriesList
                        openFormModal={showFormModal}
                        onCloseFormModal={() => setShowFormModal(false)}
                    />
                </div>
            </div>
        </div>
    );
}
