"use client";

import { useEffect, useState, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { fetchJobs, createImportJob, setSelectedJob } from "@/redux/seedDataSlice";
import { tenantsApi, Tenant } from "@/services/tenantsApi";
import { SeedJobResponse, JobType, CreateSeedJobRequest } from "@/services/seedDataApi";
import { SeedDataJobDetailsModal } from "./SeedDataJobDetailsModal";
import { SkeletonRow } from "../shared/SkeletonRow";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { isPlatformOwner } from "@/utils/auth";
import { timeAgo } from "@/utils/format";
import {
    RefreshCcw,
    Play,
    Database,
    Building2,
    CheckCircle,
    AlertCircle,
    Clock,
    Loader2,
    List,
    Eye
} from "lucide-react";
import { Pagination } from "../common/Pagination";

const POLL_INTERVAL = 5000; // 5 seconds

export function SeedDataPanel() {
    const dispatch = useAppDispatch();
    const { jobs, loading, creatingJob, error, selectedJob, lastQuery } = useAppSelector(
        (s) => s.seedData
    );

    const [jobType, setJobType] = useState<JobType>("master_only");
    const [selectedTenantId, setSelectedTenantId] = useState<string>("");
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [limit, setLimit] = useState(25);
    const [page, setPage] = useState(1);
    const [isPolling, setIsPolling] = useState(false);

    const isPlatformOwnerUser = isPlatformOwner();

    // Load Tenants for Platform Owner
    useEffect(() => {
        if (isPlatformOwnerUser) {
            tenantsApi.list({ page: 1, page_size: 100 })
                .then(response => setTenants(response.items))
                .catch(err => console.error("Failed to fetch tenants:", err));
        }
    }, [isPlatformOwnerUser]);

    // Initial Load
    const loadJobs = useCallback(() => {
        dispatch(fetchJobs({
            limit,
            tenant_id: isPlatformOwnerUser ? selectedTenantId || undefined : undefined
        }));
    }, [dispatch, limit, selectedTenantId, isPlatformOwnerUser]);

    useEffect(() => {
        loadJobs();
    }, [loadJobs]);

    // Polling Logic
    useEffect(() => {
        // Check if any job is running or pending
        const hasActiveJobs = jobs.some(j => j.status === "running" || j.status === "pending");

        if (hasActiveJobs) {
            setIsPolling(true);
            const interval = setInterval(() => {
                loadJobs();
            }, POLL_INTERVAL);
            return () => clearInterval(interval);
        } else {
            setIsPolling(false);
        }
    }, [jobs, loadJobs]);

    const handleCreateJob = async () => {
        if (jobType === "tenant_only" && !selectedTenantId) {
            toast.error("Please select a tenant for Tenant Only import");
            return;
        }

        const request: CreateSeedJobRequest = {
            job_type: jobType,
            tenant_id: (jobType === "tenant_only" || jobType === "full_import") && selectedTenantId ? selectedTenantId : null
        };

        try {
            await dispatch(createImportJob(request)).unwrap();
            toast.success("Import job started successfully");
            loadJobs();
        } catch (error) {
            toast.error(getErrorMessage(error));
        }
    };

    const handleRefresh = () => {
        loadJobs();
        toast.success("Refreshed jobs list");
    };

    const StatusBadge = ({ status }: { status: string }) => {
        switch (status) {
            case "completed":
                return (
                    <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                        <CheckCircle className="h-3 w-3" /> Completed
                    </span>
                );
            case "failed":
                return (
                    <span className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                        <AlertCircle className="h-3 w-3" /> Failed
                    </span>
                );
            case "running":
                return (
                    <span className="flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                        <Loader2 className="h-3 w-3 animate-spin" /> Running
                    </span>
                );
            default:
                return (
                    <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                        <Clock className="h-3 w-3" /> Pending
                    </span>
                );
        }
    };

    return (
        <div className="space-y-6">
            {/* Creation Panel */}
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                <div className="mb-4">
                    <h2 className="text-lg font-semibold text-slate-900">Start Import Job</h2>
                    <p className="text-sm text-slate-500">
                        Select the type of data to seed into the database
                    </p>
                </div>

                <div className="flex flex-col gap-6 md:flex-row md:items-start">
                    <div className="flex-1 space-y-4">
                        <div className="space-y-3">
                            <label className="text-sm font-medium text-slate-700">Import Type</label>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <label className={`relative flex cursor-pointer rounded-xl border p-4 shadow-sm hover:border-sky-300 transition-all ${jobType === "master_only" ? "border-sky-500 bg-sky-50 ring-1 ring-sky-500" : "border-slate-200 bg-white"
                                    }`}>
                                    <input
                                        type="radio"
                                        name="job_type"
                                        className="sr-only"
                                        checked={jobType === "master_only"}
                                        onChange={() => setJobType("master_only")}
                                    />
                                    <div className="flex flex-col gap-1">
                                        <span className="font-semibold text-slate-900">Master Only</span>
                                        <span className="text-xs text-slate-500">System-wide reference data (diagnoses, drugs, etc.)</span>
                                    </div>
                                </label>

                                <label className={`relative flex cursor-pointer rounded-xl border p-4 shadow-sm hover:border-sky-300 transition-all ${jobType === "tenant_only" ? "border-sky-500 bg-sky-50 ring-1 ring-sky-500" : "border-slate-200 bg-white"
                                    }`}>
                                    <input
                                        type="radio"
                                        name="job_type"
                                        className="sr-only"
                                        checked={jobType === "tenant_only"}
                                        onChange={() => setJobType("tenant_only")}
                                    />
                                    <div className="flex flex-col gap-1">
                                        <span className="font-semibold text-slate-900">Tenant Only</span>
                                        <span className="text-xs text-slate-500">Default data for a specific tenant</span>
                                    </div>
                                </label>

                                <label className={`relative flex cursor-pointer rounded-xl border p-4 shadow-sm hover:border-sky-300 transition-all ${jobType === "full_import" ? "border-sky-500 bg-sky-50 ring-1 ring-sky-500" : "border-slate-200 bg-white"
                                    }`}>
                                    <input
                                        type="radio"
                                        name="job_type"
                                        className="sr-only"
                                        checked={jobType === "full_import"}
                                        onChange={() => setJobType("full_import")}
                                    />
                                    <div className="flex flex-col gap-1">
                                        <span className="font-semibold text-slate-900">Full Import</span>
                                        <span className="text-xs text-slate-500">Master data + Tenant default data</span>
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* Tenant Selector - conditional */}
                        {(jobType === "tenant_only" || jobType === "full_import") && isPlatformOwnerUser && (
                            <div className="max-w-md animate-in fade-in slide-in-from-top-2">
                                <label className="mb-1 block text-sm font-medium text-slate-700">Select Target Tenant</label>
                                <div className="relative">
                                    <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                    <select
                                        value={selectedTenantId}
                                        onChange={(e) => setSelectedTenantId(e.target.value)}
                                        className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-3 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                                    >
                                        <option value="">Select a tenant...</option>
                                        {tenants.map((tenant) => (
                                            <option key={tenant.id} value={tenant.id}>
                                                {tenant.name} ({tenant.subdomain})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={handleCreateJob}
                            disabled={creatingJob}
                            className="mt-4 flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-md hover:from-sky-500 hover:to-indigo-500 disabled:opacity-70 transition-all active:scale-95"
                        >
                            {creatingJob ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Play className="h-4 w-4 fill-current" />
                            )}
                            {creatingJob ? "Starting Job..." : "Start Import Job"}
                        </button>
                    </div>
                </div>
            </div>

            {/* Jobs List */}
            <div className="space-y-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <h3 className="text-sm font-semibold text-slate-900">Recent Jobs</h3>
                        {isPolling && (
                            <span className="flex items-center gap-1.5 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 animate-pulse">
                                <RefreshCcw className="h-3 w-3 animate-spin" /> Live Updates
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <select
                            value={limit}
                            onChange={(e) => setLimit(Number(e.target.value))}
                            className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 outline-none focus:border-sky-500"
                        >
                            <option value={10}>10 items</option>
                            <option value={25}>25 items</option>
                            <option value={50}>50 items</option>
                            <option value={100}>100 items</option>
                        </select>

                        <button
                            onClick={handleRefresh}
                            className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:border-sky-300 hover:text-sky-600"
                            title="Refresh"
                        >
                            <RefreshCcw className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-200">
                    <div className="grid grid-cols-12 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase text-slate-500">
                        <div className="col-span-3">Job Info</div>
                        <div className="col-span-2">Status</div>
                        <div className="col-span-3">Progress</div>
                        <div className="col-span-2 text-right">Started</div>
                        <div className="col-span-2 text-right">Actions</div>
                    </div>

                    {loading && jobs.length === 0 ? (
                        <div className="p-4"><SkeletonRow rows={5} /></div>
                    ) : jobs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                            <Database className="h-10 w-10 text-slate-300 mb-2" />
                            <p className="text-sm">No jobs found</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {jobs.map((job) => (
                                <div key={job.id} className="grid grid-cols-12 items-center px-4 py-3 text-sm text-slate-800 hover:bg-slate-50 transition-colors">
                                    <div className="col-span-3 pr-2">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-mono text-xs text-slate-400" title={job.id}>
                                                #{job.id.substring(0, 8)}
                                            </span>
                                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-600">
                                                {job.job_type.replace('_', ' ')}
                                            </span>
                                        </div>
                                        {job.tenant_id ? (
                                            <div className="flex items-center gap-1 text-xs text-slate-500" title={job.tenant_id}>
                                                <Building2 className="h-3 w-3" /> Tenant Specific
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1 text-xs text-slate-500">
                                                <Database className="h-3 w-3" /> System Wide
                                            </div>
                                        )}
                                    </div>

                                    <div className="col-span-2">
                                        <StatusBadge status={job.status} />
                                        {job.error_message && (
                                            <p className="mt-1 truncate text-xs text-red-600 w-32" title={job.error_message}>
                                                {job.error_message}
                                            </p>
                                        )}
                                    </div>

                                    <div className="col-span-3 pr-4">
                                        <div className="flex items-center justify-between text-xs mb-1">
                                            <span className="text-slate-600">{job.completed_tables}/{job.total_tables} tables</span>
                                            <span className="font-medium text-slate-900">{Math.round(job.progress_percentage)}%</span>
                                        </div>
                                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                                            <div
                                                className={`h-full transition-all duration-500 ${job.status === 'failed' ? 'bg-red-400' :
                                                    job.status === 'completed' ? 'bg-emerald-500' : 'bg-blue-500'
                                                    }`}
                                                style={{ width: `${job.progress_percentage}%` }}
                                            />
                                        </div>
                                        <div className="mt-1 text-[10px] text-slate-400">
                                            {job.inserted_rows} rows inserted
                                        </div>
                                    </div>

                                    <div className="col-span-2 text-right text-xs text-slate-500">
                                        <p>{timeAgo(job.started_at)}</p>
                                        {job.duration_seconds && (
                                            <p className="text-[10px] opacity-70">took {job.duration_seconds.toFixed(1)}s</p>
                                        )}
                                    </div>

                                    <div className="col-span-2 flex justify-end">
                                        <button
                                            onClick={() => dispatch(setSelectedJob(job))}
                                            className="group flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 transition-all"
                                        >
                                            <Eye className="h-3 w-3" />
                                            Details
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Details Modal */}
            {selectedJob && (
                <SeedDataJobDetailsModal
                    isOpen={!!selectedJob}
                    onClose={() => dispatch(setSelectedJob(null))}
                    job={selectedJob}
                />
            )}
        </div>
    );
}
