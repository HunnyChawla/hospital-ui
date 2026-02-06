"use client";

import { useAppDispatch } from "@/redux/hooks";
import { fetchJob } from "@/redux/seedDataSlice";
import { SeedJobResponse } from "@/services/seedDataApi";
import { formatDateTime } from "@/utils/format";
import {
    CheckCircle,
    Clock,
    AlertCircle,
    Loader2,
    RefreshCcw,
    Database,
    Table,
    User,
    Calendar,
    Building
} from "lucide-react";
import { Modal } from "../common/Modal";
import { useState } from "react";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";

interface SeedDataJobDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    job: SeedJobResponse;
}

export function SeedDataJobDetailsModal({
    isOpen,
    onClose,
    job
}: SeedDataJobDetailsModalProps) {
    const dispatch = useAppDispatch();
    const [refreshing, setRefreshing] = useState(false);

    // Helper to format timestamps
    const formatTime = (isoString?: string | null) => {
        if (!isoString) return "-";
        try {
            return formatDateTime(isoString);
        } catch {
            return isoString;
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            await dispatch(fetchJob(job.id)).unwrap();
            toast.success("Job status updated");
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setRefreshing(false);
        }
    };

    const StatusIcon = () => {
        switch (job.status) {
            case "completed":
                return <CheckCircle className="h-5 w-5 text-emerald-500" />;
            case "failed":
                return <AlertCircle className="h-5 w-5 text-red-500" />;
            case "running":
                return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
            default:
                return <Clock className="h-5 w-5 text-amber-500" />;
        }
    };

    const formatJobType = (type: string) => {
        return type
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Job Details"
            size="lg"
        >
            <div className="space-y-6">
                {/* Header Status Section */}
                <div className={`rounded-xl border p-4 flex items-center justify-between ${job.status === "completed" ? "bg-emerald-50 border-emerald-200" :
                    job.status === "failed" ? "bg-red-50 border-red-200" :
                        job.status === "running" ? "bg-blue-50 border-blue-200" :
                            "bg-amber-50 border-amber-200"
                    }`}>
                    <div className="flex items-center gap-3">
                        <StatusIcon />
                        <div>
                            <p className={`font-semibold ${job.status === "completed" ? "text-emerald-900" :
                                job.status === "failed" ? "text-red-900" :
                                    job.status === "running" ? "text-blue-900" :
                                        "text-amber-900"
                                }`}>
                                {job.status.toUpperCase()}
                            </p>
                            {job.duration_seconds !== null && (
                                <p className="text-xs opacity-80">
                                    Duration: {job.duration_seconds.toFixed(2)}s
                                </p>
                            )}
                        </div>
                    </div>

                    {(job.status === "running" || job.status === "pending") && (
                        <button
                            onClick={handleRefresh}
                            className="flex items-center gap-2 rounded-lg bg-white/50 px-3 py-1.5 text-xs font-semibold hover:bg-white transition-colors"
                        >
                            <RefreshCcw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
                            Refresh Status
                        </button>
                    )}
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-slate-500 text-xs uppercase font-semibold">
                            <Database className="h-3 w-3" /> Job Type
                        </div>
                        <p className="text-sm font-medium text-slate-900">{formatJobType(job.job_type)}</p>
                    </div>

                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-slate-500 text-xs uppercase font-semibold">
                            <Building className="h-3 w-3" /> Tenant
                        </div>
                        <p className="text-sm font-medium text-slate-900">
                            {job.tenant_id || "All Tenants (Global)"}
                        </p>
                    </div>

                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-slate-500 text-xs uppercase font-semibold">
                            <Table className="h-3 w-3" /> Tables Processed
                        </div>
                        <p className="text-sm font-medium text-slate-900">
                            {job.completed_tables} / {job.total_tables}
                        </p>
                    </div>

                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-slate-500 text-xs uppercase font-semibold">
                            <Database className="h-3 w-3" /> Rows Processed
                        </div>
                        <p className="text-sm font-medium text-slate-900">
                            {job.inserted_rows} / {job.total_rows}
                        </p>
                    </div>

                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-slate-500 text-xs uppercase font-semibold">
                            <User className="h-3 w-3" /> Created By
                        </div>
                        <p className="text-sm font-medium text-slate-900">{job.created_by}</p>
                    </div>

                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-slate-500 text-xs uppercase font-semibold">
                            <Calendar className="h-3 w-3" /> Started At
                        </div>
                        <p className="text-sm font-medium text-slate-900">{formatTime(job.started_at)}</p>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                    <div className="flex justify-between text-xs font-semibold text-slate-700">
                        <span>Overall Progress</span>
                        <span>{Math.round(job.progress_percentage)}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                            className={`h-full transition-all duration-500 ${job.status === "failed" ? "bg-red-500" :
                                job.status === "completed" ? "bg-emerald-500" :
                                    "bg-blue-500"
                                }`}
                            style={{ width: `${job.progress_percentage}%` }}
                        />
                    </div>
                </div>

                {/* Error Details */}
                {job.error_message && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                        <h3 className="flex items-center gap-2 text-sm font-bold text-red-900 mb-2">
                            <AlertCircle className="h-4 w-4" /> Import Failed
                        </h3>
                        <p className="text-sm text-red-800 mb-3">{job.error_message}</p>

                        {job.error_details && Object.keys(job.error_details).length > 0 && (
                            <div className="mt-2 rounded-lg bg-white border border-red-100 p-3 overflow-x-auto">
                                <pre className="text-xs text-red-700 font-mono">
                                    {JSON.stringify(job.error_details, null, 2)}
                                </pre>
                            </div>
                        )}
                    </div>
                )}

                {/* Footer Actions */}
                <div className="flex justify-end pt-2">
                    <button
                        onClick={onClose}
                        className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </Modal>
    );
}
