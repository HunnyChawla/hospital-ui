"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { PlannedSurgeriesList } from "@/components/planned-surgeries/PlannedSurgeriesList";
import { Plus, RefreshCw, CalendarDays, Search, X } from "lucide-react";
import { plannedSurgeryKeys } from "@/hooks/queries/usePlannedSurgeries";
import { useAppSelector } from "@/redux/hooks";

export default function PlannedSurgeriesPage() {
    const queryClient = useQueryClient();
    const doctors = useAppSelector((s) => s.doctors.list);

    const [showFormModal, setShowFormModal] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [patientSearch, setPatientSearch] = useState("");
    const [surgeonId, setSurgeonId] = useState("");

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await queryClient.invalidateQueries({ queryKey: plannedSurgeryKeys.lists() });
        } finally {
            setTimeout(() => setIsRefreshing(false), 500);
        }
    };

    return (
        <div className="grid gap-3 min-w-0 max-w-full">
            <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4 sm:p-6 min-w-0 max-w-full">
                {/* Header Bar: Title on left; Search, Surgeon Filter, Refresh, Plan New Surgery on right */}
                <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 xl:flex-row xl:items-center xl:justify-between min-w-0">
                    <div>
                        <div className="flex items-center gap-2">
                            <CalendarDays className="h-5 w-5 text-sky-500" />
                            <h1 className="text-lg font-semibold text-slate-900">Planned Surgeries</h1>
                        </div>
                        <p className="mt-1 text-sm text-slate-500">
                            View and manage scheduled surgical procedures
                        </p>
                    </div>

                    {/* Top Right Controls: Search, Surgeon Filter, Refresh Data, Plan New Surgery */}
                    <div className="flex w-full xl:w-auto flex-wrap items-center gap-2.5 sm:gap-3">
                        {/* Search Input */}
                        <div className="relative flex-1 min-w-[180px] sm:flex-initial sm:w-60">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={patientSearch}
                                onChange={(e) => setPatientSearch(e.target.value)}
                                placeholder="Search patient, UHID..."
                                className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-8 py-2 text-sm outline-none transition focus:border-sky-400"
                            />
                            {patientSearch && (
                                <button
                                    onClick={() => setPatientSearch("")}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>

                        {/* Surgeon Dropdown */}
                        <div className="flex-1 min-w-[140px] sm:flex-initial sm:w-44">
                            <select
                                value={surgeonId}
                                onChange={(e) => setSurgeonId(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-sky-400"
                            >
                                <option value="">All Surgeons</option>
                                {doctors.map((doc) => (
                                    <option key={doc.id} value={doc.id}>
                                        {doc.name || doc.user?.name || `Dr. ${doc.specialization}`}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Refresh Data button (Icon Only) */}
                        <button
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-2xs transition-all hover:bg-slate-50 hover:text-sky-600 hover:border-sky-200 active:scale-95 disabled:opacity-70 cursor-pointer shrink-0"
                            title="Refresh Data"
                        >
                            <RefreshCw className={`h-4 w-4 text-sky-500 transition-transform duration-300 ${isRefreshing ? "animate-spin" : "hover:rotate-180"}`} />
                        </button>

                        {/* Plan New Surgery button */}
                        <button
                            onClick={() => setShowFormModal(true)}
                            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow-md cursor-pointer whitespace-nowrap shrink-0"
                        >
                            <Plus className="h-4 w-4" />
                            <span>Plan New Surgery</span>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="mt-4">
                    <PlannedSurgeriesList
                        openFormModal={showFormModal}
                        onCloseFormModal={() => setShowFormModal(false)}
                        patientSearch={patientSearch}
                        setPatientSearch={setPatientSearch}
                        surgeonId={surgeonId}
                        setSurgeonId={setSurgeonId}
                    />
                </div>
            </div>
        </div>
    );
}
