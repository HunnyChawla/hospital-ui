"use client";

import { useState, useEffect } from "react";
import { DiagnosesPanel } from "@/components/master-data/DiagnosesPanel";
import { SymptomsPanel } from "@/components/master-data/SymptomsPanel";
import { AdvicesPanel } from "@/components/master-data/AdvicesPanel";
import { SeedDataPanel } from "@/components/master-data/SeedDataPanel";
import { isPlatformOwner } from "@/utils/auth";
import { Database } from "lucide-react";

type Tab = "diagnoses" | "symptoms" | "advices" | "seed-data";


export default function MasterDataPage() {
    const [activeTab, setActiveTab] = useState<Tab>("diagnoses");
    const [canSeed, setCanSeed] = useState(false);

    useEffect(() => {
        // Only Platform Owner (and maybe Admins if we update logic) can access seed data
        // For now using isPlatformOwner util which checks for platform_owner role
        // If admins are allowed, we might need to check role explicitly
        // Spec says "Platform Owner Admin only", assuming platform_owner role
        setCanSeed(isPlatformOwner());
    }, []);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Master Data</h1>
                <p className="mt-1 text-sm text-slate-500">
                    Manage hospital master data including diagnoses, procedures, and other reference data
                </p>
            </div>

            {/* Horizontal Tab Navigation */}
            <div className="border-b border-slate-200">
                <div className="flex gap-1 overflow-x-auto pb-1">
                    <button
                        onClick={() => setActiveTab("diagnoses")}
                        className={`px-4 py-2 text-sm font-semibold transition-colors relative whitespace-nowrap ${activeTab === "diagnoses"
                            ? "text-sky-600"
                            : "text-slate-600 hover:text-slate-900"
                            }`}
                    >
                        Diagnoses
                        {activeTab === "diagnoses" && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-600" />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab("symptoms")}
                        className={`px-4 py-2 text-sm font-semibold transition-colors relative whitespace-nowrap ${activeTab === "symptoms"
                            ? "text-sky-600"
                            : "text-slate-600 hover:text-slate-900"
                            }`}
                    >
                        Symptoms
                        {activeTab === "symptoms" && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-600" />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab("advices")}
                        className={`px-4 py-2 text-sm font-semibold transition-colors relative whitespace-nowrap ${activeTab === "advices"
                            ? "text-sky-600"
                            : "text-slate-600 hover:text-slate-900"
                            }`}
                    >
                        Advices
                        {activeTab === "advices" && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-600" />
                        )}
                    </button>

                    {canSeed && (
                        <button
                            onClick={() => setActiveTab("seed-data")}
                            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-colors relative whitespace-nowrap ${activeTab === "seed-data"
                                ? "text-sky-600"
                                : "text-slate-600 hover:text-slate-900"
                                }`}
                        >
                            <Database className="h-4 w-4" />
                            Seed Data
                            {activeTab === "seed-data" && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-600" />
                            )}
                        </button>
                    )}
                </div>
            </div>

            {/* Tab Content */}
            <div>
                {activeTab === "diagnoses" && <DiagnosesPanel />}
                {activeTab === "symptoms" && <SymptomsPanel />}
                {activeTab === "advices" && <AdvicesPanel />}
                {activeTab === "seed-data" && canSeed && <SeedDataPanel />}
            </div>
        </div>
    );
}
