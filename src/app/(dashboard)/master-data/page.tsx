"use client";

import { useState } from "react";
import { DiagnosesPanel } from "@/components/master-data/DiagnosesPanel";
import { AdvicesPanel } from "@/components/master-data/AdvicesPanel";

type Tab = "diagnoses" | "advices";

export default function MasterDataPage() {
    const [activeTab, setActiveTab] = useState<Tab>("diagnoses");

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
                <div className="flex gap-1">
                    <button
                        onClick={() => setActiveTab("diagnoses")}
                        className={`px-4 py-2 text-sm font-semibold transition-colors relative ${activeTab === "diagnoses"
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
                        onClick={() => setActiveTab("advices")}
                        className={`px-4 py-2 text-sm font-semibold transition-colors relative ${activeTab === "advices"
                            ? "text-sky-600"
                            : "text-slate-600 hover:text-slate-900"
                            }`}
                    >
                        Advices
                        {activeTab === "advices" && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-600" />
                        )}
                    </button>
                </div>
            </div>

            {/* Tab Content */}
            <div>
                {activeTab === "diagnoses" && <DiagnosesPanel />}
                {activeTab === "advices" && <AdvicesPanel />}
            </div>
        </div>
    );
}
