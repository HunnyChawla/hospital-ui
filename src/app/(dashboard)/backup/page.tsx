"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Database,
  Download,
  FileSpreadsheet,
  FileArchive,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  CheckSquare,
  Square,
  RefreshCw,
  Users2,
  CalendarDays,
  Activity,
  Stethoscope,
  FileText,
  BedDouble,
  Scissors,
  FlaskConical,
  CreditCard,
  Receipt,
  Pill,
  FolderArchive,
} from "lucide-react";
import { toast } from "sonner";
import clsx from "clsx";
import {
  backupApi,
  BackupFormat,
  BackupJob,
  CreateBackupRequest,
  DatasetOption,
} from "@/services/backupApi";
import { getErrorMessage } from "@/utils/errorHandler";
import { formatDateTime } from "@/utils/format";

// Mapping dataset icon strings to Lucide icon components
const DATASET_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Users2,
  CalendarDays,
  Activity,
  Stethoscope,
  FileText,
  BedDouble,
  Clock,
  Scissors,
  FlaskConical,
  CreditCard,
  Receipt,
  Pill,
  FolderArchive,
};

function formatBytes(bytes: number | null): string {
  if (!bytes || bytes <= 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function getTodayString(): string {
  return new Date().toISOString().split("T")[0];
}

function getPastDateString(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split("T")[0];
}

function getStartOfMonthString(): string {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().split("T")[0];
}

function getStartOfYearString(): string {
  const d = new Date();
  d.setMonth(0, 1);
  return d.toISOString().split("T")[0];
}

export default function BackupPage() {
  const queryClient = useQueryClient();

  // Date range state
  const [startDate, setStartDate] = useState(getPastDateString(30));
  const [endDate, setEndDate] = useState(getTodayString());
  const [selectedPreset, setSelectedPreset] = useState<string>("30d");

  // Format state
  const [format, setFormat] = useState<BackupFormat>("EXCEL");

  // Selected datasets state
  const [selectedDatasets, setSelectedDatasets] = useState<string[]>([]);
  const [isDownloadingId, setIsDownloadingId] = useState<string | null>(null);

  // Track previous status to detect transitions to COMPLETED
  const prevActiveJobRef = useRef<boolean>(false);

  // 1. Fetch available non-master datasets
  const { data: datasets = [], isLoading: isLoadingDatasets } = useQuery<DatasetOption[]>({
    queryKey: ["backup", "datasets"],
    queryFn: () => backupApi.getAvailableDatasets(),
    staleTime: 1000 * 60 * 30, // 30 minutes
  });

  // Default select all datasets once loaded
  useEffect(() => {
    if (datasets.length > 0 && selectedDatasets.length === 0) {
      setSelectedDatasets(datasets.map((d) => d.key));
    }
  }, [datasets, selectedDatasets.length]);

  // 2. Fetch backups history with polling if active jobs exist
  const {
    data: backupsData,
    isLoading: isLoadingBackups,
    refetch: refetchBackups,
    isFetching: isFetchingBackups,
  } = useQuery({
    queryKey: ["backup", "list"],
    queryFn: () => backupApi.listBackups(),
    refetchInterval: (query) => (query.state.data?.has_active_job ? 3000 : false),
  });

  const backups = useMemo(() => backupsData?.items || [], [backupsData?.items]);
  const hasActiveJob = backupsData?.has_active_job || false;
  const activeJob = backups.find(
    (b) => b.status === "PENDING" || b.status === "IN_PROGRESS"
  );

  // Notify when an active job finishes
  useEffect(() => {
    if (prevActiveJobRef.current && !hasActiveJob) {
      const latest = backups[0];
      if (latest && latest.status === "COMPLETED") {
        toast.success("Hospital data backup completed successfully! Ready for download.", {
          duration: 6000,
        });
      } else if (latest && latest.status === "FAILED") {
        toast.error(`Data backup failed: ${latest.error_message || "Unknown error"}`);
      }
    }
    prevActiveJobRef.current = hasActiveJob;
  }, [hasActiveJob, backups]);

  // 3. Trigger backup mutation
  const triggerMutation = useMutation({
    mutationFn: (req: CreateBackupRequest) => backupApi.triggerBackup(req),
    onSuccess: () => {
      toast.success("Backup task started in background. You will be notified once ready.");
      queryClient.invalidateQueries({ queryKey: ["backup", "list"] });
    },
    onError: (err: any) => {
      toast.error(getErrorMessage(err) || "Failed to trigger backup");
    },
  });

  // Preset handler
  const applyPreset = (preset: string) => {
    setSelectedPreset(preset);
    const today = getTodayString();
    setEndDate(today);

    switch (preset) {
      case "7d":
        setStartDate(getPastDateString(7));
        break;
      case "30d":
        setStartDate(getPastDateString(30));
        break;
      case "month":
        setStartDate(getStartOfMonthString());
        break;
      case "90d":
        setStartDate(getPastDateString(90));
        break;
      case "ytd":
        setStartDate(getStartOfYearString());
        break;
      default:
        break;
    }
  };

  const toggleSelectAll = () => {
    if (selectedDatasets.length === datasets.length) {
      setSelectedDatasets([]);
    } else {
      setSelectedDatasets(datasets.map((d) => d.key));
    }
  };

  const toggleDataset = (key: string) => {
    setSelectedDatasets((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleStartBackup = () => {
    if (selectedDatasets.length === 0) {
      toast.error("Please select at least one dataset to backup");
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      toast.error("Start date cannot be after end date");
      return;
    }

    triggerMutation.mutate({
      start_date: startDate,
      end_date: endDate,
      datasets: selectedDatasets,
      file_format: format,
    });
  };

  // Download handler
  const handleDownload = async (backup: BackupJob) => {
    try {
      setIsDownloadingId(backup.id);
      const blob = await backupApi.downloadBackup(backup.id);
      const ext = backup.file_format === "EXCEL" ? "xlsx" : "zip";
      const filename = `hospital_backup_${backup.start_date}_to_${backup.end_date}.${ext}`;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Download started");
    } catch (err: any) {
      toast.error(getErrorMessage(err) || "Failed to download backup file");
    } finally {
      setIsDownloadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-sky-600 text-white shadow-md">
              <Database className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Hospital Data Backup & Export</h1>
              <p className="text-xs text-slate-500">
                Export all historical clinical and operational data belonging strictly to your hospital tenant.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetchBackups()}
              disabled={isFetchingBackups}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw className={clsx("h-3.5 w-3.5", isFetchingBackups && "animate-spin")} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Active Job Processing Banner */}
      {activeJob && (
        <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-sm animate-pulse">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-amber-950">
                    Backup Job in Progress ({activeJob.status})
                  </span>
                  <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                    Auto-refreshing every 3s
                  </span>
                </div>
                <p className="text-xs text-amber-800 mt-0.5">
                  Exporting {activeJob.selected_datasets.length} datasets for range {activeJob.start_date} to {activeJob.end_date} in {activeJob.file_format} format. You can continue using the HMS while this processes.
                </p>
              </div>
            </div>
            <div className="text-xs font-mono text-amber-800 self-end sm:self-center">
              Triggered {formatDateTime(activeJob.created_at)}
            </div>
          </div>
        </div>
      )}

      {/* Request New Backup Card */}
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <h2 className="text-base font-bold text-slate-900 mb-1">Create New Backup</h2>
        <p className="text-xs text-slate-500 mb-5">
          Configure the date window, desired output format, and the specific datasets you wish to download.
        </p>

        <div className="space-y-6">
          {/* Step 1: Date Range Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              1. Extraction Date Range
            </label>

            {/* Quick Presets */}
            <div className="flex flex-wrap gap-2 mb-3">
              {[
                { id: "7d", label: "Last 7 Days" },
                { id: "30d", label: "Last 30 Days" },
                { id: "month", label: "This Month" },
                { id: "90d", label: "Last 3 Months" },
                { id: "ytd", label: "This Year" },
                { id: "custom", label: "Custom Range" },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyPreset(p.id)}
                  className={clsx(
                    "rounded-lg px-3 py-1.5 text-xs font-medium transition",
                    selectedPreset === p.id
                      ? "bg-slate-900 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Date Pickers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
              <div>
                <label className="block text-xs text-slate-500 mb-1">From Date</label>
                <div className="relative">
                  <input
                    type="date"
                    value={startDate}
                    max={endDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setSelectedPreset("custom");
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">To Date</label>
                <div className="relative">
                  <input
                    type="date"
                    value={endDate}
                    min={startDate}
                    max={getTodayString()}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setSelectedPreset("custom");
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Step 2: Format Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              2. Export Format
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
              <label
                className={clsx(
                  "relative flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition",
                  format === "EXCEL"
                    ? "border-emerald-500 bg-emerald-50/40 shadow-sm"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                )}
              >
                <input
                  type="radio"
                  name="format"
                  value="EXCEL"
                  checked={format === "EXCEL"}
                  onChange={() => setFormat("EXCEL")}
                  className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm font-semibold text-slate-900">Excel Workbook (.xlsx)</span>
                    <span className="rounded-full bg-emerald-100 px-2 py-0.2 text-[10px] font-semibold text-emerald-800">
                      Recommended
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Single spreadsheet workbook with formatted sheets for each chosen module. Easy to view in MS Excel or Google Sheets.
                  </p>
                </div>
              </label>

              <label
                className={clsx(
                  "relative flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition",
                  format === "CSV"
                    ? "border-sky-500 bg-sky-50/40 shadow-sm"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                )}
              >
                <input
                  type="radio"
                  name="format"
                  value="CSV"
                  checked={format === "CSV"}
                  onChange={() => setFormat("CSV")}
                  className="mt-0.5 text-sky-600 focus:ring-sky-500"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <FileArchive className="h-4 w-4 text-sky-600" />
                    <span className="text-sm font-semibold text-slate-900">CSV Archive (.zip)</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    ZIP archive containing individual comma-separated files for each module. Ideal for database imports and scripting.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Step 3: Datasets Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                3. Select Modules to Backup ({selectedDatasets.length} of {datasets.length} selected)
              </label>
              <button
                type="button"
                onClick={toggleSelectAll}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-600 hover:text-sky-700 transition"
              >
                {selectedDatasets.length === datasets.length ? (
                  <>
                    <CheckSquare className="h-3.5 w-3.5" />
                    Deselect All
                  </>
                ) : (
                  <>
                    <Square className="h-3.5 w-3.5" />
                    Select All ({datasets.length})
                  </>
                )}
              </button>
            </div>

            {isLoadingDatasets ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {datasets.map((d) => {
                  const isSelected = selectedDatasets.includes(d.key);
                  const Icon = DATASET_ICONS[d.icon] || Database;
                  return (
                    <div
                      key={d.key}
                      onClick={() => toggleDataset(d.key)}
                      className={clsx(
                        "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition",
                        isSelected
                          ? "border-sky-300 bg-sky-50/40 shadow-xs"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}} // Handled by div container
                        className="mt-0.5 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <Icon className={clsx("h-4 w-4", isSelected ? "text-sky-600" : "text-slate-400")} />
                          <span className="text-xs font-semibold text-slate-800 truncate">{d.name}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                          {d.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Trigger Action */}
          <div className="flex items-center justify-between border-t border-slate-100 pt-4">
            <div className="text-xs text-slate-500">
              {hasActiveJob && (
                <span className="text-amber-600 font-medium">
                  A backup is currently generating. Please wait before starting another.
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={handleStartBackup}
              disabled={triggerMutation.isPending || hasActiveJob || selectedDatasets.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
            >
              {triggerMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Initiating...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Generate Backup File
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Backup History Table */}
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Backup History & Downloads</h2>
            <p className="text-xs text-slate-500">
              Previously requested backups with download links and record statistics.
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
            {backups.length} {backups.length === 1 ? "Record" : "Records"}
          </span>
        </div>

        {isLoadingBackups ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : backups.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
            <Database className="mx-auto h-8 w-8 text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-700">No backups generated yet</p>
            <p className="text-xs text-slate-400 mt-1">
              Select your date range and click &quot;Generate Backup File&quot; above to create your first backup.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-3">Date Requested</th>
                  <th className="py-3 px-3">Date Window</th>
                  <th className="py-3 px-3">Format</th>
                  <th className="py-3 px-3">Modules & Records</th>
                  <th className="py-3 px-3">File Size</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {backups.map((b) => {
                  const totalRecords = Object.values(b.record_counts || {}).reduce(
                    (acc, n) => acc + (typeof n === "number" ? n : 0),
                    0
                  );
                  const isDownloading = isDownloadingId === b.id;

                  return (
                    <tr key={b.id} className="hover:bg-slate-50/60 transition">
                      {/* Requested At */}
                      <td className="py-3.5 px-3">
                        <div className="font-medium text-slate-900">{formatDateTime(b.created_at)}</div>
                        {b.created_by_name && (
                          <div className="text-[11px] text-slate-400">by {b.created_by_name}</div>
                        )}
                      </td>

                      {/* Date Window */}
                      <td className="py-3.5 px-3 text-slate-700 font-mono text-[11px]">
                        {b.start_date} <span className="text-slate-400">to</span> {b.end_date}
                      </td>

                      {/* Format */}
                      <td className="py-3.5 px-3">
                        {b.file_format === "EXCEL" ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700">
                            <FileSpreadsheet className="h-3 w-3" />
                            Excel (.xlsx)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-0.5 font-semibold text-sky-700">
                            <FileArchive className="h-3 w-3" />
                            CSV (.zip)
                          </span>
                        )}
                      </td>

                      {/* Modules & Records */}
                      <td className="py-3.5 px-3">
                        <div className="font-semibold text-slate-800">
                          {b.selected_datasets.length} modules
                        </div>
                        {b.status === "COMPLETED" && (
                          <div className="text-[11px] text-slate-500">
                            {totalRecords.toLocaleString()} total rows
                          </div>
                        )}
                      </td>

                      {/* File Size */}
                      <td className="py-3.5 px-3 text-slate-600 font-mono text-[11px]">
                        {b.status === "COMPLETED" ? formatBytes(b.file_size_bytes) : "—"}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3">
                        {b.status === "COMPLETED" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Completed
                          </span>
                        )}
                        {b.status === "IN_PROGRESS" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            In Progress
                          </span>
                        )}
                        {b.status === "PENDING" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                            <Clock className="h-3.5 w-3.5" />
                            Queued
                          </span>
                        )}
                        {b.status === "FAILED" && (
                          <div className="flex items-center gap-1 text-rose-600" title={b.error_message || "Export error"}>
                            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                            <span className="font-semibold">Failed</span>
                          </div>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-3 text-right">
                        {b.status === "COMPLETED" ? (
                          <button
                            type="button"
                            onClick={() => handleDownload(b)}
                            disabled={isDownloading}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
                          >
                            {isDownloading ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Downloading...
                              </>
                            ) : (
                              <>
                                <Download className="h-3.5 w-3.5 text-sky-600" />
                                Download
                              </>
                            )}
                          </button>
                        ) : b.status === "IN_PROGRESS" || b.status === "PENDING" ? (
                          <span className="text-xs text-slate-400 italic">Processing...</span>
                        ) : (
                          <span className="text-xs text-rose-500 text-[11px]">{b.error_message || "Error"}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
